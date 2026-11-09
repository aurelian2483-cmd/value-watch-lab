#!/usr/bin/env python3
"""Conservative public RSS/Atom racing-tip collector. Research only.

Source feeds must be explicitly configured in racing-research/community-feeds.json.
A tip is only accepted when a feed item explicitly names exactly one active runner
AND the racecourse and race date; ambiguous mentions are rejected. No inferred tips.
"""
import datetime as dt
import hashlib
import json
import os
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path
from primary_racing_posts import capture,capture_native_feed

ROOT = Path(__file__).resolve().parents[1]
UTC = dt.timezone.utc
NOW = dt.datetime.now(UTC)

def current_time():
    return dt.datetime.now(UTC)
CONFIG = ROOT / "racing-research/community-feeds.json"
OUT = ROOT / "racing-research/source-observations.json"
RACES = ROOT / "racing-research-data.json"
FEED_RECEIPTS={}

def load_races(path):
    """Match community observations against current and future source racecards."""
    races=list(json.loads(path.read_text(encoding='utf-8')).get('races',[]))
    future=path.parent/'racing-future-data.json'
    if future.exists():
        document=json.loads(future.read_text(encoding='utf-8'))
        if document.get('research_only') is True and document.get('publication_gate')=='BLOCKED' and document.get('model_validation')=='UNVALIDATED':
            races+=document.get('races',[])
    grouped={}
    for race in races:grouped.setdefault(str(race['race_id']),[]).append(race)
    result=[]
    for observations in grouped.values():
        if len({r.get('startUTC') for r in observations})!=1:continue
        result.append(max(observations,key=lambda r:r.get('runner_observed_at_utc',r.get('observedAtUTC',''))))
    return result

def parse_date(value):
    if not value:
        return None
    try:
        d = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            d = parsedate_to_datetime(value)
        except (TypeError, ValueError, IndexError):
            return None
    return d.astimezone(UTC) if d.tzinfo else None

def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value).casefold()).strip()

def mentions(text, value):
    value=re.sub(r'\s*\((?:GB|IRE|FR|USA|GER|AUS|NZ)\)\s*$','',value,flags=re.I)
    return bool(re.search(r"(?<![a-z0-9])" + re.escape(norm(value)) + r"(?![a-z0-9])", norm(text)))

def fetch(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme != "https" or not p.hostname:
        raise ValueError("Only HTTPS source feeds permitted")
    req = urllib.request.Request(url, headers={"User-Agent": "ValueWatchResearch/1.0 (public RSS research)"})
    with urllib.request.urlopen(req, timeout=12) as response:
        final_url=response.geturl()
        data = response.read(1_000_001)
        if len(data) > 1_000_000:
            raise ValueError("Feed too large")
        root=ET.fromstring(data)
        FEED_RECEIPTS[id(root)]={'url':final_url,'sha256':hashlib.sha256(data).hexdigest(),'observed_at_utc':dt.datetime.now(UTC).isoformat()}
        return root

def items(root):
    for item in root.findall(".//item"):
        content=item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded') or ''
        yield {
            "title": item.findtext("title") or "",
            "description": content or item.findtext("description") or "",
            "link": item.findtext("link") or "",
            "published": item.findtext("pubDate") or "",
            'author':item.findtext('{http://purl.org/dc/elements/1.1/}creator') or item.findtext('author') or '',
            'id':item.findtext('guid') or '', 'full_content':bool(content),'feed_receipt':FEED_RECEIPTS.get(id(root)),
        }
    ns = "{http://www.w3.org/2005/Atom}"
    for item in root.findall(".//" + ns + "entry"):
        link = next((e.attrib.get("href", "") for e in item.findall(ns + "link") if e.attrib.get("href") and e.attrib.get('rel','alternate')=='alternate'), "")
        content=item.findtext(ns+'content') or ''
        yield {
            "title": item.findtext(ns + "title") or "",
            "description": content or item.findtext(ns + "summary") or "",
            "link": link,
            "published": item.findtext(ns + "published") or item.findtext(ns + "updated") or "",
            'author':item.findtext(ns+'author/'+ns+'name') or '', 'id':item.findtext(ns+'id') or '',
            'full_content':bool(content),'feed_receipt':FEED_RECEIPTS.get(id(root)),
        }

def explicit_headline_pick(title, horse_name):
    """Only a directly labelled selection counts as an experimental tip."""
    if not horse_name or not mentions(title, horse_name):
        return False
    horse_name=re.sub(r'\s*\((?:GB|IRE|FR|USA|GER|AUS|NZ)\)\s*$','',horse_name,flags=re.I)
    name = re.escape(horse_name)
    return bool(
        re.search(r"\b(?:tips?|naps?|picks?|selections?)\s*[:–-]\s*" + name + r"\b", title, re.I)
        or re.search(name + r"\s*[:–-]\s*(?:tips?|naps?|picks?|selections?)\b", title, re.I)
    )

def main():
    config = json.loads(CONFIG.read_text(encoding='utf-8'))
    feed = json.loads(OUT.read_text(encoding='utf-8'))
    races = load_races(RACES)
    # Never treat a successful feed fetch as a usable racing prediction when
    # the saved racecard has no future races. Surface the missing upstream feed.
    future_races = [race for race in races if (start := parse_date(race.get("startUTC"))) and NOW < start <= NOW + dt.timedelta(days=2)]
    entries = list(feed.get("entries", []))
    known = {entry.get("id") for entry in entries}
    added = 0
    failures = []
    source_health = []
    primary_checks=[]
    thread_checks=[]
    for source in config.get("sources", []):
        if not source.get("enabled", False):
            continue
        try:
            root = fetch(source["feed_url"])
            observed_items=list(items(root))
            # Native listings contain thread openers; actual selections can be
            # in replies. Follow at most two observed public tips-thread links.
            source_url=urllib.parse.urlsplit(source['feed_url'])
            if source['type']=='forum' and source_url.hostname in ('www.reddit.com','reddit.com'):
                threads=[]
                for item in observed_items:
                    link=urllib.parse.urlsplit(item['link']);published=parse_date(item['published'])
                    if (len(threads)<2 and re.search(r'\btips?\b.*\bthread\b',item['title'],re.I) and published and dt.timedelta(0)<=NOW-published<=dt.timedelta(days=2)
                        and link.scheme=='https' and link.hostname==source_url.hostname and re.fullmatch(r'/r/HorseRacingUK/comments/[a-z0-9]+/[^/]+/',link.path)):
                        url=item['link'].split('?')[0].rstrip('/')+'/.rss'
                        if url not in threads:threads.append(url)
                for url in threads:
                    try:
                        replies=list(items(fetch(url)));observed_items+=replies
                        thread_checks.append({'url':url,'status':'FETCHED','items':len(replies)})
                    except Exception as exc:
                        thread_checks.append({'url':url,'status':'SOURCE_UNAVAILABLE','error':str(exc)[:160]})
                        failures.append({'publisher':source['publisher']+' replies','url':url,'error':str(exc)[:160]})
            scanned = 0
            matched = 0
            explicit_matches = 0
            review_matches = 0
            reasons = {'invalid_date':0,'invalid_link':0,'no_tip_language':0,'no_runner_match':0,'already_recorded':0,'after_start':0}
            for item in observed_items:
                scanned += 1
                published = parse_date(item["published"])
                if not published or published > NOW or (NOW-published).days > 3:
                    reasons["invalid_date"] += 1
                    continue
                url = item["link"]
                if urllib.parse.urlsplit(url).scheme != "https":
                    reasons["invalid_link"] += 1
                    continue
                text = item["title"] + " " + re.sub(r"<[^>]*>", " ", item["description"])
                # Explicit recommendation phrasing is mandatory.
                if not re.search(r"\b(tips?|selections?|naps?|picks?|fancy|back|backing|bets?)\b", text, re.I):
                    reasons["no_tip_language"] += 1
                    continue
                # A direct, named headline selection can be linked without a
                # course mention only when it uniquely identifies a single
                # runner across the entire upcoming card for that date.
                # General articles and descriptions still require the course.
                title = item["title"]
                headline_candidates = []
                for candidate_race in future_races:
                    start_candidate = parse_date(candidate_race.get("startUTC"))
                    # Ante-post or next-day tips can be published the day before.
                    # Require a unique runner on the upcoming 48-hour card;
                    # the observed timestamp must still precede race start.
                    if published >= start_candidate:
                        continue
                    for runner in candidate_race.get("runners", []):
                        if runner.get("active_runner") is not True or runner.get("runner_status") != "RUNNER":
                            continue
                        name = runner.get("name", "")
                        if explicit_headline_pick(title, name):
                            headline_candidates.append((candidate_race, runner))
                matches = []
                for race in races:
                    start = parse_date(race.get("startUTC"))
                    if not start or published >= start or start-NOW > dt.timedelta(days=2) or start < NOW:
                        continue
                    course = race.get("racecourse", "")
                    # Daily articles often omit the calendar date. Require the course
                    # plus either explicit race time or a unique runner across the
                    # day's entire card; never use name-only matching.
                    if not course or not mentions(text, course):
                        continue
                    runners = [h for h in race.get("runners", []) if h.get("active_runner") is True and h.get("runner_status") == "RUNNER" and mentions(text, h.get("name", ""))]
                    if len(runners) == 1:
                        matches.append((race, runners[0]))
                # If a headline explicitly names one candidate, prioritise
                # that recommendation over unrelated runners mentioned in the
                # article body. Reject conflicting or ambiguous headline picks.
                if len(headline_candidates) == 1:
                    matches = headline_candidates
                elif len(headline_candidates) > 1 or len(matches) != 1:
                    reasons["no_runner_match"] += 1
                    continue
                race, horse = matches[0]
                # Publication and first observation must both precede the
                # selected race, even when a headline names a different-day
                # runner or the upstream racecard is stale.
                race_start = parse_date(race.get("startUTC"))
                if not race_start or not (published <= NOW < race_start):
                    reasons["after_start"] += 1
                    continue
                import hashlib
                identifier = "rss-" + hashlib.sha256((source["feed_url"]+"|"+url+"|"+str(race["race_id"])).encode()).hexdigest()[:24]
                if identifier in known:
                    reasons["already_recorded"] += 1
                    continue
                # RSS candidates remain unverified until an attributable primary
                # post is checked below. Headlines alone never award blue.
                title = item["title"]
                explicit_title = explicit_headline_pick(title, horse["name"])
                verification = "RSS_EXPLICIT_HEADLINE_UNVERIFIED" if explicit_title else "RSS_EXPLICIT_MENTION_REVIEW_REQUIRED"
                record={
                    "id":identifier, "group":source["type"], "author":item.get('author') or source.get("publisher"),
                    "publisher":source["publisher"], "race_id":str(race["race_id"]),
                    "event":race.get("name", ""), "startUTC":race["startUTC"],
                    "horse":horse["name"], "market":"WIN", "published_at_utc":published.isoformat(),
                    "url":url, "summary":"Public feed item explicitly names this runner; full article not independently assessed.",
                    "verification":verification, "observed_at_utc":NOW.isoformat(),
                    "stance":"support", "source_feed":(item.get("feed_receipt") or {}).get("url",source["feed_url"]), "extraction_method":"explicit_headline" if explicit_title else "mention_only"
                }
                if source['type'] in ('forum','social_forum') and item.get('feed_receipt'):
                    try:
                        proof=capture_native_feed(item,race,record,current_time())
                        record.update(primary_capture=proof,verification='PRIMARY_POST_CAPTURED',author=proof['author'],published_at_utc=proof['published_at_utc'])
                        primary_checks.append({'url':url,'status':'PRIMARY_POST_CAPTURED','method':proof['method']})
                    except ValueError:
                        pass # A summary/RSS claim still requires a primary-page check.
                entries.append(record)
                known.add(identifier)
                added += 1
                matched += 1
                if explicit_title:
                    explicit_matches += 1
                else:
                    review_matches += 1
            source_health.append({'publisher':source['publisher'],'source_type':source['type'],'status':'fetched','items_scanned':scanned,'new_observations':matched,'explicit_tip_observations':explicit_matches,'review_only_mentions':review_matches,'skip_reasons':reasons})
        except Exception as error:
            failures.append({"publisher":source.get("publisher", "unknown"), "error":str(error)[:160]})
            source_health.append({"publisher":source.get("publisher", "unknown"), "source_type":source.get('type'), "status":"error", "error":str(error)[:160]})
    # Recheck bounded upcoming forum candidates, including earlier RSS captures.
    upcoming={str(r['race_id']):r for r in future_races}
    candidates=[e for e in entries if e.get('group') in ('forum','social_forum') and e.get('verification')!='PRIMARY_POST_CAPTURED' and str(e.get('race_id')) in upcoming]
    for record in candidates[-12:]:
        race=upcoming[str(record['race_id'])]
        if record.get('startUTC')!=race['startUTC']:continue
        try:
            proof=capture(record,race,current_time())
            record.update(primary_capture=proof,verification='PRIMARY_POST_CAPTURED',author=proof['author'],published_at_utc=proof['published_at_utc'])
            primary_checks.append({'url':record['url'],'status':'PRIMARY_POST_CAPTURED'})
        except Exception as exc:
            primary_checks.append({'url':record['url'],'status':'PRIMARY_POST_UNVERIFIED','reason':str(exc)[:160]})
    active_posts=[e for e in entries if e.get('verification')=='PRIMARY_POST_CAPTURED' and str(e.get('race_id')) in upcoming and e.get('startUTC')==upcoming[str(e['race_id'])]['startUTC']]
    feed['community_pipeline']={'upcoming_races':len(future_races),
        'forum_items_scanned':sum(h.get('items_scanned',0) for h in source_health if h.get('source_type') in ('forum','social_forum')),
        'upcoming_forum_candidates':sum(e.get('group') in ('forum','social_forum') and str(e.get('race_id')) in upcoming for e in entries),
        'checked_primary_posts':len(active_posts),'distinct_checked_authors':len({e['author'].casefold() for e in active_posts}),
        'limitation':'Blue requires a checked primary post; yellow additionally needs distinct same-thread value backers and an observed bookmaker favourite.'}
    feed["entries"] = entries
    feed["last_collector_run_utc"] = NOW.isoformat()
    feed["collector_added"] = added
    feed["collector_errors"] = failures
    feed["collector_source_health"] = source_health
    feed['primary_post_checks']=primary_checks
    feed['thread_source_checks']=thread_checks
    feed["racecard_health"] = {
        "future_races": len(future_races),
        "status": "ready" if future_races else "stale_or_no_upcoming_races",
        "message": "Current and future source racecards checked" if future_races else "No upcoming source racecards; refresh the racing snapshots before community tips can match."
    }
    feed["coverage"] = "Partial configured public RSS sources; mentions require editorial review and do not prove consensus."
    OUT.write_text(json.dumps(feed, indent=2, ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"added":added,"sources":len(config.get("sources",[])),"errors":failures,"community_pipeline":feed["community_pipeline"],"thread_sources":thread_checks,"future_races":len(future_races),"explicit_tips":sum(x.get("explicit_tip_observations",0) for x in source_health),"skips":{key:sum(x.get("skip_reasons",{}).get(key,0) for x in source_health) for key in ("invalid_date","invalid_link","no_tip_language","no_runner_match","already_recorded","after_start")}}))

if __name__ == "__main__":
    main()
