"""Paginated collection and aggregate-only model publication, with no network."""
import datetime as dt
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import collect_darts_research as collector

NOW = dt.datetime(2026, 11, 19, 9, tzinfo=dt.timezone.utc)
A = {'player_id':'pl_AAAAAA','name':'Alice'}
B = {'player_id':'pl_BBBBBB','name':'Bob'}

def result(i, day):
    return {'match_id':f'mt_{i:08d}', 'played_on':day, 'winner':A,
            'loser':B, 'result_status':'final'}

FIXTURE = {'fixture_id':'fx_12345678','date_confirmed':True,
    'starts_at':'2026-11-20T18:00:00Z','players':[A,B],'competition':'Test Cup'}

class DartsAnalysis(unittest.TestCase):
    def response(self, endpoint, params, key):
        if endpoint == '/v1/fixtures':
            rows, cursor = [FIXTURE], None
        else:
            # Two pages in each of four weeks, two matches per player per week.
            day = params['from']
            i = int(day.replace('-','')) * 2 + bool(params.get('cursor'))
            rows = [result(i, day)]
            cursor = None if params.get('cursor') else 'second'
        return {'data':rows,'meta':{'next_cursor':cursor}}, 'a'*64

    @patch.object(collector, 'request')
    def test_all_pages_feed_unchanged_d1_without_raw_archive(self, request):
        request.side_effect = self.response
        report = collector.analysis_snapshot(NOW, 'test-key')
        self.assertEqual(report['training_matches'],8)
        self.assertEqual(report['fixtures'][0]['prior_a'],8)
        self.assertEqual(report['fixtures'][0]['status'],'EXPERIMENTAL_UNCALIBRATED')
        self.assertEqual(report['coverage']['history_period'],['2026-10-15','2026-11-11'])
        self.assertEqual(len(report['source_receipts']),9)
        self.assertNotIn('results',report)
        self.assertNotIn('played_at',json.dumps(report))
        self.assertFalse(report['raw_history_published'])
        self.assertFalse(report['betting_eligible'])
        self.assertIsNone(report['odds'])

    @patch.object(collector, 'request')
    def test_repeated_cursor_withholds_partial_history(self, request):
        request.return_value = {'data':[], 'meta':{'next_cursor':'repeat'}}, 'a'*64
        with self.assertRaisesRegex(RuntimeError, 'pagination cursor'):
            collector.analysis_snapshot(NOW, 'test-key')

    @patch.object(collector, 'request')
    def test_date_filter_violation_withholds_analysis(self, request):
        request.return_value = {'data':[result(1,'2026-11-18')], 'meta':{}}, 'a'*64
        with self.assertRaisesRegex(RuntimeError, 'outside'):
            collector.analysis_snapshot(NOW, 'test-key')

    @patch.object(collector, 'request')
    def test_bad_result_does_not_silently_shrink_training_set(self, request):
        def bad(endpoint, params, key):
            payload, digest = self.response(endpoint,params,key)
            if endpoint == '/v1/results':payload['data'][0]['winner'] = None
            return payload,digest
        request.side_effect = bad
        with self.assertRaisesRegex(RuntimeError, 'normalization'):
            collector.analysis_snapshot(NOW,'test-key')

if __name__ == '__main__':unittest.main()
