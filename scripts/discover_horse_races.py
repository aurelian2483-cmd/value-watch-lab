#!/usr/bin/env python3
"""Single-source UK/Ireland race discovery. No forecasts, prices or selections."""
import datetime as dt
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
import urllib.request
from zoneinfo import ZoneInfo

SOURCE='https://www.sportinglife.com/racing/racecards'
OUT=Path('/tmp/horse-research')
COUNTRY_ALIASES={'ENG':'ENG','ENGLAND':'ENG','SCO':'SCO','SCOT':'SCO','SCOTLAND':'SCO','WAL':'WAL','WALE':'WAL','WALES':'WAL','GB':'GBR','GBR':'GBR','UK':'GBR','IRE':'IRE','IRL':'IRE','EIRE':'IRE','IRELAND':'IRE','NI':'NIR','NIR':'NIR','NORTHERNIRELAND':'NIR'}
COUNTRIES=set(COUNTRY_ALIASES.values())

def country_code(value):
 return COUNTRY_ALIASES.get(re.sub(r'[^A-Z]','',str(value or '').upper()))

class PageData(HTMLParser):
 def __init__(self):
  super().__init__();self.active=False;self.parts=[];self.blocks=0;self.links={}
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='script' and attrs.get('id')=='__NEXT_DATA__':self.active=True;self.blocks+=1
  href=attrs.get('href','')
  if tag=='a' and '/racing/racecards/' in href and '/racecard/' in href:
   try:self.links[href.split('/racecard/')[1].split('/')[0]]=href
   except IndexError:pass
 def handle_endtag(self,tag):
  if tag=='script':self.active=False
 def handle_data(self,data):
  if self.active:self.parts.append(data)

def discover(raw,observed):
 parser=PageData();parser.feed(raw.decode('utf-8'))
 if parser.blocks!=1:raise ValueError('Missing or ambiguous structured page data')
 props=json.loads(''.join(parser.parts))['props']['pageProps']
 if props.get('hasError') is not False or not isinstance(props.get('meetings'),list):raise ValueError('Racecard source error/schema change')
 today=observed.astimezone(ZoneInfo('Europe/London')).date();races=[];seen=set();rejected=[];included_meetings=[];excluded_countries=[]
 for meeting in props['meetings']:
  summary=meeting['meeting_summary'];course=summary['course']
  raw_country=course.get('country',{}).get('short_name');canonical_country=country_code(raw_country)
  if canonical_country is None:
   excluded_countries.append({'meeting':course.get('name'),'source_country':raw_country});continue
  if summary.get('visible') is not True:continue
  included_meetings.append({'racecourse':course['name'],'country':canonical_country,'source_country':raw_country,'source_race_count':len(meeting.get('races',[]))})
  for race in meeting['races']:
   if race.get('hidden') is True:continue
   try:
    day=dt.date.fromisoformat(race['date'])
    if day!=today:raise ValueError('Race date differs from requested UK day')
    if summary['date']!=race['date']:raise ValueError('Meeting/race date mismatch')
    kickoff=dt.datetime.combine(day,dt.time.fromisoformat(race['time']),ZoneInfo('Europe/London')).astimezone(dt.timezone.utc)
    race_id=str(race['race_summary_reference']['id'])
    if race_id in seen:raise ValueError('Duplicate race identifier')
    seen.add(race_id)
    count=race['ride_count']
    if type(count)!=int or count<0:raise ValueError('Invalid source runner count')
    link=parser.links.get(race_id)
    link_type='PAGE_LINK' if link else 'CONSTRUCTED_REQUIRES_IDENTITY_VALIDATION'
    if not link:
     slug=lambda text:re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')
     link='/racing/racecards/'+day.isoformat()+'/'+slug(course['name'])+'/racecard/'+race_id+'/'+slug(race['name'])
    races.append({'race_id':race_id,'racecourse':course['name'],'country':canonical_country,'source_country':raw_country,
     'name':race['name'],'startUTC':kickoff.isoformat(),'race_stage':race['race_stage'],
     'surface':race.get('course_surface',{}).get('surface'),'going':race.get('going'),
     'distance':race.get('distance'),'race_class':race.get('race_class'),'has_handicap':race.get('has_handicap'),'going_shortcode':race.get('going_shortcode'),
     'source_runner_count':count,'runners':[],
     'source':'https://www.sportinglife.com'+link,'source_link_type':link_type,
     'observedAtUTC':observed.isoformat(),'verification':'SINGLE_SOURCE_UNVERIFIED',
     'forecast_status':'RUNNER_DATA_NOT_CONNECTED','prediction':None,'odds':None,'expected_value':None,
     'forecast_eligible':False,'challenge_eligible':0})
   except (ValueError,KeyError,TypeError) as exc:rejected.append({'race_id':str(race.get('race_summary_reference',{}).get('id','')),'reason':str(exc)})
 if not races or rejected:raise ValueError('Incomplete UK/Ireland discovery: '+json.dumps(rejected))
 return {'schema_version':1,'kind':'HORSE_RACING_EXPERIMENTAL_RESEARCH','generated_at_utc':observed.isoformat(),
  'race_date_uk':today.isoformat(),'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
  'official_challenge':{'completed':0,'status':'NOT_STARTED'},'coverage_verified':False,
  'discovery_coverage':{'observed_source_meetings':len(props['meetings']),'included_meetings':included_meetings,'excluded_country_meetings':excluded_countries,'complete_external_coverage_verified':False},
  'status':'RACES_DISCOVERED_RUNNER_DATA_PENDING','source_receipts':[{'url':SOURCE,'sha256':hashlib.sha256(raw).hexdigest(),
   'observed_at_utc':observed.isoformat()}],'races':sorted(races,key=lambda r:(r['startUTC'],r['race_id'])),
  'candidate_selections':[],'qualified_selections':[],
  'limitations':['Single-source discovery; not independently corroborated or complete coverage.',
   'Source runner counts are not verified declarations. Runner identities and non-runners are not yet connected.',
   'No model probabilities or verified Sky Bet odds. Price movements are research inputs only.',
   'Race times interpreted in Europe/London. Completed races are retained as source observations, never new forecasts.']}

def main():
 req=urllib.request.Request(SOURCE,headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.status!=200:raise ValueError('Racecard HTTP failure')
  raw=response.read(3000001)
 if not raw or len(raw)>3000000:raise ValueError('Missing or oversized source')
 data=discover(raw,dt.datetime.now(dt.timezone.utc))
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/'source.html').write_bytes(raw)
 (OUT/'racing-research-data.json').write_text(json.dumps(data,indent=2)+'\n')
 print(json.dumps({'status':data['status'],'races':len(data['races']),'publication_gate':'BLOCKED'}))

if __name__=='__main__':main()
