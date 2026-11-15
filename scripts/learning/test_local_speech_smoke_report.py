"""Report provenance contracts using small temporary fixtures; no models or inference."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("speech_smoke", Path(__file__).with_name("prepare-local-speech-smoke.py"))
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class SpeechReportContract(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        files = {name: "a" * 64 for name in smoke.FILES}
        self.file_hash = smoke.sha(json.dumps(files, sort_keys=True, separators=(",", ":")).encode())
        self.manifest = {"files": files, "model": {"version": "local-recognition-v1", "kind": "speech",
                         "modelId": smoke.MODEL_ID, "revision": smoke.REVISION, "fileManifestHash": self.file_hash}}
        self.audio = b"synthetic-contract-bytes-not-real-audio"
        self.draft = {"version": "recognition-draft-v1", "text": "A sentence.", "confirmedHash": None,
                      "recognition": {"version": "local-recognition-v1", "kind": "speech", "assetHash": smoke.sha(self.audio),
                       "modelId": smoke.MODEL_ID, "revision": smoke.REVISION, "fileManifestHash": self.file_hash,
                       "text": "A sentence.", "networkUsed": False, "confidence": None, "elapsedMs": 1}}
        self.write("synthetic-cases.json", [{"id": "sample", "text": "A sentence.", "voice": "synthetic test fixture"}])
        (self.root / "sample.wav").write_bytes(self.audio)

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value), encoding="utf-8")

    def run_report(self):
        self.write("synthetic-research-manifest.json", self.manifest)
        self.write("sample-draft.json", self.draft)
        smoke.report(self.root)

    def test_valid_output_and_existing_report_preserved(self):
        self.run_report()
        report_path = self.root / "synthetic-smoke-report.json"
        original = report_path.read_bytes()
        self.assertEqual(json.loads(original)["rows"][0]["rawWordErrorRate"], 0)
        with self.assertRaises(FileExistsError):
            self.run_report()
        self.assertEqual(report_path.read_bytes(), original)

    def test_rejects_mismatched_output_provenance(self):
        replacements = {"modelId": "another-model", "kind": "handwriting_line", "fileManifestHash": "b" * 64,
                        "text": "Edited transcript.", "assetHash": "b" * 64, "revision": "b" * 40,
                        "networkUsed": True, "confidence": 0.9, "version": "other-version"}
        for field, value in replacements.items():
            with self.subTest(field=field):
                original = self.draft["recognition"][field]
                self.draft["recognition"][field] = value
                with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                    self.run_report()
                self.assertFalse((self.root / "synthetic-smoke-report.json").exists())
                self.draft["recognition"][field] = original

    def test_rejects_changed_manifest(self):
        self.manifest["files"]["model.bin"] = "b" * 64
        with self.assertRaisesRegex(ValueError, "model manifest mismatch"):
            self.run_report()

    def test_rejects_confirmed_or_edited_draft(self):
        for field, value in (("confirmedHash", "b" * 64), ("text", "Edited transcript.")):
            with self.subTest(field=field):
                original = self.draft[field]
                self.draft[field] = value
                with self.assertRaisesRegex(ValueError, "provenance mismatch"):
                    self.run_report()
                self.draft[field] = original


if __name__ == "__main__":
    unittest.main()
