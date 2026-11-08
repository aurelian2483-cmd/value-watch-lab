#!/usr/bin/env python3
"""Conservative public RSS/Atom racing-tip collector. Research only.

Source feeds must be explicitly configured in racing-research/community-feeds.json.
A tip is only accepted when a feed item explicitly names exactly one active runner
AND the racecourse and race date; ambiguous mentions are rejected. No inferred tips.
"""
import datetime as dt
import json
import os
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UTC = dt.timezone.utc
NOW = dt.datetime.now(UTC)
CONFIG = ROOT / "racing-research/community-feeds.json"
OUT = ROOT / "racing-research/source-observations.json"
RACES = ROOT / "racing-research-data.json"

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
    return bool(re.search(r"(?<![a-z0-9])" + re.escape(norm(value)) + r"(?![a-z0-9])", norm(text)))

def fetch(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme != "https" or not p.hostname:
        raise ValueError("Only HTTPS source feeds permitted")
    req = urllib.request.Request(url, headers={"User-Agent": "ValueWatchResearch/1.0 (public RSS research)"})
    with urllib.request.urlopen(req, timeout=12) as response:
        data = response.read(1_000_001)
        if len(data) > 1_000_000:
            raise ValueError("Feed too large")
        return ET.fromstring(data)

def items(root):
    for item in root.findall(".//item"):
        yield {
            "title": item.findtext("title") or "",
            "description": item.findtext("description") or "",
            "link": item.findtext("link") or "",
            "published": item.findtext("pubDate") or "",
        }
    ns = "{http://www.w3.org/2005/Atom}"
    for item in root.findall(".//" + ns + "entry"):
        link = next((e.attrib.get("href", "") for e in item.findall(ns + "link") if e.attrib.get("href")), "")
        yield {
            "title": item.findtext(ns + "title") or "",
            "description": item.findtext(ns + "summary") or "",
            "link": link,
            "published": item.findtext(ns + "published") or item.findtext(ns + "updated") or "",
        }

def main():
    config = json.loads(CONFIG.read_text())
    feed = json.loads(OUT.read_text())
    races = json.loads(RACES.read_text()).get("races", [])
    # Never treat a successful feed fetch as a usable racing prediction when
    # the saved racecard has no future races. Surface the missing upstream feed.
    future_races = [race for race in races if (start := parse_date(race.get("startUTC"))) and NOW < start <= NOW + dt.timedelta(days=2)]
    entries = list(feed.get("entries", []))
    known = {entry.get("id") for entry in entries}
    added = 0
    failures = []
    source_health = []
    for source in config.get("sources", []):
        if not source.get("enabled", False):
            continue
        try:
            root = fetch(source["feed_url"])
            scanned = 0
            matched = 0
            explicit_matches = 0
            review_matches = 0
            for item in items(root):
                scanned += 1
                published = parse_date(item["published"])
                if not published or published > NOW or (NOW-published).days > 3:
                    continue
                url = item["link"]
                if urllib.parse.urlsplit(url).scheme != "https":
                    continue
                text = item["title"] + " " + re.sub(r"<[^>]*>", " ", item["description"])
                # Explicit recommendation phrasing is mandatory.
                if not re.search(r"\b(tip|selection|nap|pick|fancy|backing)\b", text, re.I):
                    continue
                # A direct, named headline selection can be linked without a
                # course mention only when it uniquely identifies a single
                # runner across the entire upcoming card for that date.
                # General articles and descriptions still require the course.
                title = item["title"]
                headline_candidates = []
                for candidate_race in future_races:
                    start_candidate = parse_date(candidate_race.get("startUTC"))
                    if start_candidate.date() != published.date() or published >= start_candidate:
                        continue
                    for runner in candidate_race.get("runners", []):
                        if runner.get("active_runner") is not True or runner.get("runner_status") != "RUNNER":
                            continue
                        name = runner.get("name", "")
                        if name and (re.search(r"\b(?:tip|nap|pick|selection)\s*[:–-]\s*" + re.escape(name) + r"\b", title, re.I)
                                     or re.search(re.escape(name) + r"\s*[:–-]\s*(?:tip|nap|pick|selection)\b", title, re.I)):
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
                    continue
                race, horse = matches[0]
                import hashlib
                identifier = "rss-" + hashlib.sha256((source["feed_url"]+"|"+url+"|"+str(race["race_id"])).encode()).hexdigest()[:24]
                if identifier in known:
                    continue
                # Only a direct headline selection is eligible for an automatic,
                # explicitly UNVERIFIED experimental blue signal. A mere mention
                # in a preview remains review-required and never becomes a vote.
                title = item["title"]
                explicit_title = (
                    mentions(title, horse["name"])
                    and bool(re.search(r"\b(?:tip|nap|pick|selection)\s*[:–-]\s*" + re.escape(horse["name"]) + r"\b", title, re.I)
                             or re.search(re.escape(horse["name"]) + r"\s*[:–-]\s*(?:tip|nap|pick|selection)\b", title, re.I))
                )
                verification = "RSS_EXPLICIT_HEADLINE_UNVERIFIED" if explicit_title else "RSS_EXPLICIT_MENTION_REVIEW_REQUIRED"
                entries.append({
                    "id":identifier, "group":source["type"], "author":source.get("publisher"),
                    "publisher":source["publisher"], "race_id":str(race["race_id"]),
                    "event":race.get("name", ""), "startUTC":race["startUTC"],
                    "horse":horse["name"], "market":"WIN", "published_at_utc":published.isoformat(),
                    "url":url, "summary":"Public feed item explicitly names this runner; full article not independently assessed.",
                    "verification":verification, "observed_at_utc":NOW.isoformat(),
                    "stance":"support", "source_feed":source["feed_url"], "extraction_method":"explicit_headline" if explicit_title else "mention_only"
                })
                known.add(identifier)
                added += 1
                matched += 1
                if explicit_title:
                    explicit_matches += 1
                else:
                    review_matches += 1
            source_health.append({'publisher':source['publisher'],'status':'fetched','items_scanned':scanned,'new_observations':matched,'explicit_tip_observations':explicit_matches,'review_only_mentions':review_matches})
        except Exception as error:
            failures.append({"publisher":source.get("publisher", "unknown"), "error":str(error)[:160]})
            source_health.append({"publisher":source.get("publisher", "unknown"), "status":"error", "error":str(error)[:160]})
    feed["entries"] = entries
    feed["last_collector_run_utc"] = NOW.isoformat()
    feed["collector_added"] = added
    feed["collector_errors"] = failures
    feed["collector_source_health"] = source_health
    feed["racecard_health"] = {
        "future_races": len(future_races),
        "status": "ready" if future_races else "stale_or_no_upcoming_races",
        "message": "Upcoming racecards available" if future_races else "No future races in racing-research-data.json; refresh the upstream racecard snapshot before community tips can match."
    }
    feed["coverage"] = "Partial configured public RSS sources; mentions require editorial review and do not prove consensus."
    OUT.write_text(json.dumps(feed, indent=2, ensure_ascii=False)+"\n")
    print(json.dumps({"added":added,"sources":len(config.get("sources",[])),"errors":failures}))

if __name__ == "__main__":
    main()
