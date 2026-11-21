import json
from pathlib import Path
import tempfile
import unittest

from scripts.audit_football_result_reconciliation import INPUTS, audit, markdown


class ResultAuditFixture(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.source = {
            'competition':'Premier League','home':'Man City','away':'Fulham',
            'kickoff_utc':'2026-11-08T23:59:59Z','time_precision':'DATE_ONLY_END_OF_DAY',
            'score_home':2,'score_away':1,'source_url':'https://example.org/source.csv'
        }
        self.final = {
            'league':'PL','home':'Manchester City','away':'Fulham',
            'kickoff_utc':'2026-11-08T13:30:00Z','score_home':2,'score_away':1,
            'fixture_id_namespace':'example','provider_fixture_id':'event-1',
            'publication_gate':'BLOCKED','verification':'TWO_SOURCE_REGULATION_TIME_FINAL',
            'source_receipts':[
                {'url':f'https://{host}/result','sha256':'a'*64,'observed_at_utc':'2026-11-08T17:00:00Z'}
                for host in ('first.example','second.example')
            ]
        }

    def write(self, kind, document):
        path = self.root / INPUTS[kind][0]
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(document),encoding='utf-8')

    def report(self, sources=None, finals=None):
        self.write('single',{'coverage_season':'2026/27','results':[self.source] if sources is None else sources,
            'audit':[{'competition':'Premier League','source_url':self.source['source_url'],'csv_sha256':'b'*64}]})
        self.write('expanded',{'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
            'generated_at_utc':'2026-11-08T18:00:00Z','performance':{'entries':[self.final] if finals is None else finals}})
        return audit(self.root)


class FootballResultAuditTests(ResultAuditFixture):
    def test_reviewed_alias_is_likely_without_shared_id(self):
        row = self.report()['single_source_rows'][0]
        self.assertEqual(row['classification'],'likely_overlap_identity_review')
        self.assertEqual(row['participants'],['Manchester City','Fulham'])
        self.assertIsNone(row['kickoff_utc'])
        self.assertEqual(row['date'],'2026-11-08')
        self.assertEqual(row['source_csv_sha256'],'b'*64)

    def test_exact_identity_needs_namespaced_id_and_two_source_receipts(self):
        self.source.update(fixture_id_namespace='example',provider_fixture_id='event-1')
        self.assertEqual(self.report()['classification_counts']['exact_fixture_and_score'],1)
        self.source['provider_fixture_id'] = 'wrong-id'
        self.assertEqual(self.report()['classification_counts']['ambiguous_identity'],1)
        self.source['provider_fixture_id'] = 'event-1'
        self.final['source_receipts'].pop()
        self.assertEqual(self.report()['classification_counts']['likely_overlap_identity_review'],1)

    def test_reverse_order_and_same_day_ambiguity(self):
        reversed_row = {**self.source,'home':'Fulham','away':'Man City','score_home':1,'score_away':2}
        result = self.report([reversed_row])['single_source_rows'][0]
        self.assertEqual(result['classification'],'ambiguous_identity')
        self.assertFalse(result['candidates'][0]['ordered_participants_match'])
        second = {**self.final,'kickoff_utc':'2026-11-08T14:00:00Z','provider_fixture_id':'event-2'}
        self.assertEqual(self.report(finals=[self.final,second])['classification_counts']['ambiguous_identity'],1)
        second['kickoff_utc'] = self.final['kickoff_utc']
        self.assertEqual(self.report(finals=[self.final,second])['classification_counts']['ambiguous_identity'],1)

    def test_unsupported_competition_unmatched_and_outside(self):
        fixtures = [{**self.source,'competition':'Unknown'},{**self.source,'competition':'Europa League'},
                    {**self.source,'home':'Unreviewed Similar Name'}]
        result = self.report(fixtures)
        self.assertEqual([row['classification'] for row in result['single_source_rows']],
                         ['ambiguous_identity','outside_centre_coverage','unmatched'])

    def test_repeats_and_score_conflicts(self):
        result = self.report([self.source,self.source],[self.final,self.final])
        self.assertEqual(result['candidate_rows'],1)
        self.assertEqual(result['classification_counts']['duplicate_or_repeated'],1)
        self.assertEqual(result['reference_counts']['duplicate_or_repeated'],1)
        self.assertEqual(result['single_source_rows'][0]['candidates'][1]['classification'],'duplicate_or_repeated')
        changed = {**self.final,'score_home':3}
        self.assertEqual(self.report(finals=[changed])['classification_counts']['score_conflict'],1)
        self.assertEqual(self.report(finals=[self.final,changed])['classification_counts']['score_conflict'],1)

    def test_missing_inputs_and_determinism(self):
        missing = audit(self.root)
        self.assertEqual(missing['inputs']['single']['state'],'missing')
        self.assertEqual(missing['classified_rows'],0)
        start = self.report()
        checksums = {path:path.read_bytes() for path in self.root.iterdir() if path.is_file()}
        self.assertEqual(json.dumps(start),json.dumps(audit(self.root)))
        self.assertEqual(markdown(start),markdown(audit(self.root)))
        self.assertTrue(all(path.read_bytes()==raw for path,raw in checksums.items()))


if __name__ == '__main__':
    unittest.main()
