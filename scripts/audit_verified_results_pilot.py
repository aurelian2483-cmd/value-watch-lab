#!/usr/bin/env python3
"""Offline Phase 9 review of Phase 8 candidates and repository fixture anchors."""
import argparse
from collections import Counter, defaultdict
from datetime import timedelta
import json
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

if __package__:
    from .audit_football_result_reconciliation import ROOT, audit, digest, instant, two_source_contract, valid_hash
else:
    from audit_football_result_reconciliation import ROOT, audit, digest, instant, two_source_contract, valid_hash

ARCHIVE_COMMIT = '0ab96a96fd66608d931c4109392ee29fe2ba3650'
OUTPUT = Path('research/football-verified-results-pilot')
LINKED = 'verified_fixture_link_identity_insufficient'
AMBIGUOUS = 'ambiguous_identity'
SOURCE_CONFLICT = 'source_conflict'


def read_archive(root, path):
    result = subprocess.run(['git','--no-lazy-fetch','show',f'{ARCHIVE_COMMIT}:{path}'],cwd=root,
                            capture_output=True,check=False)
    return result.stdout if result.returncode == 0 else None


def archive_anchor(reference, reader):
    record_hash = reference['source_record_sha256']
    if not valid_hash(record_hash):
        return {'state':'missing_archive_pointer'}
    expanded = reference['tier'] == 'TWO_SOURCE_EXPANDED_FINAL'
    folders = ('football-expanded-archive/v1',) if expanded else ('forecast-archive/v1','forecast-archive/v2')
    for folder in folders:
        path = f'research/{folder}/{record_hash}.json'
        raw = reader(path)
        if raw is None:
            continue
        raw_hash = digest(raw)
        provenance = {'path':path, 'commit':ARCHIVE_COMMIT, 'file_sha256':raw_hash, 'record_sha256':record_hash}
        try:
            frozen = json.loads(raw)
        except ValueError:
            return {**provenance,'state':'invalid_archive'}
        league = reference['competition'] if expanded else 'E0'
        if (not isinstance(frozen,dict) or frozen.get('record_sha256') != record_hash or
                frozen.get('league') != league or
                [frozen.get('home'),frozen.get('away')] != reference['source_participants'] or
                instant(frozen.get('kickoff_utc')) != instant(reference['kickoff_utc'])):
            return {**provenance,'state':'archive_identity_conflict'}
        if not expanded:
            return {**provenance,'state':'legacy_archive_without_fixture_id'}
        unsigned = {key:value for key,value in frozen.items() if key != 'record_sha256'}
        if digest(json.dumps(unsigned,sort_keys=True,separators=(',',':')).encode()) != record_hash:
            return {**provenance,'state':'archive_hash_conflict'}
        espn = frozen.get('espn_event_id')
        if not isinstance(espn,str) or not espn.isascii() or not espn.isdigit():
            return {**provenance,'state':'missing_provider_fixture_id'}
        return {**provenance,'state':'reference_fixture_anchored','provider_fixture_id':f'espn:{espn}'}
    return {'state':'archive_unavailable'}


def host(url):
    try:
        return urlsplit(url).hostname
    except (TypeError,ValueError,AttributeError):
        return None


def source_independence(single, reference):
    reference_hosts = sorted({domain for receipt in reference['receipts'] if (domain := host(receipt.get('url')))})
    upstream = single['upstream_provider']
    known_hosts = {'espn':'site.api.espn.com','fd.co.uk':'www.football-data.co.uk',
                   'openligadb':'api.openligadb.de','fixturedl':'fixturedownload.com'}
    upstream_host = known_hosts.get(upstream)
    return {
        'single_source_host':host(single['source_url']), 'claimed_upstream':upstream,
        'reference_receipt_hosts':reference_hosts,
        'reference_passes_two_source_metadata':two_source_contract(reference),
        'state':'shared_claimed_upstream' if upstream_host in reference_hosts else 'independence_unestablished',
        'reason':'The aggregate CSV labels its upstream but supplies no fixture-level acquisition receipt or crosswalk. Distinct hostnames do not establish independent collection.'
    }


def review(root, source_review, reader):
    phase8 = audit(root)
    references = {row['key']:row for row in phase8['reference_rows']}
    anchors = {}
    source_observed = max((instant(row['snapshot_generated_at_utc']) for row in phase8['single_source_rows']
                           if instant(row['snapshot_generated_at_utc'])),default=None)
    as_of = instant(source_review['as_of_utc'])
    freshness = ('unavailable' if not source_observed or not as_of or source_observed > as_of else
                 'stale' if as_of - source_observed >= timedelta(hours=48) else 'recent')
    for row in phase8['single_source_rows']:
        for pair in row['candidates']:
            key = pair['key']
            if key not in anchors:
                anchors[key] = archive_anchor(references[key],reader)
    anchor_groups = defaultdict(set)
    for key, anchor in anchors.items():
        if anchor.get('provider_fixture_id'):
            ref = references[key]
            anchor_groups[anchor['provider_fixture_id']].add(
                (ref['competition'],tuple(ref['participants']),ref['kickoff_utc']))
    collisions = {identifier for identifier, fixtures in anchor_groups.items() if len(fixtures) > 1}
    dispositions = Counter()
    pair_counts = Counter()
    candidate_evidence = []
    for row in phase8['single_source_rows']:
        state = row['classification']
        if state in ('likely_overlap_identity_review','exact_fixture_and_score'):
            primary = next(pair for pair in row['candidates'] if pair['reference_disposition'] == 'included')
            reference = references[primary['key']]
            anchor = anchors[primary['key']]
            if anchor['state'] in ('archive_identity_conflict','archive_hash_conflict'):
                state = SOURCE_CONFLICT
            elif (anchor['state'] == 'reference_fixture_anchored' and two_source_contract(reference)
                  and anchor['provider_fixture_id'] not in collisions):
                state = LINKED
            else:
                state = AMBIGUOUS
        dispositions[state] += 1
        for pair in row['candidates']:
            reference = references[pair['key']]
            anchor = anchors[pair['key']]
            pair_state = 'duplicate_or_repeated' if pair['classification'] == 'duplicate_or_repeated' else state
            reason = {
                LINKED:'The reference has a digest-bound ESPN fixture ID. The date-only source row has no audited link to that ID.',
                AMBIGUOUS:'No unique verified reference fixture anchor for this pair.',
                SOURCE_CONFLICT:'The archived reference identity or record hash conflicts with the result pointer.',
                'duplicate_or_repeated':'Repeated reference observation. Excluded from distinct candidate counts.'
            }.get(pair_state,pair['reason'])
            pair_counts[pair_state] += 1
            candidate_evidence.append({'single':row['key'],'reference':pair['key'],'classification':pair_state,
                'reason':reason,'score_agrees':pair['score_agrees'],'ordered_participants_match':pair['ordered_participants_match'],
                'reference_anchor':anchor,'independence':source_independence(row,reference)})
        row['pilot_classification'] = state
    return {
        'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
        'archive_commit':ARCHIVE_COMMIT,'source_review':source_review,
        'single_snapshot_freshness':freshness,'stale_after_hours':48,'fixture_anchor_collisions':sorted(collisions),
        'verified_coverage_gained':0,'single_source_dispositions':dict(sorted(dispositions.items())),
        'candidate_pair_dispositions':dict(sorted(pair_counts.items())),'candidate_pair_evidence':candidate_evidence,
        'input_audit':{**phase8, 'reference_rows':[references[key] for key in anchors]}
    }


def markdown(report):
    rows = report['single_source_dispositions']
    pairs = report['candidate_pair_dispositions']
    assessment = report['source_review']['source_assessments']
    lines = ['# Verified-results coverage pilot', '', 'Models **UNVALIDATED**. Publication **BLOCKED**.', '',
             'Regenerate with `python scripts/audit_verified_results_pilot.py --write`. The pinned research commit must be available locally.',
             'The audit reads the checked-in snapshots and Git objects offline.',
             'The underlying Phase 8 audit logic is carried forward from PR #118 at `b5cbd5c8`.',
             '', '| Single-source disposition | Rows |', '| --- | ---: |']
    lines += [f'| {state} | {count} |' for state,count in rows.items()]
    lines += ['', f"Total: **{sum(rows.values())}**. Verified coverage gained: **0**.", '',
              f"Reference pairs: **{sum(pairs.values())}** (" + ', '.join(f'{key}: {value}' for key,value in pairs.items()) + ').',
              '', 'Reference receipt hosts and source labels are recorded for every pair. They establish claimed lineage, with fixture-level independence unresolved.',
              f"Single-source snapshot freshness at review: {report['single_snapshot_freshness']}. This is a snapshot-age diagnostic.",
              'The JSON includes every source row and reviewed reference. Input counts and tier dispositions cover the complete reference archives.',
              'The date-only source rows supply neither kickoff times nor pre-match availability. The ESPN IDs bind only the archived reference side.',
              'Legacy forecast hashes link research records. Those archives do not supply a stable provider fixture identity for these rows.',
              '', '## External source assessment', '']
    for item in assessment:
        lines += [f"- {item['finding']} Retrieved {item['retrieved_at_utc']}. SHA-256 `{item['sha256']}`. [Source]({item['url']})"]
    return '\n'.join(lines + ['','No external fixture data was ingested. No source row was promoted.',
        'A future crosswalk needs original fixture-level source records, explicit stable IDs or a collision-free reviewed mapping,',
        'permission to retain the evidence, and independently sourced regulation-time results.',''])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--write',action='store_true')
    group.add_argument('--check',action='store_true')
    args = parser.parse_args()
    target = ROOT / OUTPUT
    source_review = json.loads((target / 'source-review.json').read_bytes())
    report = review(ROOT,source_review,lambda path:read_archive(ROOT,path))
    outputs = {'README.md':markdown(report),'pilot.json':json.dumps(report,indent=2,ensure_ascii=False)+'\n'}
    for name,text in outputs.items():
        path = target / name
        if args.write:
            path.write_bytes(text.encode())
        if args.check and path.read_bytes() != text.encode():
            parser.error(f'{name} differs from regenerated output')
    if not (args.check or args.write):
        print(outputs['README.md'])


if __name__ == '__main__':
    main()
