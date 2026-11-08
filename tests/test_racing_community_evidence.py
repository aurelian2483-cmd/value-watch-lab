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
    def test_no_collector_candidate_promoted(self):
        for e in self.feed['entries']:
            if e.get('id','').startswith('rss-'):
                self.assertIn(e.get('verification'),('RSS_EXPLICIT_MENTION_REVIEW_REQUIRED','RSS_EXPLICIT_HEADLINE_UNVERIFIED','PRIMARY_POST_CAPTURED'))
                if e.get('verification')=='PRIMARY_POST_CAPTURED':
                    self.assertIn(e['primary_capture']['method'],('JSONLD_DISCUSSION_POST_V1','NATIVE_FORUM_FEED_V1'))
                    self.assertEqual(e['primary_capture']['receipt']['url'],e['source_feed'] if e['primary_capture']['method']=='NATIVE_FORUM_FEED_V1' else e['url'])
                    self.assertEqual(len(e['primary_capture']['receipt']['sha256']),64)
                if e.get('verification') == 'RSS_EXPLICIT_HEADLINE_UNVERIFIED':
                    self.assertEqual(e.get('extraction_method'),'explicit_headline')
    def test_explicit_headline_selection_rules(self):
        import importlib.util
        spec=importlib.util.spec_from_file_location('racing_collector',ROOT/'scripts/collect_racing_community.py')
        module=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        positive=('NAP: The Mourne Rambler','The Mourne Rambler - Tip','Pick: Low Kick')
        for headline in positive:
            horse='Low Kick' if 'Low Kick' in headline else 'The Mourne Rambler'
            with self.subTest(headline=headline):
                self.assertTrue(module.explicit_headline_pick(headline,horse))
        for headline in ('Preview: The Mourne Rambler is running','Tips for Naas including The Mourne Rambler','NAP: Another Horse'):
            with self.subTest(headline=headline):
                self.assertFalse(module.explicit_headline_pick(headline,'The Mourne Rambler'))
if __name__=='__main__':unittest.main()
