import copy
import unittest
import json
from scripts.research_verification_priority import evaluate, _unique_object


def fixture():
    return {'mode': 'SYNTHETIC', 'cost_unit': 'synthetic audit units', 'runner_ids': ['A', 'B'],
            'scenarios': [{'id': str(i), 'probabilities': {'A': p, 'B': 1-p}}
                          for i, p in enumerate([.12, .13, .18, .19])],
            'checks': [{'id': 'origin', 'cost': 1, 'can_return_unknown': False,
                        'answers': {'copied': ['0', '1'], 'distinct': ['2', '3']}},
                       {'id': 'time', 'cost': 1, 'can_return_unknown': False,
                        'answers': {'earlier': ['0', '2'], 'later': ['1', '3']}}]}


class VerificationPriorityTests(unittest.TestCase):
    def test_full_vector_worst_case_example(self):
        result = evaluate(fixture())
        self.assertAlmostEqual(result['initial_tv_diameter'], .07)
        self.assertEqual(result['recommended_check'], 'origin')
        self.assertAlmostEqual(result['ranked_checks'][0]['guaranteed_reduction_within_supplied_scenarios'], .06)
        self.assertAlmostEqual(result['ranked_checks'][1]['guaranteed_reduction_within_supplied_scenarios'], .01)
        self.assertEqual(result['publication_gate'], 'BLOCKED')

    def test_unknown_answer_gives_no_guarantee(self):
        d = fixture()
        for check in d['checks']: check['can_return_unknown'] = True
        r = evaluate(d)
        self.assertIsNone(r['recommended_check'])
        self.assertTrue(all(x['reduction_per_cost'] == 0 for x in r['ranked_checks']))

    def test_cost_changes_priority(self):
        d = fixture(); d['checks'][0]['cost'] = 10
        self.assertEqual(evaluate(d)['recommended_check'], 'time')

    def test_no_mutation_and_order_independent_ranking(self):
        d = fixture(); original = copy.deepcopy(d); first = evaluate(d)
        self.assertEqual(d, original)
        d['scenarios'].reverse(); d['checks'].reverse(); d['runner_ids'].reverse()
        self.assertEqual(first['ranked_checks'], evaluate(d)['ranked_checks'])

    def test_malformed_vectors(self):
        for value in [float('nan'), float('inf'), True, -.1, 1.1, '0.12']:
            d = fixture(); d['scenarios'][0]['probabilities']['A'] = value
            with self.subTest(value=value), self.assertRaises(ValueError): evaluate(d)
        d = fixture(); d['scenarios'][0]['probabilities'].pop('B')
        with self.assertRaises(ValueError): evaluate(d)

    def test_invalid_partitions(self):
        for answers in [{'a':['0'], 'b':['1','2']}, {'a':['0','1'], 'b':['1','2','3']},
                        {'a':['0','1','2','3','4']}, {'a':[]}]:
            d = fixture(); d['checks'][0]['answers'] = answers
            with self.subTest(answers=answers), self.assertRaises(ValueError): evaluate(d)

    def test_explicit_unknown_and_synthetic_contract(self):
        d = fixture(); del d['checks'][0]['can_return_unknown']
        with self.assertRaises(ValueError): evaluate(d)
        d = fixture(); d['mode'] = 'LIVE'
        with self.assertRaises(ValueError): evaluate(d)

    def test_cost_and_duplicate_ids(self):
        for cost in [0, -1, float('inf'), True]:
            d = fixture(); d['checks'][0]['cost'] = cost
            with self.subTest(cost=cost), self.assertRaises(ValueError): evaluate(d)
        d = fixture(); d['scenarios'][1]['id'] = '0'
        with self.assertRaises(ValueError): evaluate(d)

    def test_zero_ambiguity_no_check(self):
        d = fixture()
        for scenario in d['scenarios']: scenario['probabilities'] = {'A': .5, 'B': .5}
        self.assertIsNone(evaluate(d)['recommended_check'])

    def test_cost_unit_required(self):
        d = fixture(); del d['cost_unit']
        with self.assertRaises(ValueError): evaluate(d)

    def test_duplicate_json_keys_rejected(self):
        with self.assertRaises(ValueError):
            json.loads('{"id": "a", "id": "b"}', object_pairs_hook=_unique_object)

    def test_numeric_overflow_rejected(self):
        for cost in [10**400, 5e-324]:
            d = fixture(); d['checks'][0]['cost'] = cost
            with self.subTest(cost=str(cost)), self.assertRaises(ValueError): evaluate(d)

    def test_three_runner_distribution_not_only_leader(self):
        d = {'mode': 'SYNTHETIC', 'cost_unit': 'checks', 'runner_ids': ['A', 'B', 'C'],
             'scenarios': [{'id': 'a', 'probabilities': {'A': .5, 'B': .4, 'C': .1}},
                           {'id': 'b', 'probabilities': {'A': .5, 'B': .1, 'C': .4}}],
             'checks': [{'id': 'resolve', 'cost': 1, 'can_return_unknown': False,
                         'answers': {'left': ['a'], 'right': ['b']}}]}
        r = evaluate(d)
        self.assertAlmostEqual(r['initial_tv_diameter'], .3)
        self.assertAlmostEqual(r['ranked_checks'][0]['reduction_per_cost'], .3)

    def test_no_checks_valid_but_no_recommendation(self):
        d = fixture(); d['checks'] = []
        self.assertIsNone(evaluate(d)['recommended_check'])

    def test_hash_changes_when_assumption_changes(self):
        d = fixture(); before = evaluate(d)['input_sha256']; d['checks'][0]['cost'] = 2
        self.assertNotEqual(before, evaluate(d)['input_sha256'])


if __name__ == '__main__': unittest.main()
