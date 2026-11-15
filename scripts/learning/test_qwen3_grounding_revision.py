"""Revision contracts without GPU execution or final-case access."""
import copy
import hashlib
from pathlib import Path
import unittest
from unittest.mock import patch

import train_qwen3_4b_research as initial
import train_qwen3_grounding_revision as revision


def training_fixture():
    result = []
    for subject in ("math", "reading", "English", "science", "history"):
        for context in range(40):
            source = f"Original fixture {subject} context {context} records one detail."
            for question in range(3):
                absent = question >= (1 if context % 2 else 2)
                quote = "insufficient" if absent else "records one detail"
                result.append({"id": f"fixture-{subject}-{context}-{question}",
                    "subject": subject, "contextId": f"fixture-{subject}-{context}",
                    "source": source, "question": f"Which evidence requirement {question} applies?",
                    "target": f"EVIDENCE: {quote}\nNEXT: What evidence could establish this detail?",
                    "expectedAbstention": absent, "acceptedQuotes": [] if absent else [quote],
                    "nextStepAnchors": ["evidence"]})
    return result


class TokenizerFixture:
    def __init__(self, length=5):
        self.length = length
        self.systems = []

    def apply_chat_template(self, messages, **kwargs):
        self.systems.append(messages[0]["content"])
        return list(range(self.length)) if messages[-1]["role"] == "assistant" else [0, 1]


class RevisionContracts(unittest.TestCase):
    def setUp(self):
        self.development = revision.development_rows()
        self.records = [{"id": row["id"], "output": row["target"], "targetTokenLoss": 1.0,
                         "targetTokens": 12, "diagnostics": revision.score(row["target"], row),
                         "generatedTokenIds": [1, 2]} for row in self.development]

    def test_original_helper_settings_and_development_remain_unchanged(self):
        self.assertEqual(initial.SETTINGS["learningRate"], .00005)
        self.assertEqual(initial.SETTINGS["seed"], 59177)
        self.assertEqual(initial.SETTINGS["maxSequence"], 512)
        self.assertEqual(revision.SETTINGS["learningRate"], .00002)
        self.assertEqual(revision.SETTINGS["seed"], 69177)
        self.assertEqual(revision.canonical_hash(self.development), initial.DATA_HASHES["development"])

    def test_revised_system_is_explicit_and_preserves_original_for_reproduction(self):
        self.assertTrue(revision.SYSTEM.startswith(revision.ORIGINAL_SYSTEM))
        self.assertNotEqual(revision.SYSTEM_HASH, initial.SYSTEM_HASH)
        tokenizer = TokenizerFixture()
        revision.token_ids(tokenizer, self.development[0])
        revision.token_ids(tokenizer, self.development[0], revision.ORIGINAL_SYSTEM)
        self.assertEqual(tokenizer.systems, [revision.SYSTEM, revision.SYSTEM, revision.ORIGINAL_SYSTEM, revision.ORIGINAL_SYSTEM])

    def test_600_independent_context_contrasts_are_required(self):
        train = training_fixture()
        revision.validate_training(train, self.development)
        for altered in (train[:-1], train + [train[0]]):
            with self.assertRaises(ValueError):
                revision.validate_training(altered, self.development)
        altered = copy.deepcopy(train)
        altered[0]["source"] = altered[3]["source"]
        with self.assertRaisesRegex(ValueError, "contexts"):
            revision.validate_training(altered, self.development)

    def test_subject_answerability_balance_is_required(self):
        train = training_fixture()
        train[0]["expectedAbstention"] = True
        with self.assertRaisesRegex(ValueError, "balance"):
            revision.validate_training(train, self.development)

    def test_new_token_budget_preserves_assistant_mask_and_rejects_truncation(self):
        item = revision.token_ids(TokenizerFixture(length=700), self.development[0])
        self.assertEqual(item["labels"][:2], [-100, -100])
        self.assertEqual(item["targetTokens"], 698)
        with self.assertRaisesRegex(ValueError, "Truncation"):
            revision.token_ids(TokenizerFixture(length=769), self.development[0])

    def test_lexical_diagnostics_unchanged_and_not_eligibility_gate(self):
        metrics = revision.aggregate(self.records, self.development)
        original = initial.aggregate(self.records, self.development)
        self.assertEqual(metrics["counts"], original["counts"])
        candidate = copy.deepcopy(metrics)
        candidate["counts"]["groundedCasePass"] = 0
        self.assertTrue(all(revision.gates(metrics, candidate).values()))
        self.assertEqual(metrics["slices"]["supported"]["cases"], 24)
        self.assertEqual(metrics["slices"]["insufficient"]["cases"], 24)

    def test_formal_95_gate_requires_46_of_48(self):
        base = revision.aggregate(self.records, self.development)
        for name in ("correctAnswerability", "exactQuoteOrWarrantedAbstention", "twoLinesAndOneQuestion"):
            candidate = copy.deepcopy(base)
            candidate["formalCounts"][name] = 45
            self.assertFalse(all(revision.gates(base, candidate).values()))
            candidate["formalCounts"][name] = 46
            self.assertTrue(all(revision.gates(base, candidate).values()))

    def test_no_unsupported_answer_even_if_95_thresholds_met(self):
        base = revision.aggregate(self.records, self.development)
        candidate = copy.deepcopy(base)
        candidate["formalCounts"]["unsupportedAnswer"] = 1
        self.assertFalse(revision.gates(base, candidate)["zeroUnsupportedAnswers"])

    def test_loss_must_not_regress_against_untouched_base(self):
        base = revision.aggregate(self.records, self.development)
        candidate = copy.deepcopy(base)
        candidate["targetTokenLoss"] = 1.001
        self.assertFalse(revision.gates(base, candidate)["lossNonRegressionAgainstUntouchedBase"])
        candidate["targetTokenLoss"] = float("nan")
        with self.assertRaises(ValueError):
            revision.gates(base, candidate)

    def test_exact_quote_is_not_warranted_on_insufficient_case(self):
        row_index = next(index for index, row in enumerate(self.development) if row["expectedAbstention"])
        row = self.development[row_index]
        output = f"EVIDENCE: {row['source']}\nNEXT: What evidence could support this?"
        self.records[row_index].update(output=output, diagnostics=revision.score(output, row))
        metrics = revision.aggregate(self.records, self.development)
        self.assertEqual(metrics["formalCounts"]["exactQuoteOrWarrantedAbstention"], 47)
        self.assertEqual(metrics["formalCounts"]["unsupportedAnswer"], 1)

    def test_parent_reproduction_requires_all_ids_outputs_and_token_ids(self):
        revision.assert_identical_outputs(self.records, copy.deepcopy(self.records))
        for key, value in (("id", "changed"), ("output", "different"), ("generatedTokenIds", [2, 1])):
            changed = copy.deepcopy(self.records)
            changed[0][key] = value
            with self.assertRaises(ValueError):
                revision.assert_identical_outputs(self.records, changed)
        with self.assertRaises(ValueError):
            revision.assert_identical_outputs(self.records, self.records[:-1])

    def test_different_parent_run_or_changed_report_is_rejected_before_verification(self):
        for path in (Path("qwen3-run-other"), Path("qwen3-run-006")):
            with patch.object(revision, "sha256", return_value="modified"):
                with self.assertRaisesRegex(ValueError, "immutable run-006"):
                    revision.parent_evidence(path)

    def test_full_independent_audit_required_and_bound_to_exact_rows(self):
        train = training_fixture()
        audit = {"schema": "diana-qwen3-training-revision-audit-v1", "approvedForTraining": True,
            "independentReviewer": True, "educatorReviewed": False, "unresolvedFindings": [],
            "trainingCanonicalSha256": revision.canonical_hash(train),
            "sourceSha256": {name: "expected" for name in revision.DATA_MODULES},
            "caseReviews": [{"id": row["id"], "passed": True} for row in train],
            "evidenceFiles": {str(Path(__file__).resolve()): "expected"}}
        with patch.object(revision, "sha256", return_value="expected"):
            revision.validate_audit(audit, train)
            for key, value in (("caseReviews", audit["caseReviews"][:-1]), ("educatorReviewed", True),
                               ("trainingCanonicalSha256", "other"), ("independentReviewer", False),
                               ("unresolvedFindings", ["open finding"])):
                changed = {**audit, key: value}
                with self.subTest(key=key), self.assertRaises(ValueError):
                    revision.validate_audit(changed, train)

    def test_no_fallback_and_no_selection_before_both_epochs(self):
        metrics = revision.aggregate(self.records, self.development)
        candidates = [{"epoch": e, "metrics": metrics, "gates": {"zeroUnsupportedAnswers": False}} for e in (1, 2)]
        self.assertIsNone(revision.select_candidate(candidates))
        with self.assertRaises(ValueError):
            revision.select_candidate(candidates[:1])
        for candidate in candidates:
            candidate["gates"] = revision.gates(metrics, metrics)
        self.assertEqual(revision.select_candidate(candidates)["epoch"], 1)

    def test_scoped_source_has_no_final_loader_or_initial_module_mutation(self):
        import ast
        tree = ast.parse(Path(revision.__file__).read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                self.assertNotIn("evaluation", node.module or "")
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    self.assertFalse(isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and target.value.id == "initial")


if __name__ == "__main__":
    unittest.main()
