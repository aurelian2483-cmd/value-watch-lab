import unittest
from datetime import datetime,timedelta,timezone
from evaluate_locked_endpoint import select_endpoint

class FixedEndpointTests(unittest.TestCase):
    def setUp(self):self.t=datetime(2027,1,1,tzinfo=timezone.utc)
    def rows(self,n,days):
        return [{'race_id':str(i),'startUTC':(self.t+timedelta(days=1+i%days,hours=i%8)).isoformat(),'date':(self.t+timedelta(days=1+i%days)).date().isoformat(),'delta_log_loss':(-1 if i%2 else 1)} for i in range(n)]
    def test_zero_has_no_endpoint(self):self.assertFalse(select_endpoint([],self.t,self.t)['fixed_endpoint_reached'])
    def test_500_over_60_dates(self):
        x=select_endpoint(self.rows(500,60),self.t,self.t+timedelta(days=65));self.assertTrue(x['fixed_endpoint_reached']);self.assertEqual(len(x['rows']),500)
    def test_500_on_20dates_insufficient(self):self.assertFalse(select_endpoint(self.rows(500,20),self.t,self.t+timedelta(days=65))['fixed_endpoint_reached'])
    def test_499_on_60dates_insufficient(self):self.assertFalse(select_endpoint(self.rows(499,60),self.t,self.t+timedelta(days=65))['fixed_endpoint_reached'])
    def test_complete_final_date_not_favourable_score(self):
        rows=self.rows(600,60);x=select_endpoint(rows,self.t,self.t+timedelta(days=65));self.assertEqual(len(x['rows']),600)
        for r in rows:r['delta_log_loss']*=100
        self.assertEqual(x['stop_date'],select_endpoint(rows,self.t,self.t+timedelta(days=65))['stop_date'])
    def test_post_endpoint_excluded(self):
        rows=self.rows(500,60)+[{'race_id':'later','startUTC':(self.t+timedelta(days=100)).isoformat(),'date':(self.t+timedelta(days=100)).date().isoformat()}]
        x=select_endpoint(rows,self.t,self.t+timedelta(days=101));self.assertEqual(len(x['rows']),500);self.assertEqual(len(x['excluded_from_confirmatory_window']),1)
    def test_max_horizon_incomplete(self):self.assertEqual(select_endpoint([],self.t,self.t+timedelta(days=181))['status'],'INCOMPLETE_MAXIMUM_HORIZON')
    def test_order_invariance(self):
        rows=self.rows(500,60);self.assertEqual(select_endpoint(rows,self.t,self.t)['stop_date'],select_endpoint(rows[::-1],self.t,self.t)['stop_date'])

if __name__=='__main__':unittest.main(verbosity=2)
