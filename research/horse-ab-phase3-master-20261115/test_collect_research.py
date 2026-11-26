"""Regression tests for the unregistered acquisition adapter only."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import collect_research as adapter


class AcquisitionTests(unittest.TestCase):
    def test_local_requires_receipt_identity_and_exact_bytes(self):
        ref = 'a' * 40
        with TemporaryDirectory() as temp:
            data, receipt = (Path(temp) / name for name in ('feed.json', 'receipt.json'))
            raw = b'{"forecasts": []}\n'
            data.write_bytes(raw)
            values = {
                'repository': adapter.REPOSITORY, 'path': adapter.FEED_PATH, 'commit': ref,
                'raw_sha256': hashlib.sha256(raw).hexdigest(),
                'git_blob_sha1': adapter.git_blob_sha1(raw),
            }
            with self.assertRaisesRegex(adapter.ab.ResearchError, 'LOCAL_FEED_AND_RECEIPT'):
                adapter.acquire(ref, data, None)
            receipt.write_text(json.dumps(values), encoding='utf-8')
            self.assertEqual(adapter.acquire(ref, data, receipt)[0], raw)
            with self.assertRaisesRegex(adapter.ab.ResearchError, 'IDENTITY_MISMATCH'):
                adapter.acquire('b' * 40, data, receipt)
            data.write_bytes(raw + b' ')
            with self.assertRaisesRegex(adapter.ab.ResearchError, 'BYTES_MISMATCH'):
                adapter.acquire(ref, data, receipt)

    def test_collection_uses_clock_after_read_and_parse(self):
        received = datetime(2026, 11, 26, 12, 0, tzinfo=timezone.utc)
        inspected = received + timedelta(seconds=5)
        with patch.object(adapter.ab, 'registration'), patch.object(adapter, 'acquire',
                return_value=(b'{}', 'test', 'fixture', None)) as read, patch.object(
                adapter.ab, 'utcnow', side_effect=[received, inspected]) as clock, patch.object(
                adapter.ab, 'store_object', return_value='receipt') as store, patch.object(
                adapter.ab, 'inspect_feed', return_value={'new_paired_forecasts': 0}) as inspect:
            clock.side_effect = lambda: self.next_after_acquire(read, store, received, inspected)
            result = adapter.collect(Path('unused'), 'a' * 40)
        self.assertEqual(result['acquisition_receipt_sha256'], 'receipt')
        stamped = store.call_args.args[2]
        self.assertEqual(stamped['observed_at_utc'], received.isoformat())
        self.assertIs(stamped['independent_timestamp_attested'], False)
        self.assertEqual(inspect.call_args.args[2], inspected)

    def next_after_acquire(self, read, store, received, inspected):
        read.assert_called_once()
        return inspected if store.called else received
