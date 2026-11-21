import copy
import unittest

from scripts import football_model_recovery as recovery


class RecoveryRegistryTests(unittest.TestCase):
    def test_configuration_and_prospective_status_are_independently_checked(self):
        original = recovery.evidence.load(recovery.DIRECTORY / 'registry.json')
        recovery.validate_registry(original)
        for kind in ('configuration', 'duplicate', 'eligibility'):
            registry = copy.deepcopy(original)
            row = registry['components'][0]
            if kind == 'configuration':
                row['configuration']['minimum_league'] += 1
            elif kind == 'duplicate':
                registry['components'].append(row)
            else:
                row['prospective_eligibility'] = 'admitted'
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                recovery.validate_registry(registry)

    def test_arbitrary_revision_and_paths_do_not_open_files(self):
        for revision, path in (('HEAD', 'paper-lab/engine.js'), (recovery.BASE, '../outside.js'),
                               (recovery.ARCHIVE, 'data/holdout.csv')):
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'invalid pinned source'):
                recovery.git_source(revision, path, '0' * 64)
