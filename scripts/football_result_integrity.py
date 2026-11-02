"""Bind public Premier League result metrics to immutable forecast evidence."""
import datetime as dt
import hashlib
import json
import math
import re
from urllib.parse import urlsplit
from experiment62_fixture_discovery import norm

def when(value):
 value=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
 if value.tzinfo is None:raise ValueError('Result timestamp requires timezone')
 return value

def load_archives(root):
 records={}
 for version in ('v1','v2'):
  for path in (root/'research/forecast-archive'/version).glob('*.json'):
   r=json.loads(path.read_text());unsigned=dict(r);saved=unsigned.pop('record_sha256')
   calculated=hashlib.sha256(json.dumps(unsigned,sort_keys=True,separators=(',',':')).encode()).hexdigest()
   if saved!=path.stem or saved!=calculated:raise ValueError('Forecast archive integrity failure')
   if r.get('publication_gate')!='BLOCKED' or r.get('challenge_eligible')!=0 or when(r['generated_at_utc'])>=when(r['kickoff_utc']):raise ValueError('Invalid pre-event archive')
   records[saved]=r
 return records

def validate_result(entry,records):
 r=records.get(entry.get('record_sha256'))
 if r is None:raise ValueError('Result has no frozen forecast')
 if norm(entry.get('home',''))!=norm(r['home']) or norm(entry.get('away',''))!=norm(r['away']) or when(entry['kickoff_utc'])!=when(r['kickoff_utc']) or entry.get('model','LEGACY_ARCHIVE')!=r.get('model','LEGACY_ARCHIVE'):raise ValueError('Result identity differs from frozen forecast')
 receipts=entry.get('source_receipts',[])
 if len(receipts)!=2:raise ValueError('Two result receipts required')
 hosts=[]
 for receipt in receipts:
  url=urlsplit(receipt.get('url',''))
  if url.scheme!='https' or not re.fullmatch('[a-f0-9]{64}',receipt.get('sha256','')):raise ValueError('Invalid result receipt')
  hosts.append(url.hostname)
 if sorted(hosts)!=['site.api.espn.com','www.football-data.co.uk']:raise ValueError('Incorrect result source hosts')
 h,a=entry.get('score_home'),entry.get('score_away')
 if type(h)!=int or type(a)!=int or min(h,a)<0:raise ValueError('Invalid final score')
 outcome='H' if h>a else 'A' if a>h else 'D'
 if entry.get('actual_outcome')!=outcome:raise ValueError('Outcome differs from final score')
 ps=[r[k] for k in ('prob_home','prob_draw','prob_away')]
 if any(type(p) not in (int,float) or not math.isfinite(p) or not 0<p<1 for p in ps) or abs(sum(ps)-1)>1e-8:raise ValueError('Invalid frozen probabilities')
 index={'H':0,'D':1,'A':2}[outcome]
 expected={'multiclass_brier_score':sum((p-int(i==index))**2 for i,p in enumerate(ps)),'log_loss':-math.log(ps[index])}
 for field,value in expected.items():
  if type(entry.get(field)) not in (int,float) or not math.isfinite(entry[field]) or abs(entry[field]-value)>1e-10:raise ValueError('Result metric differs from frozen forecast')
