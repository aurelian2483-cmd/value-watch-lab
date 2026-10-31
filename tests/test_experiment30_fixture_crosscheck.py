import datetime as dt,io,json,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment30_fixture_crosscheck import verify
K="2026-11-06T20:00:00Z"
def espn(k=K,away="Coventry City"):
 return json.dumps({"events":[{"date":k,"competitions":[{"competitors":[{"homeAway":"home","team":{"displayName":"Everton"}},{"homeAway":"away","team":{"displayName":away}}]}]}]}).encode()
def football(date="06/11/2026"):
 return ("Date,HomeTeam,AwayTeam,FTHG,FTAG,FTR\n"+date+",Everton,Coventry,,,,\n").encode()
class CrosscheckTests(unittest.TestCase):
 def test_two_source_match(self):self.assertEqual(verify("Everton","Coventry",K,espn(),football())["status"],"TWO_SOURCE_SCHEDULE_MATCH_NOT_PUBLISHED")
 def test_wrong_kickoff(self):
  with self.assertRaises(ValueError):verify("Everton","Coventry",K,espn("2026-11-06T21:00:00Z"),football())
 def test_wrong_opponent(self):
  with self.assertRaises(ValueError):verify("Everton","Coventry",K,espn(away="Arsenal"),football())
 def test_missing_secondary(self):
  with self.assertRaises(ValueError):verify("Everton","Coventry",K,espn(),football("07/11/2026"))
 def test_missing_espn_events(self):
  with self.assertRaises(ValueError):verify("Everton","Coventry",K,b'{}',football())
if __name__=="__main__":unittest.main()
