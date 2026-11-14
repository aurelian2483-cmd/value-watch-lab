#!/usr/bin/env python3
"""Regression guards for the historical racing replay."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from horse_v7_market_rasen_replay import replay
class ReplayTests(unittest.TestCase):
 def test_no_hindsight_or_fake_v7(self):
  d=replay()
  self.assertEqual(len(d['runners']),7)
  self.assertTrue(d['historical_result_excluded_from_model_inputs'])
  self.assertFalse(d['source_prices_executable_verified'])
  self.assertEqual(d['publication_gate'],'BLOCKED')
  self.assertEqual(d['model_validation'],'UNVALIDATED')
  self.assertTrue(all(r['v7_probability'] is None and r['v7_fair_odds'] is None for r in d['runners']))
  self.assertAlmostEqual(sum(r['market_margin_adjusted_reference'] for r in d['runners']),1,places=4)
  self.assertEqual(d['runners'][0]['horse'],'Tilehurst')
  self.assertEqual(next(r for r in d['runners'] if r['horse']=='Moutarde')['result_for_evaluation_only'],'1')
if __name__=='__main__':unittest.main()
