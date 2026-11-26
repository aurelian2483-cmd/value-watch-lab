"""Read-only coverage checks against a named Git snapshot."""
import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
import subprocess

SOURCES = (
    ('football-main','research-dashboard-data.json','upcoming_fixtures',None,'kickoff_utc'),
    ('football-expanded','football-expanded-data.json','upcoming_fixtures','espn_event_id','kickoff_utc'),
    ('football-international','international-football-data.json','upcoming_fixtures','espn_event_id','kickoff_utc'),
    ('tennis','other-sports-data.json','sports.tennis.events','id','startUTC'),
    ('nfl','other-sports-data.json','sports.nfl.events','id','startUTC'),
    ('horse-racing','racing-research-data.json','races','race_id','startUTC'),
    ('darts-timed','darts/feed.json','fixtures','id','start_utc'),
    ('rugby','rugby-research-data.json','upcoming_fixtures','event_id','kickoff_utc'),
)


def snapshot(revision,path):
    body = subprocess.check_output(['git','show',f'{revision}:{path}'])
    return json.loads(body), hashlib.sha256(body).hexdigest()


def aware(value):
    if not isinstance(value,str) or 'T' not in value:
        return False
    try:
        return datetime.fromisoformat(value).utcoffset() is not None
    except ValueError:
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('revision')
    args = parser.parse_args()
    revision = subprocess.check_output(['git','rev-parse','--verify',args.revision+'^{commit}']).decode().strip()
    sources = []
    for sport,path,member,identifier,time in SOURCES:
        data,digest = snapshot(revision,path)
        rows = data
        for key in member.split('.'):
            rows = rows[key]
        ids = Counter((row.get('home'),row.get('away'),row.get(time)) if identifier is None
                      else row.get(identifier) for row in rows)
        missing = sum(n for key,n in ids.items() if not key or
                      (isinstance(key,tuple) and not all(key)))
        duplicates = sum(n-1 for key,n in ids.items() if key and
                         (not isinstance(key,tuple) or all(key)))
        sources.append(dict(sport=sport,path=path,sha256=digest,observed_rows=len(rows),
                            unavailable_identity=missing,duplicate_identity_rows=duplicates,
                            invalid_or_unzoned_event_time=sum(not aware(row.get(time)) for row in rows),
                            generated_at_utc=data.get('generated_at_utc'),
                            categories=dict(Counter(row['code'] for row in rows)) if sport=='rugby' else None,
                            registered_endpoint='UNUSED'))
    events,digest = snapshot(revision,'sports-watch/approved-events.json')
    print(json.dumps(dict(scope='TRACKED_REPOSITORY_SNAPSHOTS_ONLY',commit=revision,sources=sources,
                          limitations='Counts do not establish live source, permission or population completeness.',
                          watch_manifest=dict(sha256=digest,approved_event_rows=len(events['events']))),
                     sort_keys=True,indent=2))


if __name__ == '__main__':
    main()
