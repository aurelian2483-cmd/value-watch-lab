"""Check attributable structured primary forum posts, never RSS claims alone."""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

HOSTS={'theracingforum.co.uk','fatjockey.com','theukbettingforum.co.uk','forum.punterslounge.com','community.betfair.com','reddit.com','olbg.com'}
UTC=dt.timezone.utc

def instant(value):
    parsed=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
    if parsed.tzinfo is None:raise ValueError('Post timestamp must include a timezone')
    return parsed.astimezone(UTC)

def normalized(value):
    return re.sub(r'[^a-z0-9]+',' ',value.casefold()).strip()

def horse_key(value):
    return normalized(re.sub(r'\s*\((?:GB|IRE|FR|USA|GER|AUS|NZ)\)\s*$','',value,flags=re.I))

def selection_text(text,race,expected,title=''):
    text=unescape(text)
    text=re.sub(r'<(blockquote|script|style)\b[^>]*>.*?</\1\s*>',' ',text,flags=re.I|re.S)
    text=re.sub(r'<[^>]*>',' ',text);n=normalized(text)
    contains=lambda value:bool(re.search(r'\b'+re.escape(value)+r'\b',n))
    if not contains(normalized(race['racecourse'])):raise ValueError('Racecourse not identified in primary post')
    horses=[r for r in race.get('runners',[]) if r.get('active_runner') and contains(horse_key(r['name']))]
    if len(horses)!=1 or horse_key(horses[0]['name'])!=horse_key(expected):raise ValueError('Primary runner missing or ambiguous')
    horse=re.escape(horse_key(expected))
    positive=bool(re.search(r'\b(?:naps?|picks?|selections?|tips?|fancy|back|backing|bet on)\s+(?:is\s+)?'+horse+r'\b',n) or re.search(r'\b'+horse+r'\s+(?:is\s+)?(?:my\s+)?(?:nap|pick|selection|bet)\b',n))
    off=instant(race['startUTC']).astimezone(ZoneInfo('Europe/London'))
    clock=rf'\b{off.hour:02d}[:.]{off.minute:02d}\b'
    listed=bool(re.search(r'\b(?:tips?|selections?|naps?)\b',title,re.I) and re.search(clock,text) and re.search(r'\b\d+\s*/\s*\d+\b',text))
    negative=bool(re.search(r'\b(?:not|never|avoid|against|lay|laying|don t|wouldn t|won t)\b.{0,45}\b'+horse+r'\b',n))
    if not (positive or listed) or negative:raise ValueError('No explicit positive primary selection')
    value=bool(re.search(r'\b(?:value bet|value at|good value|represents value)\b',n) and not re.search(r'\b(?:no|not|poor)\s+(?:good\s+)?value\b',n) and re.search(r'\b(?:back|backing|bet)\b',n) and re.search(r'\b\d+\s*/\s*\d+\b',text))
    return horses[0],value,text

def capture_native_feed(item,race,entry,now):
    """Full, author-attributed posts in a first-party forum feed are primary data.

    A third-party RSS headline, summary, publisher name or supplied boolean is not.
    """
    receipt=item.get('feed_receipt') or {};url=item['link'];post=urlsplit(url);feed=urlsplit(receipt.get('url',''))
    host=(post.hostname or '').removeprefix('www.')
    if post.scheme!='https' or feed.scheme!='https' or (feed.hostname or '').removeprefix('www.')!=host or post.username or feed.username:raise ValueError('First-party public feed required')
    if not item.get('full_content') or not re.fullmatch(r'[a-f0-9]{64}',receipt.get('sha256','')):raise ValueError('No full post content receipt')
    parts=post.path.strip('/').split('/');identity=item.get('id','');thread=None
    if host=='reddit.com' and len(parts)>=5 and parts[0]=='r' and parts[2]=='comments' and feed.path.endswith('.rss'):
        expected=('t1_'+parts[5]) if len(parts)>5 else ('t3_'+parts[3])
        if identity!=expected:raise ValueError('Reddit post identity mismatch')
        thread=post.scheme+'://'+post.netloc+'/'+'/'.join(parts[:5])+'/'
        platform='REDDIT_ATOM'
    elif host=='fatjockey.com' and post.path.startswith('/forum/threads/') and feed.path=='/forum/forums/-/index.rss' and identity.rstrip('/')==url.rstrip('/'):
        thread=url.split('#')[0];platform='XENFORO_RSS'
    else:raise ValueError('Unsupported native forum feed')
    author=re.sub(r'^/?u/','',str(item.get('author') or '')).strip()
    if not author or normalized(author) in ('unknown','anonymous','deleted'):raise ValueError('Named primary author required')
    published=instant(item['published']);seen=instant(receipt['observed_at_utc']);off=instant(race['startUTC'])
    if not published<=seen<=now<off:raise ValueError('Primary post chronology invalid')
    horse,value,text=selection_text(item['description'],race,entry['horse'],item['title'])
    return {'method':'NATIVE_FORUM_FEED_V1','native_platform':platform,'feed_entry_id':identity,'post_url':url,'author':author,
            'published_at_utc':published.isoformat(),'race_id':str(race['race_id']),'race_start_utc':race['startUTC'],
            'horse_id':str(horse['horse_id']),'explicit_selection':True,'explicit_value_backing':value,'thread_url':thread,
            'text_sha256':hashlib.sha256(text.encode()).hexdigest(),'receipt':receipt}

class StructuredPosts(HTMLParser):
    def __init__(self):
        super().__init__();self.active=False;self.parts=[];self.documents=[]
    def handle_starttag(self,tag,attrs):
        if tag=='script' and dict(attrs).get('type','').lower()=='application/ld+json':self.active=True;self.parts=[]
    def handle_data(self,text):
        if self.active:self.parts.append(text)
    def handle_endtag(self,tag):
        if tag=='script' and self.active:
            self.active=False
            try:self.documents.append(json.loads(''.join(self.parts)))
            except ValueError:pass

def nodes(value):
    if isinstance(value,list):
        for child in value:yield from nodes(child)
    elif isinstance(value,dict):
        yield value
        for key in ('@graph','comment','mainEntity'):
            yield from nodes(value.get(key))

def capture(entry,race,now,fetch=None):
    """Return a receipt only for one exact post with an explicit named selection.

    A missing/blocked/unstructured primary page leaves the RSS candidate unverified.
    Forecast prices and media articles never establish grassroots value consensus.
    """
    url=entry['url'];u=urlsplit(url)
    if u.scheme!='https' or not u.hostname or u.hostname.removeprefix('www.') not in HOSTS or u.path=='/':raise ValueError('Primary forum URL required')
    if fetch is None:
        def fetch(url):
            request=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0 (public source verification)'})
            with urllib.request.urlopen(request,timeout=12) as response:
                if response.geturl().split('#')[0]!=url.split('#')[0]:raise ValueError('Primary post redirected')
                return response.read(1_000_001)
    raw=fetch(url)
    if not raw or len(raw)>1_000_000:raise ValueError('Primary page missing or oversized')
    parser=StructuredPosts();parser.feed(raw.decode('utf-8'))
    matches=[]
    for document in parser.documents:
        for node in nodes(document):
            kinds=node.get('@type',[]);kinds=[kinds] if isinstance(kinds,str) else kinds
            if not any(k in ('DiscussionForumPosting','Comment') for k in kinds):continue
            post_url=node.get('url') or node.get('@id')
            if post_url!=url:continue
            author=node.get('author');author=author.get('name') if isinstance(author,dict) and author.get('@type','Person')=='Person' else None
            if not isinstance(author,str) or not author.strip() or normalized(author) in ('unknown','anonymous','deleted'):continue
            text=node.get('text') or node.get('articleBody')
            if not isinstance(text,str) or not text.strip():continue
            try:
                published=instant(node['datePublished']);off=instant(race['startUTC'])
                if not published<=now<off:continue
                horse,value,text=selection_text(text,race,entry['horse'],node.get('headline',''))
            except (ValueError,KeyError,TypeError):continue
            parent=node.get('isPartOf');thread=parent.get('url') or parent.get('@id') if isinstance(parent,dict) else parent
            if not isinstance(thread,str) or urlsplit(thread).hostname!=u.hostname or urlsplit(thread).scheme!='https':thread=None
            matches.append({'method':'JSONLD_DISCUSSION_POST_V1','post_url':url,'author':author.strip(),
                'published_at_utc':published.isoformat(),'race_id':str(race['race_id']),'race_start_utc':race['startUTC'],
                'horse_id':str(horse['horse_id']),'explicit_selection':True,'explicit_value_backing':value,'thread_url':thread,
                'text_sha256':hashlib.sha256(text.encode()).hexdigest(),
                'receipt':{'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':now.isoformat()}})
    if len(matches)!=1:raise ValueError('No unique attributable structured primary selection')
    return matches[0]
