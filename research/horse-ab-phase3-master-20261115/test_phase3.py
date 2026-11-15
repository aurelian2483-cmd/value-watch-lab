"""Synthetic failure tests, never prospective race observations."""
import copy
import hashlib
import json
import math
import tempfile
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch
import phase3_ab as ab

UTC=timezone.utc
ROOT=Path(__file__).resolve().parent

class ResearchPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original=ab.load(sorted((ROOT/'audit'/'raw76').glob('*.json'))[0])
        cls.raws=[ab.load(p) for p in sorted((ROOT/'audit'/'raw76').glob('*.json'))]
        cls.now=datetime(2027,1,15,12,0,tzinfo=UTC)
        # Pure synthetic fixture: shift past dates consistently; no live record.
        cls.fixture=copy.deepcopy(cls.original)
        base=datetime.fromisoformat(cls.original['generated_at_utc']).date()
        shift=cls.now.date()-base
        cls.fixture.update({'race_id':'SYNTHETIC_RACE_ONLY','startUTC':(cls.now+timedelta(hours=1)).isoformat(),
             'generated_at_utc':(cls.now-timedelta(minutes=1)).isoformat(),'runner_observed_at_utc':(cls.now-timedelta(minutes=2)).isoformat(),
             'fixture_kind':'SYNTHETIC_TEST_ONLY'})
        for r in cls.fixture['runners']:
            for h in r['context_features']['history']:
                h['date']=(datetime.fromisoformat(h['date']).date()+shift).isoformat()
        cls.seal(cls.fixture)

    @staticmethod
    def seal(r):r['record_sha256']=ab.unsigned_digest(r);return r

    def setUp(self):
        (ROOT/'state').mkdir(exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(prefix='synthetic-test-',dir=ROOT/'state');self.root=Path(self.tmp.name)
        ab.register(self.root,self.now-timedelta(minutes=5))
        self.r=copy.deepcopy(self.fixture)

    def tearDown(self):self.tmp.cleanup()
    def reject(self,record,reason):
        with self.assertRaisesRegex(ab.ResearchError,reason):ab.capture(self.seal(record),self.root,self.now)
    def frozen(self):return ab.capture(self.r,self.root,self.now)[0]
    def evidence(self):
        f=ab.load(self.root/'forecasts'/(self.frozen()+'.json'));field=f['horse_ids'];winner=field[0]
        sources=[]
        for pub,host in [('sportinglife','www.sportinglife.com'),('racingpost','www.racingpost.com')]:
            body=json.dumps({'synthetic':True,'publisher':pub,'race':f['race_id'],'winner':winner})
            sources.append({'publisher_id':pub,'url':'https://'+host+'/synthetic-test-only',
                'observed_at_utc':(self.now+timedelta(hours=2)).isoformat(),
                'retained_snapshot_utf8':body,'source_sha256':hashlib.sha256(body.encode()).hexdigest(),
                'reviewed_extraction':{'race_id':f['race_id'],'startUTC':f['startUTC'],'status':'FINAL',
                 'canonical_final_runner_ids':field,'canonical_winner_horse_id':winner,'identity_mapping_reviewed':True}})
        return {'race_id':f['race_id'],'startUTC':f['startUTC'],'review_status':'REVIEWED_FINAL','reviewer':'SYNTHETIC_TEST_REVIEWER','sources':sources}

    def test_raw_baseline_and_challenger_exact_phase2(self):
        snapshot=ROOT/'reproduction'/'phase2_snapshot'/'results'/'runner_predictions.jsonl'
        old={}
        for line in snapshot.read_text().splitlines():
            x=json.loads(line)
            if x['candidate'] in ['A0_FULL','E_NODIST_half_life_inverse_temperature']:old[x['candidate'],x['race_id']]=x['probabilities']
        err=0
        for raw in self.raws:
            ab.validate_context(raw,self.now,False)
            for cfg,name in [(ab.BASE,'A0_FULL'),(ab.CHALLENGER,'E_NODIST_half_life_inverse_temperature')]:
                ps=ab.raw_probabilities(raw,cfg);self.assertAlmostEqual(sum(ps),1)
                err=max(err,max(abs(a-b) for a,b in zip(ps,old[name,raw['race_id']])))
        self.assertLess(err,1e-12)
    def test_capture_normalization(self):
        h=self.frozen();f=ab.load(self.root/'forecasts'/(h+'.json'))
        self.assertAlmostEqual(sum(f['A']),1);self.assertAlmostEqual(sum(f['B']),1);self.assertFalse(f['betting_eligible'])
    def test_idempotence(self):
        h=self.frozen();h2,created=ab.capture(self.r,self.root,self.now+timedelta(minutes=1))
        self.assertEqual(h,h2);self.assertFalse(created);self.assertEqual(len(ab.objects(self.root,'forecasts')),1)
    def test_late_capture_blocked(self):
        with self.assertRaisesRegex(ab.ResearchError,'CAPTURE_NOT_PRE_EVENT'):ab.capture(self.r,self.root,self.now+timedelta(hours=2))
    def test_naive_timestamp(self):self.r['startUTC']='2027-01-15T13:00:00';self.reject(self.r,'TIMESTAMP_NAIVE')
    def test_offset_equivalence(self):self.assertEqual(ab.stamp('2027-01-15T14:00:00+01:00'),ab.stamp('2027-01-15T13:00:00Z'))
    def test_summer_london_rollover(self):self.assertEqual(ab.london_date(ab.stamp('2026-07-01T23:30:00Z')).isoformat(),'2026-07-02')
    def test_winter_london(self):self.assertEqual(ab.london_date(ab.stamp('2026-11-15T23:30:00Z')).isoformat(),'2026-11-15')
    def test_timezone_no_database_fails_closed(self):
        with patch.object(ab,'ZoneInfo',side_effect=ab.ZoneInfoNotFoundError),patch.object(ab.shutil,'which',return_value=None):
            with self.assertRaisesRegex(ab.ResearchError,'TIMEZONE_DATABASE_UNAVAILABLE'):ab.london_date(self.now)
    def test_duplicate_runner(self):self.r['runners'][1]['horse_id']=self.r['runners'][0]['horse_id'];self.reject(self.r,'DUPLICATE_RUNNER')
    def test_incomplete_field(self):self.r['active_runner_count']+=1;self.reject(self.r,'INCOMPLETE_FIELD')
    def test_wrong_model(self):self.r['model']='V3_FIXED_DISTANCE_SURFACE_RESEARCH';self.reject(self.r,'WRONG_SOURCE_MODEL')
    def test_wrong_parameter(self):self.r['parameters']['neutral_prior_runs']=0;self.reject(self.r,'WRONG_SOURCE_PARAMETERS')
    def test_bool_not_number(self):self.r['parameters']['minimum_form_runs']=True;self.reject(self.r,'WRONG_SOURCE_PARAMETERS')
    def test_wrong_gate(self):self.r['publication_gate']='OPEN';self.reject(self.r,'SOURCE_GATES_UNSAFE')
    def test_future_runner_observation(self):self.r['runner_observed_at_utc']=(self.now+timedelta(minutes=1)).isoformat();self.reject(self.r,'SOURCE_RUNNERS_STALE_OR_FUTURE')
    def test_stale_runner_observation(self):self.r['runner_observed_at_utc']=(self.now-timedelta(hours=1)).isoformat();self.reject(self.r,'SOURCE_RUNNERS_STALE_OR_FUTURE')
    def test_target_outcome_rejected(self):self.r['actual_winner']=self.r['runners'][0]['horse_id'];self.reject(self.r,'TARGET_OUTCOME_IN_CAPTURE')
    def test_history_future(self):self.r['runners'][0]['context_features']['history'][0]['date']=self.now.date().isoformat();self.reject(self.r,'HISTORY_FUTURE_OR_STALE')
    def test_history_duplicate(self):h=self.r['runners'][0]['context_features']['history'];h[1]=copy.deepcopy(h[0]);self.reject(self.r,'DUPLICATE_HISTORY')
    def test_history_unknown(self):self.r['runners'][0]['context_features']['history'][0]['outcome']='UNKNOWN';self.reject(self.r,'UNRESOLVED_HISTORY')
    def test_wrong_percentile(self):self.r['runners'][0]['context_features']['history'][0]['finish_percentile']=.12345;self.reject(self.r,'PERCENTILE_MISMATCH')
    def test_wrong_recency(self):self.r['runners'][0]['context_features']['history'][0]['recency_weight']=.12345;self.reject(self.r,'RECENCY_DATE_MISMATCH')
    def test_bad_similarity(self):self.r['runners'][0]['context_features']['history'][0]['similarities']['going']=2;self.reject(self.r,'SIMILARITY_RANGE')
    def test_vector_corruption(self):self.r['runners'][0]['model_probability']+=.1;self.reject(self.r,'BASELINE_PARITY_FAILURE')
    def test_hash_corruption(self):
        self.r['race_name']='tampered'
        with self.assertRaisesRegex(ab.ResearchError,'SOURCE_HASH_MISMATCH'):ab.capture(self.r,self.root,self.now)
    def test_prior_race_excluded(self):self.r['race_id']=self.original['race_id'];self.reject(self.r,'PREVIOUSLY_EXAMINED_RACE')
    def test_json_duplicate_keys(self):
        with self.assertRaisesRegex(ab.ResearchError,'DUPLICATE_JSON_KEY'):ab.strict_json('{"a":1,"a":2}')
    def test_json_nan(self):
        with self.assertRaisesRegex(ab.ResearchError,'NONFINITE_JSON_NUMBER'):ab.strict_json('{"a":NaN}')
    def test_json_exponent_overflow(self):
        with self.assertRaisesRegex(ab.ResearchError,'NONFINITE_JSON_NUMBER'):ab.strict_json('{"a":1e9999}')
    def test_acquisition_git_hash_exact(self):
        import collect_research
        raw=(ROOT/'acquisition'/'horse-predictions-data.json').read_bytes()
        self.assertEqual(collect_research.git_blob_sha1(raw),'74887274029001f87a033a80d5a714574ec2e9b6')
    def test_schedule_revision_not_two_races(self):
        self.frozen();self.r['startUTC']=(self.now+timedelta(hours=1,minutes=10)).isoformat()
        self.reject(self.r,'SCHEDULE_CHANGED_REQUIRES_REVIEW')
        _,x=ab.analyze(self.root,self.now);self.assertEqual(x['genuinely_pre_event_paired_races'],1)
    def test_null_runner(self):self.r['runners'][0]=None;self.reject(self.r,'RUNNER_NOT_OBJECT')
    def test_null_features(self):self.r['runners'][0]['context_features']=None;self.reject(self.r,'CONTEXT_FEATURES_NOT_OBJECT')
    def test_null_history(self):self.r['runners'][0]['context_features']['history'][0]=None;self.reject(self.r,'HISTORY_ROW_NOT_OBJECT')
    def test_null_result_source(self):
        b=self.evidence();b['sources'][0]=None
        with self.assertRaisesRegex(ab.ResearchError,'RESULT_SOURCE_NOT_OBJECT'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_json_malformed(self):
        with self.assertRaisesRegex(ab.ResearchError,'MALFORMED_JSON'):ab.strict_json('{')
    def test_path_traversal(self):
        with self.assertRaisesRegex(ab.ResearchError,'INVALID_ID'):ab.ident('../../main')
    def test_store_outside_research_rejected(self):
        with self.assertRaisesRegex(ab.ResearchError,'STORE_OUTSIDE'):ab.safe_root(ROOT.parent)
    def test_immutable_write(self):
        p=self.root/'x.json';ab.write_once(p,{'a':1})
        with self.assertRaisesRegex(ab.ResearchError,'IMMUTABLE_OBJECT_CONFLICT'):ab.write_once(p,{'a':2})
    def test_partial_files_not_ledger(self):
        (self.root/'forecasts').mkdir();(self.root/'forecasts'/'.partial-crash').write_text('bad')
        self.assertEqual(ab.objects(self.root,'forecasts'),[])
    def test_zero_metrics_are_unavailable(self):
        h,x=ab.analyze(self.root,self.now);self.assertEqual(x['completed_prospective_comparisons'],0);self.assertIsNone(x['A']['mean_log_loss'])
    def test_feed_current_field_guard(self):
        feed={'model':'CONTEXT_FORM_RESEARCH_V1','generated_at_utc':self.now.isoformat(),'forecasts':[self.r],'skipped':[],**ab.GUARDS}
        out=ab.inspect_feed(feed,self.root,self.now);self.assertEqual(out['new_paired_forecasts'],0)
        self.assertEqual(out['capture_failures'][0]['reason'],'CURRENT_FIELD_NOT_CONFIRMED')
    def test_feed_current_field_match(self):
        feed={'model':'CONTEXT_FORM_RESEARCH_V1','generated_at_utc':self.now.isoformat(),'forecasts':[self.r],'skipped':[],**ab.GUARDS,
          'current_field_checks':{self.r['record_sha256']:{'status':'FRESH_MATCHING_FIELD_AND_CONTEXT','checked_at_utc':self.now.isoformat(),'runner_observed_at_utc':self.r['runner_observed_at_utc'],'active_runner_ids':[r['horse_id'] for r in self.r['runners']],'context_signature':self.r['context_signature']}}}
        out=ab.inspect_feed(feed,self.root,self.now);self.assertEqual(out['new_paired_forecasts'],1)
    def test_result_valid_manual_evidence(self):
        h,created=ab.result_evidence(self.evidence(),self.root,self.now+timedelta(hours=3));self.assertTrue(created)
        _,s=ab.analyze(self.root,self.now+timedelta(hours=3));self.assertEqual(s['completed_prospective_comparisons'],1)
    def test_result_two_sources_required(self):
        b=self.evidence();b['sources']=b['sources'][:1]
        with self.assertRaisesRegex(ab.ResearchError,'TWO_RESULT_SOURCES_REQUIRED'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_source_duplicate(self):
        b=self.evidence();b['sources'][1]['publisher_id']='sportinglife'
        with self.assertRaisesRegex(ab.ResearchError,'RESULT_SOURCES_NOT_DISTINCT'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_receipt_before_race(self):
        b=self.evidence();b['sources'][0]['observed_at_utc']=self.now.isoformat()
        with self.assertRaisesRegex(ab.ResearchError,'RESULT_RECEIPT_CHRONOLOGY'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_sources_disagree(self):
        b=self.evidence();b['sources'][1]['reviewed_extraction']['canonical_winner_horse_id']=self.r['runners'][1]['horse_id']
        with self.assertRaisesRegex(ab.ResearchError,'RESULT_SOURCES_DISAGREE'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_field_change(self):
        b=self.evidence()
        for s in b['sources']:s['reviewed_extraction']['canonical_final_runner_ids']=s['reviewed_extraction']['canonical_final_runner_ids'][:-1]
        with self.assertRaisesRegex(ab.ResearchError,'FINAL_FIELD_CHANGED'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_review_required(self):
        b=self.evidence();b['review_status']='UNREVIEWED'
        with self.assertRaisesRegex(ab.ResearchError,'NOT_INDEPENDENTLY_REVIEWED'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_payload_hash(self):
        b=self.evidence();b['sources'][0]['retained_snapshot_utf8']+=' changed'
        with self.assertRaisesRegex(ab.ResearchError,'SNAPSHOT_HASH_MISMATCH'):ab.result_evidence(b,self.root,self.now+timedelta(hours=3))
    def test_result_idempotence(self):
        b=self.evidence();h,_=ab.result_evidence(b,self.root,self.now+timedelta(hours=3));h2,created=ab.result_evidence(b,self.root,self.now+timedelta(hours=4));self.assertEqual(h,h2);self.assertFalse(created)
    def test_amendment_requires_link_and_preserves_original(self):
        b=self.evidence();h,_=ab.result_evidence(b,self.root,self.now+timedelta(hours=3));b2=copy.deepcopy(b);b2['reviewer']='NEW_SYNTHETIC_REVIEW'
        with self.assertRaisesRegex(ab.ResearchError,'AMENDMENT_LINK'):ab.result_evidence(b2,self.root,self.now+timedelta(hours=4))
        b2['supersedes']=h;h2,_=ab.result_evidence(b2,self.root,self.now+timedelta(hours=4));self.assertNotEqual(h,h2);self.assertEqual(len(ab.objects(self.root,'results')),2)
        _,x=ab.analyze(self.root,self.now+timedelta(hours=4));self.assertEqual(x['completed_prospective_comparisons'],1)

if __name__=='__main__':unittest.main(verbosity=2)
