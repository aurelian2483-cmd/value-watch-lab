import datetime as dt
import importlib.util
import pathlib
import unittest

module=pathlib.Path(__file__).resolve().parents[1]/'scripts/collect_reliability_history.py'
spec=importlib.util.spec_from_file_location('historical_collector',module)
collector=importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)
NOW=dt.datetime(2026,11,15,1,tzinfo=dt.timezone.utc)
HEADER='date,home,away,ft_home,ft_away,ft_result,source\n'

class HistoricalArchiveTests(unittest.TestCase):
    def test_rejects_invalid_scores_and_same_day_future_leak(self):
        csv=HEADER+('2026-11-10,Man City,Fulham,2,0,H,espn\n'
            '2026-11-11,Arsenal,Chelsea,1,0,A,espn\n'
            '2026-11-15,Liverpool,Everton,1,0,H,espn\n'
            '2026-11-17,Leeds,Hull,0,0,D,espn\n')
        rows=collector.parse_results(csv,'Premier League','https://example.test',NOW)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['kickoff_utc'],'2026-11-10T23:59:59Z')
    def test_source_failure_preserves_previous_archive(self):
        def bad(url):
            if 'europa-league' in url:raise OSError('unavailable')
            return HEADER+'2026-11-10,Home,Away,1,0,H,espn\n'
        with self.assertRaisesRegex(RuntimeError,'Europa League'):
            collector.collect(bad,NOW)
    def test_seven_leagues_and_explicit_no_value(self):
        samples=''.join('2026-11-%02d,Home%d,Away%d,1,0,H,espn\n'%(i,i,i) for i in range(1,15))
        feed=collector.collect(lambda _:HEADER+samples,NOW)
        self.assertEqual(len(feed['audit']),7)
        self.assertEqual(len(feed['results']),98)
        self.assertEqual(feed['source_verification'],'SINGLE_SOURCE_UNVERIFIED')
        self.assertEqual(feed['publication_gate'],'BLOCKED')

if __name__=='__main__':unittest.main()
