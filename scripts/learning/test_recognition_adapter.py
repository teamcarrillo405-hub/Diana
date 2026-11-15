"""Contract checks only. These do not run or validate neural recognition."""
import importlib.util
import json
from pathlib import Path
from contextlib import contextmanager
import shutil
import unittest
import uuid

spec = importlib.util.spec_from_file_location("recognize_local", Path(__file__).with_name("recognize_local.py"))
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)
TEST_ROOT = Path(__file__).resolve().parents[2] / "artifacts" / "learning-engine" / "recognition-contract-tests"
TEST_ROOT.mkdir(parents=True, exist_ok=True)


@contextmanager
def temporary_fixture():
    # Inherit workspace ACLs; Python 3.14's private Windows temp ACL excludes the sandbox identity.
    root = TEST_ROOT / ("test-" + str(uuid.uuid4()))
    root.mkdir()
    try:
        yield root
    finally:
        resolved = root.resolve(strict=True)
        if resolved.parent != TEST_ROOT.resolve(strict=True) or not resolved.name.startswith("test-"):
            raise RuntimeError("test_cleanup_boundary")
        shutil.rmtree(resolved)


class RecognitionAdapterTests(unittest.TestCase):
    def fixture(self, root):
        directory = Path(root) / "model"
        directory.mkdir()
        (directory / "config.json").write_text("{}", encoding="utf-8")
        files = {"config.json": adapter.digest_bytes(b"{}")}
        config = {"model": {"version":"local-recognition-v1", "kind":"speech", "modelId":"test-only/speech-fixture", "revision":"1"*40, "fileManifestHash":adapter.canonical_hash(files), "approvedBy":"test-operator", "approvalReference":"synthetic-contract-test", "approvedAt":"2020-01-01T00:00:00Z", "expiresAt":"2099-01-01T00:00:00Z", "enabled":True}, "directory":str(directory), "files":files}
        filename = Path(root) / "manifest.json"
        filename.write_text(json.dumps(config), encoding="utf-8")
        return filename, config, directory

    def test_hashes_every_model_file(self):
        with temporary_fixture() as root:
            filename, _config, directory = self.fixture(root)
            self.assertEqual(adapter.load_manifest(str(filename))[1], directory)
            (directory / "config.json").write_text('{"changed":true}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "model_file_changed"):
                adapter.load_manifest(str(filename))

    def test_unlisted_files_and_disabled_models(self):
        with temporary_fixture() as root:
            filename, config, directory = self.fixture(root)
            (directory / "unlisted.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "unlisted_model_file"):
                adapter.load_manifest(str(filename))
            config["model"]["enabled"] = False
            filename.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "model_unavailable"):
                adapter.load_manifest(str(filename))

    def test_traversal_is_rejected_before_model_loading(self):
        with temporary_fixture() as root:
            filename, config, _directory = self.fixture(root)
            config["files"] = {"../config.json":"1"*64}
            config["model"]["fileManifestHash"] = adapter.canonical_hash(config["files"])
            filename.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "model_file_name"):
                adapter.load_manifest(str(filename))

    def test_network_denial(self):
        with self.assertRaisesRegex(RuntimeError, "network_disabled"):
            adapter.deny_network()


if __name__ == "__main__":
    unittest.main()
