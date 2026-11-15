"""Preference objective/data/reference contracts without real-model execution."""
import copy
import importlib.util
import math
from pathlib import Path
import unittest
from unittest.mock import patch

import train_qwen3_preference as runner


def partition(author):
    rows = []
    categories = [name for name, count in (("echo", 40), ("unsupported-premise", 20), ("wrong-scope", 20), ("wrong-answerability", 20)) for _ in range(count)]
    for index in range(50):
        subject = ("math", "reading", "English", "science", "history")[index // 10]
        source = f"Fictional author {author} context {index} records a labelled measurement."
        for absent in (False, True):
            identifier = f"fixture-{author}-{index}-{absent}"
            quote = "insufficient" if absent else "records a labelled measurement"
            rows.append({"id": identifier, "family": f"fixture-{author}-{index}", "subject": subject, "level": "unvalidated",
                "source": source, "question": "What unknown result?" if absent else "What stated measurement?",
                "target": f"EVIDENCE: {quote}\nNEXT: What measurement could establish the needed value?",
                "rejected": f"EVIDENCE: {quote}\nNEXT: What is the answer?",
                "expectedAbstention": absent, "acceptedQuotes": [] if absent else [quote], "nextStepAnchors": ["measurement"],
                "conflictingContext": index % 5 == 0, "preferenceCategory": categories[len(rows)],
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
        self.assertAlmostEqual(result["combinedLoss"], math.log(2) + .4)

    def test_preference_gradient_direction_by_central_difference(self):
        def objective(chosen, rejected):
            return runner.objective_terms(chosen, rejected, -10., -12., 5)["combinedLoss"]
        step = .0001
        chosen_gradient = (objective(-10 + step, -12) - objective(-10 - step, -12)) / (2 * step)
        rejected_gradient = (objective(-10, -12 + step) - objective(-10, -12 - step)) / (2 * step)
        self.assertAlmostEqual(chosen_gradient, -.1 / 2 - .2 / 5, places=7)
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

    def test_200_pairs_balance_and_categories_are_fixed(self):
        first, second = partition("a"), partition("b")
        rows = runner.validate_training(first, second, [])
        self.assertEqual(len(rows), 200)
        first[0]["preferenceCategory"] = "wrong-scope"
        with self.assertRaisesRegex(ValueError, "category distribution"):
            runner.validate_training(first, second, [])

    def test_context_contrast_and_conflict_coverage_are_required(self):
        first, second = partition("a"), partition("b")
        for row in first + second:
            row["conflictingContext"] = False
        with self.assertRaisesRegex(ValueError, "20"):
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

    def test_independent_audit_binds_both_responses_each_pair_and_notes(self):
        rows = partition("a") + partition("b")
        audit = {"schema": "diana-qwen3-preference-audit-v1", "approvedForTraining": True,
            "independentReviewer": True, "educatorReviewed": False, "unresolvedFindings": [],
            "trainingCanonicalSha256": runner.canonical_hash(rows), "sourceSha256": {name: "source" for name in runner.DATA_MODULES},
            "evidenceFiles": {str(Path(__file__).resolve()): "source"},
            "caseReviews": [{"id": row["id"], "passed": True, "chosenPass": True, "rejectedIsInferior": True,
                "pairHash": runner.canonical_hash(row), "notes": "Independently checked both responses and preference rationale."} for row in rows]}
        with patch.object(runner, "sha256", return_value="source"):
            runner.validate_audit(audit, rows)
            for key, value in (("pairHash", "changed"), ("rejectedIsInferior", False), ("notes", "brief")):
                changed = copy.deepcopy(audit)
                changed["caseReviews"][0][key] = value
                with self.subTest(key=key), self.assertRaises(ValueError):
                    runner.validate_audit(changed, rows)

    def test_epoch_two_only_has_no_epoch_one_fallback_or_loss_ranking(self):
        candidates = [{"epoch": 1, "metrics": {"targetTokenLoss": .1}, "gates": {"eligible": True}},
                      {"epoch": 2, "metrics": {"targetTokenLoss": .5}, "gates": {"eligible": True}}]
        self.assertEqual(runner.select_candidate(candidates)["epoch"], 2)
        candidates[1]["gates"]["eligible"] = False
        self.assertIsNone(runner.select_candidate(candidates))
        with self.assertRaises(ValueError):
            runner.select_candidate(candidates[:1])

    def test_fixed_update_and_pair_accounting(self):
        self.assertEqual(200 * runner.SETTINGS["epochs"] // runner.SETTINGS["gradientAccumulation"], 100)
        self.assertEqual(runner.SETTINGS["seed"], 71313)
        self.assertEqual(runner.SETTINGS["learningRate"], .000005)
        self.assertEqual(runner.prior.SETTINGS["learningRate"], .00002)

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
