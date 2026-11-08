import datetime as dt,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from atr_calendar import parse_calendar
class CalendarTests(unittest.TestCase):
 def test_meetings_not_races(self):
  html=b"<h3>9th November 2026</h3><ul><li>Carlisle (Afternoon)</li><li>Punchestown</li></ul><h3>10th November 2026</h3><ul><li>Exeter</li></ul>"
  rows=parse_calendar(html,{"2026-11-09"},dt.datetime(2026,11,8,tzinfo=dt.timezone.utc))
  self.assertEqual({r["course"] for r in rows},{"Carlisle","Punchestown"})
  self.assertTrue(all(r["record_type"]=="MEETING_FIXTURE" and "startUTC" not in r for r in rows))
 def test_no_date_no_fixture(self):
  self.assertEqual(parse_calendar(b"<ul><li>Carlisle</li></ul>",{"2026-11-09"},dt.datetime.now(dt.timezone.utc)),[])
if __name__=="__main__":unittest.main()
