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

    def test_byte_pin_rejects_changed_archive_and_working_implementation(self):
        from pathlib import Path
        from tempfile import TemporaryDirectory
        from types import SimpleNamespace
        from unittest.mock import patch
        relative = 'paper-lab/synthetic.js'
        source = b"'use strict';\n"
        digest = recovery.evidence.digest(source)
        with TemporaryDirectory(prefix='immutable football source ') as workspace:
            root = Path(workspace)
            file = root / relative
            file.parent.mkdir()
            file.write_bytes(source.replace(b'\n', b'\r\n'))
            with patch.object(recovery.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=source)):
                self.assertEqual(recovery.git_source(recovery.BASE, relative, digest, root), source)
                with self.assertRaisesRegex(ValueError, 'pinned source SHA-256 mismatch'):
                    recovery.git_source(recovery.BASE, relative, '0' * 64, root)
                file.write_bytes(source + b'module.exports = {};')
                with self.assertRaisesRegex(ValueError, 'working implementation differs'):
                    recovery.git_source(recovery.BASE, relative, digest, root)
