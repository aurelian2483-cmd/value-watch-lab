import unittest
from datetime import date, timedelta
from replay import completed, predict

class Chronology(unittest.TestCase):
    def test_release_boundary_and_same_event(self):
        start=date(2021,1,1)
        rows=[(start+timedelta(days=d),("event",str(i)),"Hard","1","2") for i,d in enumerate([0,0,41,42])]
        scored=predict(rows)[2021]
        self.assertTrue(all(r[2]==[.5]*4 for r in scored[:3]))
        self.assertGreater(scored[-1][2][0],.5)
        flipped=[(*r[:3],r[4],r[3]) for r in rows]
        for r,s in zip(scored,predict(flipped)[2021]):
            self.assertNotEqual(r[1],s[1])
            for p,q in zip(r[2],s[2]):
                self.assertAlmostEqual(p+q,1)
    def test_score(self):
        self.assertTrue(completed("6-3 6-7(5) 7-5","3"))
        for score in ("W/O","6-0 RET","6-0 6-0 6-0","6-4 2-1","2-6 3-6",""):
            self.assertFalse(completed(score,"3"))
