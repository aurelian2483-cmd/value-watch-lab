#!/usr/bin/env python3
"""Research-only seven-competition score archive. Source reported, not independently verified."""
import csv, datetime as dt, hashlib, io, json, os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'historical-reliability-data.json'
BASE='https://raw.githubusercontent.com/oladeeayo/open-matchday/master/data'
LEAGUES={
 'Premier League':'ENG_1_premier-league',
 'Championship':'ENG_2_championship',
 'La Liga':'ESP_1_la-liga',
 'Bundesliga':'GER_1_bundesliga',
 'Serie A':'ITA_1_serie-a',
 'Champions League':'UEFA_1_champions-league',
 'Europa League':'UEFA_1_europa-league',
}

def parse_results(text, competition, url, now):
    reader=csv.DictReader(io.StringIO(text))
    required={'date','home','away','ft_home','ft_away','ft_result','source'}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):
        raise ValueError('Unexpected result schema: '+competition)
    out=[]; seen=set()
    for row in reader:
        try:
            match_day=dt.date.fromisoformat((row.get('date') or '').strip())
            # Source lacks reliable timezone; end-of-day keeps same-day fixtures out of form.
            cutoff=dt.datetime.combine(match_day,dt.time(23,59,59),tzinfo=dt.timezone.utc)
            home=(row.get('home') or '').strip()
            away=(row.get('away') or '').strip()
            gh,ga=int(row['ft_home']),int(row['ft_away'])
            outcome=(row.get('ft_result') or '').strip().upper()
        except (ValueError,TypeError,KeyError):
            continue
        if not home or not away or home.casefold()==away.casefold() or min(gh,ga)<0 or max(gh,ga)>30:
            continue
        if outcome not in ('H','D','A') or outcome!=('H' if gh>ga else 'A' if gh<ga else 'D'):
            continue
        if not (dt.date(2026,7,1)<=match_day<=now.date()) or cutoff>now:
            continue
        identity=(match_day,home.casefold(),away.casefold())
        if identity in seen:continue
        seen.add(identity)
        out.append({'competition':competition,'home':home,'away':away,
          'kickoff_utc':cutoff.isoformat().replace('+00:00','Z'),
          'actual_outcome':outcome,'score_home':gh,'score_away':ga,
          'source_url':url,'upstream_provider':(row.get('source') or 'unspecified')[:64],
          'time_precision':'DATE_ONLY_END_OF_DAY'})
    return sorted(out,key=lambda r:(r['kickoff_utc'],r['home'],r['away']))

def collect(fetch=None,now=None):
    now=(now or dt.datetime.now(dt.timezone.utc)).astimezone(dt.timezone.utc)
    def default_fetch(url):
        req=Request(url,headers={'User-Agent':'ValueWatchResearchLab/1.0 (personal noncommercial football research)'})
        with urlopen(req,timeout=30) as response:payload=response.read(2_000_001)
        if len(payload)>2_000_000:raise ValueError('Source file too large')
        return payload.decode('utf-8-sig')
    fetch=fetch or default_fetch
    results=[]; audits=[]; failures=[]
    for competition,slug in LEAGUES.items():
        url=f'{BASE}/{slug}/results_2627.csv'
        try:
            source=fetch(url)
            rows=parse_results(source,competition,url,now)
            if not rows:raise ValueError('No valid completed matches')
            results.extend(rows)
            audits.append({'competition':competition,'status':'SOURCE_REPORTED_UNVERIFIED',
                'rows':len(rows),'source_url':url,
                'csv_sha256':hashlib.sha256(source.encode('utf-8')).hexdigest()})
        except Exception as error:
            failures.append(f'{competition}: {error}')
    # Atomic fail-closed publication: never replace prior good file with partial coverage.
    if failures:raise RuntimeError('Source coverage incomplete: '+ '; '.join(failures))
    if len(results)<90:raise RuntimeError('Seven-competition sample unexpectedly small')
    return {'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED',
        'publication_gate':'BLOCKED','source_verification':'SINGLE_SOURCE_UNVERIFIED',
        'generated_at_utc':now.isoformat().replace('+00:00','Z'),
        'coverage_season':'2026/27','source_name':'open-matchday',
        'source_home':'https://github.com/oladeeayo/open-matchday',
        'limitations':['Results not independently cross-checked',
           'Only 2026/27 same-competition results','Date-only UTC end-of-day conservative cutoff',
           'No bookmaker prices, calibrated probabilities or verified value'],
        'audit':audits,
        'results':sorted(results,key=lambda r:(r['competition'],r['kickoff_utc'],r['home'],r['away']))}

if __name__=='__main__':
    document=collect()
    temp=OUTPUT.with_suffix('.json.tmp')
    temp.write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    os.replace(temp,OUTPUT)
    print(f"Archive: {len(document['results'])} completed matches, {len(document['audit'])} competitions")
