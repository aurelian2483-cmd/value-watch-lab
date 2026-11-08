import datetime as dt
import pathlib
import sys
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from fixture_calendar import collect_fixtures,parse_fixture_links

class FixtureCalendarTests(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
 def test_explicit_date_course_link_only(self):
  html=b'<a href="/racing/racecards/2026-11-09/carlisle">Carlisle</a><a href="/racing/racecards/2026-11-08/kempton">Kempton</a>'
  rows=parse_fixture_links(html,{'2026-11-09'},self.now)
  self.assertEqual(len(rows),1)
  self.assertEqual(rows[0]['course'],'Carlisle')
  self.assertEqual(rows[0]['record_type'],'MEETING_FIXTURE')
  self.assertNotIn('startUTC',rows[0])
 def test_unverified_format_not_invented(self):
  d=collect_fixtures(['2026-11-09'],self.now,fetch=lambda url:b'<html>Today's fixtures</html>')
  self.assertEqual(d['status'],'FORMAT_UNVERIFIED')
  self.assertEqual(d['meetings'],[])
 def test_failed_source_not_empty_calendar_claim(self):
  d=collect_fixtures(['2026-11-09'],self.now,fetch=lambda url:(_ for _ in ()).throw(OSError('offline')))
  self.assertEqual(d['status'],'COLLECTION_FAILED')
  self.assertEqual(d['meetings'],[])
if __name__=='__main__':unittest.main()
