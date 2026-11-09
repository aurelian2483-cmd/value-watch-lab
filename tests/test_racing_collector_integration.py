"""Offline collector integration: RSS -> matched runner -> attributed archive.
Uses synthetic future dates and local temporary files; never publishes fake picks.
"""
import datetime as dt
import importlib.util
import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
SPEC=importlib.util.spec_from_file_location("racing_collector_integration",ROOT/"scripts/collect_racing_community.py")
collector=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)
UTC=dt.timezone.utc

class CollectorIntegration(unittest.TestCase):
    def setUp(self):
        published=patch.object(collector,'collect_published',return_value=([],[]))
        published.start();self.addCleanup(published.stop)
        backups=patch.object(collector,'collect_backups',return_value=([],[]))
        backups.start();self.addCleanup(backups.stop)
    def test_native_reply_reaches_checked_primary_archive(self):
        now=dt.datetime(2026,11,8,12,tzinfo=UTC)
        url='https://www.reddit.com/r/HorseRacingUK/comments/abc/tips/def/'
        feed_url='https://www.reddit.com/r/HorseRacingUK/new/.rss'
        xml=ET.fromstring(f'''<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>t1_def</id><title>Tips Thread</title><content type="html">Naas: NAP: Test Horse</content><author><name>/u/TestAlice</name></author><published>2026-11-08T11:00:00Z</published><link href="{url}"/></entry></feed>''')
        collector.FEED_RECEIPTS[id(xml)]={'url':feed_url,'sha256':'a'*64,'observed_at_utc':now.isoformat()}
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'feeds.json').write_text(json.dumps({'sources':[{'publisher':'Test Forum','type':'forum','feed_url':feed_url,'enabled':True}]}))
            (root/'archive.json').write_text(json.dumps({'entries':[]}))
            (root/'races.json').write_text(json.dumps({'races':[{'race_id':'test','name':'Naas 14:00','racecourse':'Naas','startUTC':(now+dt.timedelta(hours=2)).isoformat(),'runners':[{'horse_id':'horse','name':'Test Horse (IRE)','active_runner':True,'runner_status':'RUNNER'}]}]}))
            with patch.object(collector,'CONFIG',root/'feeds.json'),patch.object(collector,'OUT',root/'archive.json'),patch.object(collector,'RACES',root/'races.json'),patch.object(collector,'NOW',now),patch.object(collector,'current_time',return_value=now),patch.object(collector,'fetch',return_value=xml):
                collector.main()
            archive=json.loads((root/'archive.json').read_text())
            entry=archive['entries'][0]
            self.assertEqual(entry['verification'],'PRIMARY_POST_CAPTURED')
            self.assertEqual(entry['author'],'TestAlice')
            self.assertEqual(entry['primary_capture']['method'],'NATIVE_FORUM_FEED_V1')
            self.assertEqual(archive['community_pipeline']['checked_primary_posts'],1)
        collector.FEED_RECEIPTS.pop(id(xml),None)

    def test_native_atom_content_and_author_are_read_without_summary(self):
        xml=ET.fromstring('''<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>t1_abc</id><title>Monday's Tips Thread</title><content type="html">Naas: NAP: Test Horse</content><author><name>/u/TestAlice</name></author><published>2026-11-08T12:00:00Z</published><link rel="self" href="https://example.org/feed"/><link rel="alternate" href="https://www.reddit.com/r/HorseRacingUK/comments/post/tips/abc/"/></entry></feed>''')
        item=list(collector.items(xml))[0]
        self.assertIn('NAP: Test Horse',item['description']);self.assertEqual(item['author'],'/u/TestAlice')
        self.assertTrue(item['full_content']);self.assertIn('/comments/',item['link'])

    def test_official_trf_feed_accepts_positive_body_but_rejects_quotes_and_negations(self):
        now=dt.datetime(2026,11,8,12,tzinfo=UTC)
        source='https://theracingforum.co.uk/forums/forum/daily-lays-and-plays/feed/'
        url='https://theracingforum.co.uk/forums/topic/test-chat/#post-123'
        cases=[('Naas 14:00: NAP: Test Horse','POST_OBSERVED_OPINION_UNVERIFIED'),
               ('Naas: NAP: Test Horse','RSS_EXPLICIT_MENTION_REVIEW_REQUIRED'),
               ('Naas: I am not backing Test Horse','RSS_EXPLICIT_MENTION_REVIEW_REQUIRED'),
               ('<blockquote>Naas: NAP: Test Horse</blockquote>I disagree.','RSS_EXPLICIT_MENTION_REVIEW_REQUIRED')]
        for body,expected in cases:
            with self.subTest(body=body),tempfile.TemporaryDirectory() as folder:
                xml=ET.fromstring(f'<rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><item><title>Reply To: Daily chat</title><description><![CDATA[{body}]]></description><link>{url}</link><guid>{url}</guid><dc:creator>TestAlice</dc:creator><pubDate>Sun, 08 Nov 2026 11:00:00 GMT</pubDate></item></channel></rss>')
                collector.FEED_RECEIPTS[id(xml)]={'url':source,'sha256':'a'*64,'observed_at_utc':now.isoformat()}
                root=Path(folder)
                (root/'feeds.json').write_text(json.dumps({'sources':[{'publisher':'The Racing Forum','type':'forum','selection_mode':'EXPLICIT_BODY','feed_url':source,'enabled':True}]}))
                (root/'archive.json').write_text(json.dumps({'entries':[]}))
                (root/'races.json').write_text(json.dumps({'races':[{'race_id':'test','racecourse':'Naas','startUTC':(now+dt.timedelta(hours=2)).isoformat(),'runners':[{'horse_id':'h','name':'Test Horse','active_runner':True,'runner_status':'RUNNER'}]}]}))
                with patch.object(collector,'CONFIG',root/'feeds.json'),patch.object(collector,'OUT',root/'archive.json'),patch.object(collector,'RACES',root/'races.json'),patch.object(collector,'NOW',now),patch.object(collector,'current_time',return_value=now),patch.object(collector,'fetch',return_value=xml),patch.object(collector,'capture',side_effect=ValueError('Unverified opinion')):
                    collector.main()
                entry=json.loads((root/'archive.json').read_text())['entries'][0]
                self.assertEqual(entry['verification'],expected);self.assertNotIn('primary_capture',entry)
                collector.FEED_RECEIPTS.pop(id(xml),None)

    def run_case(self, title, expected, published='Sun, 08 Nov 2026 11:00:00 GMT',future_only=False):
        now=dt.datetime(2026,11,8,12,0,tzinfo=UTC)
        start=now+dt.timedelta(hours=2)
        xml=f"""<rss><channel><item><title>{title}</title><description>Naas racing preview</description><link>https://example.org/tip/123</link><pubDate>{published}</pubDate></item></channel></rss>"""
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"feeds.json").write_text(json.dumps({"sources":[{"publisher":"Test Tipster","type":"tipster","feed_url":"https://example.org/feed","enabled":True}]}))
            (root/"archive.json").write_text(json.dumps({"schema_version":1,"entries":[]}))
            (root/"races.json").write_text(json.dumps({"races":[{"race_id":"test-123","name":"Naas 14:00","startUTC":start.isoformat(),"racecourse":"Naas","runners":[{"name":"The Mourne Rambler","active_runner":True,"runner_status":"RUNNER"},{"name":"Low Kick","active_runner":True,"runner_status":"RUNNER"}]}]}))
            if future_only:
                future=json.loads((root/'races.json').read_text())
                future.update(research_only=True,publication_gate='BLOCKED',model_validation='UNVALIDATED')
                (root/'racing-future-data.json').write_text(json.dumps(future))
                (root/'races.json').write_text(json.dumps({'races':[]}))
            with patch.object(collector,"CONFIG",root/"feeds.json"),patch.object(collector,"OUT",root/"archive.json"),patch.object(collector,"RACES",root/"races.json"),patch.object(collector,"NOW",now),patch.object(collector,"fetch",return_value=ET.fromstring(xml)):
                collector.main()
            archive=json.loads((root/"archive.json").read_text())
            self.assertEqual(len(archive["entries"]),expected)
            if expected:
                entry=archive["entries"][0]
                self.assertEqual(entry["horse"],"The Mourne Rambler")
                self.assertEqual(entry["race_id"],"test-123")
                self.assertEqual(entry["verification"],"RSS_EXPLICIT_HEADLINE_UNVERIFIED")
                self.assertLess(dt.datetime.fromisoformat(entry["observed_at_utc"]),start)
                self.assertEqual(entry["url"],"https://example.org/tip/123")
                self.assertEqual(archive["collector_source_health"][0]["explicit_tip_observations"],1)

    def test_explicit_pick_is_archived(self):
        self.run_case("NAP: The Mourne Rambler",1)

    def test_plural_tips_headline_is_not_discarded(self):
        self.run_case('Tips: The Mourne Rambler',1)

    def test_future_racecard_can_match_when_current_day_feed_has_finished(self):
        self.run_case('NAP: The Mourne Rambler',1,future_only=True)

    def test_preview_is_not_promoted_to_blue(self):
        self.run_case("Naas racing preview: The Mourne Rambler",0)

    def test_previous_day_explicit_tip_is_archived(self):
        self.run_case("NAP: The Mourne Rambler",1,published='Sat, 07 Nov 2026 21:00:00 GMT')

if __name__=="__main__":
    unittest.main()
