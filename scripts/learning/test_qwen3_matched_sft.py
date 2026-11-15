"""Adversarial synthetic checks. No publisher model, run outputs or final cases."""
from copy import deepcopy
import importlib.util
import math
import json
from pathlib import Path, PurePosixPath
from contextlib import contextmanager
import shutil
import types
import unittest
import uuid
from unittest.mock import patch, Mock

import train_qwen3_matched_sft as runner


@contextmanager
def fixture_directory():
    # Avoid Python 3.14 temporary-directory ACLs excluding the Windows sandbox.
    parent = Path(__file__).resolve().parent
    path = parent / (".matched-sft-fixture-" + uuid.uuid4().hex)
    path.mkdir()
    try:
        yield path
    finally:
        resolved = path.resolve()
        if resolved.parent != parent or not resolved.name.startswith(".matched-sft-fixture-"):
            raise ValueError("Fixture cleanup escaped the test directory")
        shutil.rmtree(resolved)


def fixture():
    return {"prefix": [1, 3, 4], "full": [1, 3, 4, 5, 6, 2],
            "labels": [-100, -100, -100, 5, 6, 2], "targetTokens": 3}


def event():
    return {"chosenSumLogp": -6.0, "chosenTokens": 3,
            "chosenTokenLogps": [-1.0, -2.0, -3.0], "chosenTokenMeanCE": 2.0,
            "combinedLoss": 1.0, "tensorCombinedLoss": 1.0,
            "tensorChosenTokenMeanCE": 2.0, "gradientNorm": .8}


class ObjectiveTests(unittest.TestCase):
    def test_half_chosen_mean_ce(self):
        self.assertEqual(runner.objective_terms(-6.0, 3),
                         {"chosenTokenMeanCE": 2.0, "combinedLoss": 1.0})
        self.assertEqual(runner.objective_terms(-12.0, 6), runner.objective_terms(-6.0, 3))

    def test_invalid_numerical_inputs(self):
        for total in (True, 1, math.inf, -math.inf, math.nan, "-2"):
            with self.subTest(total=total), self.assertRaises(ValueError):
                runner.objective_terms(total, 3)
        for count in (0, -1, True, 1.0):
            with self.subTest(count=count), self.assertRaises(ValueError):
                runner.objective_terms(-2, count)

    def test_no_unweighted_or_dpo_term(self):
        for key, value in (("combinedLoss", 2.0), ("tensorCombinedLoss", 1.693147),
                           ("chosenSumLogp", -7), ("chosenTokens", 2),
                           ("chosenTokenLogps", [-1, -2, math.nan]),
                           ("chosenTokenLogps", [-1, -2, 3]),
                           ("tensorChosenTokenMeanCE", 3), ("gradientNorm", math.inf)):
            altered = event()
            altered[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                runner.validate_objective_event(altered)

    @unittest.skipUnless(importlib.util.find_spec("torch"), "Optional tiny tensor test requires existing torch; no installation")
    def test_scalar_tensor_gradient(self):
        import torch
        chosen = torch.tensor(-6.0, requires_grad=True)
        loss, ce = runner.tensor_objective(chosen, 3)
        loss.backward()
        self.assertEqual(float(loss.detach()), 1)
        self.assertEqual(float(ce.detach()), 2)
        self.assertAlmostEqual(float(chosen.grad), -.5 / 3)


class MaskingTests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec("torch"), "Optional tiny tensor test requires existing torch; no installation")
    def test_prompt_end_tokens_and_shifted_mask(self):
        import torch
        item = fixture()
        # Prompt predictions can be nonfinite: only assistant predictions count.
        logits = torch.zeros((1, len(item["full"]), 8), dtype=torch.bfloat16)
        logits[0, :2] = math.nan
        logits.requires_grad_()
        model = Mock(return_value=types.SimpleNamespace(logits=logits))
        total, per_token = runner.sequence_logps(model, item, device="cpu")
        self.assertEqual(per_token.dtype, torch.float32)
        self.assertEqual(len(per_token), 3)
        self.assertAlmostEqual(float(total.detach()), -3 * math.log(8), places=5)
        total.backward()
        self.assertTrue(torch.equal(logits.grad[0, :2], torch.zeros_like(logits.grad[0, :2])))
        self.assertTrue(torch.isfinite(logits.grad).all())
        self.assertNotEqual(float(logits.grad[0, 4, 2]), 0.0)
        self.assertEqual(model.call_count, 1)
        self.assertNotIn("labels", model.call_args.kwargs)

    @unittest.skipUnless(importlib.util.find_spec("torch"), "Optional tiny tensor test requires existing torch; no installation")
    def test_nonfinite_target_logits_stop(self):
        import torch
        logits = torch.zeros((1, 6, 8))
        logits[0, 2, 5] = math.nan
        with self.assertRaises(ValueError):
            runner.sequence_logps(Mock(return_value=types.SimpleNamespace(logits=logits)), fixture(), "cpu")

    def test_prompt_loss_missing_eos_and_count_tampering(self):
        for mutate in (
            lambda x: x["labels"].__setitem__(1, 3),
            lambda x: x["labels"].__setitem__(-1, -100),
            lambda x: x.__setitem__("targetTokens", 2),
            lambda x: x.__setitem__("targetTokens", True),
            lambda x: x["full"].__setitem__(0, 2),
            lambda x: x.__setitem__("prefix", []),
        ):
            altered = fixture()
            mutate(altered)
            with self.assertRaises(ValueError):
                runner.validate_mask(altered)

    def test_rejected_metadata_never_tokenized(self):
        class Poison:
            def __str__(self):
                raise AssertionError("Rejected response accessed by tokenizer")
        class Tokenizer:
            def apply_chat_template(self, messages, **kwargs):
                if messages[-1]["role"] == "assistant":
                    self.target = messages[-1]["content"]
                    return [1, 3, 4, 5, 6, 2]
                return [1, 3, 4]
        row = {"id": "synthetic", "source": "Fixture only", "question": "Which?",
               "target": "Chosen", "rejected": Poison()}
        tokenizer = Tokenizer()
        self.assertEqual(runner.token_ids(tokenizer, row), fixture())
        self.assertEqual(tokenizer.target, "Chosen")

    def test_no_truncation(self):
        item = fixture()
        item["prefix"] = [1] * 650
        item["full"] = item["prefix"] + [2]
        item["labels"] = [-100] * 650 + [2]
        item["targetTokens"] = 1
        with self.assertRaises(ValueError):
            runner.validate_mask(item)


class QualificationTests(unittest.TestCase):
    def proof(self):
        return {"schema": "diana-qwen3-matched-sft-objective-qualification-v1", "status": "qualified",
            "sourceSha256": runner.sha256(Path(runner.__file__)),
            "settingsSha256": runner.canonical_hash(runner.SETTINGS), "environment": {},
            "environmentSha256": runner.canonical_hash({}), "runtimeContractSha256": "a" * 64,
            "randomTinyModelOnly": True, "realModelOrTrainingDataLoaded": False,
            "targetOnlyMasking": True, "finiteGradients": True, "gradientDirectionPassed": True,
            "trainableTensors": 16, "changedTensors": 16, "fixture": fixture(),
            "events": [{**event(), "step": 1}, {**event(), "step": 2}], "productionEligible": False}

    def test_complete_synthetic_proof(self):
        proof = self.proof()
        with patch.object(runner, "read_json", return_value=proof):
            self.assertEqual(runner.validate_objective_qualification(Path("unused"), {}), proof)

    def test_tampered_proofs(self):
        for mutate in (
            lambda x: x.__setitem__("sourceSha256", "0" * 64),
            lambda x: x.__setitem__("settingsSha256", "0" * 64),
            lambda x: x.__setitem__("changedTensors", 15),
            lambda x: x.__setitem__("environment", {"changed": True}),
            lambda x: x.__setitem__("realModelOrTrainingDataLoaded", True),
            lambda x: x.__setitem__("targetOnlyMasking", False),
            lambda x: x["events"].pop(),
            lambda x: x["events"][0].__setitem__("tensorCombinedLoss", 2),
            lambda x: x["fixture"]["labels"].__setitem__(1, 3),
        ):
            proof = self.proof()
            mutate(proof)
            with patch.object(runner, "read_json", return_value=proof), self.assertRaises(ValueError):
                runner.validate_objective_qualification(Path("unused"), {})

    def test_runtime_contract_preserves_raw_bytes(self):
        with fixture_directory() as directory:
            source, destination = Path(directory) / "in.json", Path(directory) / "out.json"
            source.write_bytes(b'{ "approved" : true }\n\n')
            runner.copy_runtime_contract(source, destination)
            self.assertEqual(source.read_bytes(), destination.read_bytes())


class BoundaryTests(unittest.TestCase):
    def test_comparator_audit_serialization_exception_preserves_both_byte_seals(self):
        with fixture_directory() as directory:
            original, serialized = directory / "original.json", directory / "serialized.json"
            audit = {"approved": True, "notes": ["Synthetic audit only"]}
            original.write_bytes(json.dumps(audit, separators=(",", ":")).encode())
            serialized.write_bytes(json.dumps(audit, indent=2).encode())
            pins = {"AUDIT_HASH": runner.sha256(original), "COMPARATOR_AUDIT_HASH": runner.sha256(serialized),
                    "AUDIT_CANONICAL_HASH": runner.canonical_hash(audit)}
            self.assertNotEqual(pins["AUDIT_HASH"], pins["COMPARATOR_AUDIT_HASH"])
            with patch.multiple(runner, **pins):
                runner.validate_matched_audit(serialized, original)
                original.write_bytes(json.dumps(audit, indent=1).encode())
                with self.assertRaisesRegex(ValueError, "original audit bytes"):
                    runner.validate_matched_audit(serialized, original)
                original.write_bytes(json.dumps(audit, separators=(",", ":")).encode())
                serialized.write_bytes(json.dumps({**audit, "approved": False}, indent=2).encode())
                with self.assertRaisesRegex(ValueError, "serialized audit identity"):
                    runner.validate_matched_audit(serialized, original)

    def test_only_objective_setting_changed(self):
        self.assertEqual(runner.SETTINGS, {k:v for k,v in runner.comparator_runner.SETTINGS.items() if k != "beta"})
        self.assertEqual(runner.SYSTEM, runner.comparator_runner.SYSTEM)
        self.assertEqual(runner.SETTINGS["epochs"] * 300 // runner.SETTINGS["gradientAccumulation"], 225)
        self.assertTrue(set(runner.comparator_runner.SOURCE_FILES) < set(runner.SOURCE_FILES))
        self.assertTrue(all(Path(runner.__file__).with_name(name).is_file() for name in runner.SOURCE_FILES))

    def test_no_earlier_epoch_fallback(self):
        candidates = [{"epoch": n, "gates": {"pass": n < 3}} for n in (1, 2, 3)]
        self.assertIsNone(runner.select_candidate(candidates))
        candidates[2]["gates"]["pass"] = True
        self.assertIs(runner.select_candidate(candidates), candidates[2])
        candidates[2]["gates"]["pass"] = 1
        with self.assertRaises(ValueError):
            runner.select_candidate(candidates)
        with self.assertRaises(ValueError):
            runner.select_candidate(candidates[:2])

    def test_matching_strings_cannot_hide_changed_generated_tokens(self):
        original = [{"id": str(i), "output": "Same", "generatedTokenIds": [1, 2]} for i in range(48)]
        altered = deepcopy(original)
        altered[12]["generatedTokenIds"] = [1, 3]
        with self.assertRaises(ValueError):
            runner.assert_identical_outputs(original, altered)
        with self.assertRaises(ValueError):
            runner.assert_identical_outputs(original[:47], original[:47])

    def test_loss_recovery_is_separate_from_eligibility(self):
        def metrics(value):
            return {"targetTokenLoss": value, "slices": {k: {"targetTokenLoss": value} for k in ("supported", "insufficient")}}
        history = [{"epoch": epoch, "examples": [event() for _ in range(300)]} for epoch in (1, 2, 3)]
        partial = runner.loss_recovery(history, metrics(1.7), metrics(3.9), metrics(2.0))
        self.assertTrue(partial["improvedOverComparator"])
        self.assertFalse(partial["fullParentLossRecovery"])
        self.assertTrue(partial["doesNotAlterEligibility"])
        self.assertEqual(partial["trainingCEByEpoch"][0]["chosenTokenMeanCE"], 2)
        recovered = runner.loss_recovery(history, metrics(1.7), metrics(3.9), metrics(1.7))
        self.assertTrue(recovered["fullParentLossRecovery"])

    def test_comparator_manifest_cannot_escape_root(self):
        for name in ("../outside", "a/../../outside", "C:/outside", "C:outside", "a\\outside"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                runner.bound_file(Path.cwd(), name)

    def test_windows_drive_paths_are_rejected_even_with_posix_path_rules(self):
        # A POSIX host treats drive-qualified strings as relative paths. The
        # manifest boundary must reject them before filesystem access anyway.
        for name in ("C:/outside", "C:outside", "a/file:stream"):
            with self.subTest(name=name), patch.object(runner, "Path", PurePosixPath), \
                    patch.object(runner, "safe_path") as check, self.assertRaises(ValueError):
                runner.bound_file(Path.cwd(), name)
            check.assert_not_called()

    def test_supervisor_terminates_and_reaps_own_process(self):
        child = Mock(pid=123)
        child.poll.return_value = None
        child.wait.side_effect = [runner.subprocess.TimeoutExpired("fixture", 10), 0]
        with patch.object(runner.os, "killpg", create=True) as kill, patch.object(runner.signal, "SIGKILL", 9, create=True):
            runner.stop_owned_process(child)
        self.assertEqual(kill.call_count, 2)
        self.assertEqual(child.wait.call_count, 2)


if __name__ == "__main__":
    unittest.main()
