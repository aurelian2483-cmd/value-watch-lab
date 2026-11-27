#!/usr/bin/env python3
"""Evaluate the four frozen paper rules from local, archived pre-race inputs."""
import argparse
from datetime import timedelta
import json
import math
from pathlib import Path

from horse_model_pipeline import PARAMETERS, sha, stamp, validate_record

VERSION = 'HORSE_FOUR_RULES_V1'
MARGIN_THRESHOLD = 0.005261
MAX_QUOTE_AGE = timedelta(minutes=30)


def normalized(weights):
    total = math.fsum(weights.values())
    return {horse: value / total for horse, value in weights.items()}


def market_vector(forecast, quote, field):
    if quote is None:
        return None, 'NO_QUOTE'
    unsigned = {key: value for key, value in quote.items() if key != 'record_sha256'}
    if quote.get('record_sha256') != sha(unsigned):
        return None, 'QUOTE_INTEGRITY_FAILURE'
    if (quote.get('kind') != 'HORSE_SOURCE_MARKET_CAPTURE'
            or quote.get('publisher') != 'Sporting Life'
            or quote.get('bookmaker') != 'Sky Bet'
            or quote.get('publication_gate') != 'BLOCKED'
            or quote.get('research_only') is not True
            or quote.get('executable_verified') is not False):
        return None, 'INELIGIBLE_QUOTE_SOURCE'
    if (quote.get('race_id') != forecast['race_id'] or quote.get('startUTC') != forecast['startUTC']
            or sorted(quote['active_runner_ids']) != field):
        return None, 'QUOTE_FIELD_MISMATCH'
    age = stamp(forecast['generated_at_utc']) - stamp(quote['observed_at_utc'])
    if not timedelta(0) <= age <= MAX_QUOTE_AGE:
        return None, 'QUOTE_OUTSIDE_CAPTURE_WINDOW'
    prices = {row['horse_id']: row['decimal'] for row in quote['quotes']}
    if (len(quote['quotes']) != len(field) or sorted(prices) != field
            or any(type(price) not in (int, float) or not 1 < price <= 10000
                   for price in prices.values())):
        return None, 'INCOMPLETE_OR_INVALID_QUOTES'
    return normalized({horse: 1 / prices[horse] for horse in field}), 'ELIGIBLE'


def evaluate(forecast, quote=None):
    validate_record(forecast)
    if forecast['parameters'] != PARAMETERS or forecast.get('research_only') is not True:
        raise ValueError('Expected the frozen V1 form configuration')
    rows = {row['horse_id']: row for row in forecast['runners']}
    field = sorted(rows)
    original = {horse: rows[horse]['model_probability'] for horse in field}
    rank = sorted(field, key=lambda horse: (-original[horse], horse))
    margin = original[rank[0]] - original[rank[1]]
    market, quote_status = market_vector(forecast, quote, field)
    blend = None
    if market is not None:
        weights = {}
        for horse in field:
            history = rows[horse]['form_features']['history']
            signal = math.fsum((run['finish_percentile'] - 0.5) * run['recency_weight']
                               for run in history)
            weight = math.fsum(run['recency_weight'] for run in history)
            weights[horse] = math.exp(2 * signal / (2 + weight))
        adjusted = normalized(weights)
        blend = {horse: (adjusted[horse] + market[horse]) / 2 for horse in field}
    use_blend = blend is not None and (margin <= MARGIN_THRESHOLD
                                       or math.isclose(margin, MARGIN_THRESHOLD, rel_tol=0, abs_tol=1e-15))

    def selection(vector, basis):
        pick = min(field, key=lambda horse: (-vector[horse], horse)) if vector is not None else None
        return {'basis': basis, 'pick': pick, 'probabilities': vector}

    return {
        'version': VERSION, 'research_only': True, 'publication_gate': 'BLOCKED',
        'race_id': forecast['race_id'], 'start_utc': forecast['startUTC'],
        'cutoff_utc': forecast['generated_at_utc'], 'model': forecast['model'],
        'field': field, 'forecast_sha256': forecast['record_sha256'],
        'form_depth': {horse: len(rows[horse]['form_features']['history']) for horse in field},
        'margin_percentage_points': 100 * margin, 'quote_status': quote_status,
        'quote_sha256': quote['record_sha256'] if market is not None else None,
        'quote_observed_at_utc': quote['observed_at_utc'] if market is not None else None,
        'rules': {
            'A': selection(original, 'ORIGINAL'),
            'B': selection(blend or original, 'BLEND' if blend else 'ORIGINAL_FALLBACK'),
            'C': selection(blend if use_blend else original,
                           'BLEND' if use_blend else 'ORIGINAL_FALLBACK' if blend is None else 'ORIGINAL_WIDE_MARGIN'),
            'D': selection(market, 'MARKET' if market is not None else 'UNAVAILABLE'),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('forecast', type=Path)
    parser.add_argument('--quote', type=Path)
    args = parser.parse_args()
    forecast = json.loads(args.forecast.read_text())
    quote = json.loads(args.quote.read_text()) if args.quote else None
    print(json.dumps(evaluate(forecast, quote), indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
