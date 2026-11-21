import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from check_provider_readiness import REGISTRY, readiness


class ProviderReadinessTests(unittest.TestCase):
    def setUp(self):
        self.registry = json.loads(REGISTRY.read_text(encoding='utf-8'))

    def test_all_nine_sports_block_when_credentials_are_missing(self):
        report = readiness(self.registry, {})
        self.assertEqual(len(report['sports']), 9)
        self.assertTrue(all('NEEDS CREDENTIALS' in row['states'] for row in report['sports']))
        self.assertTrue(all('NEEDS RIGHTS REVIEW' in row['states'] for row in report['sports']))
        self.assertEqual(report['model_validation'], 'UNVALIDATED')
        self.assertEqual(report['publication_gate'], 'BLOCKED')

    def test_credential_presence_does_not_approve_rights(self):
        env = {'FOOTBALL_DATA_API_KEY': 'synthetic-token', 'RACING_API_USERNAME': '  '}
        report = readiness(self.registry, env)
        self.assertTrue(report['credentials']['FOOTBALL_DATA_API_KEY'])
        self.assertFalse(report['credentials']['RACING_API_USERNAME'])
        self.assertNotIn('READY FOR TESTING', report['sports'][0]['states'])
        self.assertNotIn('NEEDS CREDENTIALS', report['sports'][0]['states'])

    def test_all_gates_and_credentials_required_for_testing_only(self):
        registry = copy.deepcopy(self.registry)
        row = registry['sports'][0]
        row.update(access_authorized=True, rights_approved=True, independent_source_reviewed=True)
        report = readiness(registry, {'FOOTBALL_DATA_API_KEY': 'synthetic-token'})
        self.assertEqual(report['sports'][0]['states'], ['READY FOR TESTING'])
        self.assertEqual(report['publication_gate'], 'BLOCKED')
        self.assertEqual(readiness(registry, {})['sports'][0]['states'], ['NEEDS CREDENTIALS'])

    def test_duplicate_sport_and_unrecognised_provider_fail_closed(self):
        broken = copy.deepcopy(self.registry)
        broken['sports'][1]['id'] = broken['sports'][0]['id']
        with self.assertRaises(ValueError):
            readiness(broken, {})
        broken = copy.deepcopy(self.registry)
        broken['sports'][0]['providers'] = ['unknown']
        with self.assertRaises(KeyError):
            readiness(broken, {})

    def test_cli_does_not_print_values_or_unrelated_variables(self):
        run = subprocess.run([sys.executable, str(REGISTRY.parents[1] / 'scripts/check_provider_readiness.py')],
                             env={'FOOTBALL_DATA_API_KEY': 'synthetic-secret-marker',
                                  'UNRELATED_TOKEN': 'another-synthetic-marker'},
                             capture_output=True, check=True, text=True)
        self.assertFalse(any(marker in run.stdout + run.stderr for marker in
                             ('synthetic-secret-marker', 'UNRELATED_TOKEN', 'another-synthetic-marker')))
        self.assertTrue(json.loads(run.stdout)['credentials']['FOOTBALL_DATA_API_KEY'])
