"""Source-observed schedules and unvalidated, fixed-parameter Elo baselines.
No bookmaker prices, fitted edge claims, or official challenge credit.
"""
import calendar
import concurrent.futures
import hashlib
import json
import math
import re
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
import urllib.request
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime.now(timezone.utc)
BASE = 'https://site.api.espn.com/apis/site/v2/sports/'
RECEIPTS = []
CACHE = Path('/tmp/value-watch-sports-sources')
MAX_PART_AGE = timedelta(hours=36)

def current_time():
    return datetime.now(timezone.utc)


def stamp(d):
    return d.isoformat().replace('+00:00', 'Z')

def dt(s):
    value = datetime.fromisoformat(s.replace('Z', '+00:00'))
    if value.tzinfo is None:
        raise ValueError('Timezone is required')
    return value.astimezone(timezone.utc)

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def cache_ttl(path, now):
    """Live schedules expire quickly; completed past periods are economical to reuse."""
    query = parse_qs(urlsplit(path).query)
    dates = query.get('dates', [''])[0]
    if path.startswith('tennis/') and re.fullmatch(r'\d{8}-\d{8}', dates):
        if datetime.strptime(dates.split('-')[1], '%Y%m%d').date() < now.replace(day=1).date():
            return 7*86400
    if path.startswith('football/nfl/') and dates.isdigit() and len(dates) == 4:
        if int(dates) < now.year:
            return 7*86400
    return 900

def fetch(path):
    url = BASE + path
    key = hashlib.sha256(url.encode()).hexdigest()
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / (key + '.json')
    # Original source collection time remains in receipts when using an Actions cache.
    age = current_time().timestamp() - cached.stat().st_mtime if cached.exists() else None
    if age is not None and 0 <= age < cache_ttl(path, current_time()):
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
    if str(players[0]['id']) == str(players[1]['id']):
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
            if any(not math.isfinite(x) or x < 0 or not x.is_integer() for x in (a, b)):
                return None
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
    except (ValueError, KeyError, TypeError):
        return None

def tennis_schedule_paths(tour, now):
    """Seven UK calendar days, using the existing daily scoreboard endpoint."""
    if tour not in ('atp', 'wta') or now.tzinfo is None:
        raise ValueError('Supported tour and timezone-aware collection time required')
    today = now.astimezone(ZoneInfo('Europe/London')).date()
    return [(today + timedelta(days=offset),
             f'tennis/{tour}/scoreboard?dates={today + timedelta(days=offset):%Y%m%d}&limit=100')
            for offset in range(7)]


def tennis_source_counts(doc, tour, now):
    """Tournaments are not matches; classify each singles observation once.

    ESPN daily pages can contain an entire draw on other dates, including TBD
    slots. Report actual competition dates rather than assigning the query date.
    """
    slug = 'mens-singles' if tour == 'atp' else 'womens-singles'
    days = {}
    for event in doc.get('events', []):
        for group in event.get('groupings', []):
            if group.get('grouping', {}).get('slug') != slug:
                continue
            for c in group.get('competitions', []):
                try:
                    when = dt(c['date'])
                    day = when.astimezone(ZoneInfo('Europe/London')).date().isoformat()
                except (KeyError, ValueError, TypeError):
                    day = 'INVALID_DATE'
                bucket = days.setdefault(day, Counter())
                if day == 'INVALID_DATE': reason = 'invalid_date'
                elif not pair(c, 'athlete'): reason = 'participants_unconfirmed'
                elif c.get('timeValid') is not True: reason = 'time_unconfirmed'
                elif c.get('status', {}).get('type', {}).get('state') != 'pre': reason = 'not_pre_event'
                elif when <= now+timedelta(minutes=5): reason = 'started_or_too_soon'
                else: reason = 'eligible_before_window_and_identity_checks'
                bucket['raw_singles_slots'] += 1
                bucket[reason] += 1
    return {'tournaments': len(doc.get('events', [])), 'actual_date_counts': days}


def tennis_schedule(tour, now, ratings, counts, history, diagnostics=None):
    """Deduplicate daily observations; omit ambiguous reschedules entirely."""
    paths = tennis_schedule_paths(tour, now)
    docs = batch([path for _, path in paths])
    first_day, last_day = paths[0][0], paths[-1][0]
    rows, identities, conflicts = {}, {}, set()
    slug = 'mens-singles' if tour == 'atp' else 'womens-singles'
    for (requested_day, path), doc in zip(paths, docs):
        if not isinstance(doc, dict) or not isinstance(doc.get('events'), list):
            raise ValueError('Tennis daily schedule response missing its event list')
        if diagnostics is not None:
            diagnostics.append({'tour': tour.upper(), 'requested_date': requested_day.isoformat(),
                                'url': BASE+path, **tennis_source_counts(doc, tour, now)})
        for event in doc['events']:
            for group in event.get('groupings', []):
                if group.get('grouping', {}).get('slug') != slug:
                    continue
                for competition in group.get('competitions', []):
                    cid = competition.get('id')
                    if isinstance(cid, bool) or not isinstance(cid, (str, int)) or not str(cid).strip() or len(str(cid)) > 100:
                        continue
                    event_id = tour + '-' + str(cid)
                    players = pair(competition, 'athlete')
                    try:
                        when = dt(competition['date'])
                        signature = digest({
                            'date': stamp(when),
                            'participants': sorted((str(p['id']), p['athlete']['displayName']) for p in players) if players else None,
                            'competition': event.get('name'),
                            'state': competition.get('status', {}).get('type', {}).get('state'),
                            'time_valid': competition.get('timeValid') is True,
                        })
                    except (KeyError, ValueError, TypeError):
                        conflicts.add(event_id)
                        continue
                    if event_id in identities and identities[event_id] != signature:
                        conflicts.add(event_id)
                    identities[event_id] = signature
                    local_day = when.astimezone(ZoneInfo('Europe/London')).date()
                    if event_id in conflicts or event_id in rows or not first_day <= local_day <= last_day or not upcoming(competition, 'athlete') or not isinstance(event.get('name'), str) or not event['name'].strip():
                        continue
                    source = BASE + path
                    receipt = next((r for r in reversed(RECEIPTS) if r.get('url') == source), None)
                    row = {
                        'id': event_id, 'name': ' vs '.join(p['athlete']['displayName'] for p in players),
                        'competition': tour.upper() + ' · ' + event['name'], 'startUTC': stamp(when),
                        'participants': [{'id': str(p['id']), 'name': p['athlete']['displayName']} for p in players],
                        'source': source, 'forecast': forecast(players, ratings, counts, history, 'athlete'),
                        'unavailable_reason': 'Requires eight source-observed prior completed singles matches per player.',
                    }
                    if receipt:
                        row['source_collected_at_utc'] = receipt['collected_at_utc']
                        row['source_sha256'] = receipt['sha256']
                    rows[event_id] = row
    return ([row for event_id, row in rows.items() if event_id not in conflicts],
            [{'id': event_id, 'reason': 'CONFLICTING_DAILY_SCHEDULE_OBSERVATIONS'} for event_id in sorted(conflicts)])


def tennis_tournament_coverage(now):
    """Source-observed tournament names by UK day, even if no singles draw is published."""
    days = {}
    for tour in ('atp', 'wta'):
        for day, path in tennis_schedule_paths(tour, now):
            date = day.isoformat()
            bucket = days.setdefault(date, {'date': date, 'tournaments': [], 'draw_status': 'NO_CONFIRMED_MATCHES_IN_SOURCE'})
            try:
                doc = fetch(path)
                if not isinstance(doc, dict) or not isinstance(doc.get('events'), list):
                    raise ValueError('Missing source events')
                for event in doc['events']:
                    name = event.get('name')
                    if not isinstance(name, str) or not name.strip():
                        continue
                    item = {'tour': tour.upper(), 'name': name.strip(),
                            'source_url': BASE + path, 'verification': 'SOURCE_OBSERVED_TOURNAMENT_ONLY',
                            'matchup_status': 'DRAW_OR_MATCHUP_NOT_CONFIRMED'}
                    if item not in bucket['tournaments']:
                        bucket['tournaments'].append(item)
            except Exception as exc:
                bucket.setdefault('source_errors', []).append(tour.upper()+': '+type(exc).__name__)
    return [days[day] for day in sorted(days)]

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
    rows, conflicts, diagnostics = [], [], []
    for tour in histories:
        history = unique(histories[tour])
        if len(history) < 100:
            raise ValueError('Insufficient tennis training coverage: ' + tour)
        ratings, counts = fit(history)
        schedule, rejected = tennis_schedule(tour, NOW, ratings, counts, history, diagnostics)
        rows.extend(schedule)
        conflicts.extend(rejected)
    schedule_days = tennis_schedule_paths('atp', NOW)
    tournament_days = tennis_tournament_coverage(NOW)
    for day in tournament_days:
        day['confirmed_match_count'] = sum(dt(r['startUTC']).astimezone(ZoneInfo('Europe/London')).date().isoformat() == day['date'] for r in rows)
        if day['confirmed_match_count']:
            day['draw_status'] = 'SOURCE_OBSERVED_CONFIRMED_MATCHES'
    return {'generated_at_utc': stamp(NOW), 'events': sorted(rows, key=lambda e: e['startUTC']),
            'schedule_window_uk': [schedule_days[0][0].isoformat(), schedule_days[-1][0].isoformat()],
            'schedule_days_requested': 7, 'tournament_schedule_days': tournament_days, 'schedule_coverage': 'SOURCE_OBSERVED_NOT_COMPLETE_EXTERNAL_COVERAGE',
            'schedule_conflicts': conflicts,
            'schedule_source_diagnostics': diagnostics,
            'limitations': 'Seven UK calendar days requested from existing daily ATP/WTA scoreboards; future draws and confirmed participants may not yet be published. Conflicting repeated schedule observations are withheld. Fixed Elo baseline, separate ATP/WTA histories from January of the current year (history resets each January; early-year coverage can be insufficient). No surface, fitness, retirement or fatigue model. Scheduled times can move. Historical results are not a verified backtest.'}

def validate_nfl_coverage(rows, previous_year):
    previous = unique([r for r in rows if r.get('season') == previous_year])
    counts = defaultdict(int)
    for row in previous:
        counts[row['a']] += 1
        counts[row['b']] += 1
    # Current 32-team, 17-game regular-season format: 272 distinct prior games.
    if len(previous) != 272 or len(counts) != 32 or set(counts.values()) != {17}:
        raise ValueError('Previous NFL regular-season coverage incomplete; expected 272 games and 17 per team')
    return {'previous_season': previous_year, 'previous_season_completed_games': len(previous),
            'previous_season_teams': len(counts), 'verification': 'SOURCE_OBSERVED_NOT_INDEPENDENTLY_VERIFIED'}

def nfl_schedule(year, week, ratings, counts, history):
    """Explicit weekly slates; a default scoreboard stops at the current week.

    Keep both full slates (including UK Monday/Tuesday games), never assume a
    fixed number of games: bye weeks differ. Week 18 must not wrap to preseason.
    """
    paths = [(w, f'football/nfl/scoreboard?dates={year}&seasontype=2&week={w}&limit=100')
             for w in range(week, min(week+1, 18)+1)]
    docs = batch([path for _, path in paths])
    events, seen, diagnostics = [], set(), []
    for (w, path), doc in zip(paths, docs):
        if (doc.get('season', {}).get('year') != year or doc.get('season', {}).get('type') != 2
                or doc.get('week', {}).get('number') != w or not isinstance(doc.get('events'), list)):
            raise ValueError('NFL schedule season/week mismatch')
        accepted = 0
        for e in doc['events']:
            if e.get('season', {}).get('year') != year or e.get('season', {}).get('type') != 2:
                raise ValueError('NFL schedule event season mismatch')
            for c in e.get('competitions', []):
                ps = upcoming(c, 'team')
                if not ps:
                    continue
                cid = str(c['id'])
                if cid in seen:
                    raise ValueError('Duplicate NFL schedule competition')
                seen.add(cid)
                source = BASE + path
                receipt = next((r for r in reversed(RECEIPTS) if r.get('url') == source), None)
                row = {'id': 'nfl-'+cid, 'name': ' vs '.join(p['team']['displayName'] for p in ps),
                       'competition': f'NFL · Week {w}', 'startUTC': c['date'],
                       'participants': [{'id': str(p['id']), 'name': p['team']['displayName']} for p in ps],
                       'source': source, 'forecast': forecast(ps, ratings, counts, history, 'team'),
                       'unavailable_reason': 'Requires eight source-observed prior completed games per team.'}
                if receipt:
                    row.update(source_collected_at_utc=receipt['collected_at_utc'], source_sha256=receipt['sha256'])
                events.append(row)
                accepted += 1
        diagnostics.append({'week': w, 'url': BASE+path, 'raw_events': len(doc['events']),
                            'accepted_upcoming_games': accepted,
                            'teams_on_bye': [str(t['id']) for t in doc.get('week', {}).get('teamsOnBye', [])]})
    return sorted(events, key=lambda e: e['startUTC']), diagnostics

def nfl():
    current = fetch('football/nfl/scoreboard?limit=100')
    year, week = int(current['season']['year']), int(current['week']['number'])
    if current['season']['type'] != 2 or year != NOW.year:
        raise ValueError('NFL regular-season feed not available')
    paths = [(year-1,w) for w in range(1,19)]+[(year,w) for w in range(1,week)]
    docs = batch([f'football/nfl/scoreboard?dates={y}&seasontype=2&week={w}&limit=100' for y,w in paths])
    rows = []
    for (y,w), doc in zip(paths, docs):
        if int(doc.get('season',{}).get('year',0)) != y or int(doc.get('season',{}).get('type',0)) != 2 or int(doc.get('week',{}).get('number',0)) != w or not doc.get('events'):
            raise ValueError('NFL source season/week mismatch')
        for e in doc.get('events', []):
            if e.get('season', {}).get('year') != y or e.get('season', {}).get('type') != 2:
                raise ValueError('NFL event season identity mismatch')
            for c in e.get('competitions', []):
                r = final(c, 'team')
                if r:
                    rows.append({**r, 'season': y})
    history = unique(rows)
    coverage = validate_nfl_coverage(history, year-1)
    ratings, counts = fit(history)
    events, schedule_coverage = nfl_schedule(year, week, ratings, counts, history)
    return {'generated_at_utc':stamp(NOW),'events':sorted(events,key=lambda e:e['startUTC']), 'training_coverage':coverage,
            'schedule_week_coverage': schedule_coverage,
            'limitations':'Regular-season NFL only; postseason and off-season forecasts are not implemented. Fixed Elo baseline; no home advantage, quarterback, injury, weather or spread model. Three-way result including overtime; tie prior is smoothed historical frequency. No verified value selections.'}

def finalize_part(part, started, completed):
    """Use actual completion, never import time, as this snapshot's time boundary."""
    result = dict(part)
    result['collection_started_at_utc'] = stamp(started)
    result['generated_at_utc'] = stamp(completed)
    result['collection_status'] = 'COLLECTED'
    result['result_tracking_status'] = 'NOT_IMPLEMENTED'
    result['events'] = []
    for event in part.get('events', []):
        try:
            if dt(event['startUTC']) <= completed + timedelta(minutes=5):
                continue
        except (KeyError, ValueError, TypeError):
            continue
        row = dict(event)
        if row.get('forecast'):
            row['forecast'] = {**row['forecast'], 'generated_at_utc': stamp(completed)}
        result['events'].append(row)
    return result

def previous_part(document, sport, completed, error):
    """An isolated failure may retain a still-fresh observation, never renew its age."""
    try:
        if document.get('research_only') is not True or document.get('publication_gate') != 'BLOCKED' or document.get('model_validation') != 'UNVALIDATED':
            return None
        old = document['sports'][sport]
        age = completed - dt(old['generated_at_utc'])
        if not timedelta(0) <= age <= MAX_PART_AGE or not isinstance(old.get('events'), list):
            return None
        kept = dict(old)
        kept['events'] = [e for e in old['events'] if dt(e['startUTC']) > completed + timedelta(minutes=5)]
        kept['collection_status'] = 'RETAINED_AFTER_COLLECTION_ERROR'
        kept['last_collection_error'] = error
        kept['last_collection_attempt_at_utc'] = stamp(completed)
        kept['result_tracking_status'] = 'NOT_IMPLEMENTED'
        return kept
    except (KeyError, ValueError, TypeError):
        return None

def main():
    try:
        previous = json.loads((ROOT/'other-sports-data.json').read_text())
    except (OSError, ValueError):
        previous = {}
    sports, errors = {}, {}
    run_started = current_time()
    for sport, collect in [('tennis', tennis), ('nfl', nfl)]:
        started = current_time()
        try:
            sports[sport] = finalize_part(collect(), started, current_time())
        except Exception as exc:
            errors[sport] = type(exc).__name__+': '+str(exc)
            retained = previous_part(previous, sport, current_time(), errors[sport])
            if retained:
                sports[sport] = retained
            print('::warning title='+sport.upper()+' collection::'+errors[sport].replace('\n', ' '))
    if not sports:
        raise RuntimeError(str(errors))
    completed = current_time()
    # A second sport can take minutes. Recheck before writing the archive as well.
    for part in sports.values():
        part['events'] = [e for e in part['events'] if dt(e['startUTC']) > completed + timedelta(minutes=5)]
    receipts = list(RECEIPTS)
    if any(p['collection_status'] == 'RETAINED_AFTER_COLLECTION_ERROR' for p in sports.values()):
        receipts += previous.get('source_receipts', [])
    document = {'schema_version': 1, 'generated_at_utc': stamp(completed),
                'collection_started_at_utc': stamp(run_started), 'research_only': True,
                'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
                'official_challenge': '0/100', 'sports': sports, 'collection_errors': errors,
                'result_tracking_status': 'NOT_IMPLEMENTED',
                'source_receipts': sorted({digest(r): r for r in receipts}.values(), key=lambda r: r['url'])}
    # Keep each pre-event snapshot append-only. A digest alone is not an external timestamp attestation.
    sha = digest(document)
    archive = ROOT/'research/other-sports-archive'/completed.strftime('%Y-%m-%d')/(sha+'.json')
    archive.parent.mkdir(parents=True, exist_ok=True)
    archive.write_text(json.dumps(document, indent=2)+'\n')
    document['archive_sha256'] = sha
    (ROOT/'other-sports-data.json').write_text(json.dumps(document, indent=2)+'\n')
    print(json.dumps({'events': {k: len(v['events']) for k, v in sports.items()},
                      'forecasts': {k: sum(bool(e['forecast']) for e in v['events']) for k, v in sports.items()},
                      'errors': errors}))
    return document

if __name__ == '__main__':
    main()
