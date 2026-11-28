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
                return_value=(b'{"skipped":[{"reason":"NO_FIELD"}]}', 'test', 'fixture', None)) as read, patch.object(
                adapter.ab, 'utcnow', side_effect=[received, inspected]) as clock, patch.object(
                adapter.ab, 'store_object', return_value='receipt') as store, patch.object(
                adapter.ab, 'event') as event, patch.object(adapter.ab, 'inspect_feed',
                return_value={'new_paired_forecasts': 0, 'capture_failures': [{'reason': 'STALE'}]}) as inspect:
            clock.side_effect = lambda: self.next_after_acquire(read, store, received, inspected)
            result = adapter.collect(Path('unused'), 'a' * 40)
        self.assertEqual(result['acquisition_receipt_sha256'], 'receipt')
        stamped = store.call_args.args[2]
        self.assertEqual(stamped['observed_at_utc'], received.isoformat())
        self.assertIs(stamped['independent_timestamp_attested'], False)
        self.assertEqual(inspect.call_args.args[2], inspected)
        self.assertEqual(event.call_args.args[1], 'PINNED_FEED_RECEIVED')
        self.assertEqual(event.call_args.kwargs['acquisition_receipt_sha256'], 'receipt')
        self.assertEqual(event.call_args.kwargs['source_snapshot_sha256'], adapter.ab.sha(inspect.call_args.args[0]))
        self.assertEqual(result['capture_failure_counts'], {'STALE': 1})
        self.assertEqual(result['upstream_exclusion_counts'], {'NO_FIELD': 1})
        self.assertEqual(result['intake_checked_at_utc'], inspected.isoformat())

    def next_after_acquire(self, read, store, received, inspected):
        read.assert_called_once()
        return inspected if store.called else received

    def test_bad_skip_rows_cannot_partially_enroll_an_envelope(self):
        for raw, error in ((b'{"skipped":{}}', 'SKIP_LIST_INVALID'),
                           (b'{"skipped":[{"reason":1}]}', 'SKIP_RECORD_INVALID')):
            with self.subTest(raw=raw), patch.object(adapter.ab, 'registration'), patch.object(
                    adapter, 'acquire', return_value=(raw, 'test', 'fixture', None)), patch.object(
                    adapter.ab, 'store_object') as store, patch.object(adapter.ab, 'inspect_feed') as inspect:
                with self.assertRaisesRegex(adapter.ab.ResearchError, error):
                    adapter.collect(Path('unused'), 'a' * 40)
                store.assert_called_once()  # Acquisition receipt only.
                inspect.assert_not_called()

    def test_clock_moving_backwards_blocks_before_enrollment(self):
        received = datetime(2026, 11, 26, 12, tzinfo=timezone.utc)
        with patch.object(adapter.ab, 'registration'), patch.object(adapter, 'acquire',
                return_value=(b'{}', 'test', 'fixture', None)), patch.object(
                adapter.ab, 'utcnow', side_effect=[received, received-timedelta(seconds=1)]), patch.object(
                adapter.ab, 'store_object'), patch.object(adapter.ab, 'event'), patch.object(adapter.ab, 'inspect_feed') as inspect:
            with self.assertRaisesRegex(adapter.ab.ResearchError, 'COLLECTION_CLOCK_MOVED_BACKWARDS'):
                adapter.collect(Path('unused'), 'a' * 40)
            inspect.assert_not_called()

    def test_probe_deletes_disposable_writes_even_on_failure(self):
        root = adapter.ab.ROOT / 'state'
        original = set(root.rglob('*.json'))
        visited = []

        def capture(store, ref, local, receipt):
            self.assertNotEqual(root, store)
            self.assertEqual(adapter.ab.registration(store), adapter.ab.registration(root))
            adapter.ab.event(store, 'PROBE_TEST', adapter.ab.utcnow())
            visited.append(store)
            if ref == 'failure':
                raise adapter.ab.ResearchError('BLOCKED_TEST')
            return {'new_paired_forecasts': 1}

        with patch.object(adapter, 'collect', side_effect=capture):
            output = adapter.probe(root, 'success')
            self.assertEqual(output['new_paired_forecasts'], 1)
            self.assertIs(output['persisted_in_registered_ledger'], False)
            with self.assertRaisesRegex(adapter.ab.ResearchError, 'BLOCKED_TEST'):
                adapter.probe(root, 'failure')
        self.assertTrue(all(not store.exists() for store in visited))
        self.assertEqual(original, set(root.rglob('*.json')))
