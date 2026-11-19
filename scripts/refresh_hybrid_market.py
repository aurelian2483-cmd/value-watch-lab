#!/usr/bin/env python3
"""Refresh reviewed football 1X2 market pairs using public research snapshots."""
import argparse
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
import math
from pathlib import Path
import re
import tempfile
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_AGE = timedelta(minutes=30)
BUFFER = timedelta(minutes=5)
KINDS = ('home', 'draw', 'away')
ROOT = Path(__file__).resolve().parents[1]


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = build_opener(NoRedirect)


def instant(value):
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        raise ValueError('Timezone missing from market timestamp')
    return parsed.astimezone(timezone.utc)


def fetch(url, host):
    address = urlsplit(url)
    if address.scheme != 'https' or address.netloc != host or address.query or address.fragment:
        raise ValueError('Unexpected market source URL')
    request = Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'ValueWatchResearch/1.0'})
    try:
        with OPENER.open(request, timeout=15) as response:
            if response.geturl() != url:
                raise ValueError('Unexpected market source redirect')
            raw = response.read(3_000_001)
            date = parsedate_to_datetime(response.headers['Date'])
            cache_age = int(response.headers.get('Age', '0'))
    except HTTPError as error:
        raise ValueError(f'{host} returned HTTP {error.code}') from None
    now = datetime.now(timezone.utc)
    if not raw or len(raw) > 3_000_000 or abs(now-date) > timedelta(minutes=2) or not 0 <= cache_age <= 30:
        raise ValueError('Missing, stale or oversized market response')
    return raw.decode(), {
        'source': url, 'source_sha256': hashlib.sha256(raw).hexdigest(),
        'captured_at_utc': now.isoformat(), 'http_date_utc': date.isoformat(),
    }


def goldedge_prices(html, url, event_id, teams, start):
    details = []
    for chunk in re.findall(r'self\.__next_f\.push\((\[.*?\])\)</script>', html):
        frame = json.loads(chunk)
        if len(frame) != 2 or not isinstance(frame[1], str):
            continue
        for line in frame[1].splitlines():
            if '"refBook"' not in line:
                continue
            obj = json.loads(line.split(':', 1)[1])
            if isinstance(obj, list) and len(obj) == 4 and isinstance(obj[-1], dict):
                detail = obj[-1].get('detail')
                if isinstance(detail, dict):
                    details.append(detail)
    if len(details) != 1:
        raise ValueError('Missing or ambiguous GoldEdge fixture')
    detail = details[0]
    fixture = detail['event']
    if (detail['sport']['slug'] != 'football' or
        fixture['shortId'] != event_id or fixture['path'] != urlsplit(url).path or
        (fixture['home'], fixture['away']) != teams or fixture['startUnix'] != int(start.timestamp()) or
        fixture['status'] != 'scheduled' or fixture['twoWay'] is not False):
        raise ValueError('GoldEdge fixture does not match the reviewed identity')
    if sum(m.get('market') == '1x2' for m in detail['markets']) != 1:
        raise ValueError('Missing or ambiguous GoldEdge 1X2 market')
    odds = fixture['odds']
    ref = odds['ref']
    if odds['refBook'] != 'Pinnacle' or type(ref['atUnix']) is not int:
        raise ValueError('GoldEdge Pinnacle benchmark lacks a source quote timestamp')
    return {key: ref[initial] for key, initial in zip(KINDS, ('h', 'd', 'a'))}, datetime.fromtimestamp(ref['atUnix'], timezone.utc)


def walk(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from walk(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk(item)


def sky_prices(html, event_id, market_id, teams, start):
    doc = json.JSONDecoder().raw_decode(html.split('window.__TBD_PRELOADED_CATALOG__ = ', 1)[1])[0]['data']
    home, away = teams
    names = (home, 'Draw', away)
    matches = [event for event in doc['FootballFixture'] if event.get('urn') == 'ppb:fixture:' + event_id]
    if len(matches) != 1:
        raise ValueError('Missing or ambiguous Sky Bet fixture')
    fixture = matches[0]
    if ((fixture['runnerNames']['home'], fixture['runnerNames']['away']) != teams or
        instant(fixture['scheduledAt']) != start or fixture['duration']['status'] != 'PRE_MATCH'):
        raise ValueError('Sky Bet fixture does not match the reviewed identity')
    markets = [market for market in walk(doc) if market.get('urn') == market_id and
               market.get('marketType') == 'MATCH_ODDS' and market.get('name') == 'Full Time Result' and
               'liveData' in market]
    if len(markets) != 1:
        raise ValueError('Missing or ambiguous Sky Bet 1X2 market')
    market = markets[0]
    live = market['liveData']
    if live['sportsbookMarketStatus'] != 'OPEN' or live['inplay'] is not False:
        raise ValueError('Sky Bet market is not an open pre-match market')
    ids = {runner['name']: runner['selectionId'] for runner in market['runners']}
    prices = {runner['selectionId']: runner['odds']['decimal'] for runner in live['runners']
              if runner['runnerStatus'] == 'ACTIVE' and runner['handicap'] == 0}
    if set(ids) != set(names) or len(prices) != 3 or set(prices) != set(ids.values()):
        raise ValueError('Sky Bet selections do not match the reviewed 1X2 market')
    return {key: prices[ids[name]] for key, name in zip(KINDS, names)}


def refresh(record, now, fetch_page=fetch):
    benchmark = record['benchmark']
    sky = record['sky_bet']
    if benchmark.get('source_id') != 'PINNACLE_VIA_GOLDEDGE':
        return None
    start = instant(record['start_utc'])
    if record.get('market') != 'FOOTBALL_90_MINUTE_1X2' or start <= now+BUFFER:
        return None
    teams = tuple(benchmark['source_team_names'])
    html, receipt = fetch_page(benchmark['source'], 'www.goldedge.net')
    prices, observed = goldedge_prices(html, benchmark['source'], benchmark['source_event_id'], teams, start)
    captured = instant(receipt['captured_at_utc'])
    if observed <= instant(benchmark['observed_at_utc']):
        return None
    if not captured-MAX_AGE <= observed <= captured < start-BUFFER:
        raise ValueError('Pinnacle quote is outside the pre-kickoff freshness window')
    html, sky_receipt = fetch_page(sky['source'], 'skybet.com')
    sky_quote = sky_prices(html, sky['source_event_id'], sky['source_market_id'], teams, start)
    end = instant(sky_receipt['captured_at_utc'])
    if not end-MAX_AGE <= observed <= captured <= end < start-BUFFER:
        raise ValueError('Market pair exceeds the pre-kickoff freshness window')
    if any(type(q) not in (int, float) or not math.isfinite(q) or q <= 1 for q in (*prices.values(), *sky_quote.values())):
        raise ValueError('Invalid decimal price')
    return {**record, 'snapshot_at_utc': end.isoformat(),
            'benchmark': {**benchmark, **receipt, 'observed_at_utc': observed.isoformat(), 'prices': prices,
                          'timestamp_basis': 'GOLDEDGE_PINNACLE_1X2_OBSERVATION_TIME', 'verified': True},
            'sky_bet': {**sky, **sky_receipt, 'observed_at_utc': end.isoformat(), 'prices': sky_quote,
                        'timestamp_basis': 'DIRECT_SKY_BET_HTTP_OBSERVATION_TIME',
                        'verified': True, 'executable_verified': False}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--feed', type=Path, default=ROOT/'paper-lab/hybrid-market-data.json')
    args = parser.parse_args()
    doc = json.loads(args.feed.read_text())
    if doc.get('schema_version') != 1 or not isinstance(doc.get('records'), list):
        raise ValueError('Unsafe market evidence envelope')
    updated = 0
    failures = 0
    for idx, record in enumerate(doc['records']):
        try:
            candidate = refresh(record, datetime.now(timezone.utc))
        except (KeyError, ValueError, TypeError, OSError, IndexError) as error:
            detail = str(error) if type(error) is ValueError and not isinstance(error, json.JSONDecodeError) else type(error).__name__
            print('Market refresh skipped for a reviewed fixture:', detail)
            failures += 1
            continue
        if candidate is not None:
            doc['records'][idx] = candidate
            updated += 1
    if updated:
        with tempfile.NamedTemporaryFile(dir=args.feed.parent, mode='w', encoding='utf-8', delete=False) as out:
            json.dump(doc, out, indent=2)
            out.write('\n')
        Path(out.name).replace(args.feed)
    print('Fresh football research market pairs:', updated)
    if failures and not updated:
        raise SystemExit('All attempted market refreshes failed. The last valid snapshot is retained.')


if __name__ == '__main__':
    main()
