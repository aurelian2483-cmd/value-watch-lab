"""Run the isolated evidence lifecycle acceptance suite and emit a reproducible receipt."""
import argparse
import json
from pathlib import Path
import sys
import unittest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    suite = unittest.defaultTestLoader.discover(str(Path(__file__).resolve().parent), 'test_lifecycle.py')
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    receipt = {
        'scope': 'DISPOSABLE_SYNTHETIC_EVIDENCE_LIFECYCLE',
        'tests': result.testsRun,
        'failures': [case.id() for case, _ in result.failures],
        'errors': [case.id() for case, _ in result.errors],
        'skipped': [case.id() for case, _ in result.skipped],
        'live_collection_enabled': False,
        'external_tsa_qualified': False,
        'external_reviewer_signoff': False,
        'model_validation': 'UNVALIDATED',
        'publication_gate': 'BLOCKED',
    }
    with args.output.open('x', encoding='utf-8') as handle:
        json.dump(receipt, handle, indent=2, sort_keys=True)
        handle.write('\n')
    return 0 if result.wasSuccessful() and not result.skipped else 1


if __name__ == '__main__':
    sys.exit(main())
