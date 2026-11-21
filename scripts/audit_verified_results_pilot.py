#!/usr/bin/env python3
"""Offline Phase 9 review of Phase 8 candidates and repository fixture anchors."""
from collections import Counter, defaultdict
from datetime import timedelta
import json
import subprocess
from urllib.parse import urlsplit

if __package__:
    from .audit_football_result_reconciliation import audit, digest, instant, two_source_contract, valid_hash
else:
    from audit_football_result_reconciliation import audit, digest, instant, two_source_contract, valid_hash

ARCHIVE_COMMIT = '0ab96a96fd66608d931c4109392ee29fe2ba3650'
LINKED = 'verified_fixture_link_identity_insufficient'
AMBIGUOUS = 'ambiguous_identity'
SOURCE_CONFLICT = 'source_conflict'


def read_archive(root, path):
    return read_git_blob(root, ARCHIVE_COMMIT, path)


def read_git_blob(root, revision, path):
    result = subprocess.run(['git','--no-lazy-fetch','show',f'{revision}:{path}'],cwd=root,
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


def review(root, source_review, reader, reconciliation_report=None):
    phase8 = audit(root) if reconciliation_report is None else reconciliation_report
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
