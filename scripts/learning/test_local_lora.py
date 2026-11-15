"""Contract tests that require no model weights, network, or accelerator."""

from __future__ import annotations

import hashlib
import json
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from compare_local_lora import engineering_checks, validate_evaluation
from train_local_lora import preflight, validate_accumulation_plan
from local_lora_common import (EXPECTED_HELDOUT_CORPUS_SHA256, EXPECTED_HELDOUT_DATA_SHA256,
                               validate_training_export, verify_adapter_integrity, verify_export_attestation,
                               text_fingerprints, verify_train_holdout_separation, verify_current_revocations)

class LocalLoraContractTests(unittest.TestCase):
    def test_partial_gradient_update_is_blocked_before_training(self):
        self.assertEqual(validate_accumulation_plan(32, 4), 8)
        with self.assertRaisesRegex(ValueError, "partial updates"):
            validate_accumulation_plan(33, 4)
        manifest = {"dataSha256": "a" * 64}
        rows = [{} for _ in range(33)]
        with patch("train_local_lora.verify_private_path"), \
             patch("train_local_lora.validate_training_export", return_value=(manifest, rows)), \
             patch("train_local_lora.verify_export_attestation", return_value={"issuedBy": "operator-01", "reviewRecordId": "record-001", "keyFingerprintSha256": "b" * 64}), \
             patch("train_local_lora.verify_current_revocations"), \
             patch("train_local_lora.validate_evaluation", return_value=[]), \
             patch("train_local_lora.verify_train_holdout_separation"), \
             patch("train_local_lora.dependency_status", return_value={}), \
             patch("train_local_lora.cuda_status", return_value={"available": True, "totalMemoryGiB": 24, "bf16Supported": True}):
            result = preflight(Path("dataset"), Path("heldout"), None, Path("trusted.pem"), "b" * 64,
                               Path("revocations.json"), gradient_accumulation=4)
            self.assertIn("training_example_count_must_divide_evenly_by_gradient_accumulation", result["reasons"])

    def test_gated_export_hash_and_count_are_enforced(self):
        directory = Path("synthetic-training")
        data = json.dumps({"sourceText": "A reviewed source about quadratic equations.", "messages": [
            {"role": "system", "content": "Tutor"},
            {"role": "user", "content": json.dumps({"question": "Help", "source": "A reviewed source about quadratic equations."})},
            {"role": "assistant", "content": "Try this"},
        ]})
        manifest = {"version": "diana-local-lora-dataset-v1", "modelId": "Qwen/Qwen3-4B-Instruct-2507",
                    "dataSha256": hashlib.sha256(data.encode()).hexdigest(), "exampleCount": 1,
                    "documentFamilies": ["train-doc"], "templateFamilies": ["train-template"],
                    "heldOutCorpusSha256": EXPECTED_HELDOUT_CORPUS_SHA256,
                    "heldOutEvaluationSha256": EXPECTED_HELDOUT_DATA_SHA256,
                    "trainingPromptFingerprints": [text_fingerprints("Help")],
                    "trainingSourceFingerprints": [text_fingerprints("A reviewed source about quadratic equations.")]}
        def read_text(path, encoding="utf-8"):
            return json.dumps(manifest) if path.name == "manifest.json" else data
        with patch.object(Path, "read_text", read_text), patch("local_lora_common.file_sha256", return_value=manifest["dataSha256"]):
            self.assertEqual(len(validate_training_export(directory)[1]), 1)
        with patch.object(Path, "read_text", read_text), patch("local_lora_common.file_sha256", return_value="0" * 64):
            with self.assertRaisesRegex(ValueError, "no longer matches"):
                validate_training_export(directory)
        manifest["trainingSourceFingerprints"][0] = text_fingerprints("Unrelated source")
        with patch.object(Path, "read_text", read_text), patch("local_lora_common.file_sha256", return_value=manifest["dataSha256"]):
            with self.assertRaisesRegex(ValueError, "fingerprints differ"):
                validate_training_export(directory)

    def test_comparison_rejects_train_holdout_family_overlap(self):
        directory = Path("synthetic-evaluation")
        case = {"id": "one", "documentFamily": "train-doc", "templateFamily": "eval-template",
                "provenance": "authored_engineering_fixture", "source": "A source.", "prompt": "Question",
                "expected": {"answer": None, "abstain": False},
                "promptFingerprints": text_fingerprints("Question"),
                "sourceFingerprints": text_fingerprints("A source."),
                "messages": [{"role": "system", "content": "Tutor"}, {"role": "user", "content": "Question"}]}
        data = json.dumps(case)
        manifest = {"version": "diana-local-lora-evaluation-v1", "caseCount": 1,
                    "dataSha256": hashlib.sha256(data.encode()).hexdigest(), "corpusSha256": EXPECTED_HELDOUT_CORPUS_SHA256}
        training = {"documentFamilies": ["train-doc"], "templateFamilies": ["train-template"],
                    "heldOutEvaluationSha256": manifest["dataSha256"], "heldOutCorpusSha256": EXPECTED_HELDOUT_CORPUS_SHA256,
                    "trainingPromptFingerprints": [{"exact": "c" * 64, "template": "d" * 64}],
                    "trainingSourceFingerprints": [{"exact": "e" * 64, "template": "f" * 64}]}
        def read_text(path, encoding="utf-8"):
            return json.dumps(manifest) if path.name == "manifest.json" else data
        with patch.object(Path, "read_text", read_text), patch("compare_local_lora.file_sha256", return_value=manifest["dataSha256"]):
            with self.assertRaisesRegex(ValueError, "family overlap"):
                validate_evaluation(directory, training)
            case["documentFamily"] = "relabeled-doc"
            training["trainingPromptFingerprints"][0] = text_fingerprints("Question")
            data = json.dumps(case)
            manifest["dataSha256"] = hashlib.sha256(data.encode()).hexdigest()
            training["heldOutEvaluationSha256"] = manifest["dataSha256"]
            with patch("compare_local_lora.file_sha256", return_value=manifest["dataSha256"]):
                with self.assertRaisesRegex(ValueError, "fingerprint overlap"):
                    validate_evaluation(directory, training)
            training["trainingPromptFingerprints"][0] = text_fingerprints("Unrelated prompt")
            case["promptFingerprints"]["unexpected"] = "f" * 64
            data = json.dumps(case)
            manifest["dataSha256"] = hashlib.sha256(data.encode()).hexdigest()
            training["heldOutEvaluationSha256"] = manifest["dataSha256"]
            with patch("compare_local_lora.file_sha256", return_value=manifest["dataSha256"]):
                with self.assertRaisesRegex(ValueError, "differ from actual content"):
                    validate_evaluation(directory, training)

    def test_signed_export_requires_trusted_key_and_unchanged_bytes(self):
        key = Ed25519PrivateKey.generate()
        public = key.public_key()
        pem = public.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        der = public.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        fingerprint = hashlib.sha256(der).hexdigest()
        now = datetime.now(timezone.utc)
        payload = {"version": "diana-local-lora-attestation-v1", "modelId": "Qwen/Qwen3-4B-Instruct-2507",
                   "manifestSha256": "a" * 64, "datasetSha256": "b" * 64,
                   "keyFingerprintSha256": fingerprint, "issuedBy": "trusted-reviewer",
                   "reviewRecordId": "external-record-001", "issuedAt": now.isoformat(),
                   "expiresAt": (now + timedelta(hours=24)).isoformat()}
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
        import base64
        receipt = {"payload": payload, "signatureBase64": base64.b64encode(key.sign(canonical)).decode()}
        directory = Path("synthetic-training")
        with patch.object(Path, "read_bytes", return_value=pem), \
             patch.object(Path, "read_text", side_effect=lambda **_: json.dumps(receipt)), \
             patch("local_lora_common.file_sha256", side_effect=lambda path: payload["manifestSha256"] if path.name == "manifest.json" else payload["datasetSha256"]):
            self.assertEqual(verify_export_attestation(directory, Path("trusted.pem"), fingerprint)["reviewRecordId"], "external-record-001")
            with self.assertRaisesRegex(ValueError, "pinned fingerprint"):
                verify_export_attestation(directory, Path("trusted.pem"), "0" * 64)
            receipt["signatureBase64"] = base64.b64encode(b"forged").decode()
            with self.assertRaisesRegex(ValueError, "signature"):
                verify_export_attestation(directory, Path("trusted.pem"), fingerprint)

    def test_actual_message_content_is_checked_against_heldout(self):
        rows = [{"sourceText": "Unrelated source", "messages": [
            {"role": "system", "content": "exact answer from a held out algebra lesson"},
            {"role": "user", "content": "Unrelated question"},
            {"role": "assistant", "content": "Try a hint"}]}]
        cases = [{"prompt": "Different prompt", "source": "exact answer from a held out algebra lesson"}]
        with self.assertRaisesRegex(ValueError, "overlaps pinned held-out"):
            verify_train_holdout_separation(rows, cases)

    def test_previous_problem_hidden_in_long_user_json_is_rejected(self):
        source = "A reviewed source about quadratic equations."
        payload = {"question": "What is a derivative?", "source": source,
                   "previousProblem": "Solve 9x+3=39.", "safeContext": "A long unrelated passage " * 30}
        rows = [{"sourceText": source, "messages": [
            {"role": "system", "content": "Tutor"},
            {"role": "user", "content": json.dumps(payload)},
            {"role": "assistant", "content": "Try this"}]}]
        cases = [{"prompt": "Solve 9x+3=39.", "source": "To solve a linear equation, apply the same operation to both sides."}]
        with self.assertRaisesRegex(ValueError, "overlaps pinned held-out"):
            verify_train_holdout_separation(rows, cases)
        data = json.dumps(rows[0])
        manifest = {"version": "diana-local-lora-dataset-v1", "modelId": "Qwen/Qwen3-4B-Instruct-2507",
                    "dataSha256": hashlib.sha256(data.encode()).hexdigest(), "exampleCount": 1,
                    "documentFamilies": ["unrelated-doc"], "templateFamilies": ["unrelated-template"],
                    "heldOutCorpusSha256": EXPECTED_HELDOUT_CORPUS_SHA256,
                    "heldOutEvaluationSha256": EXPECTED_HELDOUT_DATA_SHA256,
                    "trainingPromptFingerprints": [text_fingerprints(payload["question"])],
                    "trainingSourceFingerprints": [text_fingerprints(source)]}
        def read_text(path, encoding="utf-8"):
            return json.dumps(manifest) if path.name == "manifest.json" else data
        with patch.object(Path, "read_text", read_text), patch("local_lora_common.file_sha256", return_value=manifest["dataSha256"]):
            with self.assertRaisesRegex(ValueError, "source differs from its user payload"):
                validate_training_export(Path("synthetic-training"))

    def test_revocation_snapshot_is_signed_current_and_blocks_revoked_data(self):
        key = Ed25519PrivateKey.generate()
        public = key.public_key()
        pem = public.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        der = public.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        now = datetime.now(timezone.utc)
        payload = {"version": "diana-local-lora-revocations-v1", "issuedAt": now.isoformat(),
                   "expiresAt": (now + timedelta(hours=1)).isoformat(), "revokedDatasetSha256": ["a" * 64]}
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
        import base64
        receipt = {"payload": payload, "signatureBase64": base64.b64encode(key.sign(canonical)).decode()}
        with patch.object(Path, "read_bytes", return_value=pem), patch.object(Path, "read_text", return_value=json.dumps(receipt)):
            self.assertEqual(verify_current_revocations(Path("snapshot"), "b" * 64, Path("public"), hashlib.sha256(der).hexdigest()), payload)
            with self.assertRaisesRegex(ValueError, "revoked"):
                verify_current_revocations(Path("snapshot"), "a" * 64, Path("public"), hashlib.sha256(der).hexdigest())

    def test_adapter_config_and_weight_hashes_are_checked(self):
        expected = {"adapter_config.json": "a" * 64, "adapter_model.safetensors": "b" * 64}
        with patch("local_lora_common.adapter_file_hashes", return_value=expected):
            self.assertEqual(verify_adapter_integrity(Path("adapter"), {"adapterFilesSha256": expected}), expected)
            with self.assertRaisesRegex(ValueError, "differ"):
                verify_adapter_integrity(Path("adapter"), {"adapterFilesSha256": {**expected, "adapter_model.safetensors": "c" * 64}})

    def test_automated_checks_do_not_claim_tutoring_quality(self):
        case = {"source": "The source says x equals two.", "expected": {"answer": "2", "abstain": False}}
        checked = engineering_checks('{"answer":"2","abstain":false,"feedback":"Use the source.","quotes":["x equals two"]}', case)
        self.assertEqual(checked, {"validJson": True, "abstentionMatchesFixture": True,
                                   "allQuotesInSource": True, "mathAnswerExact": True})
        self.assertFalse(engineering_checks('{"answer":"2","abstain":false,"feedback":"Use the source.","quotes":["invented"]}', case)["allQuotesInSource"])


if __name__ == "__main__":
    unittest.main()
