#!/usr/bin/env python3
"""Rebuild a pinned football provenance inventory without network or feed writes."""
import argparse
from functools import cache
from collections import Counter, defaultdict
import json
from pathlib import Path

if __package__:
    from . import audit_football_result_reconciliation as reconciliation
    from . import audit_verified_results_pilot as pilot
    from .collect_reliability_history import parse_results
else:
    import audit_football_result_reconciliation as reconciliation
    import audit_verified_results_pilot as pilot
    from collect_reliability_history import parse_results

ROOT = reconciliation.ROOT
OUTPUT = Path('research/football-result-provenance')
EXPECTED = dict(single=734, expanded=66, legacy=18, retrospective=608, ledger=64, outcomes=0)
DISPOSITIONS = ('exact_independent_corroboration', 'linked_identity_insufficient', 'ambiguous_identity',
                'source_independence_unknown', 'score_or_source_conflict', 'duplicate', 'unmatched',
                'outside_centre_coverage')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def snapshot_inputs(root, pins, expected):
    documents, records = {}, {}
    for kind, count in expected.items():
        info, document, rows = reconciliation.read_snapshot(root, kind)
        require(info['state'] == 'loaded', f"{kind} snapshot: {info['state']}")
        require(info['file_sha256'] == pins.get(kind), f'{kind} snapshot SHA-256 changed')
        require(info['rows'] == count, f'{kind}: expected {count} rows, found {info["rows"]}')
        require(all(isinstance(row, dict) for row in rows), f'{kind}: malformed row')
        documents[kind], records[kind] = document, rows
    return documents, records


def check_csv_bytes(raw, receipt):
    decoded = raw.decode('utf-8-sig')
    require(reconciliation.digest(decoded.encode()) == receipt['csv_sha256'],
            f"{receipt['competition']}: collector CSV SHA-256 mismatch")
    return decoded


def validate_csv_manifest(single, rows, trace, reader=None):
    current = single['audit']
    recorded = trace['csv_sources']
    key = lambda entry: (entry['competition'], entry['source_url'], entry['csv_sha256'], entry['rows'])
    require(Counter(map(key, current)) == Counter(map(key, recorded)), 'CSV receipt inventory changed')
    require(len({item['competition'] for item in recorded}) == len(recorded), 'duplicate CSV competition receipt')
    require(sum(item['rows'] for item in recorded) == len(rows), 'CSV receipt totals do not reconcile')
    generated = reconciliation.instant(single.get('generated_at_utc'))
    require(generated is not None, 'invalid snapshot collection timestamp')
    for item in recorded:
        label = item['competition']
        selected = [row for row in rows if row['competition'] == label]
        require(len(selected) == item['rows'] and all(row['source_url'] == item['source_url'] for row in selected),
                f'{label}: source row count or URL mismatch')
        require(Counter(row['upstream_provider'] for row in selected) == item['row_provider_labels'],
                f'{label}: provenance provider counts changed')
        if reader is not None:
            require(item['matches'], f'{label}: no historical CSV blob was recovered')
        for match in item['matches']:
            require(match['collector_text_sha256'] == item['csv_sha256'], f'{label}: inconsistent trace hash')
            if reader is not None:
                raw = reader(match)
                require(raw is not None, f'{label}: pinned upstream blob missing')
                text = check_csv_bytes(raw, item)
                require(reconciliation.digest(raw) == match['raw_sha256'], f'{label}: upstream raw SHA-256 mismatch')
                require(parse_results(text, label, item['source_url'], generated) == selected,
                        f'{label}: collector replay differs from snapshot rows')


def assert_alias_integrity(rows, allowed_repeats=()):
    # An explicit spelling change can map between streams. Two spellings for
    # the same date/fixture inside one stream are not silently consolidated.
    groups = defaultdict(list)
    for row in rows:
        key = reconciliation.identity(row)
        require(key is not None and row['score'] is not None, f"{row['key']}: malformed football record")
        if row['tier'] == 'SINGLE_SOURCE_UNVERIFIED':
            require(row['date_precision'] == 'DATE_ONLY_END_OF_DAY' and
                    row['source_date_field'] == row['date'] + 'T23:59:59Z',
                    f"{row['key']}: invalid date-only sentinel")
        groups[(row['tier'], key, row['kickoff_utc'])].append(row)
    collisions = set()
    for group in groups.values():
        if len({tuple(row['source_participants']) for row in group}) <= 1:
            continue
        keys = tuple(sorted(row['key'] for row in group))
        require(keys in allowed_repeats and len({tuple(row['score']) for row in group}) == 1 and
                all(row['tier'] == 'LEGACY_SCORED_ARCHIVE' for row in group),
                f'reviewed alias collision within a source stream: {keys}')
        collisions.add(keys)
    require(collisions == set(allowed_repeats), 'reviewed legacy alias groups changed')


def adjudicate(single, reference, pair, anchor, lineage):
    if pair['classification'] == 'duplicate_or_repeated':
        return 'duplicate', 'Repeated reference row excluded from distinct source-row totals.'
    if not pair['ordered_participants_match']:
        return 'ambiguous_identity', 'Home and away are reversed.'
    if pair['classification'] in ('score_conflict', 'source_conflict') or not pair['score_agrees']:
        return 'score_or_source_conflict', 'The ordered score or archived reference evidence conflicts.'
    source_id = single['fixture_id']
    reference_id = reference['fixture_id']
    if anchor.get('provider_fixture_id'):
        archived_id = anchor['provider_fixture_id'].split(':', 1)
        if reference_id and reference_id != archived_id:
            return 'score_or_source_conflict', 'Reference and frozen archive fixture IDs disagree.'
        reference_id = archived_id
    if source_id and reference_id and source_id[0] == reference_id[0]:
        if source_id != reference_id:
            return 'ambiguous_identity', 'Different fixture IDs in the same provider namespace.'
        if pair['classification'] == 'ambiguous_identity':
            return 'ambiguous_identity', 'Multiple same-day references or conflicting identities remain.'
        return 'source_independence_unknown', (
            'Fixture IDs, ordered participants and score agree. Both records claim a shared upstream.'
            if lineage == 'shared_claimed_upstream' else
            'Fixture IDs, ordered participants and score agree. Independent acquisition is unestablished.'
        )
    if pair['classification'] == pilot.LINKED:
        return 'linked_identity_insufficient', 'Reference fixture ID is anchored. Source row has no matching stable ID or audited crosswalk.'
    return 'ambiguous_identity', 'No unique shared fixture identity can be established.'


def coverage(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[(row['tier'], row['competition'], row['season'], row['season_inferred'])].append(row)
    return [{
        'tier': tier, 'competition': competition, 'season': season, 'season_inferred': inferred,
        'rows': len(group), 'from': min(row['date'] for row in group), 'through': max(row['date'] for row in group),
        'teams': len({team for row in group for team in row['participants']}),
        'date_precision': dict(Counter(row['date_precision'] for row in group)),
        'fixture_ids_in_snapshot': sum(row['fixture_id'] is not None for row in group),
        'fixture_ids_in_archive': sum(bool(row.get('archive_anchor', {}).get('provider_fixture_id')) for row in group),
        'dispositions': dict(Counter(row.get('adjudication', row.get('record_status')) for row in group)),
    } for (tier, competition, season, inferred), group in sorted(groups.items())]


def build(root, manifest, archive_reader):
    trace = manifest['source_trace']
    documents, originals = snapshot_inputs(root, manifest['input_sha256'], EXPECTED)
    validate_csv_manifest(documents['single'], originals['single'], trace)
    reconciled = reconciliation.audit(root)
    references = reconciled['reference_rows']
    read_cached = cache(archive_reader)
    report = pilot.review(root, {'as_of_utc': trace['reviewed_at_utc'], 'source_assessments': []},
                          read_cached, reconciliation_report=reconciled)
    source = report['input_audit']
    for row in references:
        if row['tier'] != 'RETROSPECTIVE_RECONSTRUCTION':
            row['archive_anchor'] = pilot.archive_anchor(row, read_cached)
    reference_by_key = {row['key']: row for row in references}
    singles = {row['key']: row for row in source['single_source_rows']}
    assert_alias_integrity([*singles.values(), *references],
                           [tuple(group) for group in manifest['reviewed_legacy_alias_repeats']])
    require(report['single_snapshot_freshness'] in ('recent','stale'), 'invalid snapshot review clock')
    require(source['football_prospective_forecasts'] == 0, 'football prospective forecast total changed')
    require(source['expanded_rows_meeting_two_source_contract'] == 66, 'expanded receipt count changed')
    require(not report['fixture_anchor_collisions'], 'candidate fixture ID collision')
    anchors = [row['archive_anchor'] for row in references if row['tier'] == 'TWO_SOURCE_EXPANDED_FINAL']
    require(all(anchor['state'] == 'reference_fixture_anchored' for anchor in anchors),
            'expanded reference archive missing, invalid or incomplete')
    require(len({anchor['provider_fixture_id'] for anchor in anchors}) == len(anchors),
            'expanded fixture ID collision')
    pairs = report['candidate_pair_evidence']
    distinct = {}
    for pair in pairs:
        row, reference = singles[pair['single']], reference_by_key[pair['reference']]
        state, reason = adjudicate(row, reference, pair, pair['reference_anchor'], pair['independence']['state'])
        pair.update(adjudication=state, adjudication_reason=reason)
        if state != 'duplicate':
            require(row['key'] not in distinct, f"{row['key']}: multiple distinct candidate pairs")
            distinct[row['key']] = pair
    candidate_tiers = Counter(reference_by_key[pair['reference']]['tier'] for pair in distinct.values())
    require(len(pairs) == 55 and len(distinct) == source['candidate_rows'] == 51 and
            candidate_tiers == {'TWO_SOURCE_EXPANDED_FINAL': 41, 'LEGACY_SCORED_ARCHIVE': 10} and
            all(reference_by_key[pair['reference']]['tier'] == 'LEGACY_SCORED_ARCHIVE'
                for pair in pairs if pair['adjudication'] == 'duplicate'),
            'candidate or repeat totals changed')
    for index, row in enumerate(singles.values()):
        pair = distinct.get(row['key'])
        row['adjudication'] = pair['adjudication'] if pair else {
            'duplicate_or_repeated': 'duplicate', 'score_conflict': 'score_or_source_conflict',
        }.get(row['classification'], row['classification'])
        row['original'] = originals['single'][index]
    counts = Counter(row['adjudication'] for row in singles.values())
    require(set(counts) <= set(DISPOSITIONS) and sum(counts.values()) == EXPECTED['single'],
            'unreconciled distinct row dispositions')
    return {
        'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
        'input_counts': {kind: len(rows) for kind, rows in originals.items()},
        'football_prospective_forecasts': source['football_prospective_forecasts'],
        'input_sha256': manifest['input_sha256'], 'source_trace': trace,
        'distinct_counts': {state: counts[state] for state in DISPOSITIONS},
        'pair_counts': dict(Counter(pair['adjudication'] for pair in pairs)),
        'candidate_counts_by_tier': dict(candidate_tiers),
        'verified_coverage_gained': 0,
        'expanded_provider_anchors': len(anchors),
        'single_snapshot_freshness_at_review': report['single_snapshot_freshness'],
        'coverage': coverage([*singles.values(), *references]),
        'single_source_rows': list(singles.values()), 'candidate_pairs': pairs, 'reference_rows': references,
    }


def markdown(report):
    counts = report['input_counts']
    trace = report['source_trace']
    lines = [
        '# Football result provenance', '',
        'Research only. Models **UNVALIDATED**. Publication **BLOCKED**.', '',
        f"Rebuilt {counts['single']} single-source rows, {counts['expanded']} expanded finals, "
        f"{counts['legacy']} legacy rows and {counts['retrospective']} retrospective rows. "
        f"The broader ledger contains {counts['ledger']} records, with "
        f"{report['football_prospective_forecasts']} prospective football forecasts and {counts['outcomes']} outcome-feed rows.",
        '', '| Single-source disposition | Rows |', '| --- | ---: |',
    ]
    lines.extend(f'| {label} | {count} |' for label, count in sorted(report['distinct_counts'].items()))
    lines += [
        '', 'Of the 51 distinct candidates, 41 map to expanded references and 10 to the legacy sample. '
        'Four repeated legacy reference pairings are recorded separately. No retrospective row was paired.',
        '', f"Found stable ESPN IDs for all {report['expanded_provider_anchors']} expanded reference fixtures. "
        'No single-source row carries a namespaced fixture ID or fixture-level receipt. No row gained verified coverage. '
        'The 25 newly inventoried IDs are on reference fixtures outside the 41 expanded candidate links. '
        'All 55 pairings still lack independent acquisition evidence.',
        '', 'The 72 Europa League results are outside current Centre result coverage.',
        'Date-only results retain calendar-date precision. They establish neither kickoff nor pre-match availability.',
        '', '| Evidence tier | Competition | Season | Rows | Date range | Teams |',
        '| --- | --- | --- | ---: | --- | ---: |',
    ]
    for row in report['coverage']:
        season = row['season'] + (' (inferred)' if row['season_inferred'] else '')
        lines.append(f"| {row['tier']} | {row['competition']} | {season} | {row['rows']} | "
                     f"{row['from']} to {row['through']} | {row['teams']} |")
    lines += [
        '', '## Source chain', '',
        f"Scanned {trace['reachable_commits']} reachable revisions of Open Matchday at `{trace['upstream_commit']}`. "
        f"Value Watch snapshot last changed in `{trace['repo_snapshot_commit']}`.",
        '', 'Open Matchday distributes and deduplicates the CSVs. Its public documentation describes a private builder '
        'with merge priority OpenLigaDB, FixtureDownload, ESPN, football-data.co.uk, then Soccerway. '
        'The winning row label accounts for 653 FixtureDownload and 81 OpenLigaDB rows. The builder does not publish '
        'per-fixture upstream acquisition receipts or provider IDs. Documentation of provider priority cannot establish '
        'whether a particular score originated independently of ESPN or Sky Sports.',
        '', 'The expanded sample has 66 ESPN, 63 Sky Sports and 3 football-data.co.uk receipt entries. The legacy sample '
        'has 18 ESPN and 18 football-data.co.uk receipt entries across 14 distinct archived fixtures. Open Matchday '
        'also uses ESPN and football-data.co.uk elsewhere in its build. None of the audited rows claims those two '
        'labels, but the source chain cannot exclude shared upstream evidence. The retrospective archive points to '
        'a separate historical source commit. The record-level inventory retains each receipt URL and hash.',
        '', f"{sum(bool(item['matches']) for item in trace['csv_sources'])} of {len(trace['csv_sources'])} stored collector "
        'digests match decoded-text hashes at pinned upstream revisions. The manifest separately records the raw '
        'byte hashes. During this review all seven raw-byte hashes agreed and collector replay reproduced all 734 '
        'checked-in rows. The original URL uses mutable `master`. '
        'The collector records a snapshot-wide generation time and no original per-CSV retrieval time, HTTP receipt or '
        'upstream revision. A recovered equal blob does not prove when the original fetch happened.',
        '', '| Competition | CSV rows | Claimed provider | Pinned CSV |', '| --- | ---: | --- | --- |',
    ]
    for item in trace['csv_sources']:
        providers = ', '.join(sorted(item['row_provider_labels']))
        pinned = ', '.join(f"[{match['revision'][:12]}]({match['url']})" for match in item['matches'])
        lines.append(f"| {item['competition']} | {item['rows']} | {providers} | {pinned or 'Unavailable'} |")
    lines += [
        '', 'The trace manifest gives document hashes and original and pinned URLs. Open Matchday specifies '
        'non-commercial attribution and leaves provider rights with the providers. This audit stores hashes, links '
        'and derived decisions. The raw CSVs remain at their upstream source.',
        '',
    ]
    lines.extend(f"- {item['finding']} [Provider document]({item['url']})" for item in trace['provider_documents'])
    lines += [
        '', '## Reproduce offline', '',
        'Make the Value Watch research commit `' + pilot.ARCHIVE_COMMIT + '` available in the local Git object store. '
        'The command fails if the pinned expanded archive is missing or the checked-in snapshots differ.',
        '', '```sh',
        'python scripts/audit_football_provenance.py --check',
        'python scripts/audit_football_provenance.py --json > /tmp/football-provenance.json',
        'python scripts/audit_football_provenance.py --check --upstream-git /path/to/open-matchday',
        '```', '',
        'The optional local upstream clone must contain the pinned CSV blobs. That mode rehashes the original bytes '
        'and verifies exact collector replay. The regular offline mode rebuilds the decisions from pinned repository '
        'files and identifies the raw-source findings as a recorded trace. No command makes a network request.',
        '', 'To establish independence in future, obtain lawfully retained fixture-level receipts with event identifiers, '
        'settlement scope and auditable acquisition lineage, then manually review the crosswalk. A shared ID only '
        'establishes identity. Eight-digit dates, matching names and identical scores cannot prove independence.', '',
        'See [evidence operations](OPERATIONS.md) for the ledger, drift review and integration checks.', '',
    ]
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    outputs = parser.add_mutually_exclusive_group()
    outputs.add_argument('--check', action='store_true')
    outputs.add_argument('--write', action='store_true')
    outputs.add_argument('--json', action='store_true')
    parser.add_argument('--upstream-git', type=Path, help='local upstream Git object store for original-byte replay')
    args = parser.parse_args()
    target = ROOT / OUTPUT
    try:
        manifest = json.loads((target / 'manifest.json').read_bytes())
        report = build(ROOT, manifest, lambda path: pilot.read_archive(ROOT, path))
        if args.upstream_git:
            documents, records = snapshot_inputs(ROOT, manifest['input_sha256'], EXPECTED)
            def reader(match):
                path = match['url'].split(match['revision'] + '/', 1)[1]
                return pilot.read_git_blob(args.upstream_git, match['revision'], path)
            validate_csv_manifest(documents['single'], records['single'], manifest['source_trace'], reader)
        summary = markdown(report)
        serialized = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
        digest_line = reconciliation.digest(serialized.encode()) + '\n'
        artifacts = {'README.md': summary, 'report.sha256': digest_line}
        for name, content in artifacts.items():
            if args.write:
                (target / name).write_bytes(content.encode())
            if args.check:
                require((target / name).read_bytes() == content.encode(), f'{name}: regenerated output differs')
        if args.json:
            print(serialized, end='')
        elif args.check:
            print(f'PASS: offline provenance report matches ({digest_line.strip()})'
                  + (' and all pinned upstream CSVs replay exactly' if args.upstream_git else ''))
        elif not args.write:
            print(summary)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
