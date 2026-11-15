"""Fail-closed BSP CSV and pre-event experimental V3 freezer checks."""
import copy
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import import_betfair_daily_bsp as B
import freeze_horse_v3_research as V

NOW=dt.datetime(2026,11,15,11,0,tzinfo=dt.timezone.utc)
START="2026-11-15T13:15:00+00:00"
CSV="EVENT_ID,SELECTION_ID,SELECTION_NAME,EVENT_DT,BSP,WIN_LOSE\n" \
    "e1,101,First,2026-11-15T13:15:00+00:00,3.5,1\n" \
    "e1,102,Second,2026-11-15T13:15:00+00:00,5.1,0\n"
MAP={"mapping_verified":True,"market_type":"WIN","event_id":"e1",
     "race_id":"sl100","startUTC":START,"runner_id_map":{"h1":"101","h2":"102"}}

def sample_feed():
    horses=[]
    for i in range(2):
        history=[{"race_id":f"earlier-{i}-{n}","date":f"2026-10-{10+n:02d}",
                  "run_type":"FLAT","position":1+i+n,"runner_count":7,
                  "distance":"1m","going":"Standard"} for n in range(3)]
        horses.append({"horse_id":f"h{i+1}","name":f"Horse {i+1}",
                       "runner_status":"RUNNER","active_runner":True,"previous_results":history})
    race={"race_id":"sl100","racecourse":"Newcastle","startUTC":START,
          "runner_observed_at_utc":"2026-11-15T10:55:00+00:00",
          "runner_source_sha256":"a"*64,"runner_source":"https://www.sportinglife.com/racing/racecards/test",
          "surface":"ALLWEATHER","run_type":"FLAT","distance":"1m","runners":horses,
          "runner_data_status":"SINGLE_SOURCE_RUNNERS_OBSERVED",
          "active_runner_count":2,"capture_phase":"PRE_EVENT","race_stage":"DORMANT"}
    return {"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
            "generated_at_utc":NOW.isoformat(),"races":[race]}

class TestBsp(unittest.TestCase):
    def test_full_source_csv(self):
        record=B.parse_file(CSV.encode(),"dwbfpricesuk15112026.csv",MAP)
        self.assertEqual(len(record["quotes"]),2)
        self.assertTrue(record["bsp_is_post_off_reference"])
        self.assertFalse(record["pre_event_executable_price"])
        self.assertEqual(record["publication_gate"],"BLOCKED")
        self.assertEqual(record["record_sha256"],B.digest({k:v for k,v in record.items() if k!="record_sha256"}))
    def test_refuse_missing_horse_mapping(self):
        mapping=copy.deepcopy(MAP);mapping["runner_id_map"].pop("h2")
        with self.assertRaises(ValueError):B.parse_file(CSV.encode(),"prices.csv",mapping)
    def test_refuse_unverified_mapping(self):
        mapping=copy.deepcopy(MAP);mapping["mapping_verified"]=False
        with self.assertRaises(ValueError):B.parse_file(CSV.encode(),"prices.csv",mapping)
    def test_refuse_bsp_sentinel(self):
        with self.assertRaises(ValueError):B.parse_file(CSV.replace("3.5","1001").encode(),"prices.csv",MAP)
    def test_refuse_incomplete_betfair_field(self):
        with self.assertRaises(ValueError):B.parse_file(CSV.splitlines()[0].encode(),"prices.csv",MAP)
    def test_refuse_wrong_market(self):
        mapping=copy.deepcopy(MAP);mapping["market_type"]="PLACE"
        with self.assertRaises(ValueError):B.parse_file(CSV.encode(),"prices.csv",mapping)
    def test_refuse_result_ambiguity(self):
        with self.assertRaises(ValueError):B.parse_file(CSV.replace("5.1,0","5.1,1").encode(),"prices.csv",MAP)
    def test_refuse_timezone_naive(self):
        with self.assertRaises(ValueError):B.parse_file(CSV.replace("+00:00","").encode(),"prices.csv",MAP)

class TestFreeze(unittest.TestCase):
    def test_v3_archived_immutably(self):
        f=sample_feed()
        with tempfile.TemporaryDirectory() as tmp:
            one=V.archive(f,Path(tmp),NOW)
            two=V.archive(f,Path(tmp),NOW)
            self.assertEqual(one["forecasts_archived"],1)
            self.assertEqual(two["forecasts_archived"],1)
            records=list(Path(tmp).rglob("*.json"))
            self.assertEqual(len(records),1)
            record=json.loads(records[0].read_text())
            self.assertEqual(record["model"],V.MODEL)
            self.assertEqual(record["publication_gate"],"BLOCKED")
            self.assertAlmostEqual(sum(x["model_probability"] for x in record["runners"]),1)
            self.assertEqual(record["record_sha256"],V.fingerprint({k:v for k,v in record.items() if k!="record_sha256"}))
    def test_v3_rejects_unknown_history(self):
        f=sample_feed();f["races"][0]["runners"][1]["previous_results"]=[]
        with tempfile.TemporaryDirectory() as tmp:
            report=V.archive(f,Path(tmp),NOW)
            self.assertEqual(report["forecasts_archived"],0)
    def test_v3_rejects_post_race(self):
        f=sample_feed();f["races"][0]["startUTC"]="2026-11-15T10:59:00Z"
        self.assertIsNotNone(V.attempt(f["races"][0],NOW)[1])
    def test_v3_rejects_stale_runner_field(self):
        f=sample_feed();f["races"][0]["runner_observed_at_utc"]="2026-11-15T09:00:00+00:00"
        self.assertIsNotNone(V.attempt(f["races"][0],NOW)[1])
    def test_v3_rejects_hurdles(self):
        f=sample_feed();f["races"][0]["run_type"]="HURDLE"
        self.assertEqual(V.attempt(f["races"][0],NOW)[1],"OUTSIDE_FLAT_ALL_WEATHER_SCOPE")
    def test_v3_rejects_missing_source_receipt(self):
        f=sample_feed();f["races"][0]["runner_source_sha256"]=None
        self.assertIsNotNone(V.attempt(f["races"][0],NOW)[1])
    def test_v3_rejects_tampered_feed(self):
        f=sample_feed();f["publication_gate"]="OPEN"
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):V.archive(f,Path(tmp),NOW)
    def test_v3_rejects_duplicate_runner(self):
        f=sample_feed();f["races"][0]["runners"][1]["horse_id"]="h1"
        self.assertIsNotNone(V.attempt(f["races"][0],NOW)[1])
    def test_v3_rejects_future_form(self):
        f=sample_feed()
        for r in f["races"][0]["runners"]:
            r["previous_results"]=[{"race_id":"late","date":"2026-11-16","run_type":"FLAT","position":1,"runner_count":8}]
        self.assertIsNotNone(V.attempt(f["races"][0],NOW)[1])

if __name__=="__main__":unittest.main()
