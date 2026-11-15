"""Contract tests for the isolated original-synthetic research path (no weights)."""
import json
from pathlib import Path
import socket
import tempfile
import unittest

from prepare_synthetic_lora import final_rows, prepare, rows, sha
from train_synthetic_lora import MODEL_FILE_HASHES, deny_network, diagnostics, validate_data, validate_model
from summarize_synthetic_lora import assess_research_result


class SyntheticResearchContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        prepare(self.root, False)

    def tearDown(self):
        self.temp.cleanup()

    def test_original_fixtures_have_disjoint_families_and_real_source_quotes(self):
        train, heldout = validate_data(self.root)
        self.assertEqual((len(train), len(heldout)), (32, 8))
        self.assertFalse({row["family"] for row in train} & {row["family"] for row in heldout})
        for row in train + heldout:
            score = diagnostics(row["messages"][-1]["content"], row["source"])
            self.assertTrue(score["twoLineFormat"] and score["exactSourceQuoteOrAbstention"] and score["oneQuestion"])

    def test_self_rehashed_real_or_modified_data_is_rejected(self):
        path = self.root / "train.jsonl"
        data = [json.loads(line) for line in path.read_text().splitlines()]
        data[0]["source"] = "A substituted student response or textbook passage."
        path.write_text("\n".join(json.dumps(row) for row in data), encoding="utf-8")
        manifest_path = self.root / "dataset-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["files"]["train.jsonl"] = sha(path)
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, "code-pinned"):
            validate_data(self.root)

    def test_subsequent_test_is_separate_and_discloses_its_timing(self):
        next_root = self.root / "subsequent"
        prepare(next_root, False, "subsequent-test")
        train, heldout = validate_data(next_root)
        self.assertEqual(heldout, final_rows())
        earlier_families = {row["family"] for row in rows()[0] + rows()[1]}
        self.assertFalse(earlier_families & {row["family"] for row in heldout})
        self.assertTrue(json.loads((next_root / "dataset-manifest.json").read_text())["testAuthoredAfterInitialDevelopmentResult"])
        for row in heldout:
            score = diagnostics(row["messages"][-1]["content"], row["source"])
            self.assertTrue(score["twoLineFormat"] and score["exactSourceQuoteOrAbstention"] and score["oneQuestion"])

    def test_forged_review_or_production_eligibility_is_rejected(self):
        path = self.root / "dataset-manifest.json"
        manifest = json.loads(path.read_text())
        manifest["educatorReviewed"] = True
        path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, "status"):
            validate_data(self.root)

    def test_exact_quote_check_rejects_invented_evidence(self):
        score = diagnostics("EVIDENCE: invented claim\nNEXT: Which fact matters?", "A source with different facts.")
        self.assertTrue(score["twoLineFormat"])
        self.assertFalse(score["exactSourceQuoteOrAbstention"])
        self.assertFalse(diagnostics("EVIDENCE: fact\nNEXT: First? Second?", "fact")["oneQuestion"])

    def test_network_denial_blocks_and_restores_sockets(self):
        original = socket.create_connection
        with deny_network():
            with self.assertRaisesRegex(RuntimeError, "Networking is disabled"):
                socket.create_connection(("127.0.0.1", 1))
            with socket.socket() as connection:
                with self.assertRaisesRegex(RuntimeError, "Networking is disabled"):
                    connection.connect(("127.0.0.1", 1))
        self.assertIs(socket.create_connection, original)

    def test_changed_model_revision_is_rejected_before_file_loading(self):
        (self.root / "model-provenance.json").write_text(json.dumps({"model": "Qwen/Qwen2.5-0.5B-Instruct", "license": "apache-2.0", "revision": "0" * 40}))
        with self.assertRaisesRegex(ValueError, "immutable"):
            validate_model(self.root)

    def test_self_rehashed_tokenizer_is_rejected_before_file_loading(self):
        files = {name: {"sha256": digest} for name, digest in MODEL_FILE_HASHES.items()}
        files["tokenizer.json"]["sha256"] = "0" * 64
        (self.root / "model-provenance.json").write_text(json.dumps({"model": "Qwen/Qwen2.5-0.5B-Instruct", "license": "apache-2.0", "revision": "7ae557604adf67be50417f59c2c2f167def9a775", "files": files}))
        with self.assertRaisesRegex(ValueError, "tokenizer bytes"):
            validate_model(self.root)

    def test_lower_loss_does_not_override_false_abstention_regression(self):
        verdict = assess_research_result(1.5, 1.1, 0, 2, 6)
        self.assertEqual(verdict["nonRegressionVerdict"], "rejected")
        self.assertFalse(verdict["productionEligible"])

    def test_passing_diagnostics_never_authorizes_production(self):
        verdict = assess_research_result(1.5, 1.1, 0, 0, 6)
        self.assertEqual(verdict["nonRegressionVerdict"], "passed-limited-diagnostics")
        self.assertFalse(verdict["productionEligible"])
        with self.assertRaisesRegex(ValueError, "Finite"):
            assess_research_result(1.5, float("nan"), 0, 0, 6)


if __name__ == "__main__":
    unittest.main()
