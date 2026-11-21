import json
import unittest

from scripts import audit_football_result_reconciliation, audit_verified_results_pilot
from test_football_result_reconciliation import ResultAuditFixture

pilot = audit_verified_results_pilot


class VerifiedResultsPilotTests(ResultAuditFixture):
    as_of = {'as_of_utc':'2026-11-09T00:00:00Z','source_assessments':[]}

    def prepare_archive(self):
        record = {'league':'PL','home':'Manchester City','away':'Fulham',
                  'kickoff_utc':self.final['kickoff_utc'],'espn_event_id':'12345'}
        key = pilot.digest(json.dumps(record,sort_keys=True,separators=(',',':')).encode())
        self.final['record_sha256'] = key
        self.report()
        path = f'research/football-expanded-archive/v1/{key}.json'
        return path, {**record,'record_sha256':key}

    def test_archive_anchor_does_not_transfer_identity(self):
        path, archive = self.prepare_archive()
        reader = lambda name: json.dumps(archive).encode() if name == path else None
        result = pilot.review(self.root,self.as_of,reader)
        self.assertEqual(result['single_source_dispositions'],{pilot.LINKED:1})
        pair = result['candidate_pair_evidence'][0]
        self.assertEqual(pair['reference_anchor']['provider_fixture_id'],'espn:12345')
        self.assertEqual(pair['independence']['state'],'independence_unestablished')
        self.assertEqual(result['verified_coverage_gained'],0)
        self.assertIsNone(result['input_audit']['single_source_rows'][0]['kickoff_utc'])
        self.assertEqual(result,pilot.review(self.root,self.as_of,reader))
        archive['espn_event_id'] = '54321'
        self.assertEqual(pilot.review(self.root,self.as_of,reader)['single_source_dispositions'],{pilot.SOURCE_CONFLICT:1})

    def test_shared_host_label_does_not_count_as_independent(self):
        self.source['upstream_provider'] = 'espn'
        self.final['source_receipts'][0]['url'] = 'https://site.api.espn.com/scoreboard'
        path, archive = self.prepare_archive()
        report = pilot.review(self.root,self.as_of,lambda name:json.dumps(archive).encode() if name == path else None)
        self.assertEqual(report['candidate_pair_evidence'][0]['independence']['state'],'shared_claimed_upstream')
        self.assertEqual(report['verified_coverage_gained'],0)

    def test_missing_archive_and_stale_snapshot(self):
        self.prepare_archive()
        source_file = self.root / audit_football_result_reconciliation.INPUTS['single'][0]
        source = json.loads(source_file.read_text(encoding='utf-8'))
        source['generated_at_utc'] = '2026-11-06T00:00:00Z'
        self.write('single',source)
        report = pilot.review(self.root,self.as_of,lambda _:None)
        self.assertEqual(report['single_snapshot_freshness'],'stale')
        self.assertEqual(report['single_source_dispositions'],{pilot.AMBIGUOUS:1})
        self.assertEqual(report['candidate_pair_evidence'][0]['reference_anchor']['state'],'archive_unavailable')
        source_file.unlink()
        report = pilot.review(self.root,self.as_of,lambda _:None)
        self.assertEqual(report['single_snapshot_freshness'],'unavailable')
        self.assertEqual(report['single_source_dispositions'],{})
