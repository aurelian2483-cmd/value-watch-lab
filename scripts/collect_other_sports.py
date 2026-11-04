"""Source-observed schedules and unvalidated, fixed-parameter Elo baselines.
No bookmaker prices, fitted edge claims, or official challenge credit.
"""
import calendar
import concurrent.futures
import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime.now(timezone.utc)
BASE = 'https://site.api.espn.com/apis/site/v2/sports/'
RECEIPTS = []
CACHE = Path('/tmp/value-watch-sports-sources')

def stamp(d):
    return d.isoformat().replace('+00:00', 'Z')

def dt(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def fetch(path):
    url = BASE + path
    key = hashlib.sha256(url.encode()).hexdigest()
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / (key + '.json')
    # Cache only within this run/day; source age remains explicit in receipts.
    if cached.exists() and NOW.timestamp() - cached.stat().st_mtime < 1800:
        raw = cached.read_bytes()
    else:
        req = urllib.request.Request(url, headers={'User-Agent': 'ValueWatchResearch/1.0'})
        with urllib.request.urlopen(req, timeout=40) as response:
            raw = response.read(12000001)
        if len(raw) > 12000000:
            raise ValueError('Source response exceeds size limit')
        json.loads(raw)
        cached.write_bytes(raw)
    RECEIPTS.append({'url': url, 'sha256': hashlib.sha256(raw).hexdigest(),
                     'collected_at_utc': stamp(datetime.fromtimestamp(cached.stat().st_mtime, timezone.utc))})
    return json.loads(raw)

def batch(paths):
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(fetch, paths))

def pair(c, kind):
    players = c.get('competitors', [])
    if len(players) != 2 or any(p.get('type') != kind or not p.get('id') for p in players):
        return None
    if players[0]['id'] == players[1]['id']:
        return None
    key = 'athlete' if kind == 'athlete' else 'team'
    if any(not p.get(key, {}).get('displayName') or p[key]['displayName'].upper() in ('TBD', 'TBA') for p in players):
        return None
    return players

def final(c, kind):
    ps = pair(c, kind)
    s = c.get('status', {}).get('type', {})
    if not ps or s.get('name') != 'STATUS_FINAL' or s.get('completed') is not True:
        return None
    try:
        when = dt(c['date'])
        if when >= NOW - timedelta(hours=6):
            return None
        if kind == 'athlete':
            notes = ' '.join(n.get('text','') for n in c.get('notes',[]))
            if re.search(r'\b(retired|retirement|walkover|walk-over|w/o|ret)\b', notes, re.I):
                return None
            if sum(p.get('winner') is True for p in ps) != 1:
                return None
            result = 1.0 if ps[0].get('winner') else 0.0
        else:
            a, b = [float(p['score']) for p in ps]
            result = 1.0 if a > b else 0.0 if a < b else .5
        return {'id': str(c['id']), 'date': stamp(when), 'a': str(ps[0]['id']), 'b': str(ps[1]['id']), 'result': result}
    except (KeyError, ValueError, TypeError):
        return None

def unique(rows):
    found = {}
    for r in rows:
        if r['id'] in found and found[r['id']] != r:
            raise ValueError('Conflicting result identity: ' + r['id'])
        found[r['id']] = r
    return sorted(found.values(), key=lambda r: (r['date'], r['id']))

def probability(a, b):
    return 1 / (1 + 10 ** ((b-a) / 400))

def fit(rows):
    ratings, counts = defaultdict(lambda: 1500.0), defaultdict(int)
    for r in rows:
        a, b = r['a'], r['b']
        delta = 24 * (r['result'] - probability(ratings[a], ratings[b]))
        ratings[a] += delta
        ratings[b] -= delta
        counts[a] += 1
        counts[b] += 1
    return ratings, counts

def forecast(ps, ratings, counts, history, kind):
    ids = [str(p['id']) for p in ps]
    if min(counts[i] for i in ids) < 8:
        return None
    p = probability(ratings[ids[0]], ratings[ids[1]])
    key = 'athlete' if kind == 'athlete' else 'team'
    tie = (sum(r['result'] == .5 for r in history)+1)/(len(history)+100) if kind == 'team' else 0
    outcomes = [{'id': i, 'name': x[key]['displayName'], 'probability': prob*(1-tie), 'prior_matches': counts[i]} for i, x, prob in zip(ids, ps, (p, 1-p))]
    if kind == 'team':
        outcomes.insert(1, {'id': 'tie', 'name': 'Tie after overtime', 'probability': tie})
    return {'model': 'FIXED_ELO_K24_V1', 'outcomes': outcomes, 'training_matches': len(history),
            'training_sha256': digest(history), 'training_latest_start_utc': max(r['date'] for r in history),
            'market': 'MATCH_WINNER' if kind == 'athlete' else 'GAME_RESULT_INCLUDING_OVERTIME',
            'calibrated': False, 'odds': None, 'expected_value': None}

def upcoming(c, kind):
    ps = pair(c, kind)
    try:
        return ps if ps and c.get('status', {}).get('type', {}).get('state') == 'pre' and c.get('timeValid') is True and dt(c['date']) > NOW+timedelta(minutes=5) else None
    except (ValueError, KeyError):
        return None

def tennis():
    histories = {'atp': [], 'wta': []}
    paths = []
    for tour in histories:
        for month in range(1, NOW.month+1):
            end = min(datetime(NOW.year, month, calendar.monthrange(NOW.year, month)[1], tzinfo=timezone.utc), NOW)
            paths.append((tour, f'tennis/{tour}/scoreboard?dates={NOW.year}{month:02d}01-{end:%Y%m%d}&limit=100'))
    docs = batch([p for _, p in paths])
    for (tour, _), doc in zip(paths, docs):
        for event in doc.get('events', []):
            for g in event.get('groupings', []):
                if g.get('grouping', {}).get('slug') != ('mens-singles' if tour == 'atp' else 'womens-singles'):
                    continue
                histories[tour].extend(r for c in g.get('competitions', []) if (r := final(c, 'athlete')))
    rows = []
    for tour in histories:
        history = unique(histories[tour])
        if len(history) < 100:
            raise ValueError('Insufficient tennis training coverage: ' + tour)
        ratings, counts = fit(history)
        doc = fetch(f'tennis/{tour}/scoreboard?dates={NOW:%Y%m%d}&limit=100')
        seen = set()
        for e in doc.get('events', []):
            for g in e.get('groupings', []):
                if g.get('grouping', {}).get('slug') != ('mens-singles' if tour == 'atp' else 'womens-singles'):
                    continue
                for c in g.get('competitions', []):
                    ps = upcoming(c, 'athlete')
                    if not ps or c['id'] in seen:
                        continue
                    seen.add(c['id'])
                    rows.append({'id': tour+'-'+str(c['id']), 'name': ' vs '.join(p['athlete']['displayName'] for p in ps),
                                 'competition': tour.upper()+' · '+e['name'], 'startUTC': c['date'],
                                 'source': BASE+f'tennis/{tour}/scoreboard?dates={NOW:%Y%m%d}&limit=100',
                                 'forecast': forecast(ps, ratings, counts, history, 'athlete'),
                                 'unavailable_reason': 'Requires eight source-observed prior completed singles matches per player.'})
    return {'generated_at_utc': stamp(NOW), 'events': sorted(rows, key=lambda e: e['startUTC']),
            'limitations': 'Fixed Elo baseline, separate ATP/WTA histories. No surface, fitness, retirement or fatigue model. Scheduled times can move. Historical results are not a verified backtest.'}

def nfl():
    current = fetch('football/nfl/scoreboard?limit=100')
    year, week = int(current['season']['year']), int(current['week']['number'])
    if current['season']['type'] != 2 or year != NOW.year:
        raise ValueError('NFL regular-season feed not available')
    paths = [(year-1,w) for w in range(1,19)]+[(year,w) for w in range(1,week)]
    docs = batch([f'football/nfl/scoreboard?dates={y}&seasontype=2&week={w}&limit=100' for y,w in paths])
    rows = []
    for (y,w), doc in zip(paths, docs):
        if int(doc.get('season',{}).get('year',0)) != y or int(doc.get('week',{}).get('number',0)) != w:
            raise ValueError('NFL source season/week mismatch')
        rows.extend(r for e in doc.get('events', []) if e.get('season',{}).get('type') == 2 for c in e.get('competitions', []) if (r := final(c,'team')))
    history = unique(rows)
    if len(history) < 272:
        raise ValueError('NFL history coverage incomplete')
    ratings, counts = fit(history)
    events = []
    for e in current.get('events', []):
        for c in e.get('competitions', []):
            ps = upcoming(c,'team')
            if not ps:
                continue
            events.append({'id':'nfl-'+str(c['id']), 'name':' vs '.join(p['team']['displayName'] for p in ps),
                           'competition':f'NFL · Week {week}', 'startUTC':c['date'],
                           'source':BASE+'football/nfl/scoreboard?limit=100',
                           'forecast':forecast(ps,ratings,counts,history,'team'),
                           'unavailable_reason':'Requires eight source-observed prior completed games per team.'})
    return {'generated_at_utc':stamp(NOW),'events':sorted(events,key=lambda e:e['startUTC']),
            'limitations':'Fixed Elo baseline; no home advantage, quarterback, injury, weather or spread model. Three-way result including overtime; tie prior is smoothed historical frequency. No verified value selections.'}

def main():
    sports, errors = {}, {}
    for sport, collect in [('tennis',tennis),('nfl',nfl)]:
        try:
            sports[sport] = collect()
        except Exception as exc:
            errors[sport] = type(exc).__name__+': '+str(exc)
    if not sports:
        raise RuntimeError(str(errors))
    document = {'schema_version':1,'generated_at_utc':stamp(NOW),'research_only':True,'model_validation':'UNVALIDATED',
                'publication_gate':'BLOCKED','official_challenge':'0/100','sports':sports,'collection_errors':errors,
                'source_receipts':sorted(RECEIPTS,key=lambda r:r['url'])}
    # Keep each pre-event snapshot append-only. A digest alone is not an external timestamp attestation.
    sha = digest(document)
    archive = ROOT/'research/other-sports-archive'/NOW.strftime('%Y-%m-%d')/(sha+'.json')
    archive.parent.mkdir(parents=True,exist_ok=True)
    archive.write_text(json.dumps(document,indent=2)+'\n')
    document['archive_sha256'] = sha
    (ROOT/'other-sports-data.json').write_text(json.dumps(document,indent=2)+'\n')
    print(json.dumps({'events':{k:len(v['events']) for k,v in sports.items()},'forecasts':{k:sum(bool(e['forecast']) for e in v['events']) for k,v in sports.items()},'errors':errors}))

if __name__ == '__main__':
    main()
