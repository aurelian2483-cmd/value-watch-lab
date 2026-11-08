import copy,datetime as dt,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from horse_market import publisher_forecast

class PublisherForecast(unittest.TestCase):
    def setUp(self):
        self.card={'betting_forecast':'Test Horse (IRE) (2/1), Other Horse (4/1)',
                   'rides':[{'ride_status':'RUNNER','horse':{'horse_reference':{'id':str(i)},'name':name}} for i,name in enumerate(('Test Horse (IRE)','Other Horse'))]}
        self.now=dt.datetime(2026,11,8,20,tzinfo=dt.timezone.utc)
    def run_forecast(self,card=None,field=True):
        return publisher_forecast(card or self.card,self.now,'https://www.sportinglife.com/racing/meeting/2026-11-09/test/12','a'*64,True,field)
    def test_complete_labelled_forecast_preserves_source_without_claiming_bookmaker(self):
        p=self.run_forecast()
        self.assertEqual(p['status'],'COMPLETE_PUBLISHER_FORECAST')
        self.assertEqual([x['decimal'] for x in p['prices']],[3,5])
        self.assertIsNone(p['bookmaker']);self.assertFalse(p['executable_verified'])
    def test_missing_ambiguous_unknown_horse_and_doubtful_fields_fail_closed(self):
        for text in ('Test Horse (2/1)','Test Horse (2/1), Test Horse (4/1)','Unknown Horse (2/1), Other Horse (4/1)','Test Horse (SP), Other Horse (4/1)'):
            with self.subTest(text=text):
                c=copy.deepcopy(self.card);c['betting_forecast']=text
                self.assertNotEqual(self.run_forecast(c)['status'],'COMPLETE_PUBLISHER_FORECAST')
        self.assertEqual(self.run_forecast(field=False)['prices'],[])

if __name__=='__main__':unittest.main()
