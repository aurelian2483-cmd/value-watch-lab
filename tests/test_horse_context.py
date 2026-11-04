import copy
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import horse_context_pipeline as m

NOW=dt.datetime(2026,11,4,10,tzinfo=dt.timezone.utc)

def history(rid,position=1,run_type='FLAT',distance='6f',going='Soft',race_class='4'):
    return {'race_id':rid,'date':'2026-10-'+str(10+int(rid)%10),'course_name':'Nottingham','distance':distance,'run_type':run_type,'position':position,'runner_count':10,'going':going,'race_class':race_class,'casualty':{}}

def race():
    return {'race_id':'1','racecourse':'Nottingham','name':'Research Handicap','startUTC':'2026-11-04T13:00:00Z','run_type':'FLAT',
            'run_type_basis':'INFERRED_FULL_FIELD_HISTORY','surface':'TURF','going':'Soft','distance':'6f','race_class':'4',
            'runner_data_status':'SINGLE_SOURCE_RUNNERS_OBSERVED','capture_phase':'PRE_EVENT','race_stage':'DORMANT',
            'runner_observed_at_utc':NOW.isoformat(),'runner_source_sha256':'a'*64,'source':'https://www.sportinglife.com/racing/racecards/2026-11-04/nottingham/racecard/1/research-handicap',
            'active_runner_count':2,'runners':[{'horse_id':'a','name':'Alpha','active_runner':True,'runner_status':'RUNNER','previous_results':[history(10),history(11),history(12)]},
                                             {'horse_id':'b','name':'Beta','active_runner':True,'runner_status':'RUNNER','previous_results':[history(20,4),history(21,4),history(22,4)]}]}

class ContextControls(unittest.TestCase):
    def test_turf_supported_with_provenance_and_unvalidated_vector(self):
        r,reason=m.forecast(race(),NOW)
        self.assertIsNone(reason);self.assertEqual(r['model'],m.MODEL);self.assertEqual(r['run_type'],'FLAT')
        self.assertAlmostEqual(sum(h['model_probability']for h in r['runners']),1)
        self.assertGreater(r['runners'][0]['model_probability'],r['runners'][1]['model_probability'])
        self.assertEqual(r['model_validation'],'UNVALIDATED');self.assertIsNone(r['odds']);self.assertIsNone(r['expected_value'])
    def test_jump_disciplines_do_not_borrow_flat_form(self):
        for kind in ['HURDLE','CHASE','NH_FLAT']:
            r=race();r['run_type']=kind;r['run_type_basis']='EXPLICIT_RACE_TITLE_TERM'
            self.assertEqual(m.forecast(r,NOW)[1],'INSUFFICIENT_SAME_DISCIPLINE_HISTORY')
            for runner in r['runners']:
                for p in runner['previous_results']:p['run_type']=kind
            self.assertIsNone(m.forecast(r,NOW)[1])
    def test_known_falls_lower_form_and_unknown_outcome_blocks(self):
        r=race();r['run_type']='CHASE'
        for runner in r['runners']:
            for p in runner['previous_results']:p['run_type']='CHASE';p['position']=1
        p=r['runners'][0]['previous_results'][0];p['position']=None;p['casualty']={'reason':'Fell'}
        f,_=m.forecast(r,NOW);a,b=f['runners'];self.assertEqual(a['context_features']['non_finishes'],1)
        self.assertLess(a['model_probability'],b['model_probability'])
        p['casualty']={'reason':'Unrecognised outcome'}
        self.assertEqual(m.forecast(r,NOW)[1],'UNRESOLVED_HISTORY_OUTCOME')
    def test_normalized_collector_finish_status_contract(self):
        numeric={**history(10,2),'finish_status':'FINISHED','nonfinish_reason':None}
        self.assertIsNotNone(m.outcome(numeric))
        fallen={**history(11,None),'finish_status':'NON_FINISHER','nonfinish_reason':'PulledUp'}
        self.assertEqual(m.outcome(fallen),(0.0,'KNOWN_NON_FINISH'))
        conflict={**history(12,1),'finish_status':'CONFLICTING_SOURCE_OUTCOME','nonfinish_reason':'Fell'}
        self.assertIsNone(m.outcome(conflict))
    def test_future_same_day_and_wrong_discipline_cannot_change_weights(self):
        r=race();before,_=m.forecast(r,NOW)
        r['runners'][0]['previous_results'] += [{**history(30,10),'date':'2026-11-04'},{**history(31,10),'date':'2026-11-05'},history(32,10,'CHASE')]
        after,_=m.forecast(r,NOW)
        self.assertEqual(before['runners'],after['runners'])
    def test_sparse_or_doubtful_field_not_filled_with_invented_estimate(self):
        r=race();r['runners'][0]['previous_results']=r['runners'][0]['previous_results'][:2]
        self.assertEqual(m.forecast(r,NOW)[1],'INSUFFICIENT_SAME_DISCIPLINE_HISTORY')
        r=race();r['runner_data_status']='RUNNER_FIELD_UNCONFIRMED'
        self.assertEqual(m.forecast(r,NOW)[1],'RUNNER_FIELD_UNCONFIRMED')
    def test_freshness_and_pre_event_buffer(self):
        r=race();r['runner_observed_at_utc']=(NOW-dt.timedelta(minutes=31)).isoformat()
        self.assertEqual(m.forecast(r,NOW)[1],'STALE_RUNNER_DATA')
        r=race();r['startUTC']=(NOW+dt.timedelta(minutes=5)).isoformat()
        self.assertEqual(m.forecast(r,NOW)[1],'NOT_PRE_EVENT_WITH_BUFFER')
    def test_context_similarity_changes_relative_history_weight_not_sample_size(self):
        r=race();a=r['runners'][0];a['previous_results']=[history(10,1,distance='6f'),history(11,10,distance='2m'),history(12,5,distance='6f')]
        feature,_=m.context_features(a,r,NOW.date())
        self.assertEqual(feature['comparable_distance_runs'],2)
        expected=sum(x['recency_weight']for x in feature['history'])
        self.assertAlmostEqual(feature['effective_recency_runs'],expected)
        self.assertGreater(feature['history'][0]['similarities']['distance'],feature['history'][1]['similarities']['distance'])
    def test_context_refresh_invalidates_changed_going_or_weight(self):
        r=race();f,_=m.forecast(r,NOW);f['record_sha256']=m.sha(f)
        data={'races':[r]};self.assertEqual(m.field_checks(data,[f],NOW)[f['record_sha256']]['status'],'FRESH_MATCHING_FIELD_AND_CONTEXT')
        r['going']='Good';self.assertEqual(m.field_checks(data,[f],NOW)[f['record_sha256']]['status'],'RACE_CONDITIONS_CHANGED')
    def test_secondary_structured_type_preferred_but_conflict_blocks(self):
        r=race();r['secondary_run_type']='FLAT';r['schedule_cross_checked']=True
        r['secondary_run_type_receipt']={'url':'https://api.theracingapi.com/v1/racecards/free','sha256':'b'*64}
        f,reason=m.forecast(r,NOW);self.assertIsNone(reason);self.assertEqual(f['run_type_basis'],'SECOND_PUBLISHER_STRUCTURED_TYPE')
        r['discipline_conflict']=True;self.assertEqual(m.forecast(r,NOW)[1],'CONFLICTING_DISCIPLINE_SOURCES')
    def test_archive_immutable_reuses_unchanged_and_revises_conditions(self):
        r=race();data={'generated_at_utc':NOW.isoformat(),'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','races':[r]}
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp);current,records,skipped=m.archive_forecasts(data,NOW,path)
            first=current[0]['record_sha256'];saved=(path/(first+'.json')).read_bytes()
            again,records,_=m.archive_forecasts(data,NOW+dt.timedelta(minutes=1),path)
            self.assertEqual(again[0]['record_sha256'],first)
            r['going']='Good';changed,records,_=m.archive_forecasts(data,NOW+dt.timedelta(minutes=2),path)
            self.assertNotEqual(changed[0]['record_sha256'],first);self.assertEqual(changed[0]['revision_of'],first)
            self.assertEqual((path/(first+'.json')).read_bytes(),saved)
            bad=copy.deepcopy(changed[0]);bad['runners'][0]['model_probability']=.99
            with self.assertRaises(ValueError):m.validate_record(bad)


class ForwardResultCycle(unittest.TestCase):
    def test_frozen_context_vector_scores_only_matching_final_field(self):
        r=race();data={'generated_at_utc':NOW.isoformat(),'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','races':[r]}
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp);current,records,_=m.archive_forecasts(data,NOW,path/'archive')
            final={'hasError':False,'race':{'race_summary':{'race_summary_reference':{'id':1},'course_name':'Nottingham','date':'2026-11-04','time':'13:00:00','race_stage':'WEIGHEDIN'},'rides':[{'horse':{'horse_reference':{'id':'a'}},'ride_status':'RUNNER','finish_position':1},{'horse':{'horse_reference':{'id':'b'}},'ride_status':'RUNNER','finish_position':2}]}}
            raw=('<script id="__NEXT_DATA__" type="application/json">'+json.dumps({'props':{'pageProps':final}})+'</script>').encode()
            scored=m.score_provisional(records,NOW+dt.timedelta(hours=4),path/'results.json',fetch=lambda _:raw)
            self.assertEqual(scored['scored_forecasts'],1)
            self.assertEqual(scored['entries'][0]['model'],m.MODEL)
            self.assertEqual(scored['entries'][0]['winner_horse_id'],'a')
            self.assertEqual(scored['entries'][0]['challenge_eligible'],0)
            p=next(x['model_probability']for x in current[0]['runners']if x['horse_id']=='a')
            self.assertAlmostEqual(scored['entries'][0]['log_loss'],-m.math.log(p))
            final['race']['rides'][1]['ride_status']='NONRUNNER'
            altered=('<script id="__NEXT_DATA__" type="application/json">'+json.dumps({'props':{'pageProps':final}})+'</script>').encode()
            blocked=m.score_provisional(records,NOW+dt.timedelta(hours=4),path/'other-results.json',fetch=lambda _:altered)
            self.assertEqual(blocked['scored_forecasts'],0)
            self.assertEqual(blocked['pending'][0]['reason'],'VOID_FIELD_CHANGED_AFTER_CAPTURE')

if __name__=='__main__':unittest.main()
