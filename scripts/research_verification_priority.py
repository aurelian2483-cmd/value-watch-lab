#!/usr/bin/env python3
"""Opt-in synthetic provenance sensitivity experiment; never feeds live forecasts."""
import argparse
import hashlib
import json
import math
from pathlib import Path


def _name(value):
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        raise ValueError('Nonempty string identity required')
    return value


def _number(value):
    if type(value) not in (int, float):
        raise ValueError('Finite numeric value required')
    try:
        finite = math.isfinite(value)
    except OverflowError:
        finite = False
    if not finite:
        raise ValueError('Finite numeric value required')
    return value


def _diameter(vectors):
    return max((math.fsum(abs(x-y) for x, y in zip(a, b))/2
                for a in vectors for b in vectors), default=0.0)


def evaluate(document):
    """Rank fully specified synthetic checks by worst-case TV reduction / cost.

    Answer groups must partition the frozen scenarios. An unresolved answer is
    separately represented by can_return_unknown=True and retains all scenarios.
    This is sensitivity to supplied scenarios, not probability uncertainty.
    """
    if not isinstance(document, dict) or document.get('mode') != 'SYNTHETIC':
        raise ValueError('Only explicit SYNTHETIC experiments are supported')
    cost_unit = _name(document.get('cost_unit'))
    runners = document.get('runner_ids')
    if not isinstance(runners, list) or len(runners) < 2:
        raise ValueError('Full field with at least two runners required')
    runners = [_name(x) for x in runners]
    if len(set(runners)) != len(runners):
        raise ValueError('Duplicate runner identity')
    scenarios = document.get('scenarios')
    if not isinstance(scenarios, list) or not scenarios:
        raise ValueError('Explicit scenarios required')
    vectors = {}
    for scenario in scenarios:
        if not isinstance(scenario, dict):
            raise ValueError('Scenario must be an object')
        identity = _name(scenario.get('id'))
        if identity in vectors:
            raise ValueError('Duplicate scenario identity')
        probabilities = scenario.get('probabilities')
        if not isinstance(probabilities, dict) or set(probabilities) != set(runners):
            raise ValueError('Every scenario must contain the identical complete field')
        vector = tuple(_number(probabilities[x]) for x in runners)
        if any(p < 0 or p > 1 for p in vector) or abs(math.fsum(vector)-1) > 1e-10:
            raise ValueError('Probability vector must sum to one with values in [0,1]')
        vectors[identity] = vector
    checks = document.get('checks')
    if not isinstance(checks, list):
        raise ValueError('Explicit check list required')
    diameter = _diameter(list(vectors.values()))
    ranked = []
    seen = set()
    for check in checks:
        if not isinstance(check, dict):
            raise ValueError('Check must be an object')
        identity = _name(check.get('id'))
        if identity in seen:
            raise ValueError('Duplicate check identity')
        seen.add(identity)
        cost = _number(check.get('cost'))
        if cost <= 0:
            raise ValueError('Check cost must be positive in common declared units')
        unknown = check.get('can_return_unknown')
        if type(unknown) is not bool:
            raise ValueError('Declare can_return_unknown explicitly')
        answers = check.get('answers')
        if not isinstance(answers, dict) or not answers:
            raise ValueError('Explicit answer partition required')
        covered = set()
        residuals = {}
        for answer, ids in answers.items():
            _name(answer)
            if not isinstance(ids, list) or not ids:
                raise ValueError('Answer must identify a nonempty scenario group')
            ids = [_name(x) for x in ids]
            if len(set(ids)) != len(ids) or covered.intersection(ids) or not set(ids) <= set(vectors):
                raise ValueError('Answer groups must be disjoint known scenario identities')
            covered.update(ids)
            residuals[answer] = _diameter([vectors[x] for x in ids])
        if covered != set(vectors):
            raise ValueError('Answer groups must cover all frozen scenarios')
        worst_residual = diameter if unknown else max(residuals.values())
        reduction = max(0.0, diameter-worst_residual)
        priority = reduction/cost
        if not math.isfinite(priority):
            raise ValueError('Cost produces an unrepresentable priority')
        ranked.append({'check_id': identity, 'cost': cost,
                       'answer_residual_tv': residuals,
                       'can_return_unknown': unknown,
                       'worst_case_residual_tv': worst_residual,
                       'guaranteed_reduction_within_supplied_scenarios': reduction,
                       'reduction_per_cost': priority})
    ranked.sort(key=lambda x: (-x['reduction_per_cost'], x['check_id']))
    # Bind output to the exact supplied scenario/check specification, not only its ranking.
    encoded = json.dumps(document, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()
    return {'protocol': 'SYNTHETIC_PROVENANCE_PRIORITY_V1', 'mode': 'SYNTHETIC',
            'research_only': True, 'publication_gate': 'BLOCKED', 'model_validation': 'UNVALIDATED',
            'input_sha256': hashlib.sha256(encoded).hexdigest(),
            'scenario_count': len(vectors), 'runner_ids': runners, 'cost_unit': cost_unit,
            'initial_tv_diameter': diameter, 'ranked_checks': ranked,
            'recommended_check': ranked[0]['check_id'] if ranked and ranked[0]['reduction_per_cost'] > 0 else None,
            'limitations': ['Synthetic scenario sensitivity only; no fitted racing probabilities or measured performance.',
                           'Guarantees apply only to supplied scenarios and truthful, exhaustive answer partitions.',
                           'Ranges are not confidence intervals or bounds on true winning probabilities.',
                           'Unknown verification outcomes retain the full scenario set and guarantee zero reduction.',
                           'No live integration; mandatory freshness and runner checks must never be displaced.']}


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON object key: ' + key)
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='Explicit synthetic experiment JSON')
    args = parser.parse_args()
    try:
        result = evaluate(json.loads(args.input.read_text(), object_pairs_hook=_unique_object))
    except (ValueError, TypeError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
