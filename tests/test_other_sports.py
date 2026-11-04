import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import collect_other_sports as m

class Controls(unittest.TestCase):
    def test_updates_conserve_rating_and_increase_winner(self):
        rs,cs=m.fit([{'a':'a','b':'b','result':1}])
        self.assertAlmostEqual(rs['a']+rs['b'],3000)
        self.assertGreater(m.probability(rs['a'],rs['b']),.5)
        self.assertEqual(cs['a'],1)
    def test_unseen_player_has_no_forecast(self):
        rs,cs=m.fit([])
        self.assertIsNone(m.forecast([{'id':'a'},{'id':'b'}],rs,cs,[],'athlete'))
    def test_conflicting_result_identity_stops_training(self):
        with self.assertRaises(ValueError):
            m.unique([{'id':'x','date':'2025-01-01','result':1},{'id':'x','date':'2025-01-01','result':0}])
    def test_future_result_cannot_train(self):
        c={'id':'x','date':m.stamp(m.NOW+m.timedelta(days=1)),'status':{'type':{'name':'STATUS_FINAL','completed':True}},'competitors':[{'id':'a','type':'athlete','winner':True,'athlete':{'displayName':'A'}},{'id':'b','type':'athlete','winner':False,'athlete':{'displayName':'B'}}]}
        self.assertIsNone(m.final(c,'athlete'))
    def test_nfl_tie_vector_sums_to_one(self):
        history=[{'id':str(i),'date':'2025-01-01','a':'a','b':'b','result':.5}for i in range(10)]
        rs,cs=m.fit(history)
        f=m.forecast([{'id':'a','team':{'displayName':'A'}},{'id':'b','team':{'displayName':'B'}}],rs,cs,history,'team')
        self.assertAlmostEqual(sum(o['probability']for o in f['outcomes']),1)
        self.assertEqual(f['market'],'GAME_RESULT_INCLUDING_OVERTIME')
    def test_doubles_and_placeholders_rejected(self):
        self.assertIsNone(m.pair({'competitors':[{'id':'a','type':'team'},{'id':'b','type':'team'}]},'athlete'))

if __name__=='__main__':unittest.main()
