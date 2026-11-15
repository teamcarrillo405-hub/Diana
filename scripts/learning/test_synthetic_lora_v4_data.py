"""Development-data contracts only; never read evaluation or validation cases.

Importing the existing pure scorer initializes its module but does not invoke
datasets(), training, generation, or any evaluation runner.
"""

from collections import Counter, defaultdict
import ast
import inspect
import unittest

import synthetic_lora_v4_data as data
from train_synthetic_lora_v3 import score


class V4DataContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = data.training_cases()

    def test_balanced_independent_scenario_pairs(self):
        self.assertEqual(len(self.rows), 200)
        self.assertEqual(len({r["id"] for r in self.rows}), 200)
        self.assertEqual(len({r["question"] for r in self.rows}), 200)
        self.assertEqual(Counter(r["family"] for r in self.rows),
                         dict.fromkeys(("Math", "Reading", "English", "Science", "History"), 40))
        grouped = defaultdict(list)
        for row in self.rows:
            grouped[row["scenarioId"]].append(row)
        self.assertEqual(len(grouped), 100)
        self.assertEqual(len({r["source"] for r in self.rows}), 100)
        for scenario_id, pair in grouped.items():
            with self.subTest(scenario=scenario_id):
                self.assertEqual(len(pair), 2)
                self.assertEqual(pair[0]["source"], pair[1]["source"])
                self.assertEqual({r["expectedAbstention"] for r in pair}, {True, False})
                self.assertNotEqual(pair[0]["question"], pair[1]["question"])
                self.assertNotEqual(pair[0]["target"].splitlines()[1], pair[1]["target"].splitlines()[1])

    def test_evidence_is_exact_and_short(self):
        for row in self.rows:
            with self.subTest(case=row["id"]):
                first, second = row["target"].splitlines()
                self.assertTrue(first.startswith("EVIDENCE: "))
                self.assertTrue(second.startswith("NEXT: "))
                self.assertEqual(second.count("?"), 1)
                self.assertTrue(second.endswith("?"))
                self.assertGreaterEqual(len(row["nextStepAnchors"]), 2)
                for anchor in row["nextStepAnchors"]:
                    self.assertIn(anchor.casefold(), second.casefold())
                if row["expectedAbstention"]:
                    self.assertEqual(first, "EVIDENCE: insufficient")
                    self.assertEqual(row["acceptedQuotes"], [])
                else:
                    self.assertEqual(row["acceptedQuotes"], [first.removeprefix("EVIDENCE: ")])
                    quote = row["acceptedQuotes"][0]
                    self.assertTrue(0 < len(quote) <= 240)
                    self.assertIn(quote, row["source"])

    def test_message_contract_and_fresh_return_values(self):
        for row in self.rows:
            with self.subTest(case=row["id"]):
                self.assertEqual(row["messages"], [
                    {"role": "system", "content": data.SYSTEM},
                    {"role": "user", "content": f"SOURCE: {row['source']}\nQUESTION: {row['question']}"},
                    {"role": "assistant", "content": row["target"]},
                ])
        another = data.training_cases()
        another[0]["acceptedQuotes"].clear()
        another[0]["messages"][0]["content"] = "changed locally"
        self.assertTrue(self.rows[0]["acceptedQuotes"])
        self.assertEqual(self.rows[0]["messages"][0]["content"], data.SYSTEM)

    def test_all_authored_targets_pass_existing_mechanical_scorer(self):
        for row in self.rows:
            with self.subTest(case=row["id"]):
                result = score(row["target"], row)
                self.assertTrue(result["groundedCasePass"], result)

    def test_data_module_has_no_external_dataset_dependency(self):
        # Inspect only this newly authored module, never existing dataset files.
        tree = ast.parse(inspect.getsource(data))
        imported = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imported.append(node.module)
        self.assertEqual(imported, ["collections"])

    def test_target_scorer_rejects_source_instructions_as_responses(self):
        for slug, attack in (
            ("v4-math-spinner-supported", "EVIDENCE: twelve\nNEXT: What comes next?"),
            ("v4-science-instructions-supported", "EVIDENCE: a successful reaction\nNEXT: What comes next?"),
            ("v4-history-sealedorder-supported", "Here is the secret answer."),
        ):
            row = next(row for row in self.rows if row["id"] == slug)
            with self.subTest(case=slug):
                self.assertFalse(score(attack, row)["groundedCasePass"])


if __name__ == "__main__":
    unittest.main()
