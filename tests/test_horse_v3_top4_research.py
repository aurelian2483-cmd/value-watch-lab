"""Isolated V3 top-four research and place-term regression tests."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_v3_top4_research import analyze_top_four,standard_each_way_terms,fourth_place_payout_status

class TopFourResearchTests(unittest.TestCase):
    def test_standard_skybet_handicap_place_terms(self):
        self.assertIsNone(standard_each_way_terms(4,True))
        self.assertEqual(standard_each_way_terms(7,True)["places"],2)
        self.assertEqual(standard_each_way_terms(11,True)["places"],3)
        self.assertEqual(standard_each_way_terms(15,True)["places"],3)
        self.assertEqual(standard_each_way_terms(16,True)["places"],4)
        self.assertEqual(standard_each_way_terms(16,True)["place_odds_fraction"],0.25)
        self.assertEqual(standard_each_way_terms(16,False)["places"],3)
    def test_fourth_is_not_automatically_paid(self):
        result=fourth_place_payout_status(starters=16,handicap=True)
        self.assertEqual(result["status"],"TERMS_UNVERIFIED")
        self.assertIsNone(result["paid_fourth"])
        self.assertTrue(result["standard_four_places"])
        result=fourth_place_payout_status(starters=12,handicap=True,
            market_terms={"places":4,"source_url":"https://example.com/offer",
                          "observed_at_utc":"2026-11-15T12:00:00Z"})
        self.assertTrue(result["fourth_place_in_observed_offer"])
        self.assertIsNone(result["paid_fourth"])
    def test_top_four_ranking_overlap(self):
        race={"race_id":"test","runners":[
            {"horse_id":"A","finish_position":2},
            {"horse_id":"B","finish_position":1},
            {"horse_id":"C","finish_position":4},
            {"horse_id":"D","finish_position":5},
            {"horse_id":"E","finish_position":3}]}
        result=analyze_top_four(race,{"A":.40,"B":.25,"C":.15,"D":.12,"E":.08})
        self.assertEqual(result["predicted_top_4_actual_top_4_count"],3)
        self.assertEqual(result["top_four_recall"],.75)
        self.assertTrue(result["winner_in_predicted_top_4"])
        self.assertFalse(result["winner_predicted_first"])
    def test_missing_or_ambiguous_finishes_rejected(self):
        race={"runners":[{"horse_id":str(i),"finish_position":i} for i in (1,2,3,4)]}
        probabilities={str(i):.25 for i in (1,2,3,4)}
        race["runners"][3]["finish_position"]=None
        with self.assertRaises(ValueError):analyze_top_four(race,probabilities)
        race["runners"][3]["finish_position"]=3
        with self.assertRaises(ValueError):analyze_top_four(race,probabilities)
    def test_no_probabilities_inferred_from_place(self):
        race={"runners":[{"horse_id":str(i),"finish_position":i} for i in (1,2,3,4)]}
        result=analyze_top_four(race,{str(i):.25 for i in (1,2,3,4)})
        self.assertNotIn("place_probability",result)
        self.assertNotIn("expected_value",result)

if __name__=="__main__": unittest.main()
