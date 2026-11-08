import copy
import datetime as dt
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
import io
import urllib.error
import email.utils
from unittest.mock import patch
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts') if HERE.name=='tests' else str(HERE))
import horse_secondary_source as s
from horse_evaluation import evaluate
class SecondaryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  self.now=dt.datetime(2026,11,2,12,tzinfo=dt.timezone.utc)
  self.race={'race_id':'1','racecourse':'Chelmsford City','startUTC':'2026-11-02T13:00:00Z'}
  self.receipt={'url':'https://api.theracingapi.com/v1/results/today/free?region=gb','sha256':'a'*64,'observed_at_utc':self.now.isoformat()}
  self.row={'race_id':'rac_2','region':'GB','course':'Chelmsford (AW)','date':'2026-11-02','off_dt':'2026-11-02T13:00:00+00:00',
   'race_status':'declared','is_abandoned':False,'runners':[{'horse':'Horse One (IRE)','position':'1'},{'horse':'Horse Two','position':'2'}],'_source_receipt':self.receipt}
  self.record={**self.race,'record_sha256':'b'*64,'runners':[{'horse_id':'1','name':'Horse One'},{'horse_id':'2','name':'Horse Two'}]}
  self.entry={'winner_horse_id':'1','source_receipt':{'url':'https://www.sportinglife.com/racing/example','sha256':'c'*64}}
 def tearDown(self):self.tmp.cleanup()
 def test_missing_credentials_does_not_call_network(self):
  with patch.dict(os.environ,{},clear=True),patch('urllib.request.build_opener',side_effect=AssertionError('must not connect')):
   d,rows,a=s.collect({'races':[self.race]},self.now,cache=self.root/'cache')
  self.assertEqual(a['connection_status'],'MISSING_CREDENTIALS');self.assertEqual(rows,[])
 def test_strict_schedule_identity_offset_and_ambiguity(self):
  self.assertEqual(len(s.candidates(self.race,[self.row])),1)
  for field,value in [('course','Wolverhampton'),('off_dt','2026-11-02T14:00:00Z'),('off_dt','2026-11-02T13:00:00'),('region','USA')]:
   row={**self.row,field:value};self.assertEqual(s.candidates(self.race,[row]),[])
  class MockClient:
   def pages(inner,path,key,query):return ([self.row,self.row],[]) if key=='racecards' else ([],[])
  d,rows,a=s.collect({'races':[copy.deepcopy(self.race)]},self.now,MockClient(),self.root/'cache')
  self.assertFalse(d['races'][0]['schedule_cross_checked'])
 def test_explicit_secondary_discipline_and_conflict(self):
  row={**self.row,'type':'Hurdle'}
  class Client:
   def pages(inner,path,key,query):return ([row] if key=='racecards' else []),[]
  data={'races':[{**self.race,'run_type':'FLAT'}]}
  output,_,_=s.collect(data,self.now,client=Client(),cache=self.root/'types')
  self.assertEqual(output['races'][0]['secondary_run_type'],'HURDLE')
  self.assertTrue(output['races'][0]['discipline_conflict'])
  self.assertEqual(output['races'][0]['secondary_run_type_receipt'],self.receipt)
 def going_collect(self,going,primary=None,**row_updates):
  receipt={**self.receipt,'url':'https://api.theracingapi.com/v1/racecards/free?day=today&region_codes=gb'}
  row={**copy.deepcopy(self.row),'going':going,'_source_receipt':receipt,**row_updates}
  class Client:
   def pages(inner,path,key,query):return ([row] if key=='racecards' else []),[]
  race={**self.race,'going':primary}
  output,_,_=s.collect({'races':[race]},self.now,client=Client(),cache=self.root/'going')
  return output['races'][0],receipt
 def test_documented_secondary_going_fills_only_missing_primary_with_receipt(self):
  for primary in [None,'','  ','-','Unknown','not supplied']:
   with self.subTest(primary=primary):
    race,receipt=self.going_collect('Good To Yielding',primary)
    self.assertEqual(race['going'],'Good To Yielding')
    self.assertEqual(race['going_basis'],'SECOND_PUBLISHER_STRUCTURED_GOING')
    self.assertEqual(race['going_source_receipt'],receipt)
    self.assertEqual(race['secondary_going_receipt'],receipt)
    self.assertEqual(race['secondary_going'],'Good To Yielding')
    self.assertFalse(race['going_conflict'])
 def test_primary_text_is_preserved_and_equivalent_wording_is_not_a_conflict(self):
  for primary,secondary in [('Good to Soft (Good in places)','good_to_soft'),('Good-good to soft in places','Good To Soft'),('STANDARD','standard'),('Good to Firm','good-to-firm')]:
   with self.subTest(primary=primary):
    race,_=self.going_collect(secondary,primary)
    self.assertEqual(race['going'],primary)
    self.assertFalse(race['going_conflict'])
    self.assertEqual(race['going_comparison_status'],'AGREES_AT_BROAD_CONDITION_LEVEL')
    self.assertNotIn('going_source_receipt',race)
 def test_material_disagreement_is_flagged_without_overwriting_primary(self):
  race,receipt=self.going_collect('Firm','Soft')
  self.assertEqual(race['going'],'Soft');self.assertEqual(race['secondary_going'],'Firm')
  self.assertTrue(race['going_conflict'])
  self.assertEqual(race['going_comparison_status'],'MATERIAL_DISAGREEMENT')
  self.assertEqual(race['secondary_going_receipt'],receipt)
 def test_unknown_oversized_and_mixed_discipline_descriptions_are_not_imputed(self):
  for value in [None,'','Unknown','API error','Good_Request_Error','Good'*60,'Hurdle: soft; chase: good-good to firm in places','Soft / Good','<script>Good</script>',{'going':'Good'}]:
   with self.subTest(value=value):
    race,_=self.going_collect(value)
    self.assertIsNone(race['going'])
    self.assertNotIn('secondary_going',race)
    self.assertEqual(race['going_comparison_status'],'SECONDARY_GOING_UNAVAILABLE_OR_UNSUPPORTED')
 def test_receipt_must_be_fresh_supported_endpoint_and_hash(self):
  for updates in [{'url':'https://api.theracingapi.com/v1/results/today/free'}, {'url':'https://evil.invalid/v1/racecards/free'}, {'sha256':'invalid'}, {'observed_at_utc':(self.now-dt.timedelta(hours=1)).isoformat()}, {'observed_at_utc':(self.now+dt.timedelta(minutes=6)).isoformat()}]:
   with self.subTest(updates=updates):
    receipt={**self.receipt,'url':'https://api.theracingapi.com/v1/racecards/free',**updates}
    race,_=self.going_collect('Good',_source_receipt=receipt)
    self.assertIsNone(race['going']);self.assertNotIn('secondary_going',race)
    self.assertEqual(race['going_comparison_status'],'SECONDARY_GOING_RECEIPT_UNCONFIRMED')
 def test_ambiguous_or_wrong_race_match_cannot_supply_going(self):
  row={**self.row,'going':'Good','_source_receipt':{**self.receipt,'url':'https://api.theracingapi.com/v1/racecards/free'}}
  class Client:
   def pages(inner,path,key,query):return ([row,row] if key=='racecards' else []),[]
  output,_,_=s.collect({'races':[{**self.race,'going':None}]},self.now,client=Client(),cache=self.root/'ambiguous-going')
  self.assertIsNone(output['races'][0]['going']);self.assertNotIn('secondary_going',output['races'][0])
  race,_=self.going_collect('Good',course='Wrong Course')
  self.assertIsNone(race['going']);self.assertNotIn('secondary_going',race)
 def test_unmapped_primary_description_is_preserved_without_claiming_agreement(self):
  primary='Hurdle: soft; chase: good-good to firm in places'
  race,_=self.going_collect('Good',primary)
  self.assertEqual(race['going'],primary)
  self.assertEqual(race['going_comparison_status'],'PRIMARY_DESCRIPTION_UNMAPPED')
  self.assertFalse(race['going_conflict'])
 def test_full_field_and_winner_must_agree(self):
  e,reason=s.corroborate(self.record,self.entry,[self.row]);self.assertIsNone(reason);self.assertEqual(e['verification'],'TWO_PUBLISHER_RESULT_CORROBORATED')
  for change in ['field','winner','receipt','ambiguous']:
   row=copy.deepcopy(self.row);rows=[row]
   if change=='field':row['runners'][1]['horse']='Other horse'
   elif change=='winner':row['runners'][0]['position']='2';row['runners'][1]['position']='1'
   elif change=='receipt':row['_source_receipt']['url']='https://not-our-provider.invalid/v1/results/today/free'
   else:rows.append({**row,'race_id':'rac_3'})
   e,reason=s.corroborate(self.record,self.entry,rows);self.assertIsNone(e);self.assertIsNotNone(reason)
 def test_cache_hashes_and_corrections_preserved(self):
  path=self.root/'cache';self.assertEqual(len(s.cache_results([self.row],path)),1);self.assertEqual(len(s.cache_results([self.row],path)),1)
  row=copy.deepcopy(self.row);row['runners'][0]['position']='2'
  self.assertEqual(len(s.cache_results([row],path)),2)
  p=next(path.glob('*.json'));d=json.loads(p.read_text());d['row']['course']='Changed';p.write_text(json.dumps(d))
  with self.assertRaises(ValueError):s.cache_results([],path)
 def test_rate_limit_retry_honours_header(self):
  class Response(io.BytesIO):
   status=200
   def geturl(inner):return 'https://api.theracingapi.com/v1/racecards/free'
  class Opener:
   calls=0
   def open(inner,req,timeout):
    inner.calls+=1
    if inner.calls==1:raise urllib.error.HTTPError(req.full_url,429,'rate limit',{'Retry-After':'7'},None)
    return Response(b'{"racecards":[],"total":0,"skip":0}')
  waits=[];opener=Opener();client=s.Client('private-test-user','private-test-password',opener=opener,pause=waits.append)
  data,receipt,raw=client.get('/v1/racecards/free',{})
  self.assertEqual(opener.calls,2);self.assertIn(7,waits);self.assertEqual(receipt['rate_limit_retries'],1)
  self.assertNotIn('private-test',json.dumps(receipt))
 def test_rate_retries_bounded_and_auth_not_retried(self):
  class Opener:
   def __init__(inner,code,header='0'):inner.code=code;inner.calls=0;inner.header=header
   def open(inner,req,timeout):
    inner.calls+=1
    raise urllib.error.HTTPError(req.full_url,inner.code,'blocked',{'Retry-After':inner.header},None)
  for code,header,expected in [(429,'0',3),(401,'0',1),(403,'0',1),(429,'120',1)]:
   opener=Opener(code,header);waits=[];client=s.Client('u','p',opener=opener,pause=waits.append)
   with self.assertRaises(ValueError):client.get('/v1/results/today/free',{})
   self.assertEqual(opener.calls,expected);self.assertTrue(all(w<=60 for w in waits))
 def test_retry_after_http_date(self):
  header=email.utils.format_datetime(dt.datetime.now(dt.timezone.utc)+dt.timedelta(seconds=10),usegmt=True)
  class Opener:
   calls=0
   def open(inner,req,timeout):
    inner.calls+=1
    raise urllib.error.HTTPError(req.full_url,429,'rate limit',{'Retry-After':header},None)
  waits=[];client=s.Client('u','p',opener=Opener(),pause=waits.append)
  with self.assertRaises(ValueError):client.get('/v1/results/today/free',{})
  self.assertTrue(any(w>=8 for w in waits))
 def test_only_free_endpoints_are_permitted(self):
  client=s.Client('fake-user','fake-password',opener=object())
  with self.assertRaises(ValueError):client.get('/v1/results',{})
class EvaluationTests(unittest.TestCase):
 def fixture(self,n):
  records=[];entries=[]
  for i in range(n):
   records.append({'record_sha256':str(i),'model':'TEST','race_id':str(i),'startUTC':'2026-11-02T13:00:00Z','runners':[{'horse_id':'1','model_probability':.6},{'horse_id':'2','model_probability':.4}]})
   entries.append({'record_sha256':str(i),'winner_horse_id':'1','multiclass_brier_score':.32,'log_loss':-__import__('math').log(.6),'equal_chance_brier_score':.5,'equal_chance_log_loss':__import__('math').log(2)})
  return records,entries
 def test_no_invented_accuracy_and_small_sample_gate(self):
  self.assertEqual(evaluate([],[])['models'],{})
  r,e=self.fixture(3);m=evaluate(r,e)['models']['TEST'];self.assertEqual(m['status'],'INSUFFICIENT_SAMPLE');self.assertIsNone(m['brier_delta_bootstrap_95_interval'])
 def test_race_bootstrap_and_calibration(self):
  r,e=self.fixture(30);d=evaluate(r,e);m=d['models']['TEST']
  self.assertAlmostEqual(m['brier_delta_bootstrap_95_interval']['lower'],-.18)
  self.assertEqual(sum(x['runner_observations'] for x in m['calibration_bins']),60)
  self.assertEqual(d['model_validation'],'UNVALIDATED')
 def test_duplicate_revision_cannot_inflate_sample(self):
  r,e=self.fixture(1)
  with self.assertRaises(ValueError):evaluate(r,e+e)
if __name__=='__main__':unittest.main()
