"""Observed public OLBG aggregate selections; never verified individual tipsters."""
import datetime as dt
import hashlib
import re
import urllib.request
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlsplit,parse_qs
from primary_racing_posts import horse_key

OLBG='https://www.olbg.com/betting-tips/Horse_Racing/2'

class Rows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False);self.depth=0;self.parts=[];self.rows=[]
    def handle_starttag(self,tag,attrs):
        classes=dict(attrs).get('class','').split()
        if not self.depth and tag=='div' and 'grd' in classes and 'tip' in classes:self.depth=1;self.parts=[self.get_starttag_text()];return
        if self.depth:
            self.parts.append(self.get_starttag_text())
            if tag=='div':self.depth+=1
    def handle_endtag(self,tag):
        if self.depth:
            self.parts.append('</'+tag+'>')
            if tag=='div':
                self.depth-=1
                if not self.depth:self.rows.append(''.join(self.parts))
    def handle_data(self,data):
        if self.depth:self.parts.append(data)
    def handle_entityref(self,name):self.handle_data('&'+name+';')
    def handle_charref(self,name):self.handle_data('&#'+name+';')

class Tip(HTMLParser):
    def __init__(self):
        super().__init__();self.times=[];self.links=[];self.names=[];self.events=[];self.text=[];self.capture=None;self.parts=[];self.sport_events=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('itemtype')=='http://schema.org/SportsEvent':self.sport_events+=1
        if tag=='time' and a.get('itemprop')=='startDate':self.times.append(a.get('datetime',''))
        if tag=='a' and a.get('itemprop')=='url':self.links.append(a.get('href',''))
        if tag=='h4' or tag=='h5' and a.get('itemprop')=='name':self.capture=tag;self.parts=[]
    def handle_data(self,text):
        self.text.append(text)
        if self.capture:self.parts.append(text)
    def handle_endtag(self,tag):
        if tag==self.capture:
            (self.names if tag=='h4' else self.events).append(''.join(self.parts).strip());self.capture=None

class PageState(HTMLParser):
    def __init__(self):
        super().__init__();self.canonical=False;self.hidden=0;self.text=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical' and a.get('href')==OLBG:self.canonical=True
        if tag in ('script','style'):self.hidden+=1
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.hidden=max(0,self.hidden-1)
    def handle_data(self,text):
        if not self.hidden:self.text.append(text)

def collect(races,now,fetch=None):
    if fetch is None:
        def fetch(url):
            req=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0 (public aggregate racing research)'})
            with urllib.request.urlopen(req,timeout=20) as response:
                if response.geturl()!=url:raise ValueError('OLBG source redirected')
                return response.read(2_000_001)
    health={'publisher':'OLBG aggregate tips','source_type':'tipster','url':OLBG,'status':'error'}
    try:
        raw=fetch(OLBG)
        if not raw or len(raw)>2_000_000:raise ValueError('OLBG page missing or oversized')
        html=raw.decode('utf-8');parser=Rows();parser.feed(html)
        if not parser.rows:
            page=PageState();page.feed(html)
            if page.canonical and re.search(r'\bNo tips found\.', ' '.join(page.text),re.I):
                health.update(status='fetched',source_state='NO_TIPS_PUBLISHED',items_scanned=0,matched_selections=0,explicit_tip_observations=0,limitation='Source explicitly reports no tips for this page; no selections inferred.')
                return [],[health]
            raise ValueError('No structured OLBG tip rows; source layout unavailable')
        entries=[];seen=set();rejected=0
        for row in parser.rows:
            tip=Tip();tip.feed(row)
            support=re.findall(r'\b(\d+)\s*/\s*(\d+)\s+Win Tips\b',' '.join(tip.text),re.I)
            if tip.sport_events!=1 or len(tip.times)!=1 or len(tip.names)!=1 or len(tip.events)!=1 or len(support)!=1:rejected+=1;continue
            votes,total=map(int,support[0]);event=re.fullmatch(r'\d{1,2}:\d{2}\s+(.+)',tip.events[0]);links=set(tip.links)
            if not event or not 0<votes<=total or len(links)!=1:rejected+=1;continue
            url=next(iter(links));u=urlsplit(url)
            if u.scheme!='https' or u.hostname!='www.olbg.com' or u.username or not u.path.startswith('/betting-tips/Horse_Racing/') or not re.fullmatch(r'\d+',parse_qs(u.query).get('event_id',[''])[0]):rejected+=1;continue
            try:off=dt.datetime.fromisoformat(tip.times[0].replace('Z','+00:00'))
            except ValueError:rejected+=1;continue
            if off.tzinfo is None or not now<off<=now+dt.timedelta(days=2):rejected+=1;continue
            matches=[]
            for race in races:
                if dt.datetime.fromisoformat(race['startUTC'].replace('Z','+00:00'))!=off or horse_key(race['racecourse'])!=horse_key(event[1]):continue
                for horse in race['runners']:
                    if horse.get('active_runner') is True and horse.get('runner_status')=='RUNNER' and horse_key(horse['name'])==horse_key(tip.names[0]):matches.append((race,horse))
            if len(matches)!=1:rejected+=1;continue
            race,horse=matches[0];identity='olbg-'+hashlib.sha256((url+'|'+str(race['race_id'])+'|'+race['startUTC']+'|'+str(horse['horse_id'])).encode()).hexdigest()[:24]
            if identity in seen:continue
            seen.add(identity)
            entries.append({'id':identity,'group':'tipster','publisher':'OLBG aggregate tips','author':'OLBG aggregate (individual authors not captured)',
                'race_id':str(race['race_id']),'startUTC':race['startUTC'],'event':race.get('name',''),'horse':horse['name'],'stance':'support','market':'WIN',
                'verification':'PUBLIC_SELECTION_OBSERVED','extraction_method':'OLBG_PUBLIC_WIN_TIPS_V1','url':url,'source_feed':OLBG,
                'publication_date':off.date().isoformat(),'observed_at_utc':now.isoformat(),
                'aggregate_counts':{'win_tips':votes,'all_win_tips':total,'independent_authors_verified':False},
                'summary':'OLBG aggregate win selection; reported counts are unverified and do not establish independently checked authors or consensus.',
                'selection_receipt':{'url':OLBG,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':now.isoformat(),'race_id':str(race['race_id']),'horse_id':str(horse['horse_id']),'source_start_utc':tip.times[0]}})
        health.update(status='fetched',items_scanned=len(parser.rows),matched_selections=len(entries),explicit_tip_observations=len(entries),rejected_rows=rejected,
            limitation='Partial first-page aggregate coverage; counts are not independently verified individual authors.')
        return entries,[health]
    except Exception as exc:
        health['error']=str(exc)[:180];return [],[health]
