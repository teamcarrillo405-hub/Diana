"""Preference objective/data/reference contracts without real-model execution."""
import copy
import importlib.util
import math
from pathlib import Path
import unittest
import json
import shutil
import uuid
from contextlib import contextmanager
from unittest.mock import patch

import train_qwen3_evidence_integrity as runner


@contextmanager
def fixture_directory():
    # Python 3.14's Windows temp-directory ACL can exclude the sandbox identity.
    # Use an ordinary, isolated workspace directory and verify cleanup's scope.
    parent = Path(__file__).resolve().parent
    path = parent / (".integrity-test-" + uuid.uuid4().hex)
    path.mkdir()
    try:
        yield path
    finally:
        resolved = path.resolve()
        if resolved.parent != parent or not resolved.name.startswith(".integrity-test-"):
            raise ValueError("Fixture cleanup escaped the test directory")
        shutil.rmtree(resolved)


def partition(author):
    rows = []
    categories = [name for name in runner.CATEGORIES for _ in range(30)]
    for index in range(75):
        subject = ("math", "reading", "English", "science", "history")[index // 15]
        source = f"Fictional author {author} context {index} records a labelled measurement."
        for absent in (False, True):
            identifier = f"fixture-{author}-{index}-{absent}"
            quote = "insufficient" if absent else "records a labelled measurement"
            rows.append({"id": identifier, "family": f"fixture-{author}-{index}", "subject": subject, "level": "unvalidated",
                "source": source, "question": "What unknown result?" if absent else "What stated measurement?",
                "target": f"EVIDENCE: {quote}\nNEXT: What measurement could establish the needed value?",
                "rejected": f"EVIDENCE: {quote}\nNEXT: What is the answer?",
                "expectedAbstention": absent, "acceptedQuotes": [] if absent else [quote], "nextStepAnchors": ["measurement"],
                "conflictingContext": index % 5 == 0, "sourceInstructionPresent": index % 5 == 1, "preferenceCategory": categories[len(rows)],
                "preferenceReason": "The preferred question specifies an operation and the datum sought."})
    return rows


class FakeTokenizer:
    def apply_chat_template(self, messages, **kwargs):
        if messages[-1]["role"] != "assistant":
            return [1, 3, 4]
        return [1, 3, 4, 7, 8, 2] if "needed value" in messages[-1]["content"] else [1, 3, 4, 9, 10, 11, 2]


class PreferenceContracts(unittest.TestCase):
    def test_standard_dpo_reference_value_and_chosen_ce(self):
        result = runner.objective_terms(-10., -12., -10., -12., 5)
        self.assertAlmostEqual(result["dpoLoss"], math.log(2))
        self.assertAlmostEqual(result["chosenTokenMeanCE"], 2.)
        self.assertAlmostEqual(result["combinedLoss"], math.log(2) + 1.0)

    def test_preference_gradient_direction_by_central_difference(self):
        def objective(chosen, rejected):
            return runner.objective_terms(chosen, rejected, -10., -12., 5)["combinedLoss"]
        step = .0001
        chosen_gradient = (objective(-10 + step, -12) - objective(-10 - step, -12)) / (2 * step)
        rejected_gradient = (objective(-10, -12 + step) - objective(-10, -12 - step)) / (2 * step)
        self.assertAlmostEqual(chosen_gradient, -.1 / 2 - .5 / 5, places=7)
        self.assertAlmostEqual(rejected_gradient, .1 / 2, places=7)
        self.assertLess(chosen_gradient, 0)
        self.assertGreater(rejected_gradient, 0)

    def test_dpo_uses_sequence_sums_and_only_sft_is_length_normalized(self):
        short = runner.objective_terms(-5., -9., -7., -9., 2)
        long = runner.objective_terms(-5., -9., -7., -9., 20)
        self.assertEqual(short["dpoLoss"], long["dpoLoss"])
        self.assertAlmostEqual(short["chosenTokenMeanCE"], long["chosenTokenMeanCE"] * 10)
        self.assertLess(short["dpoLoss"], math.log(2))

    def test_reference_changes_affect_margin_but_never_receive_updates(self):
        original = runner.objective_terms(-5., -9., -7., -9., 5)
        changed = runner.objective_terms(-5., -9., -3., -9., 5)
        self.assertGreater(changed["dpoLoss"], original["dpoLoss"])

    def test_extreme_margins_stay_finite_and_bad_inputs_fail(self):
        for values in ((-1., -100000., -100000., -1.), (-100000., -1., -1., -100000.)):
            self.assertTrue(math.isfinite(runner.objective_terms(*values, 5)["combinedLoss"]))
        for value in (float("nan"), float("inf"), 1.0):
            with self.assertRaises(ValueError):
                runner.objective_terms(value, -1., -1., -1., 2)
        with self.assertRaises(ValueError):
            runner.objective_terms(-1., -1., -1., -1., 0)

    def test_pair_mask_excludes_identical_prompt_and_keeps_both_targets(self):
        pair = runner.pair_tokens(FakeTokenizer(), partition("a")[0])
        self.assertEqual(pair["chosen"]["prefix"], pair["rejected"]["prefix"])
        self.assertEqual(pair["chosen"]["labels"], [-100, -100, -100, 7, 8, 2])
        self.assertEqual(pair["rejected"]["labels"], [-100, -100, -100, 9, 10, 11, 2])

    def test_300_pairs_balance_and_categories_are_fixed(self):
        first, second = partition("a"), partition("b")
        rows = runner.validate_training(first, second, [])
        self.assertEqual(len(rows), 300)
        first[0]["preferenceCategory"] = "task-scope"
        with self.assertRaisesRegex(ValueError, "category distribution"):
            runner.validate_training(first, second, [])

    def test_context_contrast_and_conflict_coverage_are_required(self):
        first, second = partition("a"), partition("b")
        for row in first + second:
            row["conflictingContext"] = False
        with self.assertRaisesRegex(ValueError, "30"):
            runner.validate_training(first, second, [])
        first, second = partition("a"), partition("b")
        first[0]["question"] = first[1]["question"]
        with self.assertRaisesRegex(ValueError, "distinct supported"):
            runner.validate_training(first, second, [])

    def cache_fixture(self):
        rows = partition("a") + partition("b")
        pairs = [runner.pair_tokens(FakeTokenizer(), row) for row in rows]
        records = [{"id": pair["id"], "chosenTokens": 3, "rejectedTokens": 4,
                    "chosenSumLogp": -3., "rejectedSumLogp": -8., "chosenTokenLogps": [-1.] * 3,
                    "rejectedTokenLogps": [-2.] * 4} for pair in pairs]
        cache = {"schema": "diana-qwen3-frozen-preference-reference-v1", "parentAdapterSha256": "parent",
            "protocolSha256": "protocol", "pairTokenizationSha256": runner.canonical_hash(pairs),
            "systemSha256": runner.SYSTEM_HASH, "createdBeforeOptimizer": True, "pairs": records}
        return pairs, cache

    def test_reference_cache_binds_parent_prompt_protocol_sequences_and_order(self):
        pairs, cache = self.cache_fixture()
        runner.validate_reference_cache(cache, pairs, "parent", "protocol")
        for key, value in (("parentAdapterSha256", "different"), ("protocolSha256", "different"),
                           ("systemSha256", "different"), ("createdBeforeOptimizer", False), ("pairTokenizationSha256", "different")):
            with self.subTest(key=key), self.assertRaises(ValueError):
                runner.validate_reference_cache({**cache, key: value}, pairs, "parent", "protocol")
        cache["pairs"][0]["id"] = "different"
        with self.assertRaisesRegex(ValueError, "identity"):
            runner.validate_reference_cache(cache, pairs, "parent", "protocol")

    def test_reference_cache_rejects_rehashed_sum_token_count_and_nonfinite_fabrication(self):
        pairs, original = self.cache_fixture()
        for key, value in (("chosenSumLogp", -4.), ("chosenTokens", 2), ("chosenTokenLogps", [float("nan")] * 3)):
            cache = copy.deepcopy(original)
            cache["pairs"][0][key] = value
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "accounting"):
                runner.validate_reference_cache(cache, pairs, "parent", "protocol")

    def audit_fixture(self, directory):
        rows = partition("a") + partition("b")
        reviews = [{"id": row["id"], "passed": True, "chosenPass": True, "rejectedIsInferior": True,
                    "pairHash": runner.canonical_hash(row), "notes": "Independently checked both responses and preference rationale."} for row in rows]
        audit = {"schema": "diana-qwen3-evidence-integrity-audit-v1", "approvedForTraining": True,
            "independentReviewer": True, "educatorReviewed": False, "unresolvedFindings": [],
            "trainingCanonicalSha256": runner.canonical_hash(rows), "sourceSha256": {name: "source" for name in runner.DATA_MODULES},
            "evidenceFiles": {}, "caseReviews": reviews}
        for i in range(2):
            path = Path(directory) / f"independent-{i}.json"
            proof = {"reviewerId": f"reviewer-{i}", "approvedForTraining": True,
                "independentReviewer": True, "educatorReviewed": False, "unresolvedFindings": [],
                "sourceSha256": "source", "canonicalRowsSha256": runner.canonical_hash(rows[i*150:(i+1)*150]),
                "caseReviews": reviews[i*150:(i+1)*150]}
            path.write_text(json.dumps(proof), encoding="utf-8")
            audit["evidenceFiles"][str(path.resolve())] = "source"
        return rows, audit

    def test_independent_audit_binds_both_responses_each_pair_and_notes(self):
        with fixture_directory() as directory, patch.object(runner, "sha256", return_value="source"):
            rows, audit = self.audit_fixture(directory)
            runner.validate_audit(audit, rows)
            for key, value in (("pairHash", "changed"), ("rejectedIsInferior", False), ("notes", "brief")):
                changed = copy.deepcopy(audit)
                changed["caseReviews"][0][key] = value
                with self.subTest(key=key), self.assertRaises(ValueError):
                    runner.validate_audit(changed, rows)
            changed = copy.deepcopy(audit)
            changed["caseReviews"] = changed["caseReviews"][:-1]
            with self.assertRaisesRegex(ValueError, "All 300"):
                runner.validate_audit(changed, rows)

    def test_independent_partition_receipts_cannot_reuse_reviewer_or_omit_case(self):
        with fixture_directory() as directory, patch.object(runner, "sha256", return_value="source"):
            rows, audit = self.audit_fixture(directory)
            path = Path(directory) / "independent-1.json"
            proof = json.loads(path.read_text())
            proof["reviewerId"] = "reviewer-0"
            path.write_text(json.dumps(proof))
            with self.assertRaisesRegex(ValueError, "distinct"):
                runner.validate_audit(audit, rows)
            proof["reviewerId"] = "reviewer-1"
            proof["caseReviews"].pop()
            path.write_text(json.dumps(proof))
            with self.assertRaisesRegex(ValueError, "coverage"):
                runner.validate_audit(audit, rows)

    def test_epoch_three_only_has_no_earlier_fallback_or_loss_ranking(self):
        candidates = [{"epoch": e, "metrics": {"targetTokenLoss": e / 10}, "gates": {"eligible": True}} for e in (1, 2, 3)]
        self.assertEqual(runner.select_candidate(candidates)["epoch"], 3)
        candidates[2]["gates"]["eligible"] = False
        self.assertIsNone(runner.select_candidate(candidates))
        with self.assertRaises(ValueError):
            runner.select_candidate(candidates[:2])
        for invalid in ({}, {"eligible": 1}, {"eligible": "true"}):
            candidates[2]["gates"] = invalid
            with self.assertRaises(ValueError):
                runner.select_candidate(candidates)

    def test_fixed_update_and_pair_accounting(self):
        self.assertEqual(300 * runner.SETTINGS["epochs"] // runner.SETTINGS["gradientAccumulation"], 225)
        self.assertEqual(300 * runner.SETTINGS["epochs"], 900)
        self.assertEqual(runner.SETTINGS["seed"], 81173)
        self.assertEqual(runner.SETTINGS["learningRate"], .00001)
        self.assertEqual(runner.SETTINGS["chosenSFTWeight"], .5)
        self.assertEqual(runner.SETTINGS["selectedEpochOnly"], 3)
        self.assertEqual(runner.SETTINGS["maxSequence"], 768)
        self.assertEqual(runner.SETTINGS["maxNewTokens"], 128)
        self.assertEqual(runner.SETTINGS["maxSeconds"], 7200)

    def test_source_instruction_contexts_are_required_and_labels_cannot_disagree(self):
        first, second = partition("a"), partition("b")
        for row in first + second:
            row["sourceInstructionPresent"] = False
        with self.assertRaisesRegex(ValueError, "30.*source-instruction"):
            runner.validate_training(first, second, [])
        first, second = partition("a"), partition("b")
        first[0]["sourceInstructionPresent"] = not first[1]["sourceInstructionPresent"]
        with self.assertRaisesRegex(ValueError, "annotations disagree"):
            runner.validate_training(first, second, [])

    def test_runtime_contract_preserves_exact_noncanonical_bytes(self):
        with fixture_directory() as directory:
            source, target = Path(directory) / "approved.json", Path(directory) / "frozen.json"
            raw = b'{  "approved": true, "description": "fixture" }\r\n'
            source.write_bytes(raw)
            runner.copy_runtime_contract(source, target)
            self.assertEqual(target.read_bytes(), raw)
            self.assertEqual(runner.sha256(source), runner.sha256(target))
            self.assertNotEqual(raw, (json.dumps(json.loads(raw), indent=2) + "\n").encode())

    def test_only_supplied_parent_hashes_and_epoch_two_can_be_used(self):
        import verify_qwen3_preference_v2 as verifier
        parent = Path("qwen3-run-008")
        def fake_digest(path):
            return {"report.json": runner.PARENT_REPORT_HASH, "protocol.json": runner.PARENT_PROTOCOL_HASH}.get(path.name, "fixture")
        checked = {"verified": True, "selectedEpoch": 2, "automaticEligibilityPassed": True, "testOpened": False}
        with patch.object(runner, "sha256", side_effect=fake_digest), patch.object(verifier, "verify", return_value=checked):
            proof = runner.parent_evidence(parent)
            self.assertEqual(proof["epoch"], 2)
            self.assertIn("epoch-2-development.jsonl", proof["files"])
            with self.assertRaises(ValueError):
                runner.parent_evidence(Path("qwen3-run-007"))
            checked["selectedEpoch"] = 1
            with self.assertRaises(ValueError):
                runner.parent_evidence(parent)

    def test_source_inventory_extends_frozen_parent_with_independent_verifiers(self):
        required = set(runner.preference_parent.SOURCE_FILES) | {
            "verify_qwen3_preference_v2.py", "verify_qwen3_evidence_integrity.py",
            "qwen3_evidence_integrity_contract.py", "qwen3_evidence_integrity_metrics.py",
            "train_qwen3_evidence_integrity.py", *runner.DATA_MODULES}
        self.assertEqual(set(runner.SOURCE_FILES), required)
        self.assertEqual(len(runner.SOURCE_FILES), len(required))

    def ancestry_fixture(self, directory):
        names = list(runner.PRIOR_TRAINING_COUNTS)
        for index, (name, count) in enumerate(runner.PRIOR_TRAINING_COUNTS.items()):
            root = Path(directory) / name
            root.mkdir()
            rows = [{"id": f"old-{name}-{i}", "source": f"Old invented {name} source {i}.",
                     "question": f"Old fictional question {i}?"} for i in range(count)]
            protocol = {"parent": {"root": str(Path(directory) / names[index + 1])}} if index + 1 < len(names) else {}
            (root / "train.json").write_text(json.dumps(rows), encoding="utf-8")
            (root / "protocol.json").write_text(json.dumps(protocol), encoding="utf-8")
        return Path(directory) / names[0]

    def test_ancestry_guard_binds_all_1240_prior_pairs_without_copying_case_text(self):
        with fixture_directory() as directory:
            parent = self.ancestry_fixture(directory)
            rows = partition("a") + partition("b")
            receipt = runner.prior_training_overlap(rows, parent)
            self.assertEqual(receipt["priorTrainingPairs"], 1240)
            self.assertEqual([item["trainCount"] for item in receipt["ancestors"]], [200, 600, 440])
            self.assertTrue(receipt["zeroOverlap"])
            self.assertEqual(receipt["newTrainingCanonicalSha256"], runner.canonical_hash(rows))
            self.assertNotIn("Old invented", json.dumps(receipt))
            for item in receipt["ancestors"]:
                self.assertEqual(item["overlapCounts"], {"ids": 0, "sources": 0, "sourceQuestions": 0})
                self.assertEqual(item["trainingSha256"], runner.sha256(Path(item["root"]) / "train.json"))

    def test_ancestry_guard_rejects_id_and_source_overlap_in_each_generation(self):
        with fixture_directory() as directory:
            parent = self.ancestry_fixture(directory)
            original = partition("a") + partition("b")
            for name in runner.PRIOR_TRAINING_COUNTS:
                for key, value in (("id", f"old-{name}-0"), ("source", f"Old invented {name} source 0.")):
                    rows = copy.deepcopy(original)
                    rows[0][key] = value
                    with self.subTest(ancestor=name, overlap=key), self.assertRaisesRegex(ValueError, "overlaps verified ancestor"):
                        runner.prior_training_overlap(rows, parent)

    def test_ancestry_guard_rejects_population_and_parent_path_changes(self):
        with fixture_directory() as directory:
            parent = self.ancestry_fixture(directory)
            rows = partition("a") + partition("b")
            path = parent / "protocol.json"
            original = path.read_text()
            path.write_text(json.dumps({"parent": {"root": str(parent.parent / "unrelated")}}))
            with self.assertRaisesRegex(ValueError, "sibling ancestry"):
                runner.prior_training_overlap(rows, parent)
            path.write_text(original)
            path = parent.parent / "qwen3-run-006" / "train.json"
            path.write_text(json.dumps(json.loads(path.read_text())[:-1]))
            with self.assertRaisesRegex(ValueError, "population"):
                runner.prior_training_overlap(rows, parent)

    @unittest.skipUnless(importlib.util.find_spec("torch"), "Optional tiny tensor test requires existing torch; no installation")
    def test_tensor_objective_matches_scalar_math_and_gradient_direction(self):
        import torch
        chosen, rejected = torch.tensor(-10., requires_grad=True), torch.tensor(-12., requires_grad=True)
        total, dpo, ce, margin = runner.tensor_objective(chosen, rejected, -10., -12., 5)
        expected = runner.objective_terms(-10., -12., -10., -12., 5)
        self.assertAlmostEqual(float(total.detach()), expected["combinedLoss"], places=6)
        total.backward()
        self.assertLess(float(chosen.grad), 0)
        self.assertGreater(float(rejected.grad), 0)


if __name__ == "__main__":
    unittest.main()
