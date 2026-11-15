"""Fail-closed final-execution contracts. No final cases or model calls."""
import ast
import copy
import hashlib
from contextlib import contextmanager, ExitStack
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
import uuid

import evaluate_qwen3_final as final
from grounding_review_v3 import build_packet, digest, DIMENSIONS
from grounding_adjudication import prepare


def fixture():
    rows = [{"id": f"contract-{i}", "source": f"A fixture records detail {i}.",
             "question": "Which detail is recorded?", "expectedAbstention": False} for i in range(48)]
    outputs = [{"id": row["id"], "output": f"EVIDENCE: {row['source']}\nNEXT: What detail can you identify?"} for row in rows]
    packet, key = build_packet(rows, outputs, outputs, "a" * 64, "validation", 1)
    def review(name):
        return {"reviewerKind": "ai", "reviewerId": name, "packetHash": digest(packet),
            "ratings": [{"id": row["id"], "arm": arm, "caseHash": row["caseHash"],
                "responseHash": digest(row["response" + arm]), **{d: True for d in DIMENSIONS},
                "notes": "Independent fixture judgment of the recorded evidence."}
                for row in packet["cases"] for arm in ("A", "B")]}
    values = {"packet": packet, "key": key, "first": review("reviewer-one"), "second": review("reviewer-two")}
    return rows, outputs, values


def bundle_for(values):
    bundle = {"schema": "diana-development-semantic-gate-bundle-v1", "files": {}, "reviewerReceipts": []}
    for role, value in values.items():
        bundle["files"][role] = {"path": str(Path(__file__).resolve()), "sha256": digest(value)}
        if role in ("first", "second", "adjudication"):
            bundle["reviewerReceipts"].append({"role": role, "reviewerId": value["reviewerId"],
                "reviewFileSha256": digest(value), "independentlyAuthored": True, "savedBeforeUnblinding": True,
                "savedAtUtc": "2026-09-28T12:00:00Z", "reviewerUnblindedAtUtc": "2026-09-28T12:01:00Z"})
    return bundle


def ancestry_fixture():
    """Synthetic records only; no persisted training or final case files are read."""
    roots = [final.RESEARCH_ROOT / name for name in final.ANCESTRY_NAMES]
    files = {}
    for stage, (root, (schema, count)) in enumerate(zip(roots, final.ANCESTRY_STAGES, strict=True)):
        files[root / "train.json"] = [{"id": f"ancestor-{stage}-train-{i}",
            "source": f"Synthetic ancestor {stage} training record {i}.", "question": "Which recorded detail?"}
            for i in range(count)]
        files[root / "development.json"] = [{"id": f"ancestor-{stage}-development-{i}",
            "source": f"Synthetic ancestor {stage} development record {i}.", "question": "Which recorded detail?"}
            for i in range(48)]
        files[root / "protocol.json"] = {"schema": schema, "trainCount": count, "developmentCount": 48}
    bind_ancestry_fixture(roots, files)
    return roots, files


def bind_ancestry_fixture(roots, files):
    for position in reversed(range(len(roots))):
        root = roots[position]
        protocol = files[root / "protocol.json"]
        protocol["frozenFiles"] = {name: digest(files[root / name]) for name in ("train.json", "development.json")}
        if position < len(roots) - 1:
            parent_root = roots[position + 1]
            protocol["parent"] = {"root": str(parent_root),
                "files": {"protocol.json": digest(files[parent_root / "protocol.json"])}}


def comparison_fixture():
    roots, files = ancestry_fixture()
    run, sibling = roots[0], roots[0].parent / "qwen3-run-009"
    for name in ("train.json", "development.json"):
        files[sibling / name] = copy.deepcopy(files[run / name])
    files[sibling / "protocol.json"] = {"schema": "diana-qwen3-evidence-integrity-protocol-v1",
        "trainCount": 300, "developmentCount": 48,
        "frozenFiles": {name: digest(files[sibling / name]) for name in ("train.json", "development.json")}}
    files[sibling / "report.json"] = {"synthetic": "approved comparison report"}
    files[run / "comparator-verification.json"] = {"verified": True, "synthetic": True}
    pins = {"COMPARATOR_REPORT_HASH": digest(files[sibling / "report.json"]),
        "COMPARATOR_PROTOCOL_HASH": digest(files[sibling / "protocol.json"]),
        "COMPARATOR_RECEIPT_HASH": digest(files[run / "comparator-verification.json"]),
        "TRAINING_HASH": final.research.canonical_hash(files[run / "train.json"]),
        "DEVELOPMENT_HASH": final.research.canonical_hash(files[run / "development.json"])}
    copied = {"root": str(sibling), "sameTrainingData": True, "initializationAncestor": False,
        "reportSha256": pins["COMPARATOR_REPORT_HASH"], "protocolSha256": pins["COMPARATOR_PROTOCOL_HASH"],
        "verificationReceiptSha256": pins["COMPARATOR_RECEIPT_HASH"],
        "files": {name: digest(files[sibling / name]) for name in ("train.json", "development.json")}}
    files[run / "comparator-evidence.json"] = copied
    bind_comparison_fixture(run, files)
    return roots, sibling, files, pins


def bind_comparison_fixture(run, files):
    protocol = files[run / "protocol.json"]
    protocol["comparator"] = copy.deepcopy(files[run / "comparator-evidence.json"])
    protocol["comparatorEvidenceSha256"] = digest(files[run / "comparator-evidence.json"])
    for name in ("comparator-evidence.json", "comparator-verification.json"):
        protocol["frozenFiles"][name] = digest(files[run / name])


@contextmanager
def mocked_comparison(files, pins):
    with ExitStack() as stack:
        stack.enter_context(patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])))
        stack.enter_context(patch.object(final, "sha256", side_effect=lambda p: digest(files[p])))
        for name, value in pins.items():
            stack.enter_context(patch.object(final.research, name, value))
        yield


@contextmanager
def isolated_output():
    directory = Path(__file__).resolve().parents[2] / ("final-supervisor-contract-" + uuid.uuid4().hex)
    directory.mkdir()
    try:
        yield directory
    finally:
        for name in ("execution.log", "interrupted.json", "supervisor-artifact-manifest.json"):
            (directory / name).unlink(missing_ok=True)
        directory.rmdir()


class FinalExecutionContracts(unittest.TestCase):
    def setUp(self):
        self.rows, self.outputs, self.values = fixture()

    def gate(self, values=None):
        values = self.values if values is None else values
        return final.semantic_gate(bundle_for(values), values, self.rows, self.outputs, self.outputs, "a" * 64, 1)

    def change_adapter(self, role, case_index, dimension):
        case_id = self.rows[case_index]["id"]
        mapping = next(row for row in self.values["key"]["cases"] if row["id"] == case_id)
        arm = next(arm for arm in ("A", "B") if mapping[arm] == "adapter")
        rating = next(row for row in self.values[role]["ratings"] if row["id"] == case_id and row["arm"] == arm)
        rating[dimension] = False

    def adjudicate_all_disputes_true(self):
        disputes, _ = prepare(*(self.values[name] for name in ("packet", "key", "first", "second")))
        adjudication = {"reviewerId": "independent-third", "reviewerKind": "ai", "disputePacketHash": digest(disputes),
            "ratings": [{"id": row["id"], "arm": row["arm"], "caseHash": row["caseHash"], "responseHash": row["responseHash"],
                "decisions": {d: True for d in row["dimensions"]}, "notes": "Independent adjudication of each listed disputed dimension."} for row in disputes["disputes"]]}
        self.values.update(disputes=disputes, adjudication=adjudication)

    def test_two_complete_bound_reviews_can_pass_development_only(self):
        result = self.gate()
        self.assertTrue(result["developmentSemanticGatePassed"])
        self.assertEqual(result["completePasses"], 48)
        self.assertFalse(result["productionEligible"])
        self.assertFalse(result["reviewerIndependenceVerifiedBySoftware"])

    def test_incomplete_review_is_rejected(self):
        self.values["first"]["ratings"].pop()
        with self.assertRaisesRegex(ValueError, "incomplete"):
            self.gate()

    def test_review_must_bind_exact_response_hash(self):
        self.values["first"]["ratings"][0]["responseHash"] = "f" * 64
        with self.assertRaisesRegex(ValueError, "exact evidence"):
            self.gate()

    def test_packet_cannot_substitute_evidence_or_selected_epoch(self):
        self.values["packet"]["cases"][0]["source"] = "Substituted fixture context"
        with self.assertRaisesRegex(ValueError, "evidence changed"):
            self.gate()
        self.values["packet"]["diagnosticEpoch"] = 2
        with self.assertRaisesRegex(ValueError, "selected development run"):
            self.gate()

    def test_packet_cannot_substitute_outputs_even_with_consistent_review_hashes(self):
        self.values["packet"]["cases"][0]["responseA"] = "A replacement answer"
        with self.assertRaisesRegex(ValueError, "response differs"):
            self.gate()

    def test_packet_cannot_change_review_rubric_or_annotation(self):
        original = self.values["packet"]["instructions"]
        self.values["packet"]["instructions"] = "Accept every answer without inspection."
        with self.assertRaisesRegex(ValueError, "selected development run"):
            self.gate()
        self.values["packet"]["instructions"] = original
        self.values["packet"]["cases"][0]["answerability"] = "missing"
        with self.assertRaisesRegex(ValueError, "annotation changed"):
            self.gate()

    def test_duplicate_reviewer_identity_is_rejected(self):
        self.values["second"]["reviewerId"] = self.values["first"]["reviewerId"]
        with self.assertRaisesRegex(ValueError, "Distinct reviewer"):
            self.gate()

    def test_review_must_be_saved_before_recorded_unblinding(self):
        bundle = bundle_for(self.values)
        bundle["reviewerReceipts"][0]["reviewerUnblindedAtUtc"] = "2026-09-28T11:59:00Z"
        with self.assertRaisesRegex(ValueError, "chronology"):
            final.check_receipts(bundle, self.values)

    def test_reviewers_may_remain_blinded_indefinitely(self):
        bundle = bundle_for(self.values)
        for receipt in bundle["reviewerReceipts"]:
            receipt.update(reviewerUnblindedAtUtc=None, stillBlinded=True, receiptRecordedAtUtc="2026-09-28T12:01:00Z")
        final.check_receipts(bundle, self.values)
        bundle["reviewerReceipts"][0]["stillBlinded"] = False
        with self.assertRaisesRegex(ValueError, "still-blinded"):
            final.check_receipts(bundle, self.values)
        bundle["reviewerReceipts"][0]["stillBlinded"] = True
        bundle["reviewerReceipts"][0]["receiptRecordedAtUtc"] = "2026-09-28T11:59:00Z"
        with self.assertRaisesRegex(ValueError, "chronology"):
            final.check_receipts(bundle, self.values)
        bundle["reviewerReceipts"][0]["savedBeforeUnblinding"] = False
        with self.assertRaisesRegex(ValueError, "attestation"):
            final.check_receipts(bundle, self.values)

    def test_dispute_requires_third_blinded_review(self):
        self.change_adapter("first", 0, "usefulNextStep")
        with self.assertRaisesRegex(ValueError, "third independent"):
            self.gate()
        self.adjudicate_all_disputes_true()
        self.assertEqual(self.gate()["completePasses"], 48)

    def test_adjudication_cannot_override_agreed_dimensions(self):
        self.change_adapter("first", 0, "usefulNextStep")
        self.adjudicate_all_disputes_true()
        self.values["adjudication"]["ratings"][0]["decisions"]["noFabricatedClaims"] = True
        with self.assertRaisesRegex(ValueError, "override agreed"):
            self.gate()

    def test_case_both_reviewers_reject_cannot_be_rescued_on_different_dimensions(self):
        self.change_adapter("first", 0, "sourceSupported")
        self.change_adapter("second", 0, "usefulNextStep")
        self.adjudicate_all_disputes_true()
        with self.assertRaises(ValueError):
            self.gate()

    def test_45_of_48_complete_cases_does_not_meet_95_percent(self):
        for role in ("first", "second"):
            for index in range(3):
                self.change_adapter(role, index, "usefulNextStep")
        with self.assertRaisesRegex(ValueError, "below 95%"):
            self.gate()

    def test_single_agreed_fabrication_blocks_otherwise_95_percent_result(self):
        for role in ("first", "second"):
            self.change_adapter(role, 0, "noFabricatedClaims")
        with self.assertRaisesRegex(ValueError, "fabricated responses"):
            self.gate()

    def test_dataset_claim_prevents_retry_across_output_directories(self):
        directory = Path(__file__).resolve().parents[2] / ("final-contract-" + uuid.uuid4().hex)
        directory.mkdir()
        for name in ("first", "second"):
            (directory / name).mkdir()
        try:
            with patch.object(final, "CLAIM", directory / "claim.json"):
                final.claim_once(directory / "first", "a" * 64)
                with self.assertRaises(FileExistsError):
                    final.claim_once(directory / "second", "b" * 64)
        finally:
            (directory / "first" / "started.json").unlink(missing_ok=True)
            (directory / "claim.json").unlink(missing_ok=True)
            (directory / "first").rmdir()
            (directory / "second").rmdir()
            directory.rmdir()

    def test_final_loader_never_runs_without_matching_consumption_claim(self):
        with patch.object(final, "read", return_value={}), patch.object(final.importlib.util, "spec_from_file_location") as loader:
            with self.assertRaisesRegex(ValueError, "consumption claim"):
                final.open_final_once(Path("unused"), "a" * 64)
            loader.assert_not_called()

    def test_seal_drift_rejected_without_importing_final_module(self):
        with patch.object(final, "sha256", return_value="changed"), patch.object(final.importlib.util, "spec_from_file_location") as loader:
            with self.assertRaisesRegex(ValueError, "Sealed final evidence changed"):
                final.check_seal()
            loader.assert_not_called()

    def test_frozen_protocol_drift_rejected_before_development_verification(self):
        with patch.object(final, "sha256", return_value="changed"), patch.object(final, "verified_development") as verify:
            with self.assertRaisesRegex(ValueError, "protocol changed"):
                final.verify_frozen(Path("unused"), "reviewed")
            verify.assert_not_called()

    def test_ineligible_development_does_not_read_review_bundle(self):
        verifier = SimpleNamespace(verify=Mock(return_value={"verified": True, "automaticEligibilityPassed": False}))
        with patch.dict(sys.modules, {"verify_qwen3_matched_sft": verifier}), patch.object(final, "load_bundle") as load:
            with self.assertRaisesRegex(ValueError, "automatically eligible"):
                final.verified_development(Path("unused"), Path("unused"))
            load.assert_not_called()

    def test_earlier_matched_epochs_cannot_fall_back_into_final_evaluation(self):
        for epoch in (1, 2, True):
            verifier = SimpleNamespace(verify=Mock(return_value={"verified": True, "automaticEligibilityPassed": True,
                "selectedEpoch": epoch}))
            with self.subTest(epoch=epoch), patch.dict(sys.modules, {"verify_qwen3_matched_sft": verifier}), patch.object(final, "load_bundle") as load:
                with self.assertRaisesRegex(ValueError, "automatically eligible"):
                    final.verified_development(Path("unused"), Path("unused"))
                load.assert_not_called()

    def test_matched_backend_uses_prespecified_prompt_seed_and_dependencies(self):
        self.assertEqual(final.research.__name__, "train_qwen3_matched_sft")
        self.assertEqual(final.SETTINGS["seed"], 81173)
        self.assertEqual(final.SETTINGS["optimizerSteps"], 0)
        self.assertIn("train_qwen3_preference.py", final.SOURCE_FILES)
        self.assertIn("verify_qwen3_preference.py", final.SOURCE_FILES)
        self.assertIn("verify_qwen3_preference_v2.py", final.SOURCE_FILES)
        self.assertIn("verify_qwen3_evidence_integrity.py", final.SOURCE_FILES)
        self.assertIn("verify_qwen3_matched_sft.py", final.SOURCE_FILES)
        self.assertIn("train_qwen3_matched_sft.py", final.SOURCE_FILES)
        self.assertIn("qwen3_evidence_integrity_metrics.py", final.SOURCE_FILES)
        self.assertIn("qwen3_evidence_integrity_contract.py", final.SOURCE_FILES)
        self.assertEqual(final.research.SYSTEM_HASH, hashlib.sha256(final.research.SYSTEM.encode()).hexdigest())

    def test_no_optimizer_or_training_calls_and_no_static_final_import(self):
        tree = ast.parse(Path(final.__file__).read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                self.assertNotIn(node.func.attr, ("backward", "step", "zero_grad", "AdamW"))
            if isinstance(node, ast.ImportFrom):
                self.assertNotEqual(node.module, "qwen3_fresh_evaluation")

    def test_overlap_in_any_ancestor_training_or_development_is_rejected(self):
        rows = [{"id": f"fiction-{i}", "source": f"Fictional isolated context {i}",
                 "question": "Which detail?", "expectedAbstention": i >= 60} for i in range(100)]
        for stage in range(4):
            for partition in ("train.json", "development.json"):
                with self.subTest(stage=stage, partition=partition):
                    roots, files = ancestry_fixture()
                    files[roots[stage] / partition][0]["source"] = rows[0]["source"]
                    bind_ancestry_fixture(roots, files)
                    with patch.object(final, "digest", return_value=final.ROWS_SHA), \
                            patch.object(final, "comparison_exposure", return_value=({}, [])), \
                            patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])), \
                            patch.object(final, "sha256", side_effect=lambda p: digest(files[p])):
                        with self.assertRaisesRegex(ValueError, "overlap detected"):
                            final.validate_final_rows(rows, roots[0])

    def test_entire_training_chain_is_bound_in_order(self):
        roots, files = ancestry_fixture()
        with patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])), \
                patch.object(final, "sha256", side_effect=lambda p: digest(files[p])):
            inventory, known = final.training_ancestry(roots[0])
        self.assertEqual([item["root"] for item in inventory], list(map(str, roots)))
        self.assertEqual([item["trainRows"] for item in inventory], [300, 200, 600, 440])
        self.assertEqual([item["developmentRows"] for item in inventory], [48, 48, 48, 48])
        self.assertEqual(len(known), 300 + 200 + 600 + 440 + 4 * 48)
        for item, root in zip(inventory, roots, strict=True):
            self.assertEqual(set(item), {"root", "protocolSha256", "trainSha256", "developmentSha256", "trainRows", "developmentRows"})
            self.assertEqual(item["protocolSha256"], digest(files[root / "protocol.json"]))
            self.assertEqual(item["trainSha256"], digest(files[root / "train.json"]))
            self.assertEqual(item["developmentSha256"], digest(files[root / "development.json"]))

    def test_comparison_receipt_binds_same_data_sibling_without_adding_parent(self):
        roots, sibling, files, pins = comparison_fixture()
        with mocked_comparison(files, pins):
            receipt, known = final.comparison_exposure(roots[0])
            ancestry, _ = final.training_ancestry(roots[0])
        self.assertEqual(receipt, {
            "schema": "diana-qwen3-final-comparison-exposure-v1", "root": str(sibling),
            "reportSha256": pins["COMPARATOR_REPORT_HASH"], "protocolSha256": pins["COMPARATOR_PROTOCOL_HASH"],
            "verificationReceiptSha256": pins["COMPARATOR_RECEIPT_HASH"],
            "trainSha256": digest(files[sibling / "train.json"]),
            "developmentSha256": digest(files[sibling / "development.json"]),
            "trainRows": 300, "developmentRows": 48, "trainingCanonicalSha256": pins["TRAINING_HASH"],
            "developmentCanonicalSha256": pins["DEVELOPMENT_HASH"], "sameTrainingData": True,
            "initializationAncestor": False})
        self.assertEqual(known, files[roots[0] / "train.json"] + files[roots[0] / "development.json"])
        self.assertNotIn(str(sibling), [item["root"] for item in ancestry])

    def test_rehashed_comparison_role_path_and_receipt_tampering_still_rejected(self):
        for problem in ("ancestor", "different-data", "other-root", "receipt", "data", "protocol", "copied-binding"):
            roots, sibling, files, pins = comparison_fixture()
            run = roots[0]
            copied = files[run / "comparator-evidence.json"]
            if problem == "ancestor":
                copied["initializationAncestor"] = True
            elif problem == "different-data":
                copied["sameTrainingData"] = False
            elif problem == "other-root":
                copied["root"] = str(roots[1])
            elif problem == "receipt":
                files[run / "comparator-verification.json"]["verified"] = False
            elif problem == "data":
                files[sibling / "train.json"][0]["source"] = "Changed comparison data"
            elif problem == "protocol":
                files[sibling / "protocol.json"]["trainCount"] = 299
            else:
                copied["protocolSha256"] = "0" * 64
            bind_comparison_fixture(run, files)
            with self.subTest(problem=problem), mocked_comparison(files, pins), self.assertRaises(ValueError):
                final.comparison_exposure(run)

    def test_comparator_cannot_replace_fitting_parent(self):
        roots, files = ancestry_fixture()
        protocol = files[roots[0] / "protocol.json"]
        protocol["parent"]["root"] = str(roots[0].parent / "qwen3-run-009")
        with patch.object(final, "read", side_effect=lambda p: files[p]), \
                patch.object(final, "sha256", side_effect=lambda p: digest(files[p])), self.assertRaisesRegex(ValueError, "ancestry run identity"):
            final.training_ancestry(roots[0])

    def test_comparison_population_is_explicitly_checked_for_overlap(self):
        rows = [{"id": f"fiction-{i}", "source": f"Fictional context {i}",
                 "question": "Which detail?", "expectedAbstention": i >= 60} for i in range(100)]
        run = final.RESEARCH_ROOT / "qwen3-run-010"
        for field in ("id", "source", "question"):
            # Question alone is not an overlap; pair it with the same source.
            known = {"id": "other", "source": "Other source", "question": "Other?"}
            known[field] = rows[0][field]
            if field == "question":
                known["source"] = rows[0]["source"]
            with self.subTest(field=field), patch.object(final, "digest", return_value=final.ROWS_SHA), \
                    patch.object(final, "training_ancestry", return_value=([], [])), \
                    patch.object(final, "comparison_exposure", return_value=({}, [known])), \
                    self.assertRaisesRegex(ValueError, "comparison overlap"):
                final.validate_final_rows(rows, run)
        with patch.object(final, "digest", return_value=final.ROWS_SHA), \
                patch.object(final, "training_ancestry", return_value=([], [])), \
                patch.object(final, "comparison_exposure", return_value=({}, [])):
            overlap = final.validate_final_rows(rows, run)
        zeros = {"ids": 0, "sources": 0, "sourceQuestionPairs": 0}
        self.assertEqual(overlap, {**zeros, "fittingAncestry": zeros, "comparisonExposure": zeros})

    def test_missing_parent_or_cycle_or_unexpected_extra_ancestor_is_rejected(self):
        for problem in ("missing", "cycle", "extra"):
            with self.subTest(problem=problem):
                roots, files = ancestry_fixture()
                if problem == "missing":
                    files[roots[0] / "protocol.json"].pop("parent")
                elif problem == "cycle":
                    files[roots[0] / "protocol.json"]["parent"]["root"] = str(roots[0])
                else:
                    files[roots[-1] / "protocol.json"]["parent"] = {"root": str(roots[0]), "files": {"protocol.json": "a" * 64}}
                    bind_ancestry_fixture(roots, files)
                with patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])), \
                        patch.object(final, "sha256", side_effect=lambda p: digest(files[p])):
                    with self.assertRaisesRegex(ValueError, "ancestor|ancestry"):
                        final.training_ancestry(roots[0])

    def test_ancestor_dataset_drift_is_rejected_even_when_count_is_unchanged(self):
        roots, files = ancestry_fixture()
        files[roots[2] / "train.json"][0]["source"] = "Changed synthetic ancestor input."
        with patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])), \
                patch.object(final, "sha256", side_effect=lambda p: digest(files[p])):
            with self.assertRaisesRegex(ValueError, "data differs from its frozen protocol"):
                final.training_ancestry(roots[0])

    def test_ancestor_protocol_drift_is_rejected_against_child_binding(self):
        roots, files = ancestry_fixture()
        files[roots[2] / "protocol.json"]["extra"] = "changed"
        with patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])), \
                patch.object(final, "sha256", side_effect=lambda p: digest(files[p])):
            with self.assertRaisesRegex(ValueError, "differs from its child's binding"):
                final.training_ancestry(roots[0])

    def test_ancestor_cannot_leave_current_checkout(self):
        roots, files = ancestry_fixture()
        files[roots[0] / "protocol.json"]["parent"]["root"] = str(final.ROOT.parent / "outside-research")
        with patch.object(final, "read", side_effect=lambda p: copy.deepcopy(files[p])), \
                patch.object(final, "sha256", side_effect=lambda p: digest(files[p])):
            with self.assertRaisesRegex(ValueError, "within this checkout"):
                final.training_ancestry(roots[0])

    def test_frozen_ancestor_inventory_cannot_be_replaced_before_gate_recheck(self):
        protocol = {"schema": "diana-qwen3-final-protocol-v1", "settings": final.SETTINGS,
            "system": final.research.SYSTEM, "systemSha256": final.research.SYSTEM_HASH,
            "selectedEpoch": 3, "productionEligible": False, "finalSemanticQualityValidated": False,
            "frozenFiles": {}, "developmentFiles": {}, "developmentRun": str(final.RESEARCH_ROOT / "fixture-preference"),
            "trainingAncestry": [{"root": "altered-parent", "trainSha256": "b" * 64}]}
        with patch.object(final, "sha256", return_value="a" * 64), patch.object(final, "read", return_value=protocol), \
                patch.object(final, "SOURCE_FILES", ()), \
                patch.object(final, "training_ancestry", return_value=([{"root": "actual-parent", "trainSha256": "c" * 64}], [])), \
                patch.object(final, "verified_development") as verify, patch.object(final, "check_seal") as seal:
            with self.assertRaisesRegex(ValueError, "Frozen training ancestry changed"):
                final.verify_frozen(Path("unused"), "a" * 64)
            verify.assert_not_called()
            seal.assert_not_called()

    def test_supervisor_reaps_worker_after_keyboard_interrupt_or_sigterm(self):
        for error in (KeyboardInterrupt(), final.SupervisorInterrupted("SIGTERM")):
            child = Mock(pid=4321)
            child.poll.return_value = None
            child.wait.side_effect = [error, 0]
            with isolated_output() as output, patch.object(final.subprocess, "Popen", return_value=child), patch.object(final.os, "killpg", create=True) as kill, patch.object(final.signal, "signal"):
                with self.assertRaises(type(error)):
                    final.run_supervised(output, "a" * 64)
                kill.assert_called_once_with(4321, final.signal.SIGTERM)
                self.assertEqual(child.wait.call_count, 2)
                marker = final.read(output / "interrupted.json")
                self.assertEqual(marker["reason"], "supervisor-interrupted")
                self.assertFalse(marker["retryPermitted"])

    def test_launch_failure_is_durable_and_does_not_signal_unowned_process(self):
        with isolated_output() as output, patch.object(final.subprocess, "Popen", side_effect=OSError("launch unavailable")), patch.object(final.os, "killpg", create=True) as kill, patch.object(final.signal, "signal"):
            with self.assertRaises(OSError):
                final.run_supervised(output, "a" * 64)
            kill.assert_not_called()
            self.assertEqual(final.read(output / "interrupted.json")["reason"], "launch-error")

    def test_timeout_escalates_to_kill_and_reaps_process(self):
        child = Mock(pid=4321)
        child.poll.return_value = None
        child.wait.side_effect = [final.subprocess.TimeoutExpired("worker", 7200), final.subprocess.TimeoutExpired("worker", 10), 0]
        with isolated_output() as output, patch.object(final.subprocess, "Popen", return_value=child), patch.object(final.os, "killpg", create=True) as kill, patch.object(final.signal, "signal"), patch.object(final.signal, "SIGKILL", 9, create=True):
            with self.assertRaises(final.subprocess.TimeoutExpired):
                final.run_supervised(output, "a" * 64)
            self.assertEqual(kill.call_count, 2)
            self.assertEqual(child.wait.call_count, 3)
            self.assertEqual(final.read(output / "interrupted.json")["reason"], "runtime-limit")


if __name__ == "__main__":
    unittest.main()
