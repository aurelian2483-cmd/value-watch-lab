"""Secure research-only Darts API data collection.

Requires DARTS_API_KEY injected as environment secret. Never prints or writes
the secret; never commits raw provider data or changes the public D1 feed.
"""
import json, os, sys, urllib.request, urllib.parse, urllib.error, hashlib, time, subprocess
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
    # Exact-day queries match the verified provider filter behaviour. A weekly
    # query exceeded 20 pages on 19 Nov; never accept that partial archive.
    # Fully paginate each day within the existing overall 100-request budget.
    for offset in range(28):
        first=start+timedelta(days=offset)
        last=first
        batch,receipts=pages('/v1/results',{'from':first.isoformat(),'to':last.isoformat(),'limit':200},key,20)
        if any(not isinstance(row,dict) or not isinstance(row.get('played_on'),str) or not first.isoformat()<=row['played_on']<=last.isoformat() for row in batch):
            raise RuntimeError('Provider returned results outside the requested history window; analysis withheld')
        results.extend(batch)
        recs.extend(receipts)
    fixtures,frecs=pages('/v1/fixtures',{'from':day.isoformat(),'to':(day+timedelta(days=7)).isoformat(),'limit':500},key,10)
    old,future=adapt(results,fixtures,now)
    future=[row for row in future if day.isoformat()<=row['start_utc'][:10]<=(day+timedelta(days=7)).isoformat()]
    if len(old)!=len(results):raise RuntimeError('Historical rows failed normalization; incomplete analysis withheld')
    return {'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
            'source_verification':'PROVIDER_OBSERVED_UNCORROBORATED','generated_at_utc':now.isoformat().replace('+00:00','Z'),
            'results':old,'fixtures':future,
            'coverage':{'returned_result_rows':len(results),'usable_result_rows':len(old),'returned_fixture_rows':len(fixtures),'confirmed_upcoming_fixtures':len(future),'history_period':[start.isoformat(),end.isoformat()],'pagination_complete':True,'requests_this_run':REQUEST_COUNT,'diagnostic_window':'TWENTY_EIGHT_FULL_DAY_WINDOWS'},
            'source_receipts':recs+frecs,'odds':None,'expected_value':None,'betting_eligible':False}

def analysis_snapshot(now, key):
    """Run the unchanged D1 model on paginated history, publish only aggregates.

    Raw results remain in this process and the model subprocess's stdin. Neither
    the public repository nor workflow artifacts receive the historical archive.
    """
    collected=collect(now,key)
    fixtures=sorted(collected['fixtures'],key=lambda row:(row['start_utc'],row['id']))[:12]
    model_path=Path(__file__).resolve().parents[1]/'darts/model.js'
    script="const fs=require('fs'),m=require(process.argv[1]),d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(m.model(d.results,d.fixtures,d.generated_at_utc)));"
    process=subprocess.run(['node','-e',script,str(model_path)],
        input=json.dumps({'results':collected['results'],'fixtures':fixtures,'generated_at_utc':collected['generated_at_utc']}),
        capture_output=True,text=True,timeout=30,check=False)
    if process.returncode:raise RuntimeError('D1 analysis input checks failed; publication withheld')
    report=json.loads(process.stdout)
    return {**report,'schema_version':1,'source_verification':'PROVIDER_OBSERVED_UNCORROBORATED',
        'coverage':collected['coverage'],'source_receipts':collected['source_receipts'],
        'history_latest_date':max((row['played_at'][:10] for row in collected['results']),default=None),
        'raw_history_published':False,
        'limitations':['Recent 28-day source window only; not a complete career history.',
            'Free-tier history is delayed; provider observations are not independently corroborated.',
            'D1 is experimental and uncalibrated. No bookmaker odds or betting edge.']}

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

def bounded_public_snapshot(now, key):
    """A small, non-exhaustive research display sample, never an API mirror.

    Historical dates are independently filtered because the provider's source
    pagination/date-filter behaviour has previously required investigation.
    Missing pages never imply complete training or event coverage.
    """
    dates=[(now.date()-timedelta(days=d)).isoformat() for d in (8,14,28)]
    raw_results=[]; receipts=[]; checks=[]
    for day in dates:
        payload, digest=request('/v1/results',{'from':day,'to':day,'limit':100},key)
        rows=[r for r in payload['data'] if isinstance(r,dict) and r.get('played_on')==day]
        raw_results.extend(rows)
        receipts.append({'endpoint':'results','day':day,'sha256':digest})
        checks.append({'day':day,'rows_returned':len(payload['data']),
                       'matched_day':len(rows),'has_more':bool(payload['meta'].get('next_cursor'))})
    fixtures_envelope,digest=request('/v1/fixtures',{'from':now.date().isoformat(),
        'to':(now.date()+timedelta(days=7)).isoformat(),'limit':100},key)
    fixtures_raw=fixtures_envelope['data']
    receipts.append({'endpoint':'fixtures','sha256':digest})
    from darts_api_adapter import result as normalise_result, fixture as normalise_fixture
    results=[]; result_ids=set()
    for row in raw_results:
        converted=normalise_result(row,now)
        if converted and converted['id'] not in result_ids and len(results)<80:
            result_ids.add(converted['id']);results.append(converted)
    fixtures=[]; fixture_ids=set()
    for row in fixtures_raw:
        converted=normalise_fixture(row,now)
        if converted and converted['id'] not in fixture_ids and len(fixtures)<12:
            fixture_ids.add(converted['id']);fixtures.append(converted)
    tentative=[];tentative_ids=set()
    from darts_api_adapter import player as normalise_player
    for row in fixtures_raw:
        if not isinstance(row,dict) or row.get('date_confirmed') is True:continue
        fid=row.get('fixture_id');date_text=row.get('date')
        try:
            from datetime import date as date_type
            day=date_type.fromisoformat(date_text)
            if not now.date()<=day<=now.date()+timedelta(days=7):continue
        except (TypeError,ValueError):continue
        people=row.get('players')
        if not isinstance(fid,str) or len(fid)>80 or not isinstance(people,list) or len(people)!=2:continue
        a,b=normalise_player(people[0]),normalise_player(people[1])
        if not a or not b or a['id']==b['id'] or fid in tentative_ids:continue
        competition=row.get('competition')
        name=competition.get('name') if isinstance(competition,dict) else competition
        if not isinstance(name,str) or not name.strip() or len(name)>160:continue
        tentative.append({'id':fid,'date_utc':day.isoformat(),'competition':name.strip(),
                          'player_a':a,'player_b':b,'status':'DATE_ONLY_UNCONFIRMED'})
        tentative_ids.add(fid)
        if len(tentative)>=12:break
    return {'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED',
            'publication_gate':'BLOCKED','source_verification':'PROVIDER_OBSERVED_UNCORROBORATED',
            'generated_at_utc':now.isoformat().replace('+00:00','Z'),
            'results':results,'fixtures':fixtures,'tentative_fixtures':tentative,'source_receipts':receipts,
            'coverage':{'sample_only':True,'historical_days_queried':dates,'checks':checks,
                        'results_published':len(results),'fixtures_published':len(fixtures),
                        'tentative_fixtures_displayed':len(tentative),
                        'fixture_rows_returned':len(fixtures_raw),
                        'fixture_more_pages':bool(fixtures_envelope['meta'].get('next_cursor')),
                        'notice':'Limited public research display, not complete source coverage or calibrated predictions'}}
    
def main():
    key=os.environ.get('DARTS_API_KEY','')
    if not key:raise SystemExit('DARTS_API_KEY not configured. No network request made, no public feed changed.')
    now=datetime.now(timezone.utc)
    if len(sys.argv)==2 and sys.argv[1]=='--publish-analysis':
        report=analysis_snapshot(now,key)
        out=Path('darts/analysis.json')
        out.parent.mkdir(parents=True,exist_ok=True)
        temporary=out.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        temporary.replace(out)
        print('Published D1 aggregates:',report['training_matches'],'training matches,',len(report['fixtures']),'fixture analyses; UNVALIDATED / BLOCKED')
        return
    # Provider diagnostic remains default; publication requires an explicit mode.
    if len(sys.argv)==2 and sys.argv[1]=='--publish-sample':
        report=bounded_public_snapshot(now,key)
        out=Path('darts/feed.json')
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print('Published bounded research snapshot:',len(report['results']),'results,',len(report['fixtures']),'confirmed fixtures,',len(report['tentative_fixtures']),'tentative; UNVALIDATED / BLOCKED')
        return
    if len(sys.argv)!=1:raise SystemExit('Unknown mode')
    report=coverage_probe(now,key)
    path=Path('work/darts/source-diagnostic.json')
    path.parent.mkdir(parents=True,exist_ok=True)
    # GitHub artifacts must never redistribute provider result rows.
    safe={k:v for k,v in report.items() if k not in ('results','fixtures')}
    path.write_text(json.dumps(safe,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('Darts source coverage probe complete;',report['requests_this_run'],'requests; NO PREDICTIONS GENERATED; PUBLIC FEED UNCHANGED')

if __name__=='__main__':main()
