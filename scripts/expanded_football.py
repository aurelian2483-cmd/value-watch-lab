#!/usr/bin/env python3
"""Additional football competitions, with isolated models and research-only gates.
Keeps the existing Premier League workflow and challenge records unchanged.
"""
import concurrent.futures
import csv
import datetime as dt
import hashlib
from html.parser import HTMLParser
import io
import json
import math
from pathlib import Path
import re
import unicodedata
import urllib.parse
import urllib.request
from football_h2h import head_to_head, conflict_with_forecast
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/football-expanded')
UTC=dt.timezone.utc
LEAGUES={
 'E1':{'name':'Championship','espn':'eng.2','sky':'championship','competition':'EFL Championship','expected_prior':552},
 'SP1':{'name':'La Liga','espn':'esp.1','sky':'la-liga','competition':'Spanish La Liga','expected_prior':380},
 'D1':{'name':'Bundesliga','espn':'ger.1','sky':'bundesliga','competition':'German Bundesliga','expected_prior':306},
 'I1':{'name':'Serie A','espn':'ita.1','sky':'serie-a','competition':'Italian Serie A','expected_prior':380},
 'F1':{'name':'Ligue 1','espn':'fra.1','sky':'ligue-1','competition':'French Ligue 1','expected_prior':306},
 'UCL':{'name':'Champions League','espn':'uefa.champions','sky':'champions-league','competition':'UEFA Champions League','expected_prior':144}}
UCL_DAYS=['20250916','20250917','20250918','20250930','20251001','20251021','20251022','20251104','20251105','20251125','20251126','20251209','20251210','20260120','20260121','20260128']
UCL_CALENDAR_SOURCE='https://www.uefa.com/uefachampionsleague/news/029a-1de997bb1779-486bab913658-1000--uefa-champions-league-league-phase-draw/'
ALIASES={
 'manutd':'manchesterunited','manunited':'manchesterunited','mancity':'manchestercity','newcastle':'newcastleunited','tottenham':'tottenhamhotspur',
 'sheffieldutd':'sheffieldunited','sheffutd':'sheffieldunited','sheffieldwed':'sheffieldwednesday','sheffwed':'sheffieldwednesday',
 'qpr':'queensparkrangers','oxford':'oxfordunited','swansea':'swanseacity','coventry':'coventrycity','stoke':'stokecity','hull':'hullcity',
 'birmingham':'birminghamcity','westbrom':'westbromwichalbion','ipswich':'ipswichtown','norwich':'norwichcity','leicester':'leicestercity',
 'charlton':'charltonathletic','preston':'prestonnorthend','portsmouth':'portsmouth','plymouth':'plymouthargyle','derby':'derbycounty',
 'cardiff':'cardiffcity','leeds':'leedsunited','westham':'westhamunited','wolves':'wolverhamptonwanderers','nottmforest':'nottinghamforest',
 'brighton':'brightonandhovealbion','brightonhovealbion':'brightonandhovealbion','bournemouth':'afcbournemouth',
 'athmadrid':'atleticomadrid','atleticodemadrid':'atleticomadrid','athbilbao':'athleticbilbao','athleticclub':'athleticbilbao',
 'betis':'realbetis','sociedad':'realsociedad','vallecano':'rayovallecano','espanol':'espanyol','celta':'celtavigo','oviedo':'realoviedo',
 'dortmund':'borussiadortmund','leverkusen':'bayerleverkusen','einfrankfurt':'eintrachtfrankfurt','frankfurt':'eintrachtfrankfurt',
 'mgladbach':'borussiamonchengladbach','borussiamgladbach':'borussiamonchengladbach','bayernmunchen':'bayernmunich',
 'mainz05':'mainz','1mainz05':'mainz','leipzig':'rbleipzig','hamburgersv':'hamburg','koln':'cologne','1koln':'cologne',
 'inter':'intermilan','internazionale':'intermilan','acmilan':'milan','asroma':'roma','hellasverona':'verona','parmacalcio1913':'parma',
 'psg':'parissaintgermain','paris':'paris','parisfc':'paris','olympiquedemarseille':'marseille','olympiquemarseille':'marseille',
 'olympiquelyonnais':'lyon','olympiquelyon':'lyon','staderennais':'rennes','stadebrestois29':'brest','stadebrestois':'brest',
 'lilleosc':'lille','psveindhoven':'psv','sportinglisbon':'sportingcp','sporting':'sportingcp','ajaxamsterdam':'ajax',
 'kobenhavn':'copenhagen','fckobenhavn':'copenhagen','clubbruggekv':'clubbrugge','unionstgilloise':'unionsaintgilloise',
 'saintgilloise':'unionsaintgilloise','redstarbelgrade':'crvenazvezda','slaviapraha':'slaviaprague','benficalisbon':'benfica'}

# Explicit source-name equivalences checked against the downloaded league feeds.
ALIASES.update({
 'blackburn':'blackburnrovers','bolton':'boltonwanderers','lincoln':'lincolncity','sheffieldweds':'sheffieldwednesday',
 'deportivo':'deportivolacoruna','deplacoruna':'deportivolacoruna','lacoruna':'deportivolacoruna','santander':'racingsantander',
 'monchengladbach':'borussiamonchengladbach','sv07elversberg':'elversberg','svelversberg':'elversberg',
 'schalke04':'schalke','vfbstuttgart':'stuttgart','tsghoffenheim':'hoffenheim','hamburgsv':'hamburg','scfreiburg':'freiburg',
 'scpaderborn07':'paderborn','1unionberlin':'unionberlin','bremen':'werderbremen',
 'ajauxerre':'auxerre','lehavreac':'lehavre','asmonaco':'monaco','rclens':'lens','parissg':'parissaintgermain',
 'feyenoordrotterdam':'feyenoord','linzask':'lasklinz','skslovanbratislava':'slovanbratislava','vikingfk':'viking','sabahfk':'sabah'
})

def canon(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def digest(x):return hashlib.sha256(canon(x)).hexdigest()
def stamp(x):return x.astimezone(UTC).isoformat().replace('+00:00','Z')
def when(x):
 t=dt.datetime.fromisoformat(x.replace('Z','+00:00'))
 if t.tzinfo is None:raise ValueError('Timezone required')
 return t.astimezone(UTC)
def norm(name):
 s=unicodedata.normalize('NFKD',str(name)).encode('ascii','ignore').decode().lower()
 s=re.sub(r'\bfc\b','',s);s=re.sub('[^a-z0-9]','',s)
 return ALIASES.get(s,s)
def identity(f):return (f['league'],norm(f['home']),norm(f['away']),stamp(when(f['kickoff_utc'])))
def season_code(now,previous=False):
 y=now.year if now.month>=7 else now.year-1
 if previous:y-=1
 return f'{y%100:02d}{(y+1)%100:02d}'
def espn_url(code,day):return 'https://site.api.espn.com/apis/site/v2/sports/soccer/'+LEAGUES[code]['espn']+'/scoreboard?'+urllib.parse.urlencode({'dates':day,'limit':100})

class Fetcher:
 def __init__(self):self.cache={}
 def get(self,url):
  if url in self.cache:return self.cache[url]
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
  with urllib.request.urlopen(req,timeout=25) as response:
   if response.status!=200:raise ValueError('Source HTTP failure')
   raw=response.read(3000001)
  if not raw or len(raw)>3000000:raise ValueError('Missing or oversized source')
  receipt={'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':stamp(dt.datetime.now(UTC))}
  (OUT/'source-snapshots').mkdir(parents=True,exist_ok=True)
  (OUT/'source-snapshots'/(receipt['sha256']+'.snapshot')).write_bytes(raw)
  (OUT/'source-snapshots'/(receipt['sha256']+'.receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n')
  self.cache[url]=(raw,receipt);return raw,receipt

def espn_rows(raw,code,state):
 data=json.loads(raw)
 if len(data.get('leagues',[]))!=1 or data['leagues'][0].get('slug')!=LEAGUES[code]['espn']:raise ValueError('ESPN competition mismatch')
 events=data.get('events')
 if not isinstance(events,list) or len(events)>=100:raise ValueError('ESPN schema or possible truncated daily response')
 rows=[]
 for event in events:
  comps=event.get('competitions') or []
  if len(comps)!=1:continue
  sides=comps[0].get('competitors') or []
  home=[s for s in sides if s.get('homeAway')=='home'];away=[s for s in sides if s.get('homeAway')=='away']
  if len(home)!=1 or len(away)!=1:continue
  h,a=home[0],away[0];hn=h.get('team',{}).get('displayName','');an=a.get('team',{}).get('displayName','')
  if not norm(hn) or not norm(an) or norm(hn)==norm(an):continue
  status=event.get('status',{}).get('type',{})
  if status.get('state')!=state:continue
  row={'league':code,'home':hn,'away':an,'kickoff_utc':stamp(when(event['date'])),'espn_event_id':str(event['id'])}
  if state=='post':
   # 1X2 covers 90 minutes only. Never use AET/penalty totals.
   if status.get('completed') is not True or status.get('detail')!='FT':continue
   try:hg,ag=int(h['score']),int(a['score'])
   except (ValueError,TypeError,KeyError):continue
   if min(hg,ag)<0:continue
   row.update(score_home=hg,score_away=ag)
  rows.append(row)
 return rows

class SkyPage(HTMLParser):
 def __init__(self):super().__init__();self.selected=[];self.records=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if a.get('id')=='currently-selected-day':self.selected.append(a.get('data-date-string'))
  if a.get('data-component-name')=='ui-sport-match-score':self.records.append(json.loads(a['data-state']))

def sky_rows(raw,code,month,state):
 p=SkyPage();p.feed(raw.decode('utf-8'));year,mon=map(int,month.split('-'))
 if p.selected!=[f'{mon:02d}.{year}']:raise ValueError('Sky month missing, ambiguous or different')
 if not p.records:raise ValueError('Sky structured records unavailable')
 rows=[]
 for e in p.records:
  try:
   if e['competition']['name']['full']!=LEAGUES[code]['competition'] or e.get('matchState')!=state:continue
   if any(e.get(k) for k in ('isCancelled','isPostponed','isSuspended','isAbandoned')):continue
   text=e['start']['date'];cleaned=re.sub(r'(\d+)(st|nd|rd|th)',r'\1',text)
   day=dt.datetime.strptime(cleaned+f' {year}','%A %d %B %Y')
   if day.month!=mon or day.strftime('%A')!=text.split()[0]:continue
   if not re.fullmatch(r'\d{2}:\d{2}',e['start']['time']):continue
   kickoff=dt.datetime.combine(day.date(),dt.time.fromisoformat(e['start']['time']),ZoneInfo('Europe/London'))
   row={'league':code,'home':e['teams']['home']['name']['full'],'away':e['teams']['away']['name']['full'],'kickoff_utc':stamp(kickoff)}
   if state=='pre' and e.get('isFixture') is not True:continue
   if state=='post':
    if e.get('isResult') is not True or e.get('status')!='FT':continue
    row.update(score_home=int(e['teams']['home']['score']['current']),score_away=int(e['teams']['away']['score']['current']))
   rows.append(row)
  except (KeyError,ValueError,TypeError):continue
 return rows

def corroborate(fixture,rows):
 candidates=[r for r in rows if r['league']==fixture['league'] and norm(r['home'])==norm(fixture['home']) and norm(r['away'])==norm(fixture['away'])]
 matches=[r for r in candidates if abs((when(r['kickoff_utc'])-when(fixture['kickoff_utc'])).total_seconds())<=60]
 return matches[0] if len(matches)==1 else None

def csv_rows(raw,code,cutoff,season):
 rows=[];reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
 if not {'Div','Date','HomeTeam','AwayTeam','FTHG','FTAG','FTR'}.issubset(reader.fieldnames or []):raise ValueError('Historical CSV schema mismatch')
 year=2000+int(season[:2]);start=dt.date(year,7,1);end=dt.date(year+1,7,1);seen=set()
 for r in reader:
  if r.get('Div')!=code or r.get('FTR') not in ('H','D','A'):continue
  try:
   day=dt.datetime.strptime(r['Date'],'%d/%m/%Y').date()
   if not start<=day<min(end,cutoff.date()):continue
   hg,ag=int(r['FTHG']),int(r['FTAG'])
   if min(hg,ag)<0 or r['FTR']!=('H' if hg>ag else 'A' if hg<ag else 'D'):continue
   key=(norm(r['HomeTeam']),norm(r['AwayTeam']),day.isoformat())
   if not key[0] or not key[1] or key[0]==key[1] or key in seen:raise ValueError('Invalid/duplicate historical fixture')
   seen.add(key)
   rows.append({'league':code,'home':r['HomeTeam'],'away':r['AwayTeam'],'date':day.isoformat(),'score_home':hg,'score_away':ag})
  except (TypeError,KeyError):continue
 return rows

def csv_finals(raw,code):
 rows=[]
 for r in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
  if r.get('Div')!=code or r.get('FTR') not in ('H','D','A'):continue
  try:
   hg,ag=int(r['FTHG']),int(r['FTAG'])
   if min(hg,ag)<0 or r['FTR']!=('H' if hg>ag else 'A' if hg<ag else 'D'):continue
   start=dt.datetime.combine(dt.datetime.strptime(r['Date'],'%d/%m/%Y').date(),dt.time.fromisoformat(r['Time']),ZoneInfo('Europe/London'))
   rows.append({'league':code,'home':r['HomeTeam'],'away':r['AwayTeam'],'kickoff_utc':stamp(start),'score_home':hg,'score_away':ag})
  except (KeyError,TypeError,ValueError):continue
 return rows

def stats(rows):
 teams={};th=ta=0
 for r in rows:
  h=teams.setdefault(norm(r['home']),{'hgf':0,'hga':0,'hn':0,'agf':0,'aga':0,'an':0})
  a=teams.setdefault(norm(r['away']),{'hgf':0,'hga':0,'hn':0,'agf':0,'aga':0,'an':0})
  hg,ag=r['score_home'],r['score_away'];h['hgf']+=hg;h['hga']+=ag;h['hn']+=1;a['agf']+=ag;a['aga']+=hg;a['an']+=1;th+=hg;ta+=ag
 if len(rows)<30 or min(th,ta)<=0:raise ValueError('Insufficient training results')
 return teams,th/len(rows),ta/len(rows)

def model_forecast(fixture,training,current=None):
 code=fixture['league'];minimum=3 if code=='UCL' else 10;chosen=training;mode='PRIOR_SEASON';h=chosen['teams'].get(norm(fixture['home']));a=chosen['teams'].get(norm(fixture['away']))
 if not h or not a or min(h['hn'],a['an'])<minimum:
  if current is None:return None
  chosen=current;minimum=3;mode='CURRENT_SEASON_SMALL_SAMPLE';h=chosen['teams'].get(norm(fixture['home']));a=chosen['teams'].get(norm(fixture['away']))
  if not h or not a or min(h['hn'],a['an'])<minimum:return None
 ah,aa=chosen['avg_home_goals'],chosen['avg_away_goals'];w=5
 hgf=(h['hgf']+w*ah)/(h['hn']+w);hga=(h['hga']+w*aa)/(h['hn']+w)
 agf=(a['agf']+w*aa)/(a['an']+w);aga=(a['aga']+w*ah)/(a['an']+w)
 lh=max(.15,min(4.,hgf*aga/ah));la=max(.15,min(4.,agf*hga/aa))
 p=[0.,0.,0.]
 for i in range(12):
  for j in range(12):p[0 if i>j else 1 if i==j else 2]+=math.exp(-lh)*lh**i/math.factorial(i)*math.exp(-la)*la**j/math.factorial(j)
 total=sum(p);p=[v/total for v in p]
 return {**fixture,'model':'LEAGUE_POISSON_SHRINKAGE_V1_'+code+'_'+mode,'prob_home':p[0],'prob_draw':p[1],'prob_away':p[2],
  'training_basis':{'mode':mode,'home_matches':h['hn'],'away_matches':a['an'],'league_average_pseudo_matches':w,'small_sample':mode!='PRIOR_SEASON' or code=='UCL',
   'training_matches':chosen['matches'],'source_receipts':chosen['source_receipts'],'training_sha256':chosen['training_sha256'],
   'lambda_home':lh,'lambda_away':la,'home_venue_inputs':h,'away_venue_inputs':a,'league_home_mean':ah,'league_away_mean':aa},
  'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','challenge_eligible':0,'forecast_eligible':False,'odds':None,'expected_value':None}

def train_data(rows,receipts):
 teams,ah,aa=stats(rows)
 return {'teams':teams,'avg_home_goals':ah,'avg_away_goals':aa,'matches':len(rows),'training_sha256':digest(rows),'source_receipts':receipts}

def ucl_training(fetcher,now):
 if season_code(now,True)!='2526':raise ValueError('UCL reference calendar needs a season update')
 cache=ROOT/'research/football-expanded-training/ucl-2025-26.json'
 if cache.exists():
  obj=json.loads(cache.read_text());unsigned=dict(obj);saved=unsigned.pop('record_sha256')
  if digest(unsigned)!=saved:raise ValueError('UCL training cache integrity failure')
  rows=obj['rows'];receipts=obj['source_receipts']
 else:
  rows=[];receipts=[]
  def collect(day):
   raw,receipt=fetcher.get(espn_url('UCL',day));return espn_rows(raw,'UCL','post'),receipt
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
   for results,receipt in pool.map(collect,UCL_DAYS):rows.extend(results);receipts.append(receipt)
  rows=sorted(rows,key=lambda r:(r['kickoff_utc'],r['espn_event_id']))
 # Exactly 144 regulation-time matches, 36 clubs and four home/away games each.
 if len(rows)!=144 or len({r['espn_event_id'] for r in rows})!=144:raise ValueError('UCL prior league-phase coverage incomplete')
 if any(not when('2025-09-01T00:00:00Z')<=when(r['kickoff_utc'])<when('2026-02-01T00:00:00Z') for r in rows):raise ValueError('UCL training outside league phase')
 training=train_data(rows,receipts)
 if len(training['teams'])!=36 or any(t['hn']!=4 or t['an']!=4 for t in training['teams'].values()):raise ValueError('UCL team coverage incomplete')
 if not cache.exists():
  obj={'league':'UCL','season':'2025-26 league phase','calendar_source':UCL_CALENDAR_SOURCE,'rows':rows,'source_receipts':receipts};obj['record_sha256']=digest(obj)
  cache.parent.mkdir(parents=True,exist_ok=True)
  with cache.open('x') as f:f.write(json.dumps(obj,indent=2)+'\n')
 return training

def archive_forecasts(forecasts,now,directory):
 records=[];known={}
 def signature(r):
  basis={k:v for k,v in r['training_basis'].items() if k!='source_receipts'}
  return digest({**{k:r[k] for k in ('league','home','away','kickoff_utc','model','prob_home','prob_draw','prob_away')},'training_basis':basis})
 for p in sorted(directory.glob('*.json')):
  r=json.loads(p.read_text());unsigned=dict(r);saved=unsigned.pop('record_sha256')
  if saved!=p.stem or digest(unsigned)!=saved:raise ValueError('Expanded forecast archive integrity failure')
  validate_forecast(r)
  if when(r['generated_at_utc'])>=when(r['kickoff_utc'])-dt.timedelta(minutes=5):raise ValueError('Late archived forecast')
  records.append(r)
 for r in sorted(records,key=lambda r:r['generated_at_utc']):
  key=identity(r);previous=known.get(key)
  if previous and when(r['generated_at_utc'])==when(previous['generated_at_utc']):raise ValueError('Ambiguous forecast revision timestamp')
  if previous is None and r.get('revision_of'):raise ValueError('Orphan expanded revision')
  if previous is not None and r.get('revision_of')!=previous['record_sha256']:raise ValueError('Broken expanded revision chain')
  if previous is not None and when(r['generated_at_utc'])<=when(previous['generated_at_utc']):raise ValueError('Non-monotonic expanded revision timestamp')
  known[key]=r
 current=[];new=[];seen=set()
 for f in forecasts:
  validate_forecast(f)
  key=identity(f);previous=known.get(key)
  if key in seen:raise ValueError('Duplicate current expanded fixture')
  seen.add(key)
  if previous and signature(previous)==signature(f):current.append(previous);continue
  if when(f['kickoff_utc'])<=now+dt.timedelta(minutes=5):continue
  r={**f,'generated_at_utc':stamp(now),'independent_timestamp_attested':False,'source_first_availability_verified':False}
  if previous:r['revision_of']=previous['record_sha256']
  for receipt in r['training_basis'].get('source_receipts',[])+r.get('schedule_source_receipts',[]):
   if receipt.get('observed_at_utc') and when(receipt['observed_at_utc'])>now:raise ValueError('Inputs received after forecast capture')
  r['record_sha256']=digest(r);validate_forecast(r);current.append(r);new.append(r)
 if new:directory.mkdir(parents=True,exist_ok=True)
 for r in new:
  with (directory/(r['record_sha256']+'.json')).open('x') as f:f.write(json.dumps(r,indent=2)+'\n')
 return current,records+new,len(new)

def validate_forecast(r):
 if r.get('research_only') is not True or r.get('league') not in LEAGUES or r.get('publication_gate')!='BLOCKED' or r.get('model_validation')!='UNVALIDATED' or r.get('challenge_eligible')!=0 or r.get('odds') is not None or r.get('expected_value') is not None:raise ValueError('Unsafe expanded forecast')
 p=[r[k] for k in ('prob_home','prob_draw','prob_away')]
 if any(type(v) not in (int,float) or not math.isfinite(v) or not 0<v<1 for v in p) or abs(sum(p)-1)>1e-8:raise ValueError('Invalid probability vector')

def oldest_first_unresolved(records):
 """Deterministic settlement order; oldest kickoff first, digest breaks ties."""
 return sorted(records,key=lambda item:(when(item['kickoff_utc']),item['record_sha256']))

def settlement_readiness(records,now):
 """Count archived fixtures eligible for settlement over the next 24 hours."""
 latest={}
 for r in records:
  key=identity(r)
  if key not in latest or when(r['generated_at_utc'])>when(latest[key]['generated_at_utc']):
   latest[key]=r
 due_at=[when(r['kickoff_utc'])+dt.timedelta(hours=3) for r in latest.values()]
 return {'eligible_now':sum(t<=now for t in due_at),
  'eligible_within_24h':sum(now<t<=now+dt.timedelta(hours=24) for t in due_at),
  'eligible_later':sum(t>now+dt.timedelta(hours=24) for t in due_at),
  'next_24h_by_league':{code:sum(now<when(r['kickoff_utc'])+dt.timedelta(hours=3)<=now+dt.timedelta(hours=24) for r in latest.values() if r['league']==code) for code in LEAGUES},
  'next_24h_by_hour':{str(hour):sum(now+dt.timedelta(hours=hour)<t<=now+dt.timedelta(hours=hour+1) for t in due_at) for hour in range(24)},
  'next_24h_first_eligible_utc':stamp(min(t for t in due_at if now<t<=now+dt.timedelta(hours=24))) if any(now<t<=now+dt.timedelta(hours=24) for t in due_at) else None,
  'next_24h_by_league_sum_matches_total':sum(sum(now<when(r['kickoff_utc'])+dt.timedelta(hours=3)<=now+dt.timedelta(hours=24) for r in latest.values() if r['league']==code) for code in LEAGUES)==sum(now<t<=now+dt.timedelta(hours=24) for t in due_at)}

def score_results(records,fetcher,now,path):
 old=json.loads(path.read_text()) if path.exists() else {'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','entries':[]}
 if old.get('research_only') is not True or old.get('publication_gate')!='BLOCKED' or old.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe expanded result ledger')
 frozen={r['record_sha256']:r for r in records};by_id={}
 for e in old['entries']:
  r=frozen.get(e['record_sha256'])
  if r is None or e.get('publication_gate')!='BLOCKED' or e.get('challenge_eligible')!=0 or e.get('verification')!='TWO_SOURCE_REGULATION_TIME_FINAL':raise ValueError('Invalid expanded result entry')
  if e.get('league')!=r['league'] or norm(e.get('home'))!=norm(r['home']) or norm(e.get('away'))!=norm(r['away']) or when(e['kickoff_utc'])!=when(r['kickoff_utc']):raise ValueError('Result identity mismatch')
  receipts=e.get('source_receipts',[])
  if len(receipts)!=2 or urllib.parse.urlsplit(receipts[0].get('url','')).hostname!='site.api.espn.com' or urllib.parse.urlsplit(receipts[1].get('url','')).hostname not in ('www.football-data.co.uk','www.skysports.com'):raise ValueError('Result evidence sources invalid')
  if any(not re.fullmatch('[a-f0-9]{64}',x.get('sha256','')) for x in receipts):raise ValueError('Result evidence digest missing')
  hg,ag=e['score_home'],e['score_away']
  if type(hg)!=int or type(ag)!=int or min(hg,ag)<0:raise ValueError('Invalid result score')
  idx=0 if hg>ag else 1 if hg==ag else 2;p=[r[k] for k in ('prob_home','prob_draw','prob_away')]
  if abs(e['multiclass_brier_score']-sum((v-int(i==idx))**2 for i,v in enumerate(p)))>1e-10 or abs(e['log_loss']+math.log(p[idx]))>1e-10:raise ValueError('Expanded score metrics mismatch')
  if e['record_sha256'] in by_id:raise ValueError('Duplicate result digest')
  by_id[e['record_sha256']]=e
 latest={}
 for r in records:
  key=identity(r)
  if key not in latest or when(r['generated_at_utc'])>when(latest[key]['generated_at_utc']):latest[key]=r
 pending=[];attempts=0
 # Oldest unresolved matches first: avoid starving older results when the archive grows.
 for r in oldest_first_unresolved(latest.values()):
  if r['record_sha256'] in by_id:continue
  if now<when(r['kickoff_utc'])+dt.timedelta(hours=3):pending.append({'league':r['league'],'home':r['home'],'away':r['away'],'reason':'WAITING_FOR_FINAL'});continue
  if attempts>=50:pending.append({'league':r['league'],'reason':'DEFERRED_BATCH_LIMIT'});continue
  attempts+=1
  try:
   code=r['league'];day=when(r['kickoff_utc']).strftime('%Y%m%d');er,ereceipt=fetcher.get(espn_url(code,day));e=corroborate(r,espn_rows(er,code,'post'))
   if not e:raise ValueError('ESPN 90-minute final missing or ambiguous')
   secondary=None;receipt=None
   if code!='UCL':
    try:
     raw,receipt=fetcher.get('https://www.football-data.co.uk/mmz4281/'+season_code(when(r['kickoff_utc']))+'/'+code+'.csv')
     secondary=corroborate(r,csv_finals(raw,code))
    except Exception:pass
   if secondary is None:
    month=r['kickoff_utc'][:7];raw,receipt=fetcher.get('https://www.skysports.com/'+LEAGUES[code]['sky']+'-scores-fixtures/'+month+'-01')
    secondary=corroborate(r,sky_rows(raw,code,month,'post'))
   if secondary is None or (e['score_home'],e['score_away'])!=(secondary['score_home'],secondary['score_away']):raise ValueError('Second-source regulation-time final missing or disagrees')
   hg,ag=e['score_home'],e['score_away'];idx=0 if hg>ag else 1 if hg==ag else 2;p=[r[k] for k in ('prob_home','prob_draw','prob_away')]
   by_id[r['record_sha256']]={'league':code,'home':r['home'],'away':r['away'],'kickoff_utc':r['kickoff_utc'],'model':r['model'],'record_sha256':r['record_sha256'],
    'score_home':hg,'score_away':ag,'multiclass_brier_score':sum((v-int(i==idx))**2 for i,v in enumerate(p)),'log_loss':-math.log(p[idx]),
    'source_receipts':[ereceipt,receipt],'verification':'TWO_SOURCE_REGULATION_TIME_FINAL','publication_gate':'BLOCKED','challenge_eligible':0}
  except Exception as exc:pending.append({'league':r['league'],'home':r['home'],'away':r['away'],'reason':str(exc)})
 old['entries']=sorted(by_id.values(),key=lambda x:(x['kickoff_utc'],x['record_sha256']));path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(old,indent=2)+'\n')
 selected={r['record_sha256'] for r in latest.values()};entries=[e for e in old['entries'] if e['record_sha256'] in selected]
 groups={}
 for code in LEAGUES:
  es=[e for e in entries if e['league']==code];n=len(es);groups[code]=comparison_summary(es)
  by_model={}
  for model in sorted({e['model'] for e in es}):
   sample=[e for e in es if e['model']==model];by_model[model]=comparison_summary(sample)
  groups[code]['by_model']=by_model
 future=[r for r in latest.values() if when(r['kickoff_utc'])>now]
 waiting=[r for r in latest.values() if r['record_sha256'] not in by_id and when(r['kickoff_utc'])<=now<when(r['kickoff_utc'])+dt.timedelta(hours=3)]
 due=[r for r in latest.values() if r['record_sha256'] not in by_id and now>=when(r['kickoff_utc'])+dt.timedelta(hours=3)]
 reasons={}
 for p in pending:reasons[p['reason']]=reasons.get(p['reason'],0)+1
 due_pending=[p for p in pending if p.get('reason')!='WAITING_FOR_FINAL']
 due_reason_counts={}
 for p in due_pending:due_reason_counts[p['reason']]=due_reason_counts.get(p['reason'],0)+1

 cycle={'checked_at_utc':stamp(now),'archived_unique_fixtures':len(latest),'scored_matches':len(entries),'not_started':len(future),'awaiting_settlement_buffer':len(waiting),'due_unresolved':len(due),
  'next_kickoff_utc':min((r['kickoff_utc'] for r in future),default=None),'next_result_check_eligible_utc':min((stamp(when(r['kickoff_utc'])+dt.timedelta(hours=3)) for r in latest.values() if r['record_sha256'] not in by_id),default=None),'pending_reasons':reasons,'due_unresolved_reason_counts':due_reason_counts,'due_unresolved_sample':due_pending[:20],
  'due_diagnostic_coverage':{'due_fixtures':len(due),'diagnosed_due_fixtures':len(due_pending),'complete':len(due)==len(due_pending)},
  'settlement_window':settlement_readiness([r for r in latest.values() if r['record_sha256'] not in by_id],now),
  'status':'VERIFIED_RESULTS_AVAILABLE' if entries else 'RESULT_CHECK_REQUIRED' if due else 'AWAITING_FINAL_RESULTS' if waiting else 'AWAITING_FIRST_KICKOFF' if future else 'NO_ARCHIVED_FORECASTS'}
 return {'entries':entries,'pending':pending,'by_league':groups,'cycle_audit':cycle,'comparison_policy':'Same scored matches, model versus fixed 1/3 home/draw/away baseline. Lower scores are better; negative model-minus-baseline differences favour the model. This is a sanity benchmark, not a market or profitability comparison.','selection_policy':'Latest archived forecast per league/home/away/kickoff; no revision inflates sample size.'}

def comparison_summary(entries):
 n=len(entries);b=sum(e['multiclass_brier_score'] for e in entries)/n if n else None;l=sum(e['log_loss'] for e in entries)/n if n else None
 return {'scored_races':n,'scored_matches':n,'mean_brier_score':b,'mean_log_loss':l,'uniform_mean_brier_score':2/3 if n else None,'uniform_mean_log_loss':math.log(3) if n else None,
  'mean_brier_difference':b-2/3 if n else None,'mean_log_loss_difference':l-math.log(3) if n else None,'status':'INSUFFICIENT_SAMPLE' if n<30 else 'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION'}

def main():
 OUT.mkdir(parents=True,exist_ok=True);now=dt.datetime.now(UTC);fetcher=Fetcher();league_audits={code:{'name':cfg['name'],'source_errors':[],'training_errors':[]} for code,cfg in LEAGUES.items()}
 days=[(now+dt.timedelta(days=i)).strftime('%Y%m%d') for i in range(22)];jobs=[(code,day) for code in LEAGUES for day in days];discovered={};receipts={code:[] for code in LEAGUES}
 def collect(job):
  code,day=job
  try:
   raw,receipt=fetcher.get(espn_url(code,day));return code,espn_rows(raw,code,'pre'),receipt,None
  except Exception as exc:return code,[],None,{'date':day,'error':str(exc)}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for code,rows,receipt,error in pool.map(collect,jobs):
   if error:league_audits[code]['source_errors'].append(error);continue
   receipts[code].append(receipt)
   for f in rows:
    if now+dt.timedelta(minutes=90)<=when(f['kickoff_utc'])<=now+dt.timedelta(days=21):
     key=identity(f)
     if key in discovered and discovered[key]['espn_event_id']!=f['espn_event_id']:raise ValueError('Ambiguous expanded ESPN fixture')
     discovered[key]=f
 fixtures=[];forecasts=[]
 for code,cfg in LEAGUES.items():
  audit=league_audits[code];rows=[f for f in discovered.values() if f['league']==code];audit['days_requested']=22;audit['days_succeeded']=len(receipts[code]);audit['discovered_fixtures']=len(rows)
  source_rows=[];secondary_receipts=[]
  for month in sorted({f['kickoff_utc'][:7] for f in rows}):
   try:
    raw,receipt=fetcher.get('https://www.skysports.com/'+cfg['sky']+'-scores-fixtures/'+month+'-01');source_rows.extend(sky_rows(raw,code,month,'pre'));secondary_receipts.append(receipt)
   except Exception as exc:audit['source_errors'].append({'source':'Sky','month':month,'error':str(exc)})
  prior=current=None
  h2h_rows=[]
  try:
   if code=='UCL':prior=ucl_training(fetcher,now)
   else:
    season=season_code(now,True);raw,receipt=fetcher.get('https://www.football-data.co.uk/mmz4281/'+season+'/'+code+'.csv');training=csv_rows(raw,code,now,season)
    if len(training)!=cfg['expected_prior']:raise ValueError('Prior domestic season incomplete')
    prior=train_data(training,[receipt])
    h2h_rows.extend(training)
  except Exception as exc:audit['training_errors'].append({'source':'prior','error':str(exc)})
  if code!='UCL':
   # Extra seasons are research context only. Failure never blocks the baseline model.
   # CSV dates have day precision, so the H2H helper excludes the fixture day.
   for years_back in (2,3,4):
    try:
     season=f'{(int(season_code(now)[:2])-years_back)%100:02d}{(int(season_code(now)[:2])-years_back+1)%100:02d}'
     raw,receipt=fetcher.get('https://www.football-data.co.uk/mmz4281/'+season+'/'+code+'.csv')
     older=csv_rows(raw,code,now,season)
     if len(older)<30:raise ValueError('Historical season coverage insufficient')
     h2h_rows.extend(older)
    except Exception as exc:
     audit['training_errors'].append({'source':'h2h_context_'+str(years_back),'error':str(exc)})
   try:
    season=season_code(now);raw,receipt=fetcher.get('https://www.football-data.co.uk/mmz4281/'+season+'/'+code+'.csv');current_rows=csv_rows(raw,code,now,season);current=train_data(current_rows,[receipt]);h2h_rows.extend(current_rows)
   except Exception as exc:audit['training_errors'].append({'source':'current','error':str(exc)})
  for f in rows:
   checked=corroborate(f,source_rows)
   item={**f,'league_name':cfg['name'],'verification':'SCHEDULE_CROSS_CHECK' if checked else 'UNVERIFIED','forecast_eligible':False,'paper_prediction':None,'result':None}
   item['schedule_source_receipts']=[receipt for receipt in receipts[code] if 'dates='+when(f['kickoff_utc']).strftime('%Y%m%d') in receipt['url']]+[receipt for receipt in secondary_receipts if f['kickoff_utc'][:7] in receipt['url']]
   model=None
   if checked and audit['days_succeeded']==22 and prior is not None:model=model_forecast(item,prior,current)
   item['forecast_status']='EXPERIMENTAL_MODEL_FORECAST' if model else 'SCHEDULE_UNVERIFIED' if not checked else 'MODEL_INPUTS_UNAVAILABLE'
   # Descriptive only: available seasons may contain too few direct meetings.
   # Do not feed this evidence into the published probability model.
   if code!='UCL' and h2h_rows:
    evidence=head_to_head([{**row,'home':norm(row['home']),'away':norm(row['away'])} for row in h2h_rows],norm(f['home']),norm(f['away']),now)
    evidence['coverage']='UP_TO_FIVE_LEAGUE_SEASONS_WITH_SOURCE_GAPS_POSSIBLE'
    evidence['source_status']='HISTORICAL_CSV_SOURCE_OBSERVED_NOT_INDEPENDENTLY_VERIFIED'
    evidence['history_data_observed_at_utc']=stamp(now)
    evidence['cutoff_basis']='FORECAST_GENERATION_TIME_NOT_KICKOFF'
    evidence['conflict']=conflict_with_forecast(evidence,model['prob_home'],model['prob_draw'],model['prob_away']) if model else 'NO_MODEL_FORECAST'
    item['head_to_head_research']=evidence
   fixtures.append(item)
   if model:forecasts.append(model)
  print(json.dumps({'league':code,'fixtures':len(rows),'forecasts':sum(f['league']==code for f in forecasts),'training_matches':prior['matches'] if prior else 0,'source_errors':len(audit['source_errors'])}),flush=True)
  audit.update(schedule_matches=sum(f['league']==code and f['verification']=='SCHEDULE_CROSS_CHECK' for f in fixtures),forecasts=sum(f['league']==code for f in forecasts),primary_receipts=receipts[code],secondary_receipts=secondary_receipts,training_matches=prior['matches'] if prior else 0)
 if not fixtures:raise ValueError('No additional fixtures discovered; retain previous expanded feed')
 frozen,archived,added=archive_forecasts(forecasts,dt.datetime.now(UTC),ROOT/'research/football-expanded-archive/v1')
 performance=score_results(archived,fetcher,dt.datetime.now(UTC),ROOT/'research/football-expanded-results/v1/verified.json')
 data={'schema_version':1,'generated_at_utc':stamp(dt.datetime.now(UTC)),'discovery_window_utc':[stamp(now+dt.timedelta(minutes=90)),stamp(now+dt.timedelta(days=21))],'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','official_challenge':{'completed':0,'target':100},
  'upcoming_fixtures':sorted(fixtures,key=lambda f:(f['kickoff_utc'],f['league'])),'experimental_model_forecasts':frozen,'league_audits':league_audits,
  'archive_audit':{'new_records':added,'total_records_including_revisions':len(archived)},'performance':performance,
  'limitations':['Each competition has an isolated model and performance sample. No validated betting value.',
   'Champions League uses the complete previous league phase, with shrinkage; unknown/new teams remain unmodelled.',
   'All 1X2 estimates and scores cover regulation time only. Extra time and penalties are excluded.',
   'Sky times interpreted in Europe/London. Missing or ambiguous source matches remain unverified.',
   'Schedules corroborated by two publishers do not prove historical source availability or independent timestamp attestation.']}
 (OUT/'football-expanded-data.json').write_text(json.dumps(data,indent=2)+'\n')
 (OUT/'league-audit.json').write_text(json.dumps(league_audits,indent=2)+'\n')
 print(json.dumps({'fixtures':len(fixtures),'forecasts':len(frozen),'new_archive_records':added,'scored':len(performance['entries'])}))
if __name__=='__main__':main()
