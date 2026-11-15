"""Secure research-only Darts API data collection.

Requires DARTS_API_KEY injected as environment secret. Never prints or writes
the secret; never commits raw provider data or changes the public D1 feed.
"""
import json, os, sys, urllib.request, urllib.parse, urllib.error, hashlib, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from darts_api_adapter import adapt

ROOT='https://api.dartsapi.com'
REQUEST_LIMIT=100
REQUEST_COUNT=0
LAST_REQUEST=0.0
def request(path, params, key):
    global REQUEST_COUNT, LAST_REQUEST
    if REQUEST_COUNT>=REQUEST_LIMIT:raise RuntimeError('Conservative request budget exhausted; partial feed withheld')
    delay=1.1-(time.monotonic()-LAST_REQUEST)
    if REQUEST_COUNT and delay>0:time.sleep(delay)
    REQUEST_COUNT+=1
    LAST_REQUEST=time.monotonic()
    url=ROOT+path+'?'+urllib.parse.urlencode(params)
    req=urllib.request.Request(url, headers={'Authorization':'Bearer '+key,'User-Agent':'ValueWatch-DartsResearch/1.0','Accept':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=25) as res:
            raw=res.read(3_000_001)
    except urllib.error.HTTPError as e:
        # Never echo response bodies, which might contain token-bearing URLs.
        raise RuntimeError('Darts API request refused: HTTP '+str(e.code)) from None
    if len(raw)>3_000_000:raise RuntimeError('Provider response too large')
    data=json.loads(raw)
    if not isinstance(data,dict) or not isinstance(data.get('data'),list) or not isinstance(data.get('meta'),dict):raise RuntimeError('Invalid provider envelope')
    return data,hashlib.sha256(raw).hexdigest()

def pages(endpoint, params, key, maxpages=20):
    all_rows=[];receipts=[];cursor=None;seen=set()
    for n in range(maxpages):
        args=dict(params)
        if cursor:args['cursor']=cursor
        d,digest=request(endpoint,args,key)
        receipts.append({'endpoint':endpoint,'sha256':digest,'returned':len(d['data']),'provider_plan':d['meta'].get('plan'),'provider_data_as_of':d['meta'].get('data_as_of')})
        all_rows.extend(d['data'])
        nxt=d['meta'].get('next_cursor')
        if not nxt:break
        if not isinstance(nxt,str) or nxt in seen:raise RuntimeError('Invalid or repeated pagination cursor')
        seen.add(nxt);cursor=nxt
    else:
        if nxt:raise RuntimeError('Pagination exceeded safe page cap; partial feed withheld')
    return all_rows,receipts

def collect(now, key):
    # Strictly old completed results: the free tier does not provide current-day outcomes.
    day=now.date()
    end=day-timedelta(days=8)
    start=end-timedelta(days=27)
    results=[];recs=[]
    # Four disjoint, fully paginated UTC week windows; fail closed on any incomplete week.
    for offset in range(0,28,7):
        first=start+timedelta(days=offset)
        last=min(first+timedelta(days=6),end)
        batch,receipts=pages('/v1/results',{'from':first.isoformat(),'to':last.isoformat(),'limit':200},key,20)
        results.extend(batch)
        recs.extend(receipts)
    fixtures,frecs=pages('/v1/fixtures',{'from':day.isoformat(),'to':(day+timedelta(days=7)).isoformat(),'limit':500},key,10)
    old,future=adapt(results,fixtures,now)
    return {'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
            'source_verification':'PROVIDER_OBSERVED_UNCORROBORATED','generated_at_utc':now.isoformat().replace('+00:00','Z'),
            'results':old,'fixtures':future,
            'coverage':{'returned_result_rows':len(results),'usable_result_rows':len(old),'returned_fixture_rows':len(fixtures),'confirmed_upcoming_fixtures':len(future),'history_period':[start.isoformat(),end.isoformat()],'pagination_complete':True,'requests_this_run':REQUEST_COUNT,'diagnostic_window':'FOUR_FULL_SEVEN_DAY_WINDOWS'},
            'source_receipts':recs+frecs,'odds':None,'expected_value':None,'betting_eligible':False}

def coverage_probe(now,key):
    """Small source-coverage test, not a partial historical backtest."""
    day=now.date()
    windows=[
        (day-timedelta(days=28),day-timedelta(days=28)),
        (day-timedelta(days=14),day-timedelta(days=14)),
        (day-timedelta(days=8),day-timedelta(days=8)),
    ]
    audits=[]
    for first,last in windows:
        params={'from':first.isoformat(),'to':last.isoformat(),'limit':10}
        d,digest=request('/v1/results',params,key)
        dates=[row.get('played_on') for row in d['data'] if isinstance(row,dict)]
        dates=[v for v in dates if isinstance(v,str)]
        outside=[v for v in dates if not first.isoformat()<=v<=last.isoformat()]
        audits.append({
            'endpoint':'results','date_requested':[first.isoformat(),last.isoformat()],
            'returned_rows':len(d['data']),'has_next_page':bool(d['meta'].get('next_cursor')),
            'observed_played_on_min':min(dates) if dates else None,
            'observed_played_on_max':max(dates) if dates else None,
            'date_filter_violations':len(outside),
            'sample_fields':sorted(set().union(*(row.keys() for row in d['data'] if isinstance(row,dict)))),
            'sha256':digest,'provider_data_as_of':d['meta'].get('data_as_of'),
        })
    first=day
    last=day+timedelta(days=7)
    d,digest=request('/v1/fixtures',{'from':first.isoformat(),'to':last.isoformat(),'limit':10},key)
    audits.append({
        'endpoint':'fixtures','date_requested':[first.isoformat(),last.isoformat()],
        'returned_rows':len(d['data']),'has_next_page':bool(d['meta'].get('next_cursor')),
        'sample_fields':sorted(set().union(*(row.keys() for row in d['data'] if isinstance(row,dict)))),
        'sample_has_confirmed_time':sum(bool(row.get('date_confirmed') is True and row.get('starts_at')) for row in d['data'] if isinstance(row,dict)),
        'sha256':digest,'provider_data_as_of':d['meta'].get('data_as_of')
    })
    return {'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
        'public_feed_unchanged':True,'complete_history_collected':False,
        'diagnostic':'SOURCE_COVERAGE_PROBE_NO_PREDICTIONS',
        'generated_at_utc':now.isoformat().replace('+00:00','Z'),
        'requests_this_run':REQUEST_COUNT,'audits':audits}

def main():
    key=os.environ.get('DARTS_API_KEY','')
    if not key:raise SystemExit('DARTS_API_KEY not configured. No network request made, no public feed changed.')
    now=datetime.now(timezone.utc)
    # Probe source filters and match shapes before any costly historical backfill.
    report=coverage_probe(now,key)
    path=Path('work/darts/source-diagnostic.json')
    path.parent.mkdir(parents=True,exist_ok=True)
    # GitHub artifacts must never redistribute provider result rows.
    safe={k:v for k,v in report.items() if k not in ('results','fixtures')}
    path.write_text(json.dumps(safe,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('Darts source coverage probe complete;',report['requests_this_run'],'requests; NO PREDICTIONS GENERATED; PUBLIC FEED UNCHANGED')

if __name__=='__main__':main()
