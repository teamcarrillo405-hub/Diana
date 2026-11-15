"""Regression for preserved original approval bytes versus frozen serialization."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import verify_qwen3_preference as frozen_verifier
import verify_qwen3_preference_v2 as corrected


class RuntimeContractSerializationTests(unittest.TestCase):
    def fixture(self, directory, same_bytes=False):
        root = Path(directory)
        run, runtime = root / 'qwen3-run-008', root / 'qwen3-runtime'
        run.mkdir()
        runtime.mkdir()
        contract = {'schema': 'synthetic-contract', 'approved': True, 'environment': {'device': 'fixture'}}
        original_bytes = (json.dumps(contract, indent=2) + '\n').replace('\n', '\r\n').encode()
        frozen_bytes = original_bytes if same_bytes else (json.dumps(contract, indent=2) + '\n').encode()
        original = runtime / 'reviewed-environment-contract.json'
        frozen = run / 'environment-contract.json'
        original.write_bytes(original_bytes)
        frozen.write_bytes(frozen_bytes)
        return run, original, frozen, hashlib.sha256(original_bytes).hexdigest(), corrected.canonical(contract)

    def test_byte_identical_and_reserialized_copies_require_original_hash(self):
        for same in (True, False):
            with self.subTest(same_bytes=same), tempfile.TemporaryDirectory() as temp:
                run, original, frozen, expected, canonical = self.fixture(temp, same)
                with patch.object(corrected.base, 'CONTRACT_CANONICAL_SHA', canonical):
                    receipt = corrected.check_runtime_contract(run, expected)
                    self.assertEqual(receipt['originalRuntimeContractSha256'], expected)
                    self.assertEqual(receipt['frozenRuntimeContractSha256'], corrected.digest(frozen))
                    self.assertEqual(receipt['runtimeContractCanonicalSha256'], canonical)
                    with self.assertRaisesRegex(ValueError, 'Original reviewed runtime contract hash drift'):
                        corrected.check_runtime_contract(run, '0' * 64)
                    if not same:
                        with self.assertRaisesRegex(ValueError, 'Original reviewed runtime contract hash drift'):
                            corrected.check_runtime_contract(run, corrected.digest(frozen))

    def test_altered_original_or_frozen_data_and_rehashed_unapproved_contract_fail(self):
        for mutation in ('original-data', 'original-format', 'frozen-data', 'both-rehashed'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temp:
                run, original, frozen, expected, canonical = self.fixture(temp)
                changed = json.loads(original.read_text())
                changed['approved'] = False
                if mutation in ('original-data', 'both-rehashed'):
                    original.write_text(json.dumps(changed), encoding='utf-8')
                if mutation == 'original-format':
                    original.write_bytes(original.read_bytes().replace(b'\r\n', b'\n'))
                if mutation in ('frozen-data', 'both-rehashed'):
                    frozen.write_text(json.dumps(changed), encoding='utf-8')
                if mutation == 'both-rehashed':
                    expected = corrected.digest(original)
                with patch.object(corrected.base, 'CONTRACT_CANONICAL_SHA', canonical), self.assertRaises(ValueError):
                    corrected.check_runtime_contract(run, expected)

    def test_missing_original_never_falls_back_to_frozen_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            run, original, _, expected, canonical = self.fixture(temp)
            original.unlink()
            with patch.object(corrected.base, 'CONTRACT_CANONICAL_SHA', canonical), self.assertRaises(ValueError):
                corrected.check_runtime_contract(run, expected)

    def test_actual_run008_qualification_regression_and_original_verifier_preserved(self):
        run = Path(__file__).resolve().parents[2] / 'artifacts/learning-engine/research/qwen3-run-008'
        if not (run / 'report.json').is_file():
            self.skipTest('Preserved run008 evidence is not installed in this checkout')
        protocol = corrected.read(run / 'protocol.json')
        proof = corrected.read(run / 'objective-qualification.json')
        before = {name: corrected.digest(run / name) for name in ('protocol.json', 'objective-qualification.json', 'environment-contract.json', 'report.json')}
        with self.assertRaisesRegex(ValueError, 'DPO qualification runtime drift'):
            frozen_verifier.check_objective_qualification(run, proof, protocol['environment'])
        corrected.check_objective_qualification(run, proof, protocol['environment'])
        contract_receipt = corrected.check_runtime_contract(run, proof['runtimeContractSha256'])
        self.assertEqual(contract_receipt['originalRuntimeContractSha256'], '440edb7a7dab64fe784e28f418970e80cf78f943bdb4f5d0b6445978c3a7042c')
        self.assertEqual(contract_receipt['frozenRuntimeContractSha256'], 'c7633d9e37344bfa755c1fa31f0d35ffb44b23781d3a8fa13ef907fd51504184')
        self.assertEqual(corrected.SOURCES, frozen_verifier.SOURCES)
        self.assertNotIn('verify_qwen3_preference_v2.py', corrected.SOURCES)
        self.assertEqual(corrected.digest(Path(frozen_verifier.__file__)), protocol['frozenFiles']['source/verify_qwen3_preference.py'])
        self.assertEqual(before, {name: corrected.digest(run / name) for name in before})
        tampered = deepcopy(proof)
        tampered['runtimeContractSha256'] = contract_receipt['frozenRuntimeContractSha256']
        with self.assertRaises(ValueError):
            corrected.check_objective_qualification(run, tampered, protocol['environment'])


if __name__ == '__main__':
    unittest.main()
