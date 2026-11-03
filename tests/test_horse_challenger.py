import copy
import datetime as dt
import math
import contextlib
import io
import json
import tempfile
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import horse_challenger as challenger
from horse_challenger import feature_rows,history,FEATURES,probabilities,validate_model,MODEL,FEATURE_VERSION,sha

def race():
 return {'date':'2026-10-01','racecourse':'Wolverhampton','distance':'6f','race_class':'4','runners':[
  {'horse_id':str(i),'official_rating':70+i,'weight':'9-7','previous_results':[
   {'race_id':str(j),'date':day,'position':i+1,'runner_count':10,'run_type':'FLAT','distance':'6f','course_name':'Wolverhampton','bha':70,'race_class':'4'}
   for j,day in enumerate(['2026-09-20','2026-09-01','2026-08-01'])]} for i in range(4)]}
class ChallengerTests(unittest.TestCase):
 def test_target_and_future_results_cannot_change_inputs(self):
  a=race();before=feature_rows(a)
  for r in a['runners']:
   r['finish_position']=1;r['previous_results']+=[{**r['previous_results'][0],'race_id':'target','date':'2026-10-01','position':1},{**r['previous_results'][0],'race_id':'future','date':'2026-11-01','position':1}]
  self.assertEqual(before,feature_rows(a))
 def test_missing_required_field_abstains(self):
  a=race();a['runners'][0]['official_rating']=None
  self.assertIsNone(feature_rows(a))
 def test_race_order_equivariance_and_normalization(self):
  a=race();b=copy.deepcopy(a);b['runners'].reverse();weights=[.3]*len(FEATURES)
  p=probabilities(feature_rows(a),weights);q=probabilities(feature_rows(b),weights)
  self.assertAlmostEqual(sum(p),1)
  for x,y in zip(p,reversed(q)):self.assertAlmostEqual(x,y)
 def test_feature_centering_and_history_deduplication(self):
  a=race();a['runners'][0]['previous_results']*=2
  self.assertEqual(len(history(a['runners'][0],dt.date(2026,10,1))),3)
  rows=feature_rows(a)
  for j in range(len(FEATURES)):self.assertAlmostEqual(sum(r[j] for r in rows),0)
 def test_bad_artifact_rejected(self):
  m={'model':MODEL,'feature_version':FEATURE_VERSION,'features':FEATURES,'coefficients':[0]*len(FEATURES),'publication_gate':'BLOCKED','model_validation':'UNVALIDATED'};m['artifact_sha256']=sha(m)
  validate_model(m);m['coefficients'][0]=2
  with self.assertRaises(ValueError):validate_model(m)
 def test_going_and_commentary_are_not_feature_inputs(self):
  a=race();before=feature_rows(a)
  for r in a['runners']:r.update({'odds':'1/10','commentary':'winner','timeform_stars':5})
  self.assertEqual(before,feature_rows(a))
 def test_archive_is_immutable_and_duplicate_runs_do_not_add_records(self):
  now=dt.datetime.now(dt.timezone.utc);r=race();r.pop('date')
  r.update({'name':'Test Handicap','race_id':'test-only','startUTC':(now+dt.timedelta(hours=1)).isoformat(),'surface':'ALLWEATHER','runner_data_status':'SINGLE_SOURCE_RUNNERS_OBSERVED','capture_phase':'PRE_EVENT','race_stage':'DORMANT','runner_observed_at_utc':now.isoformat(),'active_runner_count':4,'source':'https://www.sportinglife.com/test-only','runner_source_sha256':'a'*64})
  for horse in r['runners']:horse.update({'name':'Horse '+horse['horse_id'],'active_runner':True,'runner_status':'RUNNER'})
  model={'model':MODEL,'feature_version':FEATURE_VERSION,'features':FEATURES,'coefficients':[0]*len(FEATURES),'training_data_last_date':'2026-01-01','publication_gate':'BLOCKED','model_validation':'UNVALIDATED'};model['artifact_sha256']=sha(model)
  feed={'generated_at_utc':now.isoformat(),'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','races':[r]}
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);work=root/'work';work.mkdir();dest=root/'research/horse-challenger';dest.mkdir(parents=True)
   (dest/'model-v1.json').write_text(json.dumps(model));(work/'racing-research-data.json').write_text(json.dumps(feed))
   with patch.object(challenger,'ROOT',root),patch.object(challenger,'WORK',work),contextlib.redirect_stdout(io.StringIO()):
    challenger.main();paths=list((dest/'archive/v1').glob('*.json'));self.assertEqual(len(paths),1);frozen=paths[0].read_bytes();challenger.main()
   self.assertEqual(len(list((dest/'archive/v1').glob('*.json'))),1);self.assertEqual(paths[0].read_bytes(),frozen)
   public=json.loads((work/'horse-challenger-data.json').read_text());self.assertEqual(len(public['forecasts']),1);self.assertEqual(public['performance']['scored_forecasts'],0)
if __name__=='__main__':unittest.main()
