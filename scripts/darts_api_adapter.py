"""Fail-closed Darts API v1 to Value Watch D1 result/fixture adapter.

Results are day-precision only: a noon UTC carrier is used for the existing
calendar-day Elo grouping, never described as an observed start time.
"""
from datetime import datetime, timezone, timedelta, date
import re
PID=re.compile(r"^pl_[A-Za-z0-9]{6}$")
MID=re.compile(r"^mt_[A-Za-z0-9]{8,40}$")
FID=re.compile(r"^fx_[A-Za-z0-9]{8,40}$")

def player(p):
    if not isinstance(p,dict): return None
    pid,name=p.get('player_id'),p.get('name')
    if not isinstance(pid,str) or not PID.fullmatch(pid) or not isinstance(name,str) or not name.strip() or len(name)>160:return None
    return {'id':pid,'name':name.strip()}

def result_issue(r, now):
    if not isinstance(r,dict):return 'INVALID_ROW'
    status=r.get('result_status')
    if not isinstance(status,str) or not re.fullmatch(r'[a-z][a-z0-9_]{0,31}',status):return 'INVALID_RESULT_STATUS'
    if status!='final':return 'NOT_FINAL'
    if not isinstance(r.get('match_id'),str) or not MID.fullmatch(r['match_id']):return 'INVALID_MATCH_ID'
    a,b=player(r.get('winner')),player(r.get('loser'))
    if not a or not b:return 'INVALID_PLAYER'
    if a['id']==b['id']:return 'DUPLICATE_PLAYER'
    d=r.get('played_on')
    try:
        if not isinstance(d,str) or date.fromisoformat(d).isoformat()!=d or date.fromisoformat(d)>=now.astimezone(timezone.utc).date():return 'INVALID_MATCH_DATE'
    except ValueError:return 'INVALID_MATCH_DATE'
    return None

def result(r, now):
    if result_issue(r,now):return None
    a,b=player(r['winner']),player(r['loser'])
    return {'id':r['match_id'],'played_at':r['played_on']+'T12:00:00Z','source_date_precision':'DAY_ONLY','timestamp_is_carrier':True,'status':'FINAL','player_a':a,'player_b':b,'winner_id':a['id']}

def fixture(r, now):
    if not isinstance(r,dict):return None
    fid=r.get('fixture_id')
    if not isinstance(fid,str) or not FID.fullmatch(fid) or r.get('date_confirmed') is not True:return None
    start=r.get('starts_at')
    if not isinstance(start,str) or not start.endswith('Z'):return None
    try:
        dt=datetime.fromisoformat(start.replace('Z','+00:00'))
        if dt<=now.astimezone(timezone.utc)+timedelta(minutes=5):return None
    except ValueError:return None
    people=r.get('players')
    if not isinstance(people,list) or len(people)!=2:return None
    a,b=player(people[0]),player(people[1])
    if not a or not b or a['id']==b['id']:return None
    # Verified provider fixture shape uses 'competition', not 'event'.
    event=r.get('competition')
    name=event.get('name') if isinstance(event,dict) else event
    if not isinstance(name,str) or not name.strip() or len(name)>160:return None
    return {'id':fid,'start_utc':start,'status':'SCHEDULED','competition':name.strip(),'player_a':a,'player_b':b}

def adapt(results,fixtures,now):
    if not isinstance(results,list) or not isinstance(fixtures,list) or len(results)>50000 or len(fixtures)>1000:raise ValueError('Invalid source list size')
    done=[x for r in results if (x:=result(r,now))]
    future=[x for r in fixtures if (x:=fixture(r,now))]
    if len({x['id'] for x in done})!=len(done) or len({x['id'] for x in future})!=len(future):raise ValueError('Duplicated provider IDs')
    return done,future
