#!/usr/bin/env python3
"""Evidence-first three-layer racing audit. Research only; never creates tips."""
from datetime import datetime, timezone
from urllib.parse import urlsplit
import json

def valid_source(post, race_start):
    """Require independently attributable, observed-before-start selection."""
    try:
        published = datetime.fromisoformat(post["published_at_utc"].replace("Z", "+00:00"))
        observed = datetime.fromisoformat(post["observed_at_utc"].replace("Z", "+00:00"))
        start = datetime.fromisoformat(race_start.replace("Z", "+00:00"))
        url = urlsplit(post["url"])
        return (published.tzinfo is not None and observed.tzinfo is not None
                and start.tzinfo is not None and published <= observed < start
                and url.scheme == "https" and bool(url.hostname)
                and bool(post.get("author") or post.get("publisher"))
                and post.get("stance") == "support"
                and post.get("verification") in {
                    "PUBLIC_SELECTION_OBSERVED",
                    "POST_OBSERVED_OPINION_UNVERIFIED",
                    "PUBLICATION_OBSERVED_OPINION_UNVERIFIED",
                    "RSS_EXPLICIT_HEADLINE_UNVERIFIED",
                })
    except (ValueError, TypeError, KeyError):
        return False

def audit_runner(race_id, horse, start_utc, observations, press_naps=None,
                 monitored_sources=None, market_favourite=None):
    """None means unknown, never zero. No price-derived forum backing."""
    matching = [p for p in observations if str(p.get("race_id")) == str(race_id)
                and str(p.get("horse", "")).casefold() == horse.casefold()]
    verified = [p for p in matching if valid_source(p, start_utc)]
    distinct = {}
    for p in verified:
        # One publisher/author counts once regardless of duplicate syndication.
        identity = (p.get("author") or p.get("publisher") or "").casefold().strip()
        distinct.setdefault(identity, p)
    press_count = press_naps if isinstance(press_naps, int) and press_naps >= 0 else None
    forum = [p for p in distinct.values() if p.get("group") in ("forum", "social_forum")]
    publisher = [p for p in distinct.values() if p.get("group") not in ("forum", "social_forum")]
    coverage = monitored_sources or {}
    complete = bool(coverage) and all(v == "complete" for v in coverage.values())
    if press_count is not None and press_count >= 3 and forum:
        status = "CONFIRMED_CONVERGENCE_LIMITED"
    elif (press_count or 0) > 0 and not forum:
        status = "DISCREPANCY_FORUM_BACKING_UNVERIFIED"
    else:
        status = "NO_CONFIRMED_CONVERGENCE"
    return {
        "race_id": str(race_id), "horse": horse,
        "status": status, "press_naps_count": press_count,
        "market_favourite": market_favourite,
        "observed_forum_backers": len(forum),
        "observed_other_publishers": len(publisher),
        "forum_mention_count": None,  # selections are not total mentions
        "forum_coverage": "complete" if complete else "partial_or_unknown",
        "forum_zero_claim_permitted": complete and not forum,
        "evidence_urls": [p["url"] for p in distinct.values()],
        "disclaimer": "Research only. No inferred forum votes from prices or press selections.",
    }

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    p = argparse.ArgumentParser()
    p.add_argument("--observations", default="racing-research/source-observations.json")
    p.add_argument("--race-id", required=True)
    p.add_argument("--horse", required=True)
    p.add_argument("--start-utc", required=True)
    a = p.parse_args()
    data = json.loads(Path(a.observations).read_text(encoding="utf-8"))
    print(json.dumps(audit_runner(a.race_id, a.horse, a.start_utc, data.get("entries", [])), indent=2))
