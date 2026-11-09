import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from backup_racing_sources import collect

class BackupSources(unittest.TestCase):
    def setUp(self):
        self.now=dt.datetime(2026,11,9,10,tzinfo=dt.timezone.utc)
        self.race={'race_id':'12','racecourse':'Carlisle','name':'Synthetic race','startUTC':'2026-11-09T13:20:00+00:00',
            'runners':[{'horse_id':'7','name':'Synthetic Horse (IRE)','active_runner':True,'runner_status':'RUNNER'}]}
        self.html='''<div class="grd tip content-visibility-auto"><div itemscope itemtype="http://schema.org/SportsEvent"><a itemprop="url" href="https://www.olbg.com/betting-tips/Horse_Racing/UK/Carlisle/13:20_Carlisle/2?event_id=123"><h5 itemprop="name">1:20 Carlisle</h5></a><time itemprop="startDate" datetime="2026-11-09T13:20:00Z">Today 13:20</time></div><div><h4>Synthetic Horse</h4></div><div><b>8/12 Win Tips</b></div></div>'''
    def run_case(self,html=None,races=None):
        return collect(races if races is not None else [self.race],self.now,lambda _:(html or self.html).encode())
    def test_exact_source_event_name_and_runner_match(self):
        rows,health=self.run_case();self.assertEqual(len(rows),1);row=rows[0]
        self.assertEqual(row['verification'],'PUBLIC_SELECTION_OBSERVED');self.assertEqual(row['group'],'tipster')
        self.assertFalse(row['aggregate_counts']['independent_authors_verified']);self.assertNotIn('primary_capture',row)
        self.assertEqual(row['selection_receipt']['horse_id'],'7');self.assertNotIn('published_at_utc',row);self.assertNotIn('odds',row)
        self.assertEqual(health[0]['matched_selections'],1)
    def test_changed_date_clock_course_or_name_does_not_match(self):
        for old,new in [('2026-11-09T13:20:00Z','2026-11-10T13:20:00Z'),('2026-11-09T13:20:00Z','2026-11-09T13:21:00Z'),('1:20 Carlisle','1:20 Stratford'),('Synthetic Horse','Another Horse')]:
            with self.subTest(old=old):self.assertEqual(self.run_case(self.html.replace(old,new))[0],[])
    def test_place_tips_zero_support_and_invalid_links_do_not_create_blue(self):
        for old,new in [('Win Tips','Place Tips'),('8/12','0/12'),('8/12','20/12'),('https://www.olbg.com','https://example.org'),('event_id=123','event_id=unknown')]:
            with self.subTest(new=new):self.assertEqual(self.run_case(self.html.replace(old,new))[0],[])
    def test_nonrunner_and_ambiguous_match_are_excluded(self):
        self.assertEqual(self.run_case(races=[self.race,{**self.race,'race_id':'99'}])[0],[])
        self.race['runners'][0]['active_runner']=False;self.assertEqual(self.run_case()[0],[])
    def test_duplicate_rows_do_not_multiply_source_votes(self):
        self.assertEqual(len(self.run_case(self.html*2)[0]),1)
    def test_layout_failure_is_reported(self):
        rows,health=self.run_case('<html>Login or challenge</html>');self.assertEqual(rows,[]);self.assertEqual(health[0]['status'],'error')

if __name__=='__main__':unittest.main()
