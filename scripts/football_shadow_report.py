#!/usr/bin/env python3
"""Run the committed football producer snapshots through offline eligibility diagnostics."""
import argparse
from collections import Counter
from datetime import timedelta
from pathlib import Path
import sys

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_legacy_adapter as legacy
    from . import football_producer_adapter as producer
    from . import football_prospective_evaluation as evaluation
else:
    import football_legacy_adapter as legacy
    import football_producer_adapter as producer
    import football_prospective_evaluation as evaluation

contract, evidence = producer.contract, producer.evidence
ROOT = evidence.ROOT
DIRECTORY = Path('research/football-shadow-adapter')
EXAMPLES = Path('tests/fixtures/football-prospective')
INPUTS = ('research-dashboard-data.json', 'football-expanded-data.json', 'prediction-ledger.json',
          'results-feed.json', 'paper-lab/hybrid-market-data.json', 'research-history.json',
          'historical-reliability-data.json', 'research/football-baseline-v1/608-reconstructed-forecasts.json')
SOURCES = ('premier-league', 'paper-archive-projection', 'expanded')


def pinned_inputs(root, pins):
    contract.fields(pins, INPUTS, 'shadow input pins')
    documents = {}
    for path in INPUTS:
        raw = (root / path).read_bytes()
        contract.require(evidence.valid_hash(pins[path]) and evidence.digest(raw) == pins[path],
                         f'{path}: shadow snapshot SHA-256 mismatch')
        documents[path] = evidence.decode(raw)
    return documents


def rows(document, field):
    result = document.get(field)
    contract.require(isinstance(result, list) and all(isinstance(row, dict) for row in result),
                     f'{field}: expected an array of source objects')
    return result


def freshness(generated, as_of):
    parsed = producer.instant_or_none(generated)
    if parsed is None:
        return 'missing_or_invalid'
    if parsed > as_of:
        return 'future_snapshot'
    return 'stale' if as_of - parsed >= timedelta(hours=48) else 'recent_at_pinned_review'


def classify_legacy(items, kind):
    try:
        return {'records': legacy.bridge_batch(items, kind), 'state': 'diagnostic_projection_only'}
    except ValueError as error:
        return {'records': [], 'state': 'legacy_batch_rejected', 'error': str(error)}


def example(root, kind, forecasts=None, outcomes=None):
    folder = root / EXAMPLES / kind
    return evaluation.evaluate(
        evidence.load(folder / 'forecasts.json') if forecasts is None else forecasts,
        evidence.load(folder / 'outcomes.json') if outcomes is None else outcomes,
        (folder / 'manifest.json').read_bytes())


def report(root=ROOT):
    manifest = evidence.load(root / DIRECTORY / 'manifest.json')
    contract.fields(manifest, ('schema_version', 'as_of', 'input_sha256'), 'shadow manifest')
    contract.require(type(manifest['schema_version']) is int and manifest['schema_version'] == 1,
                     'unsupported shadow manifest schema')
    source = pinned_inputs(root, manifest['input_sha256'])
    as_of = contract.instant(manifest['as_of'])
    dashboard, expanded, prediction, results, market, history, single, retro = (source[path] for path in INPUTS)
    observed = [rows(dashboard, 'experimental_model_forecasts'), rows(dashboard, 'paper_forecasts'),
                rows(expanded, 'experimental_model_forecasts')]
    diagnostics = []
    for name, items in zip(SOURCES, observed):
        for ordinal, row in enumerate(items, 1):
            projected = producer.adapt_forecast(row, name)
            projected['source_row_ordinal'] = ordinal
            diagnostics.append(projected)
    ledgers = rows(prediction, 'records')
    football = [row for row in ledgers if any(isinstance(row.get(key), str) and row[key].casefold() == 'football'
                                              for key in ('sport', 'sportCode'))]
    outcome_rows = rows(results, 'records')
    forecast_packet = {'schema_version': 1, 'kind': evaluation.FORECAST_KIND,
                       'records': [item['candidate'] for item in diagnostics if item['candidate'] is not None]}
    outcome_packet = {'schema_version': 1, 'kind': evaluation.OUTCOME_KIND, 'records': []}
    evaluated = example(root, 'empty', forecast_packet, outcome_packet)
    synthetic = example(root, 'synthetic')
    return {'schema_version': 1, **evidence.SAFETY, 'status': evaluated['status'],
            'as_of': manifest['as_of'], 'input_sha256': manifest['input_sha256'],
            'snapshot_freshness': {name: freshness(doc.get('generated_at_utc'), as_of)
                                   for name, doc in [('premier-league', dashboard), ('expanded', expanded)]},
            'model_lineage': {'registered_scoring_configurations': len(evaluation.lineage.ADMITTED_CONFIGURATIONS),
                              'research_variants': [
                                  {'model': name, 'implementation': path, 'status': status,
                                   'version_sha256': None, 'configuration_sha256': None}
                                  for name, path, status in evaluation.lineage.RESEARCH_VARIANTS]},
            'repository_observations': dict(zip(SOURCES, map(len, observed))) | {
                'prospective_football_ledger_rows': len(football), 'all_outcome_feed_rows': len(outcome_rows),
                'market_reference_rows': len(rows(market, 'records'))},
            'separate_evidence_tiers': {'expanded_finals': len(rows(expanded['performance'], 'entries')),
                'legacy_archive': len(rows(history, 'entries')), 'retrospective': len(rows(retro, 'rows')),
                'single_source_unverified': len(rows(single, 'results'))},
            'ineligible_repository_forecasts': len(diagnostics) + len(football),
            'forecast_reasons': dict(Counter(reason for item in diagnostics for reason in item['reasons'])),
            'chronology_states': dict(Counter(item['chronology'] for item in diagnostics)),
            'identity_states': dict(Counter(item['identity'] for item in diagnostics)),
            'outcome_states': {'canonical_receipts': 0, 'adjudicated_outcomes': evaluated['eligible_real_adjudicated_outcomes'],
                               'legacy_or_unsupported': len(outcome_rows)},
            'legacy_diagnostics': {'forecasts': classify_legacy(football, 'forecast'),
                                   'outcomes': classify_legacy(outcome_rows, 'result')},
            'forecast_diagnostics': diagnostics,
            'eligible_real_forecasts': evaluated['eligible_real_forecasts'],
            'eligible_real_outcomes': evaluated['eligible_real_adjudicated_outcomes'],
            'synthetic_example_only': {'forecast_rows': synthetic['forecast_rows'],
                                       'outcome_receipt_rows': synthetic['outcome_receipt_rows'],
                                       'eligibility_diagnostics': synthetic['coverage'],
                                       'scored_records': synthetic['eligible_real_forecasts']}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    try:
        sys.stdout.buffer.write(evidence.canonical(report()) + b'\n')
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
