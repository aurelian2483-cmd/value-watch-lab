"""Apply the audited schedule supersession for Sporting Life race 950179."""
import json
import re
from datetime import datetime
from pathlib import Path

OLD_ID = 'verdict-b3d3791f3032298f25ead5a9'
NEW_ID = 'verdict-219c9069db87b99a99648bfb'
OLD_HASH = '8ec4e6d2d36090f1f70666edbcf4b38004a2dda8ca9de6b48a495f46213da54c'
OLD_START = '2026-11-21T14:48:00+00:00'
NEW_START = '2026-11-21T14:49:00+00:00'
PUBLIC = 'PUBLIC_SELECTION_OBSERVED'
METHOD = 'RANKED_RACECARD_VERDICT_V1'


def reconcile(feed, racecards):
    """Preserve the original receipt and classify its schedule as historical."""
    if any(doc.get('research_only') is not True or doc.get('model_validation') != 'UNVALIDATED'
           or doc.get('publication_gate') != 'BLOCKED' for doc in (feed, racecards)):
        return False
    entries = feed['entries']
    old = [row for row in entries if row.get('id') == OLD_ID]
    new = [row for row in entries if row.get('id') == NEW_ID]
    races = [row for row in racecards['races'] if str(row.get('race_id')) == '950179']
    if len(old) != 1 or len(new) != 1 or len(races) != 1:
        return False
    old, new, race = old[0], new[0], races[0]
    old_receipt = old.get('selection_receipt') or {}
    new_receipt = new.get('selection_receipt') or {}
    if (old.get('verification') != PUBLIC or new.get('verification') != PUBLIC
            or old.get('startUTC') != OLD_START or new.get('startUTC') != NEW_START
            or race.get('startUTC') != NEW_START or old_receipt.get('sha256') != OLD_HASH
            or new_receipt == old_receipt or new_receipt != race.get('publisher_verdict')
            or new_receipt.get('sha256') != race.get('runner_source_sha256')
            or new_receipt.get('url') != race.get('runner_source')):
        return False
    for row, receipt in ((old, old_receipt), (new, new_receipt)):
        if (row.get('extraction_method') != METHOD or row.get('source_identity') != 'publisher:timeform'
                or row.get('race_id') != '950179' or row.get('horse') != 'Mr Moonshine'
                or receipt.get('race_id') != '950179' or receipt.get('horse_id') != '93135'
                or receipt.get('horse') != row.get('horse') or receipt.get('rank') != 1
                or receipt.get('status') != 'EXPLICIT_FIRST_CHOICE_OBSERVED'
                or receipt.get('startUTC') != row.get('startUTC')
                or receipt.get('url') != row.get('url') or receipt.get('url') != race.get('runner_source')
                or receipt.get('observed_at_utc') != row.get('observed_at_utc')
                or not re.fullmatch(r'[a-f0-9]{64}', receipt.get('sha256', ''))):
            return False
    try:
        old_seen, new_seen, original_start = map(datetime.fromisoformat,
            (old['observed_at_utc'], new['observed_at_utc'], OLD_START))
        if not old_seen < new_seen < original_start:
            return False
    except (TypeError, ValueError):
        return False
    old['verification'] = 'HISTORICAL_SCHEDULE_SUPERSEDED'
    old['schedule_reconciliation'] = {
        'original_verification': PUBLIC,
        'reason': 'LATER_SOURCE_LINKED_RACECARD_SCHEDULE',
        'successor_id': NEW_ID,
        'successor_startUTC': NEW_START,
        'successor_observed_at_utc': new['observed_at_utc'],
        'successor_sha256': new_receipt['sha256'],
    }
    return True


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    path = root / 'racing-research/source-observations.json'
    feed = json.loads(path.read_text())
    cards = json.loads((root / 'racing-research-data.json').read_text())
    if reconcile(feed, cards):
        path.write_text(json.dumps(feed, indent=2, ensure_ascii=False) + '\n')
        print(f'Preserved {OLD_ID} as superseded by {NEW_ID}; no timestamps rewritten.')
    else:
        print('No matching schedule reconciliation applied.')
