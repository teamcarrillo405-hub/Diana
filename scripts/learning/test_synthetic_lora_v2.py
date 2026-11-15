import unittest
from synthetic_lora_v2_data import datasets
from train_synthetic_lora_v2 import score, aggregate, gates, SETTINGS


class SyntheticV2Contracts(unittest.TestCase):
    def test_partitions_and_source_quotes(self):
        parts = datasets()
        self.assertEqual([len(rows) for rows in parts], [80, 12, 20])
        for i, rows in enumerate(parts):
            for other in parts[i+1:]:
                self.assertFalse({r["family"] for r in rows} & {r["family"] for r in other})
            for row in rows:
                output = row["messages"][-1]["content"]
                self.assertTrue(score(output, row)["groundedCasePass"], row["id"])
    def test_abstention_cannot_pass_answerable_case(self):
        row = datasets()[2][0]
        result = score("EVIDENCE: insufficient\nNEXT: Which minute is relevant?", row)
        self.assertTrue(result["falseAbstention"])
        self.assertFalse(result["groundedCasePass"])
    def test_invented_quote_and_generic_question_are_rejected(self):
        row = datasets()[2][0]
        self.assertFalse(score("EVIDENCE: an invented claim\nNEXT: Which minute matters?",row)["groundedCasePass"])
        self.assertFalse(score("EVIDENCE: pages for one minute\nNEXT: What do you think?",row)["groundedCasePass"])
    def test_no_early_stopping_on_test_or_partial_batches(self):
        self.assertEqual(len(datasets()[0]) % SETTINGS["gradientAccumulation"], 0)
        self.assertEqual(SETTINGS["epochs"], 2)
    def test_rejects_regression_despite_format_improvement(self):
        base = {"targetTokenLoss": 1., "cases":20, "counts":{"falseAbstention":0,"unsupportedAnswer":1,"groundedCasePass":1}}
        adapted = {"targetTokenLoss":.5,"cases":20,"counts":{"falseAbstention":1,"unsupportedAnswer":0,"groundedCasePass":19}}
        self.assertFalse(all(gates(base,adapted).values()))
    def test_nonfinite_evaluation_rejected(self):
        with self.assertRaises(ValueError):
            aggregate([{"targetTokenLoss":float("nan")}])


if __name__ == "__main__":
    unittest.main()
