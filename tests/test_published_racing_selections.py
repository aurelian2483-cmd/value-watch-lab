import datetime as dt
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from published_racing_selections import collect

class PublishedSelections(unittest.TestCase):
    def setUp(self):
        self.now=dt.datetime(2026,11,9,10,tzinfo=dt.timezone.utc)
        self.race={'race_id':'12','racecourse':'Carlisle','name':'Synthetic race','startUTC':'2026-11-09T13:20:00+00:00',
            'runners':[{'horse_id':'7','name':'Synthetic Horse (IRE)','active_runner':True,'runner_status':'RUNNER'}]}
        self.props={'timeform':{'hasError':False,'meetings':[{'meeting_summary':{'date':'2026-11-09','course':{'name':'Carlisle'}},'races':[{
            'date':'2026-11-09','time':'13:20','race_summary_reference':{'id':12},'top_rated_horse':{'horse_reference':{'id':7},'horse_name':'Synthetic Horse','horse_status':'RUNNER'}}]}]},
            'naps':{'hasError':False,'naps':[{'horseName':'SYNTHETIC HORSE','race':'13:20 Carl','tipsterSource':'Test publication','tipster':'Test author'}]}}
    def run_source(self,races=None):
        def fetch(url):
            kind='timeform' if 'timeform-' in url else 'naps'
            return ('<h2>Mon 9 November 2026</h2><script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':self.props[kind]}})+'</script>').encode()
        return collect(races if races is not None else [self.race],self.now,fetch)
    def test_two_public_selection_formats_match_exact_race_and_runner(self):
        entries,health=self.run_source();self.assertEqual(len(entries),2)
        for e in entries:
            self.assertEqual(e['verification'],'PUBLIC_SELECTION_OBSERVED')
            self.assertEqual(e['publication_date'],'2026-11-09');self.assertNotIn('published_at_utc',e)
            self.assertEqual(e['selection_receipt']['horse_id'],'7');self.assertEqual(len(e['selection_receipt']['sha256']),64)
        self.assertEqual(sum(h['matched_selections'] for h in health),2)
    def test_wrong_horse_id_does_not_match_timeform_name_alone(self):
        self.props['timeform']['meetings'][0]['races'][0]['top_rated_horse']['horse_reference']['id']=8
        self.assertEqual(len(self.run_source()[0]),1)
    def test_wrong_day_or_race_clock_cannot_match(self):
        for change in ({'startUTC':'2026-11-10T13:20:00+00:00'},{'startUTC':'2026-11-09T13:21:00+00:00'}):
            self.assertEqual(self.run_source([{**self.race,**change}])[0],[])
    def test_nonrunner_and_finished_race_cannot_match(self):
        self.race['runners'][0]['active_runner']=False;self.assertEqual(self.run_source()[0],[])
        self.race['runners'][0]['active_runner']=True;self.now+=dt.timedelta(hours=4);self.assertEqual(self.run_source()[0],[])
    def test_ambiguous_naps_match_is_not_accepted(self):
        entries,_=self.run_source([self.race,{**self.race,'race_id':'99'}])
        self.assertEqual(len(entries),1);self.assertEqual(entries[0]['publisher'],'Timeform via Sporting Life')
    def test_source_failure_is_visible(self):
        entries,health=collect([self.race],self.now,lambda _:b'blocked or layout changed')
        self.assertEqual(entries,[]);self.assertTrue(all(h['status']=='error' for h in health))

if __name__=='__main__':unittest.main()
