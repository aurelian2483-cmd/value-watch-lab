"""Safety and deterministic arithmetic tests for isolated V3 ablations."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_v3_experimental_ablations import evaluate_retro,MODEL_VARIANTS

def fixture():
    horses=[]
    for i in range(5):
        past=[{"race_id":str(i*10+j),"date":f"2025-08-{20+j:02d}",
               "position":1+(i+j)%5,"runner_count":8,"run_type":"FLAT",
               "distance":"5f","going":"Standard"} for j in range(3)]
        horses.append({"horse_id":str(i),"finish_position":i+1,"previous_results":past})
    return {"race_id":"test","date":"2025-11-03","surface":"ALLWEATHER",
            "distance":"5f","runners":horses}

class V3Ablations(unittest.TestCase):
    def test_variants_are_fixed(self):
        self.assertEqual(MODEL_VARIANTS["M1_V1"],(0,0))
        self.assertEqual(MODEL_VARIANTS["M4_BOTH"],(.15,.15))
    def test_all_probabilities_normalize(self):
        record=evaluate_retro(fixture())
        self.assertEqual(record["publication_gate"],"BLOCKED")
        self.assertFalse(record["source_first_availability_attested"])
        for variant in record["variants"]:
            self.assertAlmostEqual(sum(variant["softmax_weights"].values()),1)
            self.assertEqual(len(variant["ranked_horse_ids"]),5)
    def test_missing_form_rejected(self):
        race=fixture();race["runners"][0]["previous_results"]=[]
        with self.assertRaises(ValueError):evaluate_retro(race)
    def test_missing_finishing_position_rejected(self):
        race=fixture();race["runners"][0]["finish_position"]=None
        with self.assertRaises(ValueError):evaluate_retro(race)
    def test_duplicate_horse_id_rejected(self):
        race=fixture();race["runners"][1]["horse_id"]="0"
        with self.assertRaises(ValueError):evaluate_retro(race)

if __name__=="__main__":unittest.main()
