import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from horse_evaluation import compare_models,evaluate,parameter_fingerprint


def fixture(race_id='1',context=True,probability=.6):
    record={'record_sha256':('a' if context else 'b')*64+race_id,'model':'CONTEXT_FORM_RESEARCH_V1' if context else 'FORM_PERCENTILE_SOFTMAX_RESEARCH_V1',
      'race_id':race_id,'racecourse':'Kempton','startUTC':'2026-11-04T15:00:00Z',
      'generated_at_utc':'2026-11-04T13:00:00Z' if context else '2026-11-04T12:00:00Z',
      'source':'https://www.sportinglife.com/racing/racecards/race/'+race_id,'parameters':{'temperature':2},
      'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','challenge_eligible':0,
      'run_type':'FLAT','surface':'TAPETA','runners':[{'horse_id':'1','model_probability':probability},{'horse_id':'2','model_probability':1-probability}]}
    entry={k:record[k] for k in ('record_sha256','race_id','racecourse','startUTC','model')}
    entry.update({'winner_horse_id':'1','multiclass_brier_score':2*(1-probability)**2,'log_loss':-math.log(probability),
      'scored_at_utc':'2026-11-04T16:00:00Z','equal_chance_brier_score':.5,'equal_chance_log_loss':math.log(2),'verification':'SINGLE_SOURCE_PROVISIONAL',
      'independently_verified':False,'publication_gate':'BLOCKED','challenge_eligible':0,
      'source_receipt':{'url':record['source'],'sha256':'c'*64,'observed_at_utc':'2026-11-04T16:00:00Z'}})
    return record,entry


class PairedModelComparison(unittest.TestCase):
    def test_paired_deltas_show_distinct_freeze_times_and_research_status(self):
        c,ce=fixture();b,be=fixture(context=False,probability=.4)
        result=compare_models([c],[ce],[b],[be])
        self.assertEqual(result['matched_races'],1)
        self.assertAlmostEqual(result['groups'][0]['mean_brier_delta_context_minus_baseline'],-.4)
        self.assertEqual(result['groups'][0]['discipline'],'FLAT')
        self.assertEqual(result['groups'][0]['surface'],'ALL_WEATHER')
        self.assertIsNone(result['groups'][0]['brier_delta_bootstrap_95_interval'])
        self.assertEqual(result['pairs'][0]['freeze_time_difference_seconds'],3600)
        self.assertEqual(result['model_validation'],'UNVALIDATED')

    def test_fields_winners_and_source_receipts_must_match_supported_evidence(self):
        for issue,expected in [('field','FROZEN_FIELDS_DIFFER'),('winner','RESULT_WINNERS_DISAGREE'),('source','INVALID_OR_UNSUPPORTED_RESULT_EVIDENCE')]:
            c,ce=fixture();b,be=fixture(context=False,probability=.4)
            if issue=='field':b['runners'][1]['horse_id']='3'
            if issue=='winner':
                be['winner_horse_id']='2';be['multiclass_brier_score']=.32;be['log_loss']=-math.log(.6)
            if issue=='source':be['source_receipt']['sha256']='unverified'
            result=compare_models([c],[ce],[b],[be])
            self.assertEqual(result['matched_races'],0,issue)
            self.assertEqual(result['exclusions'],{expected:1})

    def test_latest_revision_unscored_does_not_fall_back_to_cherry_picked_older_score(self):
        c,ce=fixture();b,be=fixture(context=False)
        later={**c,'record_sha256':'d'*64,'generated_at_utc':'2026-11-04T14:00:00Z'}
        result=compare_models([c,later],[ce],[b],[be])
        self.assertEqual(result['matched_races'],0)
        self.assertEqual(result['exclusions'],{'LATEST_REVISION_NOT_SCORED':1})

    def test_different_event_times_or_courses_are_not_paired(self):
        for changes in [{'startUTC':'2026-11-04T15:03:00Z'},{'racecourse':'Another course'}]:
            c,ce=fixture();b,be=fixture(context=False);b.update(changes);be.update(changes)
            result=compare_models([c],[ce],[b],[be])
            self.assertEqual(result['matched_races'],0)
            self.assertEqual(result['exclusions'],{'NO_MATCHING_BASELINE_FORECAST':1})

    def test_no_invented_baseline_turf_or_jumps_comparison(self):
        for changes in [{'surface':'TURF'},{'run_type':'CHASE'}]:
            c,ce=fixture();b,be=fixture(context=False);c.update(changes)
            result=compare_models([c],[ce],[b],[be])
            self.assertEqual(result['exclusions'],{'BASELINE_OUTSIDE_RECORDED_SCOPE':1})

    def test_configurations_are_separate_in_evaluation_and_model_comparison(self):
        c,ce=fixture('1');c2,ce2=fixture('2');c2['parameters']={'temperature':3}
        result=evaluate([c,c2],[ce,ce2])
        self.assertEqual(len(result['models']),2)
        self.assertTrue(all('@' in name for name in result['models']))
        self.assertEqual({v['scored_races'] for v in result['models'].values()},{1})
        b,be=fixture('1',False);b2,be2=fixture('2',False)
        paired=compare_models([c,c2],[ce,ce2],[b,b2],[be,be2])
        self.assertEqual(len(paired['groups']),2)
        self.assertEqual({v['paired_races'] for v in paired['groups']},{1})
        self.assertNotEqual(parameter_fingerprint(c),parameter_fingerprint(c2))

    def test_result_cannot_be_scored_before_it_was_observed(self):
        for timestamp in ['2026-11-04T15:59:59Z', None, '2026-11-04T16:00:00']:
            c,ce=fixture();b,be=fixture(context=False)
            if timestamp is None:ce.pop('scored_at_utc')
            else:ce['scored_at_utc']=timestamp
            result=compare_models([c],[ce],[b],[be])
            self.assertEqual(result['matched_races'],0)
            self.assertEqual(result['exclusions'],{'INVALID_OR_UNSUPPORTED_RESULT_EVIDENCE':1})
        c,ce=fixture();b,be=fixture(context=False)
        ce['scored_at_utc']='2026-11-04T17:00:00+01:00'
        self.assertEqual(compare_models([c],[ce],[b],[be])['matched_races'],1)

    def test_corrupt_score_and_late_capture_are_excluded(self):
        for changes in ['score','capture']:
            c,ce=fixture();b,be=fixture(context=False)
            if changes=='score':ce['log_loss']=0
            else:c['generated_at_utc']='2026-11-04T14:56:00Z'
            self.assertEqual(compare_models([c],[ce],[b],[be])['matched_races'],0)


if __name__=='__main__':unittest.main()
