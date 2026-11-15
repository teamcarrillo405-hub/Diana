"""CPU-only protocol contracts; no model inference or final-test data access."""
import copy
import json
from pathlib import Path
import socket
import uuid
import unittest
from unittest.mock import patch

import train_qwen3_4b_research as runner


class TokenizerFixture:
    def __init__(self, full=None, prefix=None):
        self.full = full if full is not None else [11, 12, 13, 20, 21, 2]
        self.prefix = prefix if prefix is not None else [11, 12, 13]

    def apply_chat_template(self, messages, **_kwargs):
        return self.full if messages[-1]["role"] == "assistant" else self.prefix


class ResearchContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.train, cls.development = runner.validated_data()

    def records(self):
        return [{"id": row["id"], "output": row["target"], "targetTokenLoss": 1.0,
                 "targetTokens": 12, "diagnostics": runner.score(row["target"], row)} for row in self.development]

    def test_original_data_and_system_are_fixed(self):
        self.assertEqual((len(self.train), len(self.development)), (440, 48))
        modified = copy.deepcopy(self.train)
        modified[0]["nextStepAnchors"].append("favorable")
        with patch.object(runner, "datasets", return_value=(modified, self.development)):
            with self.assertRaisesRegex(ValueError, "content changed"):
                runner.validated_data()

    def test_prompt_mask_keeps_only_assistant_target_and_eos(self):
        encoded = runner.token_ids(TokenizerFixture(), self.train[0])
        self.assertEqual(encoded["labels"], [-100, -100, -100, 20, 21, 2])
        self.assertEqual(encoded["targetTokens"], 3)

    def test_prefix_mismatch_empty_targets_and_truncation_are_rejected(self):
        for tokenizer in (TokenizerFixture(full=[8, 9, 10]), TokenizerFixture(full=[11, 12, 13]),
                          TokenizerFixture(full=list(range(513)), prefix=[0]),
                          TokenizerFixture(full=list(range(401)), prefix=list(range(400)))):
            with self.subTest(tokenizer=tokenizer), self.assertRaises(ValueError):
                runner.token_ids(tokenizer, self.train[0])

    def test_nonregression_allows_perfect_baseline_to_tie(self):
        metrics = runner.aggregate(self.records(), self.development)
        self.assertTrue(all(runner.gates(metrics, metrics).values()))

    def test_95_percent_requires_46_of_48_and_rejects_regression(self):
        baseline = runner.aggregate(self.records(), self.development)
        adapted = copy.deepcopy(baseline)
        baseline["counts"]["groundedCasePass"] = 40
        adapted["counts"]["groundedCasePass"] = 45
        self.assertFalse(runner.gates(baseline, adapted)["groundingAtLeast95Percent"])
        adapted["counts"]["groundedCasePass"] = 46
        self.assertTrue(all(runner.gates(baseline, adapted).values()))
        adapted["targetTokenLoss"] = 1.01
        self.assertFalse(runner.gates(baseline, adapted)["lossNonRegression"])
        adapted["counts"]["unsupportedAnswer"] = 1
        self.assertFalse(runner.gates(baseline, adapted)["unsupportedAnswerNonRegression"])

    def test_recomputes_raw_output_and_rejects_incomplete_or_nonfinite_evidence(self):
        records = self.records()
        variants = [records[:-1]]
        for key, value in (("output", "EVIDENCE: invented\nNEXT: What?"), ("targetTokenLoss", float("nan")),
                           ("targetTokenLoss", float("inf")), ("targetTokens", 0), ("id", "another-case")):
            changed = copy.deepcopy(records)
            changed[0][key] = value
            variants.append(changed)
        for rows in variants:
            with self.subTest(rows=rows[0]["id"]), self.assertRaises(ValueError):
                runner.aggregate(rows, self.development)

    def test_no_fallback_and_no_early_selection(self):
        metrics = runner.aggregate(self.records(), self.development)
        candidates = [{"epoch": epoch, "metrics": metrics, "gates": {"groundingAtLeast95Percent": False}} for epoch in (1, 2)]
        self.assertIsNone(runner.select_candidate(candidates))
        with self.assertRaises(ValueError):
            runner.select_candidate(candidates[:1])
        candidates[1]["gates"] = runner.gates(metrics, metrics)
        self.assertEqual(runner.select_candidate(candidates)["epoch"], 2)

    def test_network_denial_restores_socket(self):
        original = socket.socket.connect
        with runner.deny_network():
            with self.assertRaisesRegex(RuntimeError, "Networking denied"):
                socket.create_connection(("example.com", 443))
            with self.assertRaises(RuntimeError):
                socket.getaddrinfo("example.com", 443)
        self.assertIs(socket.socket.connect, original)

    def test_explicit_environment_contract_and_exact_runtime_required(self):
        actual = {"torchRuntime": "qualified-rocm", "gpuName": "R9700"}
        contract = {"schema": "diana-qwen3-rocm-environment-v1", "approved": True, "environment": actual}
        runner.verify_environment(actual, contract)
        for changed in ({**contract, "approved": False}, {**contract, "environment": {"torchRuntime": "cpu"}}):
            with self.assertRaises(ValueError):
                runner.verify_environment(actual, changed)

    def test_reviewed_protocol_hash_is_required_before_loading_any_data(self):
        with patch.object(runner, "sha256", return_value="changed"), patch.object(runner, "read_json") as read:
            with self.assertRaisesRegex(ValueError, "Reviewed protocol digest mismatch"):
                runner.verify_freeze(Path("unused"), "reviewed")
            read.assert_not_called()

    def test_runtime_qualification_must_be_sealed_before_use(self):
        with self.assertRaisesRegex(ValueError, "bound by path and digest"):
            runner.verify_qualification({})
        with patch.object(runner, "sha256", return_value="altered"):
            with self.assertRaisesRegex(ValueError, "proof changed"):
                runner.verify_qualification({"qualificationEvidence": {"path": "proof.json", "sha256": "reviewed"}})

    def test_frozen_source_cannot_change_even_if_recipe_is_unchanged(self):
        protocol = {"settings": runner.SETTINGS, "model": runner.MODEL, "revision": runner.REVISION,
                    "productionEligible": False, "testEvaluations": 0, "initialAdapter": None, "frozenFiles": {}}
        with patch.object(runner, "read_json", return_value=protocol), patch.object(runner, "sha256", side_effect=["reviewed", "live-changed", "frozen-original"]):
            with self.assertRaisesRegex(ValueError, "Live source changed"):
                runner.verify_freeze(Path("unused"), "reviewed")

    def test_cpu_fallback_is_forbidden(self):
        class FakeTorch:
            class version:
                hip = None
        with patch.object(runner.platform, "system", return_value="Linux"), patch.object(runner.platform, "release", return_value="microsoft-wsl2"):
            with self.assertRaisesRegex(ValueError, "no CPU fallback"):
                runner.environment(FakeTorch())

    def test_write_is_immutable_and_nonfinite_json_is_rejected(self):
        directory = Path(__file__).resolve().parents[2] / ("qwen-contract-" + uuid.uuid4().hex)
        directory.mkdir()
        try:
            path = directory / "protocol.json"
            runner.write_json(path, {"productionEligible": False})
            with self.assertRaises(FileExistsError):
                runner.write_json(path, {"productionEligible": True})
            with self.assertRaises(ValueError):
                runner.write_json(directory / "bad.json", {"loss": float("nan")})
        finally:
            for name in ("protocol.json", "bad.json"):
                (directory / name).unlink(missing_ok=True)
            directory.rmdir()

    def test_known_mechanical_contract_cases(self):
        row = next(row for row in self.development if not row["expectedAbstention"])
        self.assertTrue(runner.score(row["target"], row)["groundedCasePass"])
        self.assertFalse(runner.score(row["target"] + "\nExtra line", row)["groundedCasePass"])
        self.assertTrue(runner.score("EVIDENCE: insufficient\nNEXT: What evidence?", row)["falseAbstention"])
        absent = next(row for row in self.development if row["expectedAbstention"])
        self.assertTrue(runner.score(row["target"], absent)["unsupportedAnswer"])

    def test_saved_v4_development_diagnostics_parity(self):
        directory = Path(__file__).resolve().parents[2] / "artifacts/learning-engine/research/local-lora-execution/run-005-v4"
        names = ("baseline-validation.json", "parent-validation.json", "epoch-1-validation.json", "epoch-2-validation.json")
        if not all((directory / name).is_file() for name in names):
            self.skipTest("Historical development-only artifacts are not present in this checkout")
        saved_rows = json.loads((directory / "validation.json").read_text(encoding="utf-8"))
        self.assertEqual(saved_rows, self.development)
        for name in names:
            records = json.loads((directory / name).read_text(encoding="utf-8"))
            for record, row in zip(records, saved_rows, strict=True):
                self.assertEqual(runner.score(record["output"], row), record["diagnostics"], (name, row["id"]))
            runner.aggregate(records, saved_rows)


if __name__ == "__main__":
    unittest.main()
