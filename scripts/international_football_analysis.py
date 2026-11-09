"""National-team results/form analysis; independent of domestic league seasons."""
import concurrent.futures
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import urllib.request
from collect_international_football import COMPETITIONS
UTC=dt.timezone.utc
GATES={'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','odds':None,'expected_value':None}

def instant(s):
 value=dt.datetime.fromisoformat(s.replace('Z','+00:00'))
 if value.tzinfo is None:raise ValueError('Timezone required')
 return value

def completed(event,code,receipt,now):
 """Regulation full-time only: exclude extra time, shootouts, abandoned games."""
 try:
  if len(event.get('competitions',[]))!=1:return None
  c=event['competitions'][0];status=c.get('status',event.get('status',{})).get('type',{})
  if status.get('name')!='STATUS_FULL_TIME' or status.get('completed') is not True or status.get('state')!='post':return None
  start=instant(event['date'])
  if not now-dt.timedelta(days=365)<=start<now-dt.timedelta(hours=3):return None
  sides=c['competitors'];h=[s for s in sides if s['homeAway']=='home'];a=[s for s in sides if s['homeAway']=='away']
  if len(h)!=1 or len(a)!=1:return None
  h,a=h[0],a[0]
  if not str(h['score']).isdigit() or not str(a['score']).isdigit():return None
  hg,ag=int(h['score']),int(a['score'])
  if max(hg,ag)>30 or h['team']['id']==a['team']['id']:return None
  return {'id':str(event['id']),'competition':code,'startUTC':start.isoformat(),'home_id':str(h['team']['id']),'away_id':str(a['team']['id']),
   'home':h['team']['displayName'],'away':a['team']['displayName'],'home_goals':hg,'away_goals':ag,'source_receipt':receipt}
 except (KeyError,ValueError,TypeError):return None

def analyse(fixture,results,now):
 cutoff=min(now,instant(fixture['kickoff_utc']))
 def sample(side):
  team_id=fixture.get(side+'_team_id');name=fixture[side]
  rows=[];seen_ids=set()
  for r in results:
   if r['id'] in seen_ids or instant(r['source_receipt']['observed_at_utc'])>now:continue
   seen_ids.add(r['id'])
   if not cutoff-dt.timedelta(days=365)<=instant(r['startUTC'])<cutoff-dt.timedelta(hours=3):continue
   for venue in ('home','away'):
    if (str(team_id)==r[venue+'_id'] if team_id else name==r[venue]):
     other='away' if venue=='home' else 'home';gf=r[venue+'_goals'];ga=r[other+'_goals']
     rows.append({'event_id':r['id'],'date':r['startUTC'],'opponent':r[other],'goals_for':gf,'goals_against':ga,'result':'W' if gf>ga else 'L' if gf<ga else 'D','competition':r['competition'],'source_receipt':r['source_receipt']});break
  return sorted(rows,key=lambda x:x['date'],reverse=True)[:10]
 h,a=sample('home'),sample('away')
 result={**GATES,'method':'INTERNATIONAL_RECENT_RESULTS_V1','generated_at_utc':now.isoformat(),'window_days':365,'maximum_matches_per_team':10,
  'home_sample':h,'away_sample':a,'home_matches':len(h),'away_matches':len(a),'status':'INSUFFICIENT_CAPTURED_RESULTS',
  'limitations':['Partial source coverage, not necessarily each team’s true last ten matches.','Friendlies and competitive matches are combined; no opponent-strength, squad or venue adjustment.','Only regulation full-time results captured before this analysis; not historically backtested.']}
 if min(len(h),len(a))<5:return result
 mean=lambda rows,k:sum(r[k] for r in rows)/len(rows)
 lh=(mean(h,'goals_for')+mean(a,'goals_against'))/2;la=(mean(a,'goals_for')+mean(h,'goals_against'))/2
 # No invented venue advantage or smoothing. Normalize the finite Poisson grid.
 ph=[math.exp(-lh)*lh**k/math.factorial(k) for k in range(61)];pa=[math.exp(-la)*la**k/math.factorial(k) for k in range(61)]
 probs=[sum(x*y for i,x in enumerate(ph) for j,y in enumerate(pa) if (i>j if outcome==0 else i==j if outcome==1 else i<j)) for outcome in range(3)]
 total=sum(probs)
 result.update(status='EXPERIMENTAL_COMPARISON_AVAILABLE',prob_home=probs[0]/total,prob_draw=probs[1]/total,prob_away=probs[2]/total,
  expected_home_goals=lh,expected_away_goals=la,small_sample=min(len(h),len(a))<10)
 return result

def collect(now,fetch=None):
 native_fetch=fetch is None
 if fetch is None:
  def fetch(url):
   req=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0 national-team research'})
   with urllib.request.urlopen(req,timeout=15) as r:
    if r.status!=200 or r.geturl()!=url:raise ValueError('HTTP error or redirected source')
    raw=r.read(10000001)
   if not raw or len(raw)>10000000:raise ValueError('Missing/oversized source')
   return raw
 audits=[];results={};conflicts=set()
 base='https://site.api.espn.com/apis/site/v2/sports/soccer/'
 def read(code,year):
  url=base+code+'/scoreboard?dates='+str(year)+'&limit=1000';raw=fetch(url);doc=json.loads(raw)
  receipt={'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':dt.datetime.now(UTC).isoformat() if native_fetch else now.isoformat()}
  events=doc.get('events')
  if not isinstance(events,list) or len(events)>=1000:raise ValueError('Missing or possibly truncated events')
  if any(instant(e['date']).year!=year for e in events):raise ValueError('Source ignored requested year')
  return events,receipt
 tasks=[(code,year) for code in COMPETITIONS for year in [now.year-1,now.year]]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  pending=[(code,year,pool.submit(read,code,year)) for code,year in tasks]
  for code,year,f in pending:
   try:
    events,receipt=f.result();count=0
    for e in events:
     row=completed(e,code,receipt,now)
     if not row:continue
     identity=row['id']
     if identity in conflicts:continue
     if identity in results and any(results[identity][k]!=row[k] for k in ['startUTC','home_id','away_id','home_goals','away_goals']):conflicts.add(identity);results.pop(identity,None);continue
     results[identity]=row;count+=1
    audits.append({'competition':code,'year':year,'status':'SOURCE_OBSERVED','source_events':len(events),'regulation_results':count,'receipt':receipt,'complete_coverage_verified':False})
   except Exception as e:audits.append({'competition':code,'year':year,'status':'FAILED','error':str(e)[:160]})
 return {'schema_version':1,**GATES,'generated_at_utc':now.isoformat(),'results':sorted(results.values(),key=lambda r:r['startUTC']),
  'collection_audits':audits,'conflicting_events_excluded':sorted(conflicts),'coverage_verified':False}

def main():
 root=Path(__file__).resolve().parents[1];now=dt.datetime.now(UTC);data=collect(now);now=dt.datetime.now(UTC);data['generated_at_utc']=now.isoformat()
 feed=json.loads((root/'international-football-data.json').read_text(encoding='utf-8'))
 if not(feed.get('research_only') is True and feed.get('publication_gate')=='BLOCKED' and feed.get('model_validation')=='UNVALIDATED'):raise ValueError('Unsafe fixture feed')
 forecasts=[]
 for fixture in feed['upcoming_fixtures']:
  analysis=analyse(fixture,data['results'],now);fixture['international_analysis']=analysis
  fixture['forecast_status']=analysis['status']
  if analysis['status']=='EXPERIMENTAL_COMPARISON_AVAILABLE' and instant(fixture['kickoff_utc'])>now+dt.timedelta(minutes=5):
   forecasts.append({**GATES,'league':fixture['league'],'home':fixture['home'],'away':fixture['away'],'kickoff_utc':fixture['kickoff_utc'],
    'generated_at_utc':now.isoformat(),'model':'International captured-results Poisson comparison V1',
    **{k:analysis[k] for k in ['prob_home','prob_draw','prob_away']},'training_basis':{'mode':'INTERNATIONAL_RECENT_RESULTS','training_matches':analysis['home_matches']+analysis['away_matches']}})
 feed['experimental_model_forecasts']=forecasts
 feed['limitations']=['International analysis uses up to ten captured regulation results per team within 365 days, minimum five each.','Source coverage is partial. Experimental comparisons are unvalidated, without odds or verified value.']
 (root/'international-analysis-data.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 (root/'international-football-data.json').write_text(json.dumps(feed,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print(json.dumps({'results':len(data['results']),'fixtures':len(feed['upcoming_fixtures']),'comparisons':len(forecasts),'failed_requests':sum(a.get('status')=='FAILED' for a in data['collection_audits'])}))
if __name__=='__main__':main()
