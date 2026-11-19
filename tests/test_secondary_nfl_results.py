"""Offline independent-provider NFL result adapter tests. No internet required."""
import sys
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import collect_secondary_nfl_results as S
from capture_prospective_research import iso
NOW=datetime(2026,11,20,18,tzinfo=timezone.utc)
START=iso(NOW-timedelta(days=1))
SHA='f'*64
SOURCE='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&week=11'
def prediction():
    return {'prediction_id':'nfl:nfl-777:GAME_RESULT_INCLUDING_OVERTIME:MODEL','sport':'nfl',
            'event_id':'nfl-777','market':'GAME_RESULT_INCLUDING_OVERTIME','source_url':SOURCE,
            'event_start_utc':START,'participant_ids':['10','20'],
            'probabilities':{'10':.7,'20':.28,'tie':.02}}
def primary_identity():
    return {'events':[{'competitions':[{'id':'777','date':START,'competitors':[
       {'id':'10','homeAway':'home','team':{'displayName':'Team Alpha'}},
       {'id':'20','homeAway':'away','team':{'displayName':'Team Beta'}}]}]}]}
def secondary_event():
    return {'idEvent':'88764','strSport':'American Football','strLeague':'NFL',
      'strHomeTeam':'Team Alpha','strAwayTeam':'Team Beta','strStatus':'Final',
      'strTimestamp':START,'intHomeScore':'21','intAwayScore':'17'}
def secondary():
    return {'events':[secondary_event()]}
def archive():
    return {'schema_version':1,'publication_gate':'BLOCKED','observations':[]}
def ledger(records=None):
    return {'schemaVersion':1,'kind':'PROSPECTIVE_PREDICTION_LEDGER','records':[prediction()] if records is None else records}
class AdapterTests(unittest.TestCase):
    def test_exact_espn_identity(self):
        self.assertEqual(S.espn_identity(primary_identity(),prediction())['home_id'],'10')
        a=primary_identity();a['events'][0]['competitions'][0]['competitors'][0]['id']='xx'
        self.assertIsNone(S.espn_identity(a,prediction()))
    def test_secondary_frozen_identity_and_final(self):
        identity=S.espn_identity(primary_identity(),prediction())
        result=S.sportsdb_observation(secondary(),identity,prediction(),NOW,'https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=2026-11-19',SHA)
        self.assertEqual(result['actual_outcome'],'10')
        self.assertFalse(result['independently_verified'])
        self.assertEqual(result['status'],'SECONDARY_UNVERIFIED')
        self.assertFalse(result['betting_eligible'])
    def test_invalid_status_and_scores_fail_closed(self):
        identity=S.espn_identity(primary_identity(),prediction())
        for patch in [{'strStatus':'Not Started'},{'strStatus':'Q4'},{'intHomeScore':None},
                      {'intAwayScore':'2-3'},{'strHomeTeam':'Wrong Name'},
                      {'strTimestamp':iso(NOW+timedelta(days=6))},
                      {'strSport':'Basketball'},{'strLeague':'Other'},{'idEvent':'broken'}]:
            event=secondary_event();event.update(patch)
            self.assertIsNone(S.sportsdb_observation({'events':[event]},identity,prediction(),NOW,'https://www.thesportsdb.com/',SHA))
    def test_ambiguous_matches_are_not_approved(self):
        identity=S.espn_identity(primary_identity(),prediction())
        self.assertIsNone(S.sportsdb_observation({'events':[secondary_event(),secondary_event()]},identity,prediction(),NOW,'https://www.thesportsdb.com/',SHA))
    def test_tie_market_identity(self):
        event=secondary_event();event['intAwayScore']='21'
        identity=S.espn_identity(primary_identity(),prediction())
        got=S.sportsdb_observation({'events':[event]},identity,prediction(),NOW,'https://www.thesportsdb.com/',SHA)
        self.assertEqual(got['actual_outcome'],'tie')
    def test_bounded_two_provider_collection(self):
        requests=[]
        def fetcher(url):
            requests.append(url)
            return (primary_identity() if url==SOURCE else secondary(),SHA)
        a=archive();result=S.collect(ledger(),a,NOW,fetcher)
        self.assertEqual(result['new_secondary_claims'],1)
        self.assertEqual(len(a['observations']),1)
        self.assertEqual(result['second_provider_days_scanned'],1)
        self.assertEqual(S.collect(ledger(),a,NOW,fetcher)['new_secondary_claims'],0)
        self.assertEqual(len(requests),2)
        self.assertNotIn('records',a)
    def test_provider_outage_and_late_event(self):
        def unavailable(url):raise OSError('Source down')
        a=archive()
        self.assertEqual(S.collect(ledger(),a,NOW,unavailable)['source_errors'],1)
        self.assertEqual(a['observations'],[])
        p=prediction();p['event_start_utc']=iso(NOW+timedelta(days=1))
        self.assertEqual(S.collect(ledger([p]),archive(),NOW,unavailable)['candidate_records'],0)
    def test_nflverse_exact_kickoff_and_team_order(self):
        forecast=prediction()
        identity={'home_id':'10','away_id':'20','home_code':'BAL','away_code':'LAC'}
        row={'game_type':'REG','home_team':'BAL','away_team':'LAC','gameday':'2026-11-19',
             'gametime':'13:00','home_score':'20','away_score':'23','game_id':'2026_11_LAC_BAL'}
        got=S.nflverse_observation({'777':[row]},identity,forecast,NOW,SHA)
        self.assertEqual(got['actual_outcome'],'20')
        self.assertFalse(got['independently_verified'])
        for patch in ({'gametime':'18:00'},{'home_team':'LAC'},{'away_score':''},{'game_type':'PRE'}):
            self.assertIsNone(S.nflverse_observation({'777':[dict(row,**patch)]},identity,forecast,NOW,SHA))
        self.assertIsNone(S.nflverse_observation({'777':[row,row]},identity,forecast,NOW,SHA))
    def test_source_guard(self):
        self.assertFalse(S.allowed_espn('https://evil.example/scoreboard'))
        self.assertFalse(S.allowed_espn('http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'))
        self.assertTrue(S.allowed_espn(SOURCE))
if __name__=='__main__':unittest.main()
