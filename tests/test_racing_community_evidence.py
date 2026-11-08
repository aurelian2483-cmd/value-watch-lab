#!/usr/bin/env python3
"""Regression checks for sourced community selections and racecard matching."""
import json
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from datetime import datetime
ROOT=Path(__file__).resolve().parents[1]
class CommunityEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.feed=json.loads((ROOT/'racing-research/source-observations.json').read_text())
        cls.races=json.loads((ROOT/'racing-research-data.json').read_text())['races']
    def test_source_evidence_matches_race(self):
        lookup={str(r['race_id']):r for r in self.races}
        for entry in self.feed['entries']:
            if entry.get('verification')!='PUBLIC_SELECTION_OBSERVED':
                continue
            race=lookup.get(str(entry['race_id']))
            if race is None:
                continue # archive can include previous race days
            with self.subTest(entry=entry['id']):
                self.assertEqual(entry['startUTC'],race['startUTC'])
                self.assertIn(entry['horse'].casefold(),[h['name'].casefold() for h in race['runners']])
                self.assertEqual(urlsplit(entry['url']).scheme,'https')
                self.assertLess(datetime.fromisoformat(entry['observed_at_utc']),datetime.fromisoformat(race['startUTC']))
    def test_naas_1230_has_multiple_domains(self):
        entries=[e for e in self.feed['entries'] if str(e.get('race_id'))=='947661' and e.get('horse')=='The Mourne Rambler' and e.get('verification')=='PUBLIC_SELECTION_OBSERVED']
        self.assertGreaterEqual(len({urlsplit(e['url']).hostname for e in entries}),2)
    def test_no_collector_candidate_promoted(self):
        for e in self.feed['entries']:
            if e.get('id','').startswith('rss-'):
                self.assertEqual(e.get('verification'),'RSS_EXPLICIT_MENTION_REVIEW_REQUIRED')
if __name__=='__main__':unittest.main()
