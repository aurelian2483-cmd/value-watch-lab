import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import preserve_horse_evidence as E


class EvidenceReceiptTests(unittest.TestCase):
    env = {'GITHUB_REPOSITORY': 'owner/repo', 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1'}

    def setup_evidence(self, folder):
        repo, work = Path(folder) / 'repo', Path(folder) / 'work'
        (repo / 'research/horse-context-archive/v1').mkdir(parents=True)
        (work / 'runner-sources').mkdir(parents=True)
        raw = b'<html>Public racecard evidence</html>'
        sha = hashlib.sha256(raw).hexdigest()
        record = {'record_sha256': 'b' * 64, 'runner_source_sha256': sha,
                  'source': 'https://www.sportinglife.com/racing/racecard/123/test'}
        (repo / 'research/horse-context-archive/v1/test.json').write_text(json.dumps(record))
        (work / 'runner-sources/123.html').write_bytes(raw)
        return repo, work, raw, record

    def test_exact_hash_dedup_idempotence_and_no_source_publication(self):
        with tempfile.TemporaryDirectory() as folder:
            repo, work, raw, record = self.setup_evidence(folder)
            (work / 'result-sources').mkdir()
            (work / 'result-sources/123.html').write_bytes(raw)
            saved = E.preserve(repo, work, environment=self.env)
            self.assertEqual(len(saved['sources']), 1)
            self.assertEqual(saved['sources'][0]['sha256'], record['runner_source_sha256'])
            self.assertEqual(saved['sources'][0]['byte_count'], len(raw))
            self.assertEqual(saved['sources'][0]['artifact_paths'], ['runner-sources/123.html', 'result-sources/123.html'])
            E.preserve(repo, work, environment=self.env)
            paths = list((repo / 'research/horse-evidence-receipts/v1').glob('*.json'))
            self.assertEqual(len(paths), 1)
            self.assertNotIn(raw.decode(), paths[0].read_text())
            self.assertFalse(saved['independent_timestamp_attested'])
            self.assertEqual(saved['requested_raw_retention_days'], 90)

    def test_missing_corrupt_bytes_are_not_claimed_recoverable(self):
        with tempfile.TemporaryDirectory() as folder:
            repo, work, raw, record = self.setup_evidence(folder)
            (work / 'runner-sources/123.html').write_bytes(b'corrupt or different snapshot')
            result = E.preserve(repo, work, environment=self.env)
            self.assertEqual(result['sources'], [])
            self.assertEqual(result['unavailable_referenced_source_count'], 1)

    def test_tampered_receipt_blocks_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            repo, work, raw, record = self.setup_evidence(folder)
            E.preserve(repo, work, environment=self.env)
            path = next((repo / 'research/horse-evidence-receipts/v1').glob('*.json'))
            body = json.loads(path.read_text()); body['sources'][0]['byte_count'] += 1
            path.write_text(json.dumps(body))
            with self.assertRaisesRegex(ValueError, 'integrity mismatch'):
                E.preserve(repo, work, environment=self.env)

    def test_no_authenticated_payload_or_sensitive_url_is_published(self):
        with tempfile.TemporaryDirectory() as folder:
            repo, work, raw, record = self.setup_evidence(folder)
            record['source'] += '?api_key=secret'
            (repo / 'research/horse-context-archive/v1/test.json').write_text(json.dumps(record))
            (work / 'secondary-source-snapshots').mkdir()
            (work / 'secondary-source-snapshots/private.json').write_text('{"password":"secret"}')
            result = E.preserve(repo, work, environment=self.env)
            encoded = json.dumps(result)
            self.assertNotIn('secret', encoded)
            self.assertEqual(result['sources'], [])
            self.assertFalse(E.public_source('https://user:password@www.sportinglife.com/card'))

    def test_run_identity_is_required_and_scan_budget_is_disclosed(self):
        with tempfile.TemporaryDirectory() as folder:
            repo, work, raw, record = self.setup_evidence(folder)
            with self.assertRaisesRegex(ValueError, 'run identity'):
                E.preserve(repo, work, environment={})
            limit = E.MAX_SCAN_BYTES
            try:
                E.MAX_SCAN_BYTES = 1
                result = E.preserve(repo, work, environment=self.env)
            finally:
                E.MAX_SCAN_BYTES = limit
            self.assertTrue(result['scan_limit_reached'])
            self.assertEqual(result['sources'], [])


if __name__ == '__main__':
    unittest.main()
