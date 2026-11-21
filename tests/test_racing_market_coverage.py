"""Synthetic fixtures exercise the offline archive coverage contract."""
from datetime import datetime
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from audit_racing_market_coverage import audit, SAFE
from archive_horse_markets import digest


class RacingCoverageTests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.as_of = datetime.fromisoformat('2026-11-21T10:00:00+00:00')

    def capture(self, observed='2026-11-21T08:50:00Z', **changes):
        row = {**SAFE, 'schema_version':1, 'kind':'HORSE_SOURCE_MARKET_CAPTURE', 'race_id':'1',
               'racecourse':'Synthetic course', 'startUTC':'2026-11-21T12:00:00Z', 'observed_at_utc':observed,
               'publisher':'Sporting Life', 'bookmaker':'Sky Bet', 'bookmaker_race_id':'12',
               'bookmaker_market_id':'2.3', 'active_runner_ids':['8','9'], 'executable_verified':False,
               'challenge_eligible':0, 'source_sha256':'a'*64,
               'quotes':[{'horse_id':'8','decimal':2}, {'horse_id':'9','decimal':3}], **changes}
        row.setdefault('source','https://www.sportinglife.com/racing/racecards/2026-11-21/test/racecard/' + row['race_id'])
        row['record_sha256'] = digest(row)
        folder = self.root / '2026-11-21' / row['race_id']
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / (row['record_sha256'] + '.json')
        path.write_text(json.dumps(row), encoding='utf-8')
        return path

    def test_offset_duplicate_and_stale_vs_fresh(self):
        old = self.capture()
        new = self.capture('2026-11-21T10:35:00+01:00', source_sha256='b'*64)
        report = audit([old,new,old], self.as_of, include_pairs=True)
        self.assertEqual(report, audit([new,old,old], self.as_of, include_pairs=True))
        self.assertEqual(report['archive_counts']['duplicate_files'],1)
        self.assertEqual(audit([old],self.as_of)['stale_upcoming_source_observed_races'],1)
        self.assertEqual(report['historical_source_observed_races'],0)
        self.assertEqual(report['fresh_source_observed_races'],1)
        self.assertEqual(report['comparable_races'][0]['record_sha256_pairs'],[[old.stem,new.stem]])
        self.assertEqual(report['eligible_real_forecasts_added'],0)
        self.assertEqual(report['executable_prices_verified'],0)

    def test_no_conflict_bridging_or_market_reuse(self):
        observations = [self.capture(), self.capture('2026-11-21T09:50:00Z')]
        observations.append(self.capture('2026-11-21T09:50:00Z',source_sha256='b'*64))
        report = audit(observations,self.as_of)
        self.assertEqual(report['archive_counts']['races_with_observation_conflict'],1)
        self.assertEqual(report['consecutive_comparable_pairs'],0)
        report = audit([*observations[:2],self.capture(race_id='2')],self.as_of)
        self.assertEqual(report['archive_counts']['observations_with_market_id_collision'],3)
        self.assertEqual(report['fresh_source_observed_races'],0)

    def test_malformed_failed_synthetic_and_cross_sport_inputs(self):
        for path, reason in [
            (self.capture(origin='synthetic'), 'unsupported_evidence_tier'),
            (self.capture(research_only=1), 'unsupported_evidence_tier'),
            (self.capture(kind='FOOTBALL_MARKET_CAPTURE'), 'unsupported_evidence_tier'),
            (self.capture('2026-11-21T08:50:00'), 'unreadable_or_invalid_record'),
            (self.capture('2026-11-21T10:00:01Z'), 'invalid_chronology'),
            (self.capture(source_sha256='absent'), 'unsupported_receipt'),
            (self.capture(race_id='4', source='https://www.sportinglife.com/racing/racecards/2026-11-21/test/racecard/1'), 'unsupported_receipt'),
            (self.capture(quotes=[]), 'incomplete_field'),
            (self.root/'missing.json', 'unreadable_or_invalid_record'),
        ]:
            with self.subTest(reason=reason,path=path):
                self.assertEqual(audit([path],self.as_of)['archive_counts'][reason],1)

    def test_changed_field_or_kickoff_not_compared(self):
        for update in ({'startUTC':'2026-11-21T12:01:00Z'}, {'bookmaker_market_id':'5.6'}):
            report = audit([self.capture(),self.capture('2026-11-21T09:50:00Z',**update)],self.as_of)
            self.assertEqual(report['consecutive_comparable_pairs'],0)
