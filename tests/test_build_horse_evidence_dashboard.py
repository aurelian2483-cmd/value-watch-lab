"""Static evidence dashboard checks: freshness, integrity, zero-gambling gate."""
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_market_benchmark_v1 import fingerprint
from build_horse_evidence_dashboard import build,document

NOW="2026-11-15T13:30:00+00:00"
def field(at,active=True):
    rows=[{"horse_id":"101","name":"A","runner_status":"RUNNER","active_runner":True},
          {"horse_id":"102","name":"B","runner_status":"RUNNER" if active else "NONRUNNER","active_runner":active},
          {"horse_id":"103","name":"C","runner_status":"RUNNER","active_runner":True}]
    x={"schema_version":1,"kind":"SOURCE_OBSERVED_RACING_FIELD_V2",
       "research_only":True,"publication_gate":"BLOCKED","model_validation":"UNVALIDATED",
       "official_nonrunner_announcement_verified":False,
       "race_id":"100101","startUTC":"2026-11-15T17:00:00Z",
       "source_observed_at_utc":at,"capture_processed_at_utc":at,"runners":rows,
       "active_runner_ids":[r["horse_id"] for r in rows if r["active_runner"]]}
    x["record_sha256"]=fingerprint(x);return x
def save(folder,x):
    path=Path(folder)/(x["record_sha256"]+".json")
    path.write_text(json.dumps(x));return path
class DashboardTests(unittest.TestCase):
    def test_date_field_and_status_change(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths=[save(tmp,field("2026-11-15T12:00:00Z")),save(tmp,field("2026-11-15T13:20:00Z",False))]
            r=build(paths,[],[],NOW)
            self.assertEqual(r["coverage"]["current_day_races_with_source_observation"],1)
            self.assertEqual(r["coverage"]["current_day_changes_observed"],1)
            self.assertEqual(r["coverage"]["v3_frozen_forecasts"],0)
            self.assertEqual(r["coverage"]["betting_candidates_approved"],0)
            self.assertEqual(r["quality"]["official_withdrawals_confirmed_by_this_dashboard"],0)
            self.assertEqual(r["report_sha256"],fingerprint({k:v for k,v in r.items() if k!="report_sha256"}))
    def test_old_legacy_invalid_and_not_promoted(self):
        with tempfile.TemporaryDirectory() as tmp:
            x=field("2026-11-15T12:00:00Z");x["kind"]="SOURCE_OBSERVED_RACING_FIELD_V1"
            x["record_sha256"]=fingerprint({k:v for k,v in x.items() if k!="record_sha256"})
            r=build([save(tmp,x)],[],[],NOW)
            self.assertEqual(r["coverage"]["current_day_races_with_source_observation"],0)
            self.assertEqual(r["quality"]["invalid_or_legacy_field_snapshots"]["INVALID_OR_INELIGIBLE_SNAPSHOT"],1)
    def test_last_observation_age(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=build([save(tmp,field("2026-11-15T11:00:00Z"))],[],[],NOW)
            self.assertEqual(r["coverage"]["current_day_stale_last_observation_over_60m"],1)
    def test_no_evidence_still_reports(self):
        r=build([],[],[],NOW)
        self.assertEqual(r["coverage"]["current_day_races_with_source_observation"],0)
        self.assertEqual(r["quality"]["source_refresh_health"],"NO_CURRENT_DAY_SOURCE_OBSERVATION")
        self.assertIn("RESEARCH ONLY",document(r))
        self.assertNotIn("<script",document(r))
    def test_html_escapes_external_names(self):
        r=build([],[],[],NOW)
        r["evidence_gaps"]=["<img src=x onerror=alert(1)>"]
        page=document(r)
        self.assertIn("&lt;img",page)
        self.assertNotIn("<img",page)
    def test_future_records_not_as_current(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=build([save(tmp,field("2026-11-15T15:00:00Z"))],[],[],NOW)
            self.assertEqual(r["coverage"]["current_day_races_with_source_observation"],0)
if __name__=="__main__":unittest.main()
