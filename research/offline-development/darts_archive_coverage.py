"""Reconcile bounded repository snapshots. Emits aggregate counts, no player records."""
import json
import subprocess
from collections import Counter
from pathlib import Path

PIN="9c69d0f3aa0401c25397da496d8c7b1bf1d3ddce"
ROOT=Path(__file__).resolve().parents[2]
def git(*args):
    return subprocess.check_output(["git","-C",str(ROOT),*args])

def audit():
    commits=git("log",PIN,"--format=%H","--","darts/feed.json").decode().splitlines()
    assert len(commits)==16, "Use full Git history through the source pin"
    events={}
    earliest={}
    counts=Counter()
    for sha in commits:
        data=json.loads(git("show",sha+":darts/feed.json"))
        if data.get("source_verification")!="PROVIDER_OBSERVED_UNCORROBORATED":
            counts["unqualified_snapshots"]+=1
            continue
        counts["provider_snapshots"]+=1
        observed=data["generated_at_utc"][:10]
        for r in data["results"]:
            counts["observations"]+=1
            a,b=sorted([r["player_a"]["id"],r["player_b"]["id"]])
            day=r["played_at"][:10]
            assert a!=b and r["winner_id"] in (a,b) and r["status"]=="FINAL" and day<=observed
            event=(day,a,b,r["winner_id"])
            key=r["id"]
            if key in events and events[key]!=event:
                raise ValueError("Conflicting repeated result")
            events[key]=event
            earliest[key]=min(earliest.get(key,observed),observed)
    chronological=0
    earlier_days_only=0
    for day,a,b,_ in events.values():
        known=Counter(t for k,(d,p,q,_) in events.items() if d<day and earliest[k]<day for t in (p,q))
        prior=Counter(t for d,p,q,_ in events.values() if d<day for t in (p,q))
        chronological+=min(known[a],known[b])>=8
        earlier_days_only+=min(prior[a],prior[b])>=8
    return dict(source_pin=PIN,commits=commits,counts=counts,unique_results=len(events),
                unique_play_dates=len({v[0] for v in events.values()}),
                eight_prior_each_as_of_observation=chronological,
                eight_prior_each_ignoring_observation_delay=earlier_days_only)
if __name__=="__main__":
    print(json.dumps(audit(),indent=2))
