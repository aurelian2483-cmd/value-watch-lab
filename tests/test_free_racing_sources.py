import datetime as dt
import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from free_racing_sources import collect_free,parse_racingpost
class FreeFallbackTests(unittest.TestCase):
 def setUp(self):self.now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
 def test_racingpost_date_and_course(self):
  raw=b'<a href="/racecards/10/carlisle/2026-11-09/1230">12:30 Carlisle</a>'
  rows=parse_racingpost(raw,{'2026-11-09'},self.now)
  self.assertEqual(len(rows),1)
  self.assertEqual(rows[0]['course'],'Carlisle')
  self.assertNotIn('startUTC',rows[0])
 def test_fallback_when_primary_fails(self):
  def fetch(url):
   if 'racingpost' not in url:raise OSError('offline')
   return b'<a href="/racecards/10/carlisle/2026-11-09/1230">Carlisle</a>'
  d=collect_free(['2026-11-09'],self.now,fetch=fetch)
  self.assertEqual(len(d['meetings']),1)
  self.assertEqual(d['provider_results'][0]['status'],'COLLECTION_FAILED')
  self.assertEqual(d['status'],'SOURCE_OBSERVED')
 def test_no_false_meetings(self):
  d=collect_free(['2026-11-09'],self.now,fetch=lambda url:b'<html>No structured future meetings</html>')
  self.assertEqual(d['meetings'],[])
  self.assertEqual(d['status'],'NO_VERIFIED_FIXTURE_SOURCE')
if __name__=='__main__':unittest.main()
