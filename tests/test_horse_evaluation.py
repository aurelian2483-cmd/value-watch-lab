import copy
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from horse_evaluation import compare_embedded_form_baseline,compare_models,date_cluster_interval,evaluate,parameter_fingerprint


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

    def test_uniform_benchmark_must_match_actual_frozen_field(self):
        for metric in ['equal_chance_brier_score','equal_chance_log_loss']:
            r,e=fixture();e[metric]+=0.1
            with self.assertRaisesRegex(ValueError,'Uniform benchmark'):
                evaluate([r],[e])
        r,e=fixture()
        self.assertEqual(evaluate([r],[e])['models'][r['model']]['scored_races'],1)

    def test_corrupt_score_and_late_capture_are_excluded(self):
        for changes in ['score','capture']:
            c,ce=fixture();b,be=fixture(context=False)
            if changes=='score':ce['log_loss']=0
            else:c['generated_at_utc']='2026-11-04T14:56:00Z'
            self.assertEqual(compare_models([c],[ce],[b],[be])['matched_races'],0)


if __name__=='__main__':unittest.main()

class EvaluationScoreIntegrity(unittest.TestCase):
    def test_uniform_baseline_rejects_invalid_settlement_evidence(self):
        for issue, message in (
            ('late-freeze', 'Late capture'),
            ('pre-start-result', 'Outcome observed before start'),
            ('score-before-observation', 'Score precedes outcome observation'),
            ('unzoned-result', 'Timezone required'),
            ('wrong-source', 'Invalid source receipt'),
            ('wrong-event', 'Outcome identity mismatch'),
            ('unproven-verification', 'Unsafe outcome'),
        ):
            with self.subTest(issue=issue):
                r,e=fixture()
                if issue=='late-freeze':r['generated_at_utc']='2026-11-04T14:55:00Z'
                if issue=='pre-start-result':e['source_receipt']['observed_at_utc']='2026-11-04T14:59:59Z'
                if issue=='score-before-observation':e['scored_at_utc']='2026-11-04T16:59:59+01:00'
                if issue=='unzoned-result':e['source_receipt']['observed_at_utc']='2026-11-04T16:00:00'
                if issue=='wrong-source':e['source_receipt']['url']='https://example.test/results/1'
                if issue=='wrong-event':e['race_id']='another-race'
                if issue=='unproven-verification':e['independently_verified']=True
                with self.assertRaisesRegex(ValueError,message):
                    evaluate([r],[e])

    def test_uniform_baseline_accepts_equivalent_receipt_and_score_instants(self):
        r,e=fixture()
        e['scored_at_utc']='2026-11-04T17:00:00+01:00'
        self.assertEqual(evaluate([r],[e])['models'][r['model']]['scored_races'],1)

    def test_rejects_corrupted_model_scores(self):
        for key in ('multiclass_brier_score','log_loss'):
            r,e=fixture();e[key]+=.01
            with self.assertRaisesRegex(ValueError,'Evaluation score'):
                evaluate([r],[e])

    def test_rejects_missing_winner_and_duplicate_field(self):
        for issue in ('winner','field'):
            r,e=fixture()
            if issue=='winner':e['winner_horse_id']='unknown'
            else:r['runners'][1]['horse_id']='1'
            with self.assertRaises(ValueError):evaluate([r],[e])

    def test_numeric_ids_calibrate_consistently(self):
        r,e=fixture();r['runners'][0]['horse_id']=1
        result=evaluate([r],[e])
        bins=next(iter(result['models'].values()))['calibration_bins']
        self.assertEqual(sum(b['observed_win_frequency']*b['runner_observations'] for b in bins),1)

class FrozenIdentityIntegrity(unittest.TestCase):
    def test_conflicting_archive_identity_rejected_in_either_order(self):
        import copy
        r,e=fixture();changed=copy.deepcopy(r)
        changed['parameters']['temperature']=999
        for records in ([r,changed],[changed,r]):
            with self.assertRaisesRegex(ValueError,'Conflicting frozen'):
                evaluate(records,[e])

    def test_identical_repeated_record_does_not_duplicate_race(self):
        import copy
        r,e=fixture()
        result=evaluate([r,copy.deepcopy(r)],[e])
        self.assertEqual(next(iter(result['models'].values()))['scored_races'],1)

class BootstrapOrderIntegrity(unittest.TestCase):
    def test_identical_race_deltas_have_order_independent_intervals(self):
        from horse_evaluation import paired_interval
        values=[i/100 for i in range(-20,20)]
        expected=paired_interval(values)
        self.assertEqual(expected,paired_interval(list(reversed(values))))
        self.assertEqual(expected,paired_interval(values[13:]+values[:13]))
        self.assertLess(expected['lower'],expected['upper'])

    def test_small_sample_still_has_no_interval(self):
        from horse_evaluation import paired_interval
        self.assertIsNone(paired_interval([.1]*29))

    def test_date_cluster_interval_is_order_independent_and_uses_london_date(self):
        rows=[]
        # 23:30 UTC is the following London date during British Summer Time.
        for index in range(15):
            rows.append({'startUTC':f'2026-07-01T23:{30+index:02d}:00Z','delta':-.2})
            rows.append({'startUTC':f'2026-07-02T12:{index:02d}:00Z','delta':.1})
        for index in range(30):
            rows.append({'startUTC':f'2026-07-03T12:{index:02d}:00Z','delta':.3})
        expected=date_cluster_interval(rows,'delta',repeats=1000)
        self.assertEqual(expected,date_cluster_interval(list(reversed(rows)),'delta',repeats=1000))
        self.assertEqual(expected['race_dates'],2)
        self.assertLess(expected['lower'],expected['upper'])

    def test_london_clusters_across_transitions_and_local_midnight(self):
        # Each adjacent pair shares a Europe/London date, even when the UTC
        # day differs or the same clock hour occurs twice.
        stamps = (
            '2026-03-29T00:59:59Z', '2026-03-29T01:00:00Z',
            '2026-03-29T23:00:00Z', '2026-03-30T00:00:00+01:00',
            '2026-10-25T01:30:00+01:00', '2026-10-25T01:30:00+00:00',
            '2026-10-25T23:59:59Z', '2026-10-26T00:00:00Z',
        )
        rows = [{'startUTC': stamp, 'delta': .1} for stamp in stamps for _ in range(4)]
        interval = date_cluster_interval(rows, 'delta', repeats=40)
        self.assertEqual(interval['race_dates'], 4)
        self.assertEqual(interval['largest_date_race_count'], 12)
        self.assertEqual(interval['races'], 32)
        with self.assertRaisesRegex(ValueError, 'replicates'):
            date_cluster_interval(rows, 'delta', repeats=39)

    def test_date_cluster_interval_requires_sample_and_multiple_dates(self):
        self.assertIsNone(date_cluster_interval([{'startUTC':'2026-11-04T15:00:00Z','delta':.1}]*29,'delta'))
        self.assertIsNone(date_cluster_interval([{'startUTC':'2026-11-04T15:00:00Z','delta':.1}]*30,'delta'))
        with self.assertRaisesRegex(ValueError,'clustered comparison'):
            date_cluster_interval([{'startUTC':f'2026-11-{4+i%2:02d}T15:00:00Z','delta':float('nan')} for i in range(30)],'delta')

    def test_evaluation_reports_clustered_interval_without_replacing_race_interval(self):
        records=[];entries=[]
        for index in range(30):
            record,entry=fixture(str(index))
            day=4+index//15
            record['startUTC']=entry['startUTC']=f'2026-11-{day:02d}T15:00:00Z'
            record['generated_at_utc']=f'2026-11-{day:02d}T13:00:00Z'
            entry['scored_at_utc']=entry['source_receipt']['observed_at_utc']=f'2026-11-{day:02d}T16:00:00Z'
            records.append(record);entries.append(entry)
        result=evaluate(records,entries)
        summary=next(iter(result['models'].values()))
        self.assertEqual(result['protocol_version'],'RACE_LEVEL_PAIRED_EVALUATION_V3')
        self.assertIsNotNone(summary['brier_delta_bootstrap_95_interval'])
        self.assertEqual(summary['brier_delta_date_cluster_bootstrap_95_interval']['race_dates'],2)

class RevisionTieIntegrity(unittest.TestCase):
    def test_conflicting_capture_time_ties_rejected_in_both_orders(self):
        import copy
        c,ce=fixture();b,be=fixture(context=False)
        other=copy.deepcopy(c);other['record_sha256']='d'*64
        for records in ([c,other],[other,c]):
            with self.assertRaisesRegex(ValueError,'Ambiguous latest forecast'):
                compare_models(records,[ce],[b],[be])

    def test_identical_duplicate_capture_remains_one_pair(self):
        import copy
        c,ce=fixture();b,be=fixture(context=False)
        result=compare_models([c,copy.deepcopy(c)],[ce],[b],[be])
        self.assertEqual(result['matched_races'],1)

class EmbeddedFormBaselineComparison(unittest.TestCase):
    def challenger_fixture(self):
        record,entry=fixture()
        record['model']='AW_CONDITIONAL_LOGIT_PILOT_V1'
        entry['model']=record['model']
        record['runners'][0]['baseline_form_weight']=.4
        record['runners'][1]['baseline_form_weight']=.6
        return record,entry

    def corroborated(self,entry):
        result=copy.deepcopy(entry)
        result['cross_source_evidence']={'verification':'TWO_PUBLISHER_RESULT_CORROBORATED',
          'record_sha256':result['record_sha256'],'winner_horse_id':result['winner_horse_id'],
          'publication_gate':'BLOCKED','challenge_eligible':0,
          'primary_receipt':copy.deepcopy(result['source_receipt']),
          'secondary_receipt':{'url':'https://api.theracingapi.com/v1/results/today/free',
            'sha256':'d'*64,'observed_at_utc':'2026-11-04T16:01:00Z'}}
        return result

    def test_same_frozen_record_is_compared_with_uniform_also_preserved(self):
        record,entry=self.challenger_fixture()
        result=compare_embedded_form_baseline([record],[entry])
        self.assertEqual(result['matched_races'],1)
        self.assertAlmostEqual(result['mean_brier_delta_challenger_minus_form'],-.4)
        self.assertAlmostEqual(result['pairs'][0]['brier_delta_challenger_minus_uniform'],-.18)
        self.assertEqual(result['model_validation'],'UNVALIDATED')
        self.assertEqual(result['publication_gate'],'BLOCKED')
        self.assertEqual(result['two_publisher_corroborated']['matched_races'],0)

    def test_two_publisher_results_are_reported_as_a_separate_subset(self):
        record,entry=self.challenger_fixture()
        result=compare_embedded_form_baseline([record],[entry],[self.corroborated(entry)])
        subset=result['two_publisher_corroborated']
        self.assertEqual(result['matched_races'],1)
        self.assertEqual(subset['matched_races'],1)
        self.assertAlmostEqual(subset['mean_brier_delta_challenger_minus_form'],-.4)
        self.assertEqual(subset['pairs'][0]['result_evidence'],'TWO_PUBLISHER_RESULT_CORROBORATED')

    def test_corroboration_requires_distinct_valid_receipts_and_matching_winner(self):
        record,entry=self.challenger_fixture()
        for issue in ('same_host','early_receipt','winner'):
            evidence=self.corroborated(entry)
            if issue=='same_host':evidence['cross_source_evidence']['secondary_receipt']['url']=record['source']
            if issue=='early_receipt':evidence['cross_source_evidence']['secondary_receipt']['observed_at_utc']='2026-11-04T14:59:00Z'
            if issue=='winner':
                evidence['winner_horse_id']='2';evidence['cross_source_evidence']['winner_horse_id']='2'
            with self.assertRaises(ValueError,msg=issue):
                compare_embedded_form_baseline([record],[entry],[evidence])

    def test_missing_nonfinite_or_unnormalized_baseline_is_rejected(self):
        for baseline in ((.4,None),(.4,float('nan')),(.4,.5)):
            record,entry=self.challenger_fixture()
            for runner,value in zip(record['runners'],baseline):runner['baseline_form_weight']=value
            with self.assertRaisesRegex(ValueError,'embedded form baseline'):
                compare_embedded_form_baseline([record],[entry])

    def test_duplicate_scored_revision_cannot_inflate_comparison(self):
        record,entry=self.challenger_fixture()
        with self.assertRaisesRegex(ValueError,'More than one scored revision'):
            compare_embedded_form_baseline([record],[entry,dict(entry)])
