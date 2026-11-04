import copy,datetime as dt,unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from horse_market import quoted_market
class MarketTests(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,4,6,tzinfo=dt.timezone.utc)
  self.rides=[{'ride_status':'RUNNER','horse':{'horse_reference':{'id':str(i)}},'bookmakerOdds':[{'bookmakerId':17,'bookmakerName':'Sky Bet v2','outcome':'Win','decimalOdds':p,'fractionalOdds':str(p-1)+'/1','selectionId':str(i),'bookmakerRaceid':'r','bookmakerMarketId':'m'}]} for i,p in enumerate([3,5,3])]
 def run_market(self,**kwargs):return quoted_market(self.rides,self.now,'https://www.sportinglife.com/test','a'*64,kwargs.get('pre',True),kwargs.get('confirmed',True))
 def test_joint_favourites_only_from_one_complete_market(self):
  r=self.run_market();self.assertEqual(r['favourite_horse_ids'],['0','2']);self.assertFalse(r['executable_verified']);self.assertEqual(len(r['quotes']),3)
 def test_missing_duplicate_and_cross_market_do_not_produce_favourites(self):
  for transform in [lambda q:q.pop('bookmakerOdds'),lambda q:q['bookmakerOdds'].append(copy.deepcopy(q['bookmakerOdds'][0])),lambda q:q['bookmakerOdds'][0].update(bookmakerMarketId='other'),lambda q:q['bookmakerOdds'][0].update(decimalOdds=1.2),lambda q:q['bookmakerOdds'][0].update(outcome='Place')]:
   original=copy.deepcopy(self.rides);transform(self.rides[0]);self.assertEqual(self.run_market()['favourite_horse_ids'],[]);self.rides=original
 def test_uncertain_or_postevent_field_never_has_favourite(self):
  self.assertEqual(self.run_market(pre=False)['quotes'],[]);self.assertEqual(self.run_market(confirmed=False)['favourite_horse_ids'],[])
 def test_nonrunner_price_does_not_make_it_favourite(self):
  self.rides[0]['ride_status']='NONRUNNER';self.assertEqual(self.run_market()['favourite_horse_ids'],['2'])
 def test_rounded_decimal_is_checked_against_fraction(self):
  self.rides[0]['bookmakerOdds'][0].update(decimalOdds=3.33,fractionalOdds='7/3');self.assertEqual(self.run_market()['status'],'COMPLETE_SOURCE_OBSERVATION')
if __name__=='__main__':unittest.main()
