"""Mechanical checks for original batch A; not an educator or semantic audit."""

from collections import Counter, defaultdict
import importlib.util
from pathlib import Path
import re
import sys
import unittest


_PATH = Path(__file__).with_name('qwen3_evidence_integrity_data_a.py')
_SPEC = importlib.util.spec_from_file_location('integrity_data_a', _PATH)
DATA = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(DATA)


class OriginalIntegrityDataATests(unittest.TestCase):
    def setUp(self):
        self.rows = DATA.rows()

    def test_exact_size_and_individual_contexts(self):
        self.assertEqual(len(self.rows), 150)
        self.assertEqual(len({r['id'] for r in self.rows}), 150)
        self.assertEqual(len({r['source'] for r in self.rows}), 75)
        self.assertEqual(len({r['question'] for r in self.rows}), 150)
        self.assertTrue(all(r['id'].startswith('pref-integrity-a-') for r in self.rows))

    def test_balanced_cross_product(self):
        self.assertEqual(Counter(r['subject'] for r in self.rows),
                         dict.fromkeys(['math', 'reading', 'English', 'science', 'history'], 30))
        self.assertEqual(Counter(r['preferenceCategory'] for r in self.rows),
                         dict.fromkeys(['evidence-mutation', 'task-scope', 'missing-procedure',
                                        'missing-inputs', 'source-instruction'], 30))
        cross = Counter((r['subject'], r['preferenceCategory']) for r in self.rows)
        self.assertEqual(len(cross), 25)
        self.assertTrue(all(count == 6 for count in cross.values()))

    def test_two_questions_and_two_answerability_states_per_context(self):
        families = defaultdict(list)
        for row in self.rows:
            families[row['family']].append(row)
        self.assertEqual(len(families), 75)
        for pair in families.values():
            self.assertEqual(len(pair), 2)
            self.assertEqual(len({r['question'] for r in pair}), 2)
            self.assertEqual(len({r['source'] for r in pair}), 1)
            self.assertEqual({r['expectedAbstention'] for r in pair}, {True, False})

    def test_complete_schema_and_unvalidated_label(self):
        fields = {'id', 'family', 'subject', 'level', 'source', 'question', 'target',
                  'rejected', 'expectedAbstention', 'acceptedQuotes', 'nextStepAnchors',
                  'answerability', 'preferenceCategory', 'preferenceReason',
                  'conflictingContext', 'sourceInstructionPresent'}
        for row in self.rows:
            self.assertEqual(set(row), fields)
            self.assertIn('unvalidated', row['level'])
            self.assertIsInstance(row['expectedAbstention'], bool)
            self.assertIsInstance(row['conflictingContext'], bool)
            self.assertIsInstance(row['sourceInstructionPresent'], bool)
            self.assertGreater(len(row['preferenceReason']), 100)

    def test_source_lengths_and_exact_relevant_quote_shape(self):
        for row in self.rows:
            with self.subTest(row=row['id']):
                self.assertTrue(180 <= len(row['source']) <= 600)
                evidence = row['target'].splitlines()[0].removeprefix('EVIDENCE: ')
                if row['expectedAbstention']:
                    self.assertEqual(evidence, 'insufficient')
                    self.assertEqual(row['acceptedQuotes'], [])
                    self.assertIn(row['answerability'], {'insufficient', 'conflicting'})
                else:
                    self.assertLessEqual(len(evidence), 240)
                    self.assertIn(evidence, row['source'])
                    self.assertTrue(evidence.endswith(('.', '."')))
                    self.assertEqual(row['acceptedQuotes'], [evidence.strip('"')])
                    self.assertEqual(row['answerability'], 'answerable')

    def test_target_exactly_two_lines_one_operational_question(self):
        for row in self.rows:
            with self.subTest(row=row['id']):
                lines = row['target'].splitlines()
                self.assertEqual(len(lines), 2)
                self.assertTrue(lines[0].startswith('EVIDENCE: '))
                self.assertTrue(lines[1].startswith('NEXT: Can you '))
                self.assertEqual(lines[1].count('?'), 1)
                self.assertTrue(lines[1].endswith('?'))
                self.assertRegex(lines[1], r'\b(inspect|measure|compare|ask|count|check|collect|perform)\b')
                self.assertGreaterEqual(len(row['nextStepAnchors']), 2)
                for anchor in row['nextStepAnchors']:
                    self.assertIn(anchor.lower(), lines[1].lower())
                self.assertNotRegex(lines[1].lower(), r'could some data help|think harder|sounds reasonable')

    def test_rejected_preserves_evidence_but_changes_next(self):
        for row in self.rows:
            preferred = row['target'].splitlines()
            rejected = row['rejected'].splitlines()
            self.assertEqual(len(rejected), 2)
            self.assertEqual(preferred[0], rejected[0])
            self.assertNotEqual(preferred[1], rejected[1])
            self.assertTrue(rejected[1].startswith('NEXT: '))

    def test_conflicts_and_untrusted_instructions(self):
        conflict_sources = {r['source'] for r in self.rows if r['conflictingContext']}
        self.assertEqual(len(conflict_sources), 25)
        instruction_sources = {r['source'] for r in self.rows if r['sourceInstructionPresent']}
        self.assertEqual(len(instruction_sources), 15)
        for row in self.rows:
            if row['preferenceCategory'] == 'source-instruction':
                self.assertTrue(row['sourceInstructionPresent'])
                self.assertIn('untrusted', row['source'])
                self.assertRegex(row['source'], r'Ignore|Disregard')
                self.assertNotIn(row['rejected'].splitlines()[1][6:].removeprefix('Can you '), row['target'])
            else:
                self.assertFalse(row['sourceInstructionPresent'])
            if row['expectedAbstention'] and row['conflictingContext']:
                self.assertEqual(row['answerability'], 'conflicting')

    def test_full_quantitative_input_regressions(self):
        lookup = {r['id']: r for r in self.rows}
        requirements = {
            'walking_rate': ['distance', 'meters', 'elapsed time', 'seconds'],
            'paint_discount': ['paid', 'original', 'before tax', 'same currency'],
            'tank_change': ['verified morning', 'evening', 'liters'],
            'jar_volume': ['interior radius', 'interior height', 'centimeters'],
            'cooling_trial': ['both endpoint temperatures', 'Celsius', 'times', 'minutes'],
            'density_sample': ['mass', 'grams', 'volume', 'cubic centimeters'],
            'plant_growth': ['initial height', 'final height', 'centimeters', 'both observation dates'],
            'census_change': ['starting count', 'later count', 'both dates', 'boundaries', 'definitions'],
            'messenger_trip': ['distance', 'kilometers', 'departure', 'arrival', 'dates', 'time standard'],
            'evaporation_setup': ['initial and final mass', 'grams', 'both observation times', 'hours', 'spills'],
        }
        for name, anchors in requirements.items():
            step = lookup[f'pref-integrity-a-{name}-gap']['target'].splitlines()[1]
            for anchor in anchors:
                self.assertIn(anchor, step, msg=f'{name}: {anchor}')

    def test_rows_returns_fresh_data(self):
        initial = DATA.rows()
        initial[0]['acceptedQuotes'].append('mutated by caller')
        initial[0]['subject'] = 'changed'
        fresh = DATA.rows()
        self.assertEqual(fresh[0]['subject'], 'math')
        self.assertEqual(len(fresh[0]['acceptedQuotes']), 1)

    def test_all_targets_pass_shared_integrity_scorer(self):
        sys.path.insert(0, str(_PATH.parent))
        try:
            from qwen3_evidence_integrity_metrics import score
            for row in self.rows:
                with self.subTest(row=row['id']):
                    result = score(row['target'], row)
                    self.assertTrue(result['relevantSourceQuoteOrAbstention'])
                    self.assertTrue(result['groundedCasePass'])
        finally:
            sys.path.pop(0)

    def test_audited_next_steps_do_not_assume_missing_events_or_inputs(self):
        lookup = {r['id']: r for r in self.rows}
        requirements = {
            'marble_plan-gap': ['whether any cups were filled', 'if so', 'observed marble count', 'each cup'],
            'leaf_label-gap': ['source-tree identity', 'collection date', 'dated age record'],
            'two_arrivals-gap': ['arrival of Nola', 'ferry departure', 'both dates and times', 'same time standard'],
            'race_recollections-gap': ['verified start', 'resolving the two accounts', 'finish', 'both dates and times', 'one time standard'],
            'festival_notice-gap': ['whether the festival was held', 'if it was', 'attendance record', 'attendee count'],
            'lantern_path-supported': ['compare beside the gate', 'before entering the orchard', 'location', 'timing'],
            'blue_scarf-supported': ['compare blue', 'as a signal', 'appearance', 'purpose'],
            'quiet_stairs-supported': ['compare paused', 'listened', 'movement', 'sound'],
            'paper_boat-supported': ['compare in the stream', 'beside the mill', 'two phrases', 'placement location'],
            'leaf_label-supported': ['compare maple', 'leaf', 'plant identity', 'plant part'],
        }
        for suffix, concepts in requirements.items():
            step = lookup[f'pref-integrity-a-{suffix}']['target'].splitlines()[1]
            for concept in concepts:
                self.assertIn(concept, step, msg=f'{suffix}: {concept}')


if __name__ == '__main__':
    unittest.main()
