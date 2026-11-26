"""Run the complete disposable Phase 3 acceptance environment and write its receipt."""
import argparse
import json
from pathlib import Path
import sys
import unittest

from ledger import protocol
from test_repair import INTAKE_BOUNDARIES, SCHEDULE_BOUNDARIES


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    suite = unittest.defaultTestLoader.discover(str(root), 'test_repair.py')
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    receipt = dict(scope='DISPOSABLE_SYNTHETIC_ACCEPTANCE', tests=result.testsRun,
                   failures=[test.id() for test, _ in result.failures],
                   errors=[test.id() for test, _ in result.errors],
                   skipped=[test.id() for test, _ in result.skipped],
                   intake_process_exit_boundaries=list(INTAKE_BOUNDARIES),
                   scheduler_process_exit_boundaries=list(SCHEDULE_BOUNDARIES),
                   registered_live_collection=False, external_reviewer_signoff=False, **protocol.GUARDS)
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(receipt, stream, sort_keys=True, indent=2)
        stream.write('\n')
    return 0 if result.wasSuccessful() and not result.skipped else 1


if __name__ == '__main__':
    sys.exit(main())
