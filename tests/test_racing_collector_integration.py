"""Offline collector integration: RSS -> matched runner -> attributed archive.
Uses synthetic future dates and local temporary files; never publishes fake picks.
"""
import datetime as dt
import importlib.util
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("racing_collector_integration",ROOT/"scripts/collect_racing_community.py")
collector=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)
UTC=dt.timezone.utc

class CollectorIntegration(unittest.TestCase):
    def run_case(self, title, expected, published='Sun, 08 Nov 2026 11:00:00 GMT'):
        now=dt.datetime(2026,11,8,12,0,tzinfo=UTC)
        start=now+dt.timedelta(hours=2)
        xml=f"""<rss><channel><item><title>{title}</title><description>Naas racing preview</description><link>https://example.org/tip/123</link><pubDate>{published}</pubDate></item></channel></rss>"""
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"feeds.json").write_text(json.dumps({"sources":[{"publisher":"Test Tipster","type":"tipster","feed_url":"https://example.org/feed","enabled":True}]}))
            (root/"archive.json").write_text(json.dumps({"schema_version":1,"entries":[]}))
            (root/"races.json").write_text(json.dumps({"races":[{"race_id":"test-123","name":"Naas 14:00","startUTC":start.isoformat(),"racecourse":"Naas","runners":[{"name":"The Mourne Rambler","active_runner":True,"runner_status":"RUNNER"},{"name":"Low Kick","active_runner":True,"runner_status":"RUNNER"}]}]}))
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

    def test_preview_is_not_promoted_to_blue(self):
        self.run_case("Naas racing preview: The Mourne Rambler",0)

    def test_previous_day_explicit_tip_is_archived(self):
        self.run_case("NAP: The Mourne Rambler",1,published='Sat, 07 Nov 2026 21:00:00 GMT')

if __name__=="__main__":
    unittest.main()
