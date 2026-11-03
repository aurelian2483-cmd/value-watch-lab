"""Fixed-date retrospective AW handicap sample; never prospective evidence."""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

from discover_horse_races import PageData

ROOT=Path('/tmp/horse-challenger-training')
ROOT.mkdir(parents=True,exist_ok=True)
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
 with urllib.request.urlopen(req,timeout=30) as r:
  if r.status!=200 or r.geturl()!=url:raise ValueError('Unexpected response/redirect')
  raw=r.read(3000001)
 if len(raw)>3000000:raise ValueError('Oversized source')
 p=PageData();p.feed(raw.decode())
 if p.blocks!=1:raise ValueError('Ambiguous structured source')
 props=json.loads(''.join(p.parts))['props']['pageProps']
 if props.get('hasError') is not False:raise ValueError('Source error')
 return props,hashlib.sha256(raw).hexdigest()
def slug(x):return re.sub('[^a-z0-9]+','-',x.lower()).strip('-')
def card(s):
 rid=str(s['race_summary_reference']['id']);date=s['date']
 url=f"https://www.sportinglife.com/racing/racecards/{date}/{slug(s['course_name'])}/racecard/{rid}/{slug(s['name'])}"
 dest=ROOT/'cards'/(rid+'.json')
 if dest.exists():return json.loads(dest.read_text())
 p,sha=fetch(url);c=p['race'];rs=c['race_summary']
 if str(rs['race_summary_reference']['id'])!=rid or rs['date']!=date or rs['course_name']!=s['course_name'] or rs['race_stage']!='WEIGHEDIN':raise ValueError('Unsettled/incorrect card')
 runners=[]
 for r in c['rides']:
  if r['ride_status']!='RUNNER':continue
  h=r['horse'];past=[]
  for v in h.get('previous_results',[]):
   if v['date']>=date or str(v['race_id'])==rid:continue
   past.append({k:v.get(k) for k in ('race_id','date','course_name','distance','run_type','weight','position','runner_count','bha','race_class','going')})
  runners.append({'horse_id':str(h['horse_reference']['id']),'name':h['name'],'official_rating':r.get('official_rating'),'weight':r.get('handicap'),'previous_results':past,'finish_position':r.get('finish_position')})
 ids=[h['horse_id'] for h in runners]
 if len(ids)!=len(set(ids)) or len(ids)!=rs['ride_count'] or len(ids)<4:raise ValueError('Incomplete field')
 if sum(r['finish_position']==1 for r in runners)!=1:raise ValueError('Ambiguous winner')
 out={'race_id':rid,'date':date,'racecourse':rs['course_name'],'distance':rs['distance'],'race_class':rs['race_class'],'surface':'ALLWEATHER','source':url,'source_sha256':sha,'observed_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'runners':runners}
 dest.parent.mkdir(exist_ok=True);dest.write_text(json.dumps(out,indent=2)+'\n');return out
def main():
 dates=[(dt.date(2026,9,1)+dt.timedelta(days=3*i)).isoformat() for i in range(21)]
 summaries=[];errors=[]
 for date in dates:
  cache=ROOT/(date+'-index.json')
  try:
   if cache.exists(): rows=json.loads(cache.read_text())
   else:
    p,sha=fetch('https://www.sportinglife.com/racing/results/'+date)
    rows=[r for m in p['meetings'] for r in m['races'] if r.get('course_surface',{}).get('surface')=='ALLWEATHER' and r.get('has_handicap') is True and r.get('country_short_name') in ('ENG','SCO','WAL') and r.get('race_stage')=='WEIGHEDIN']
    cache.write_text(json.dumps(rows))
   summaries+=rows;print(date,len(rows),flush=True)
  except Exception as e:errors.append({'date':date,'error':str(e)})
 races=[]
 with cf.ThreadPoolExecutor(max_workers=2) as pool:
  futures={pool.submit(card,s):s for s in summaries}
  for f in cf.as_completed(futures):
   try:races.append(f.result())
   except Exception as e:errors.append({'race_id':str(futures[f]['race_summary_reference']['id']),'error':str(e)})
 races.sort(key=lambda r:(r['date'],r['race_id']))
 out={'schema_version':1,'design':'Every third calendar day from 1 September through 31 October 2026; all completed GB AW handicaps with at least four final runners and one winner. No outcome-based race selection.','evidence_type':'RETROSPECTIVE_RECONSTRUCTED_FINAL_FIELDS','limitations':['Historical first availability is not attested. Cards fetched after results may be corrected.','Conditions on final runner field; not an auditable pre-off non-runner simulation.','No prices, betting returns or prospective challenge credit.'],'requested_dates':dates,'errors':errors,'races':races}
 (ROOT/'horse-training-data.json').write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps({'races':len(races),'errors':errors}),flush=True)
if __name__=='__main__':main()
