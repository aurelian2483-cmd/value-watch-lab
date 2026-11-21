#!/usr/bin/env python3
"""Build and inspect a pinned offline football result evidence ledger."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit

if __package__:
    from . import audit_football_provenance as audit
else:
    import audit_football_provenance as audit

ROOT = audit.ROOT
DIRECTORY = audit.OUTPUT
SOURCE_FILE = audit.reconciliation.INPUTS['single'][0]
TIER = 'SINGLE_SOURCE_UNVERIFIED'
REFERENCE_TIERS = {'expanded': 'TWO_SOURCE_EXPANDED_FINAL', 'legacy': 'LEGACY_SCORED_ARCHIVE'}
RULE_VERSION = '2026-11-21.1'
PHASE10_MANIFEST_SHA256 = '72d522e72eec69817b1064e3506bdcbd559a4596d173ff3abbd621c978310aec'
PHASE10_REPORT_SHA256 = '60ba4451b369f03e98cd519cfbe2cf892535fa0d81df1b7ee1e3b4fb02327d85'
POLICY = {
    'linked_identity_insufficient': ('REFERENCE_ID_ONLY', 'Audited source-side fixture ID crosswalk and independent final receipt.'),
    'ambiguous_identity': ('IDENTITY_UNRESOLVED', 'Unique exact ordered fixture identity and independent final receipt.'),
    'unmatched': ('NO_ORDERED_REFERENCE', 'Eligible exact reference, source-side fixture ID and independent final receipt.'),
    'outside_centre_coverage': ('UNSUPPORTED_CENTRE_COMPETITION', 'Reviewed coverage extension, exact identity and independent final receipt.'),
    'duplicate': ('DUPLICATE_SOURCE_ROW', 'Resolve duplicate provenance before reassessment.'),
    'score_or_source_conflict': ('SOURCE_CONTRADICTION', 'Resolve conflicting identity, source evidence or regulation-time score.'),
    'source_independence_unknown': ('ACQUISITION_UNATTESTED', 'Independent fixture-level acquisition evidence and regulation-time receipt.'),
}
SAFETY = {'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED', 'verified_coverage_gained': 0}
require = audit.require
digest = audit.reconciliation.digest
valid_hash = audit.reconciliation.valid_hash


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def unique_object(pairs):
    result = dict(pairs)
    require(len(result) == len(pairs), 'duplicate JSON object key')
    return result


def decode(raw):
    return json.loads(raw.decode('utf-8-sig'), object_pairs_hook=unique_object)


def load(path):
    return decode(path.read_bytes())


def row_key(row):
    # Use the reported identity, before aliases. Score and provider attribution
    # can change. Date or original team-name edits produce remove/add records.
    identity = [SOURCE_FILE, row['source_competition'], row['date'], *row['source_participants']]
    return 'source-v1:' + digest(canonical(identity))


def input_inventory(report):
    return {kind: {'file': audit.reconciliation.INPUTS[kind][0], 'sha256': sha,
                   'rows': report['input_counts'][kind], 'tier': audit.reconciliation.INPUTS[kind][2]}
            for kind, sha in report['input_sha256'].items()}


def build(root=ROOT):
    directory = root / DIRECTORY
    manifest_bytes = (directory / 'manifest.json').read_bytes()
    manifest_hash = digest(manifest_bytes)
    require(manifest_hash == PHASE10_MANIFEST_SHA256, 'Phase 10 manifest differs from its pinned hash')
    report_pin = (directory / 'report.sha256').read_bytes()
    require(report_pin == (PHASE10_REPORT_SHA256 + '\n').encode(), 'Phase 10 expected report hash changed')
    manifest = decode(manifest_bytes)
    report = audit.build(root, manifest, lambda path: audit.pilot.read_archive(root, path))
    # Check the existing Phase 10 result before projecting it onto ledger rows.
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    require(digest(rendered.encode()) == PHASE10_REPORT_SHA256,
            'Phase 10 report differs from its pinned hash')
    pairs = defaultdict(list)
    references = {}
    by_position = {row['key']: row for row in report['reference_rows']}
    for pair in report['candidate_pairs']:
        reference = by_position[pair['reference']]
        kind = reference['key'].split(':')[0]
        key = f"{kind}:{reference['source_record_sha256']}"
        item = {'tier': reference['tier'], 'input': kind, 'locator': reference['key'],
                'record_sha256': reference['source_record_sha256']}
        require(key not in references or references[key] == item, f'candidate reference collision: {key}')
        references[key] = item
        pairs[pair['single']].append({'reference': key, 'disposition': pair['adjudication']})
    rows = []
    for item in report['single_source_rows']:
        disposition = item['adjudication']
        require(disposition in POLICY, f'{item["key"]}: unsupported or promoted disposition')
        reason, needed = POLICY[disposition]
        row = {name: item[name] for name in ('competition', 'source_competition', 'season',
                'date', 'date_precision', 'score', 'source_participants', 'upstream_provider', 'source_url',
                'source_csv_sha256')}
        row.update(key=row_key(row), tier=TIER, input='single',
                   disposition=disposition, reason=reason, evidence_needed=needed,
                   candidates=sorted(pairs[item['key']], key=lambda pair: pair['reference']))
        rows.append(row)
    rule_files = ('audit_football_result_reconciliation.py', 'audit_verified_results_pilot.py',
                  'audit_football_provenance.py', 'football_evidence_ledger.py')
    result = {'schema_version': 1, 'rule_version': RULE_VERSION, **SAFETY,
              'rules_sha256': digest(canonical({name: digest((root / 'scripts' / name).read_bytes().replace(b'\r\n', b'\n'))
                                               for name in rule_files})),
              'manifest_sha256': manifest_hash,
              'archive_commit': audit.pilot.ARCHIVE_COMMIT,
              'inputs': input_inventory(report), 'references': references,
              'counts': summaries(rows), 'rows': sorted(rows, key=lambda row: row['key'])}
    validate(result, pinned=True)
    return result


def summaries(rows):
    return {'dispositions': dict(Counter(row['disposition'] for row in rows)),
            'candidate_rows': sum(bool(row['candidates']) for row in rows),
            'repeated_pairings': sum(pair['disposition'] == 'duplicate'
                                    for row in rows for pair in row['candidates'])}


def fields(value, expected, label):
    require(isinstance(value, dict) and value.keys() == set(expected), f'{label}: invalid schema fields')


def text(value):
    return isinstance(value, str) and bool(value.strip()) and value == value.strip()


def validate(ledger, pinned=False):
    fields(ledger, (*SAFETY, 'schema_version', 'rule_version', 'rules_sha256', 'manifest_sha256',
                    'archive_commit', 'inputs', 'references', 'counts', 'rows'), 'ledger')
    require(type(ledger['schema_version']) is int and ledger['schema_version'] == 1, 'unsupported schema version')
    require(canonical({name: ledger[name] for name in SAFETY}) == canonical(SAFETY), 'invalid safety gates')
    require(text(ledger['rule_version']) and all(valid_hash(ledger[key]) for key in ('rules_sha256', 'manifest_sha256')),
            'missing rule or manifest provenance')
    commit = ledger['archive_commit']
    require(isinstance(commit, str) and len(commit) == 40 and valid_hash(commit + '0' * 24), 'invalid archive commit')
    inputs = ledger['inputs']
    fields(inputs, audit.reconciliation.INPUTS, 'inputs')
    for kind, item in inputs.items():
        path, _, tier = audit.reconciliation.INPUTS[kind]
        fields(item, ('file', 'sha256', 'rows', 'tier'), kind)
        require(item['file'] == path and item['tier'] == tier and valid_hash(item['sha256']) and
                type(item['rows']) is int and item['rows'] >= 0, f'{kind}: invalid input provenance or count')
    references = ledger['references']
    require(isinstance(references, dict), 'invalid reference index')
    locators = set()
    for key, ref in references.items():
        fields(ref, ('tier', 'input', 'locator', 'record_sha256'), 'reference')
        kind = ref['input']
        require(kind in REFERENCE_TIERS and ref['tier'] == REFERENCE_TIERS[kind] and valid_hash(ref['record_sha256'])
                and key == f"{kind}:{ref['record_sha256']}", 'invalid reference provenance or tier')
        locator = ref['locator']
        require(isinstance(locator, str) and locator.startswith(kind + ':') and locator.split(':')[1].isascii()
                and locator.split(':')[1].isdigit() and 1 <= int(locator.split(':')[1]) <= inputs[kind]['rows']
                and locator not in locators and locator.count(':') == 1, 'invalid or duplicate reference locator')
        locators.add(locator)
    rows = ledger['rows']
    require(isinstance(rows, list) and len(rows) == inputs['single']['rows'] and len(rows) > 0, 'invalid source row count')
    seen, used = set(), set()
    for row in rows:
        validate_row(row, references)
        require(row['key'] not in seen, f"duplicate source row key: {row['key']}")
        seen.add(row['key'])
        attached = {pair['reference'] for pair in row['candidates']}
        require(not (used & attached), 'candidate reference attached to multiple source rows')
        used.update(attached)
    require(used == references.keys(), 'unreferenced evidence in reference index')
    require(canonical(summaries(rows)) == canonical(ledger['counts']), 'inconsistent disposition counts')
    if pinned:
        require({kind: item['rows'] for kind, item in inputs.items()} == audit.EXPECTED and
                ledger['counts'] == {'dispositions': {'linked_identity_insufficient': 41, 'ambiguous_identity': 10,
                    'unmatched': 611, 'outside_centre_coverage': 72}, 'candidate_rows': 51, 'repeated_pairings': 4},
                'pinned totals differ')


def validate_row(row, references):
    fields(row, ('competition', 'source_competition', 'season', 'date', 'date_precision', 'score',
                 'source_participants', 'upstream_provider', 'source_url', 'source_csv_sha256', 'key',
                 'tier', 'input', 'disposition', 'reason', 'evidence_needed', 'candidates'), 'row')
    require(row['tier'] == TIER and row['input'] == 'single', 'mixed source evidence tier')
    require(all(text(row[name]) for name in ('competition', 'source_competition', 'season', 'upstream_provider',
                                           'source_url')) and valid_hash(row['source_csv_sha256']), 'missing row provenance')
    url = urlsplit(row['source_url'])
    require(url.scheme == 'https' and bool(url.hostname) and not url.username and not url.password,
            'invalid source URL')
    require(row['date_precision'] == 'DATE_ONLY_END_OF_DAY' and
            audit.reconciliation.calendar_date(row['date']) is not None, 'invalid date-only evidence')
    teams = row['source_participants']
    require(isinstance(teams, list) and len(teams) == 2 and all(map(text, teams)) and
            teams[0].casefold() != teams[1].casefold() and row['key'] == row_key(row), 'invalid ordered teams or key')
    score = row['score']
    require(isinstance(score, list) and len(score) == 2 and all(type(value) is int and value >= 0 for value in score),
            'invalid score')
    state = row['disposition']
    require(isinstance(state, str) and state in POLICY and
            (row['reason'], row['evidence_needed']) == POLICY[state], 'unknown, promoted or inconsistent disposition')
    candidates = row['candidates']
    require(isinstance(candidates, list), 'invalid candidates')
    keys, primary = set(), []
    for pair in candidates:
        fields(pair, ('reference', 'disposition'), 'candidate')
        key = pair['reference']
        require(isinstance(key, str) and key in references and key not in keys, 'candidate collision or missing reference')
        keys.add(key)
        if pair['disposition'] == 'duplicate':
            require(references[key]['tier'] == REFERENCE_TIERS['legacy'], 'only legacy repeat pairings are supported')
        else:
            primary.append(key)
            require(pair['disposition'] == state, 'candidate and row dispositions disagree')
    require(len(primary) == bool(candidates), 'candidate must have exactly one primary reference')
    if len(candidates) > 1:
        require(references[primary[0]]['tier'] == REFERENCE_TIERS['legacy'],
                'repeated pairings require a legacy primary reference')
    if state == 'linked_identity_insufficient':
        require(len(primary) == 1 and references[primary[0]]['tier'] == REFERENCE_TIERS['expanded'],
                'linked rows require an expanded reference')
    if state in ('unmatched', 'outside_centre_coverage'):
        require(not candidates, 'unmatched or out-of-coverage row has candidates')


def serialize(ledger):
    # One canonical row per line keeps the committed audit reviewable.
    header = {key: value for key, value in ledger.items() if key != 'rows'}
    prefix = json.dumps(header, sort_keys=True, ensure_ascii=False, indent=2)[:-2]
    return (prefix + ',\n  "rows": [\n    ' + ',\n    '.join(canonical(row).decode() for row in ledger['rows'])
            + '\n  ]\n}\n').encode('utf-8')


def summary(ledger):
    lines = ['# Football evidence ledger v1', '', 'Models **UNVALIDATED**. Publication **BLOCKED**.', '',
             '| Disposition | Rows |', '| --- | ---: |']
    counts = ledger['counts']
    lines += [f'| {state} | {count} |' for state, count in sorted(counts['dispositions'].items())]
    lines += ['', f"**{len(ledger['rows'])}** distinct single-source rows. **{counts['candidate_rows']}** candidate rows and "
              f"**{counts['repeated_pairings']}** additional legacy repeat pairings. Verified coverage gained **0**.", '',
              'A source row key identifies a calendar-date observation in this stream. It does not identify a fixture.', '']
    return '\n'.join(lines).encode('utf-8')


def compare(before, after):
    validate(before)
    validate(after)
    global_fields = ('rule_version', 'rules_sha256', 'manifest_sha256', 'archive_commit')
    rules = {key: [before[key], after[key]] for key in global_fields if before[key] != after[key]}
    inputs = {kind: [before['inputs'][kind]['sha256'], after['inputs'][kind]['sha256']]
              for kind in sorted(before['inputs']) if before['inputs'][kind] != after['inputs'][kind]}
    left, right = ({row['key']: row for row in ledger['rows']} for ledger in (before, after))
    changes = {'added': [], 'removed': [], 'changed': [], 'reclassified': []}
    for key in sorted(left.keys() | right.keys()):
        old, new = left.get(key), right.get(key)
        if old is None or new is None:
            category = 'added' if old is None else 'removed'
            changed = {}
        else:
            changed = {field: [old[field], new[field]] for field in old
                       if field != 'candidates' and old[field] != new[field]}
            old_candidates, new_candidates = (sorted(item['candidates'], key=lambda pair: pair['reference'])
                                             for item in (old, new))
            if old_candidates != new_candidates:
                changed['candidates'] = [old_candidates, new_candidates]
            if not changed:
                continue
            category = 'reclassified' if old['disposition'] != new['disposition'] else 'changed'
        relevant = {'single'}
        for ledger, row in ((before, old), (after, new)):
            if row:
                relevant.update(ledger['references'][pair['reference']]['input'] for pair in row['candidates'])
        # An unmatched classification can depend on a previously absent
        # reference. Report all changed comparison inputs for adjudication drift.
        if category == 'reclassified' or 'candidates' in changed:
            relevant.update(REFERENCE_TIERS)
        evidence = {kind: inputs[kind] for kind in sorted(relevant & inputs.keys())}
        changes[category].append({'key': key, 'fields': changed,
                                  'before_disposition': old['disposition'] if old else None,
                                  'after_disposition': new['disposition'] if new else None,
                                  'changed_input_hashes': evidence, 'changed_rule_context': rules,
                                  'attribution': 'review_required' if evidence or rules else 'no_changed_pin_reported'})
    return {**SAFETY, 'schema_version': 1, 'changed_inputs': inputs, 'changed_rule_context': rules,
            'totals': {name: len(items) for name, items in changes.items()}, **changes}


def check(root=ROOT):
    target = root / DIRECTORY
    ledger = build(root)
    committed = load(target / 'ledger.v1.json')
    validate(committed, pinned=True)
    require((target / 'ledger.v1.json').read_bytes() == serialize(ledger), 'committed ledger differs from regenerated bytes')
    require((target / 'ledger-summary.md').read_bytes() == summary(ledger), 'committed summary differs from regenerated bytes')
    require(not any(compare(committed, ledger)['totals'].values()), 'unexpected drift in committed ledger')
    return ledger


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for command in ('emit', 'summary', 'check'):
        commands.add_parser(command)
    validator = commands.add_parser('validate')
    validator.add_argument('ledger', type=Path)
    drift = commands.add_parser('compare')
    drift.add_argument('before', type=Path)
    drift.add_argument('after', type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'emit':
            output = serialize(build())
        elif args.command == 'summary':
            output = summary(build())
        elif args.command == 'check':
            ledger = check()
            output = f"PASS: regenerated {len(ledger['rows'])} rows, validated schema and found zero drift\n".encode()
        elif args.command == 'validate':
            validate(load(args.ledger))
            output = b'PASS: ledger schema and counts valid\n'
        else:
            report = compare(load(args.before), load(args.after))
            output = canonical(report) + b'\n'
        sys.stdout.buffer.write(output)
    except (ValueError, OSError, TypeError, KeyError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
