"""Opaque image/metadata audit tests. No text, weights, model imports or inference."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

spec = importlib.util.spec_from_file_location("audit", Path(__file__).with_name("local-handwriting-input-audit.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class HandwritingAuditTests(unittest.TestCase):
    def fixture(self, root):
        model_dir = root / "model"; model_dir.mkdir()
        processor = b'{"size":384}'
        (model_dir / "preprocessor_config.json").write_bytes(processor)
        files = {"preprocessor_config.json": audit.sha(processor)}
        map_hash = audit.sha(json.dumps(files, sort_keys=True, separators=(",", ":")).encode())
        model = {"directory": str(model_dir), "files": files, "model": {"fileManifestHash": map_hash}}
        model_bytes = json.dumps(model).encode(); (root / "model.json").write_bytes(model_bytes)
        cases, prior = [], []
        for i in range(8):
            image = Image.new("RGB", (40, 180) if i == 7 else (180, 40), (11,22,33))
            path = root / f"{i}.png"; image.save(path)
            cases.append({"caseId": str(i), "kind": "handwriting_line", "asset": {"path": path.name, "sha256": audit.sha(path.read_bytes())}})
            counts = {"characterErrors": 1, "referenceCharacters": 10, "wordErrors": 1, "referenceWords": 3}
            prior.append({"caseId": str(i), "kind": "handwriting_line", "status": "success", "raw": counts, "normalized": counts})
        manifest = {"cases": cases, "models": {"handwriting_line": {"fileManifestHash": map_hash, "manifest": {"path": "model.json", "sha256": audit.sha(model_bytes)}}}}
        data = json.dumps(manifest).encode(); (root / "manifest.json").write_bytes(data)
        baseline = {"results": prior, "sampleManifestSha256": audit.sha(data)}
        old = json.dumps(baseline).encode(); (root / "baseline.json").write_bytes(old)
        return [root / "manifest.json", audit.sha(data), root / "baseline.json", audit.sha(old)]

    def test_all_eight_remain_in_denominator_and_guard_is_not_line_detection(self):
        with tempfile.TemporaryDirectory(prefix="handwriting-audit-") as name:
            report = audit.audit(*self.fixture(Path(name)))
            self.assertEqual(report["auditedCases"], 8)
            self.assertEqual(report["supportedShapes"], 7)
            self.assertEqual(report["unsupportedLayouts"], 1)
            self.assertEqual(report["baselineNormalizedTotalsUnchanged"]["characterErrors"], 8)
            self.assertEqual(report["inferenceCalls"], 0)
            self.assertTrue(all(not row["singleLineVerified"] for row in report["cases"]))
            self.assertIsNone(report["newScore"])

    def test_changed_asset_rejected(self):
        with tempfile.TemporaryDirectory(prefix="handwriting-audit-") as name:
            root = Path(name); args = self.fixture(root)
            (root / "0.png").write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError, "pinned_file_changed"):
                audit.audit(*args)

    def test_missing_case_not_silently_dropped(self):
        with tempfile.TemporaryDirectory(prefix="handwriting-audit-") as name:
            args = self.fixture(Path(name)); baseline = json.loads(args[2].read_text()); baseline["results"].pop()
            data = json.dumps(baseline).encode(); args[2].write_bytes(data); args[3] = audit.sha(data)
            with self.assertRaisesRegex(ValueError, "eight_case_denominator_required"):
                audit.audit(*args)

    def test_model_change_rejected_before_image_audit(self):
        with tempfile.TemporaryDirectory(prefix="handwriting-audit-") as name:
            root = Path(name); args = self.fixture(root)
            (root / "model/preprocessor_config.json").write_bytes(b'{"size":256}')
            with self.assertRaisesRegex(ValueError, "model_file_changed"):
                audit.audit(*args)


if __name__ == "__main__":
    unittest.main()
