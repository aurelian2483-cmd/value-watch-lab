import datetime as dt
import json
from pathlib import Path
import sys
import unittest
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts') if HERE.name=='tests' else str(HERE))
from discover_horse_races import discover
class DiscoveryTests(unittest.TestCase):
 def page(self,day='2026-11-02',duplicate=False):
  race={'race_summary_reference':{'id':123},'date':day,'time':'12:30','ride_count':7,'name':'Test race','race_stage':'DORMANT'}
  meeting={'meeting_summary':{'date':day,'visible':True,'course':{'name':'Test course','country':{'short_name':'ENG'}}},'races':[race,race] if duplicate else [race]}
  return ('<script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':{'hasError':False,'meetings':[meeting]}}})+'</script>').encode()
 def test_source_observation_does_not_become_a_prediction(self):
  r=discover(self.page(),dt.datetime(2026,11,2,tzinfo=dt.timezone.utc))
  self.assertEqual(len(r['races']),1);self.assertFalse(r['coverage_verified']);self.assertIn('/racecard/123/',r['races'][0]['source']);self.assertEqual(r['races'][0]['source_link_type'],'CONSTRUCTED_REQUIRES_IDENTITY_VALIDATION');self.assertEqual(r['qualified_selections'],[])
  self.assertEqual(r['races'][0]['runners'],[]);self.assertIsNone(r['races'][0]['prediction'])
 def test_stale_duplicate_or_generic_source_rejected(self):
  now=dt.datetime(2026,11,2,tzinfo=dt.timezone.utc)
  for raw in [self.page('2026-11-01'),self.page(duplicate=True),b'<html>No racecards</html>']:
   with self.assertRaises(ValueError):discover(raw,now)
if __name__=='__main__':unittest.main()
