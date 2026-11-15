#!/usr/bin/env python3
"""Optional second-publisher race/result evidence via documented free API endpoints.
No account creation, subscriptions, odds requests, or credentials in outputs.
"""
import base64
import email.utils
import math
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo
from enrich_horse_runners import stamp

ROOT=Path(__file__).resolve().parents[1]
WORK=Path('/tmp/horse-research')
BASE='https://api.theracingapi.com'
COUNTRY_SUFFIXES='GB|IRE|FR|GER|USA|AUS|NZ|SAF|JPN|CAN|ARG|BRZ|CHI|ITY|SPA|SWE|DEN|NOR|CZE|POL|TUR|UAE|BHR|KSA'

def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def digest(x):return hashlib.sha256(canonical(x)).hexdigest()
def horse_name(value):
 value=re.sub(r'\s*\((' + COUNTRY_SUFFIXES + r')\)\s*$','',str(value),flags=re.I)
 value=unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().casefold().replace("'",'').replace('’','')
 return re.sub(r'[^a-z0-9]+',' ',value).strip()
def course_name(value):
 value=re.sub(r'\s*\((AW|IRE|GB)\)\s*$','',str(value),flags=re.I)
 name=horse_name(value)
 return {'chelmsford':'chelmsford city','chelmsford city':'chelmsford city'}.get(name,name)

def candidates(race,rows):
 matches=[]
 for row in rows:
  try:
   if row.get('region','').upper() not in ('GB','IRE') or course_name(row['course'])!=course_name(race['racecourse']):continue
   # Never infer AM/PM from the provider's 12-hour off_time/off string.
   when=stamp(row['off_dt'])
   if row['date']!=when.astimezone(ZoneInfo('Europe/London')).date().isoformat():continue
   if abs((when-stamp(race['startUTC'])).total_seconds())<=60:matches.append(row)
  except (KeyError,ValueError,TypeError,AttributeError):continue
 return matches


# The documented RacecardBasic.going field is a standardised condition string.
# Intervals deliberately compare broad conditions without pretending that small
# wording differences are contradictory racecourse measurements.
GOING_CONDITIONS={
 'hard':('TURF',0,0),'firm':('TURF',1,1),'good to firm':('TURF',1,2),
 'good':('TURF',2,2),'good to soft':('TURF',2,4),
 'good to yielding':('TURF',2,3),'yielding':('TURF',3,3),
 'yielding to soft':('TURF',3,4),'soft':('TURF',4,4),
 'soft to heavy':('TURF',4,5),'very soft':('TURF',4,5),
 'heavy':('TURF',5,5),'holding':('TURF',4,5),
 'standard':('AW',0,0),'standard to fast':('AW',-1,0),
 'standard to slow':('AW',0,1),'fast':('AW',-1,-1),'slow':('AW',1,1),
 'muddy':('DIRT',1,1),'sloppy':('DIRT',2,2),
}


def standard_going(value):
 """Accept only the provider's documented standardised going vocabulary."""
 if not isinstance(value,str) or not value.strip() or len(value)>160:return None
 normalized=re.sub(r'[-_\s]+',' ',value.strip().casefold()).strip(' .')
 if normalized not in GOING_CONDITIONS:return None
 return value.strip(),GOING_CONDITIONS[normalized]


def primary_going_interval(value):
 """Compare ordinary primary qualifiers; never interpret discipline clauses."""
 direct=standard_going(value)
 if direct:return direct[1]
 if not isinstance(value,str) or len(value)>300:return None
 normalized=re.sub(r'[-_\s]+',' ',value.casefold()).strip(' .')
 if re.search(r'[:;/]|\b(?:hurdle|chase|flat|nhf)\b',normalized):return None
 # Parenthesised/local qualifiers are useful provenance but not distinct
 # standardised observations. Restrict the whole string to recognised phrases.
 tokens=[]
 for condition in sorted(GOING_CONDITIONS,key=len,reverse=True):
  pattern=r'(?<![a-z])'+re.escape(condition)+r'(?![a-z])'
  if re.search(pattern,normalized):
   tokens.append(GOING_CONDITIONS[condition]);normalized=re.sub(pattern,' ',normalized)
 normalized=re.sub(r'\bin places\b|\band\b|\bto\b|[(),\s]+','',normalized)
 if normalized or not tokens or len({item[0] for item in tokens})!=1:return None
 return tokens[0][0],min(item[1] for item in tokens),max(item[2] for item in tokens)


def apply_secondary_going(race,row,now):
 """Fill a missing condition only after unique schedule identity is established.

 Source: /v1/racecards/free -> RacecardsBasicPage -> RacecardBasic.going in
 https://api.theracingapi.com/openapi.json. Composite discipline descriptions
 are intentionally unsupported, rather than guessed from a substring.
 """
 race['going_conflict']=False
 supplied=standard_going(row.get('going'))
 if not supplied:
  race['going_comparison_status']='SECONDARY_GOING_UNAVAILABLE_OR_UNSUPPORTED';return
 receipt=row.get('_source_receipt') or {}
 url=urllib.parse.urlsplit(str(receipt.get('url','')))
 try:
  observed=stamp(receipt['observed_at_utc']);age=(now-observed).total_seconds()
  valid_receipt=(url.scheme=='https' and url.hostname=='api.theracingapi.com' and url.path=='/v1/racecards/free' and not url.username and not url.password and
                 re.fullmatch(r'[a-f0-9]{64}',str(receipt.get('sha256',''))) and -300<=age<=1800 and observed<stamp(race['startUTC']))
 except (KeyError,ValueError,TypeError,AttributeError):valid_receipt=False
 if race.get('schedule_cross_checked') is not True or not valid_receipt:
  race['going_comparison_status']='SECONDARY_GOING_RECEIPT_UNCONFIRMED';return
 source_text,secondary=supplied
 race['secondary_going']=source_text;race['secondary_going_receipt']=receipt
 primary=race.get('going')
 missing=primary is None or (isinstance(primary,str) and primary.strip().casefold() in ('','-','unknown','unavailable','n/a','not available','not supplied'))
 if missing:
  race['going']=re.sub(r'[-_\s]+',' ',source_text).strip(' .');race['going_basis']='SECOND_PUBLISHER_STRUCTURED_GOING';race['going_source_receipt']=receipt
  race['going_comparison_status']='MISSING_PRIMARY_FILLED_FROM_SECOND_PUBLISHER';return
 mapped=primary_going_interval(primary)
 if mapped is None:
  race['going_comparison_status']='PRIMARY_DESCRIPTION_UNMAPPED';return
 race['going_conflict']=mapped[0]!=secondary[0] or max(mapped[1],secondary[1])>min(mapped[2],secondary[2])
 race['going_comparison_status']='MATERIAL_DISAGREEMENT' if race['going_conflict'] else 'AGREES_AT_BROAD_CONDITION_LEVEL'

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):raise ValueError('Provider redirect rejected')

class Client:
 def __init__(self,user,password,opener=None,pause=time.sleep):
  self.authorization='Basic '+base64.b64encode((user+':'+password).encode()).decode()
  self.opener=opener or urllib.request.build_opener(NoRedirect())
  self.pause=pause;self.last=None
 def get(self,path,query):
  if path not in ('/v1/racecards/free','/v1/results/today/free'):raise ValueError('Unapproved endpoint')
  url=BASE+path+'?'+urllib.parse.urlencode(query,doseq=True)
  req=urllib.request.Request(url,headers={'Authorization':self.authorization,'Accept':'application/json','User-Agent':'ValueWatchResearch/1.0'})
  retries=0
  for attempt in range(3):
   if self.last is not None:self.pause(max(0,2.1-(time.monotonic()-self.last)))
   try:
    self.last=time.monotonic()
    with self.opener.open(req,timeout=30) as response:
     if response.status!=200:raise ValueError('Provider HTTP failure')
     if urllib.parse.urlsplit(response.geturl()).netloc!='api.theracingapi.com':raise ValueError('Unexpected provider host')
     raw=response.read(3000001)
    self.last=time.monotonic()
    break
   except urllib.error.HTTPError as exc:
    self.last=time.monotonic()
    if exc.code!=429 or attempt==2:raise ValueError('Provider HTTP '+str(exc.code)) from None
    header=exc.headers.get('Retry-After') if exc.headers else None
    delay=5*(2**attempt)
    if header:
     try:requested=float(header)
     except ValueError:
      try:requested=(email.utils.parsedate_to_datetime(header)-dt.datetime.now(dt.timezone.utc)).total_seconds()
      except (TypeError,ValueError,OverflowError):raise ValueError('Provider rate limit; invalid Retry-After') from None
     if not math.isfinite(requested):raise ValueError('Provider rate limit; invalid Retry-After') from None
     delay=max(delay,requested)
    if delay>60:raise ValueError('Provider rate limit; requested wait exceeds this run retry window') from None
    self.pause(delay);retries+=1
   except urllib.error.URLError:raise ValueError('Provider network unavailable') from None
  if not raw or len(raw)>3000000:raise ValueError('Provider response missing or oversized')
  payload=json.loads(raw)
  if not isinstance(payload,dict):raise ValueError('Provider object response required')
  receipt={'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'rate_limit_retries':retries}
  return payload,receipt,raw
 def pages(self,path,key,query):
  rows=[];receipts=[];skip=0
  for _ in range(10):
   payload,receipt,raw=self.get(path,{**query,'limit':100,'skip':skip})
   page=payload.get(key) or []
   if not isinstance(page,list) or type(payload.get('total')) is not int or payload.get('skip')!=skip:raise ValueError('Provider pagination schema mismatch')
   (WORK/'secondary-source-snapshots').mkdir(parents=True,exist_ok=True)
   (WORK/'secondary-source-snapshots'/(receipt['sha256']+'.json')).write_bytes(raw)
   rows.extend({**r,'_source_receipt':receipt} for r in page);receipts.append(receipt);skip+=len(page)
   if skip==payload['total']:return rows,receipts
   if not page or skip>payload['total']:raise ValueError('Incomplete provider pagination')
  raise ValueError('Provider pagination limit exceeded')

def cache_results(rows,directory):
 # Keep the free endpoint's daily observations for checking older provisional races later.
 pending=[]
 existing={}
 for p in directory.glob('*.json'):
  obj=json.loads(p.read_text());unsigned=dict(obj);saved=unsigned.pop('record_sha256')
  if digest(unsigned)!=saved or p.stem!=saved:raise ValueError('Secondary result evidence integrity failure')
  existing[obj['row_digest']]=obj
 for row in rows:
  if row.get('region','').upper() not in ('GB','IRE'):continue
  unsigned={k:v for k,v in row.items() if k!='_source_receipt'};row_digest=digest(unsigned)
  if row_digest in existing:continue
  obj={'row_digest':row_digest,'row':unsigned,'receipt':row['_source_receipt']};obj['record_sha256']=digest(obj)
  existing[row_digest]=obj;pending.append(obj)
 if pending:directory.mkdir(parents=True,exist_ok=True)
 for obj in pending:
  with (directory/(obj['record_sha256']+'.json')).open('x') as f:f.write(json.dumps(obj,indent=2)+'\n')
 return [{**obj['row'],'_source_receipt':obj['receipt']} for obj in existing.values()]

def collect(data,now,client=None,cache=None):
 audit={'provider':'The Racing API','connection_status':'MISSING_CREDENTIALS','schedule_matches':0,'result_rows_cached':0,'errors':[],
  'verification_scope':'Second-publisher corroboration only; independent underlying data origin and timestamp attestation are not established.'}
 user,password=os.environ.get('RACING_API_USERNAME'),os.environ.get('RACING_API_PASSWORD')
 if client is None and (not user or not password):return data,[],audit
 client=client or Client(user,password);cards=[];results=[]
 for kind,path,key,query in [('cards','/v1/racecards/free','racecards',{'day':'today','region_codes':['gb','ire']}),('results','/v1/results/today/free','results',{'region':['gb','ire']})]:
  try:
   rows,_=client.pages(path,key,query)
   if kind=='cards':cards=rows
   else:results=rows
  except Exception as exc:audit['errors'].append({'stage':kind,'error':str(exc)})
 audit['connection_status']='PARTIAL_OR_UNAVAILABLE' if audit['errors'] else 'CONNECTED'
 for race in data['races']:
  matches=candidates(race,cards)
  race['schedule_cross_checked']=False
  if len(matches)==1 and matches[0].get('race_status') in ('declared','weighed') and matches[0].get('is_abandoned') is not True and stamp(race['startUTC'])>now:
   row=matches[0];race['schedule_cross_checked']=True;race['secondary_schedule_receipt']=row['_source_receipt'];race['secondary_race_id']=row['race_id'];audit['schedule_matches']+=1
   apply_secondary_going(race,row,now)
   family={'flat':'FLAT','hurdle':'HURDLE','chase':'CHASE','nh_flat':'NH_FLAT'}.get(str(row.get('type','')).strip().casefold().replace(' ','_'))
   if family:
    race['secondary_run_type']=family;race['secondary_run_type_receipt']=row['_source_receipt']
    primary=race.get('run_type')
    race['discipline_conflict']=primary in ('FLAT','HURDLE','CHASE','NH_FLAT') and primary!=family
  elif len(matches)>1:race['secondary_schedule_status']='AMBIGUOUS_MATCH'
 directory=cache or ROOT/'research/horse-secondary-results/v1'
 results=cache_results(results,directory);audit['result_rows_cached']=len(results)
 return data,results,audit

def corroborate(record,entry,rows):
 matches=candidates({'racecourse':record['racecourse'],'startUTC':record['startUTC']},rows)
 # Collapse identical result rows observed in several pages/runs.
 unique={digest({k:v for k,v in r.items() if k!='_source_receipt'}):r for r in matches}
 if len(unique)!=1:return None,'SECONDARY_RESULT_MISSING_AMBIGUOUS_OR_CORRECTED'
 row=next(iter(unique.values()));runners=row.get('runners')
 if not isinstance(runners,list) or not runners:return None,'SECONDARY_RUNNER_LIST_UNAVAILABLE'
 names=[];winners=[]
 for r in runners:
  position=str(r.get('position','')).strip().upper()
  if position in ('NR','WD','WITHDRAWN','NON RUNNER'):continue
  if not (position.isdigit() and int(position)>0) and position not in ('PU','F','UR','BD','RO','RR','SU','DSQ'):return None,'SECONDARY_FINISH_POSITION_UNSUPPORTED'
  name=horse_name(r.get('horse',''))
  if not name or name in names:return None,'SECONDARY_HORSE_IDENTITY_AMBIGUOUS'
  names.append(name)
  if position=='1':winners.append(name)
 expected=[horse_name(r['name']) for r in record['runners']]
 if len(set(expected))!=len(expected) or set(names)!=set(expected):return None,'SECONDARY_FIELD_DISAGREEMENT'
 expected_winner=next((horse_name(r['name']) for r in record['runners'] if r['horse_id']==entry['winner_horse_id']),None)
 if winners!=[expected_winner]:return None,'SECONDARY_WINNER_DISAGREEMENT_OR_DEAD_HEAT'
 receipt=row.get('_source_receipt',{})
 url=urllib.parse.urlsplit(receipt.get('url',''))
 if url.scheme!='https' or url.hostname!='api.theracingapi.com' or url.path!='/v1/results/today/free' or not re.fullmatch('[a-f0-9]{64}',receipt.get('sha256','')):return None,'SECONDARY_RECEIPT_INVALID'
 return {'verification':'TWO_PUBLISHER_RESULT_CORROBORATED','record_sha256':record['record_sha256'],
  'primary_receipt':entry['source_receipt'],'secondary_receipt':receipt,'secondary_race_id':row['race_id'],
  'winner_horse_id':entry['winner_horse_id'],'publication_gate':'BLOCKED','challenge_eligible':0},None

def main():
 path=WORK/'racing-research-data.json';data=json.loads(path.read_text())
 if data.get('research_only') is not True or data.get('publication_gate')!='BLOCKED':raise ValueError('Unsafe racing feed')
 now=dt.datetime.now(dt.timezone.utc)
 if not dt.timedelta(minutes=-5)<=now-stamp(data['generated_at_utc'])<=dt.timedelta(hours=2):raise ValueError('Stale discovery feed')
 data,rows,audit=collect(data,now)
 data['secondary_source_audit']=audit;path.write_text(json.dumps(data,indent=2)+'\n')
 (WORK/'secondary-result-cache.json').write_text(json.dumps(rows)+'\n')
 (WORK/'secondary-source-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
 print(json.dumps(audit))
if __name__=='__main__':main()
