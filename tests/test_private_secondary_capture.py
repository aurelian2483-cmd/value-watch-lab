"""Offline original-response preservation for the NFL second-source collector.

Uses synthetic ESPN, TheSportsDB and nflverse payloads; no real provider calls.
"""
import hashlib
import io
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path

SCRIPTS=Path(__file__).resolve().parents[1]/'scripts'
sys.path.insert(0,str(SCRIPTS))
import collect_secondary_nfl_results as S
import capture_prospective_research as C
from private_result_capture import PrivateResultCapture,PrivateCaptureError

NOW=datetime(2026,11,20,18,tzinfo=timezone.utc)
START=C.iso(NOW-timedelta(days=1))
ESPNU="https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&week=11"
SDURL=S.API+"?d=2026-11-19&s=American+Football&l=NFL"

def sha(b):return hashlib.sha256(b).hexdigest()
def prediction():
    return {"prediction_id":"nfl:nfl-777:GAME_RESULT_INCLUDING_OVERTIME:MODEL",
      "sport":"nfl","event_id":"nfl-777","market":"GAME_RESULT_INCLUDING_OVERTIME",
      "source_url":ESPNU,"event_start_utc":START,"participant_ids":["10","20"],
      "probabilities":{"10":.7,"20":.28,"tie":.02}}
def primary_identity():
    return {"events":[{"competitions":[{"id":"777","date":START,"competitors":[
      {"id":"10","homeAway":"home","team":{"displayName":"Team Alpha","abbreviation":"BAL"}},
      {"id":"20","homeAway":"away","team":{"displayName":"Team Beta","abbreviation":"LAC"}}
    ]}]}]}
def second_event():
    return {"idEvent":"88764","strSport":"American Football","strLeague":"NFL",
      "strHomeTeam":"Team Alpha","strAwayTeam":"Team Beta","strStatus":"Final",
      "strTimestamp":START,"intHomeScore":"21","intAwayScore":"17"}
def sportsdb():
    return {"events":[second_event()]}
def serialized(value):return json.dumps(value,sort_keys=True,separators=(",",":")).encode()
def fetched(value):
    b=serialized(value)
    return value,sha(b),b,C.iso(NOW)
def nflverse_csv():
    header="espn,game_id,game_type,gameday,gametime,home_team,away_team,home_score,away_score\n"
    row="777,2026_11_LAC_BAL,REG,2026-11-19,13:00,BAL,LAC,21,17\n"
    return (header+row).encode()
def nflverse_index():
    return {"777":[{
      "game_id":"2026_11_LAC_BAL","game_type":"REG","gameday":"2026-11-19",
      "gametime":"13:00","home_team":"BAL","away_team":"LAC",
      "home_score":"21","away_score":"17"}]}
def ledger():return {"schemaVersion":1,"kind":"PROSPECTIVE_PREDICTION_LEDGER","records":[prediction()]}
def archive():return {"schema_version":1,"publication_gate":"BLOCKED","observations":[]}
def secondary_evidence(url=SDURL,raw=None):
    identity=S.espn_identity(primary_identity(),prediction())
    b=serialized(sportsdb()) if raw is None else raw
    return S.sportsdb_observation(sportsdb(),identity,prediction(),NOW,url,sha(b))
def two_sources(url,mode="normal"):
    if url==ESPNU:return fetched(primary_identity())
    if url==SDURL:
        if mode=="no_result":return fetched({"events":[]})
        if mode=="mismatch":
            d,h,b,t=fetched(sportsdb())
            return d,h,b+b"tamper",t
        if mode=="late":
            d,h,b,t=fetched(sportsdb())
            return d,h,b,C.iso(NOW+timedelta(days=1))
        return fetched(sportsdb())
    raise AssertionError("unexpected source URL: "+url)

class PrivateSecondaryCapture(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix="bottleneck-second-source-")
        self.path=Path(self.tmp.name)/"private"
        self.path.mkdir(mode=0o700)
        self.capture=PrivateResultCapture(self.path,Path(__file__).resolve().parents[1])

    def tearDown(self):self.tmp.cleanup()

    def test_direct_sportsdb_bytes_and_manifest_side(self):
        raw=serialized(sportsdb())
        result=self.capture.preserve_secondary_observation(secondary_evidence(),raw)
        self.assertEqual(result["status"],"SECOND_SOURCE_BYTES_PRESERVED_LOCALLY_UNATTESTED")
        self.assertFalse(result["independently_authenticated"])
        items=self.capture.manifest()["records"]
        self.assertEqual(len(items),1)
        self.assertEqual(items[0]["side"],"second_source")
        self.assertEqual(items[0]["source_url"],SDURL)
        self.assertEqual((self.path/items[0]["relative_path"]).read_bytes(),raw)

    def test_nflverse_bytes_are_retained_with_explicit_allowlisted_url(self):
        b=nflverse_csv()
        x=S.nflverse_observation(nflverse_index(),
            S.espn_identity(primary_identity(),prediction()),
            prediction(),NOW,sha(b))
        self.assertIsNotNone(x)
        r=self.capture.preserve_secondary_observation(x,b)
        self.assertFalse(r["independently_authenticated"])
        self.assertEqual(self.capture.manifest()["records"][0]["source_url"],S.NFLVERSE)

    def test_primary_and_secondary_same_prediction_do_not_conflict(self):
        raw=serialized(primary_identity())
        prior={"prediction_id":prediction()["prediction_id"],"sport":"nfl","event_id":"nfl-777",
          "market":"GAME_RESULT_INCLUDING_OVERTIME","actual_outcome":"10",
          "source_url":ESPNU,"source_observed_at_utc":C.iso(NOW),
          "provider_response_sha256":sha(raw),"status":"SINGLE_PROVIDER_FINAL_UNVERIFIED",
          "independently_verified":False,"betting_eligible":False}
        self.capture.preserve_observation(prior,raw)
        self.capture.preserve_secondary_observation(secondary_evidence(),serialized(sportsdb()))
        items=self.capture.manifest()["records"]
        self.assertEqual({x["side"] for x in items},{"first_source","second_source"})
        self.assertEqual(len(items),2)
        self.assertEqual(len(list(self.capture.receipts.glob("*.json"))),2)

    def test_second_source_duplicate_is_idempotent(self):
        raw=serialized(sportsdb())
        x=self.capture.preserve_secondary_observation(secondary_evidence(),raw)
        y=self.capture.preserve_secondary_observation(secondary_evidence(),raw)
        self.assertTrue(x["raw_object_new"])
        self.assertFalse(y["raw_object_new"])
        self.assertEqual(len(self.capture.manifest()["records"]),1)

    def test_first_write_second_source_is_immutable(self):
        raw=serialized(sportsdb())
        self.capture.preserve_secondary_observation(secondary_evidence(),raw)
        altered=raw+b" "
        with self.assertRaisesRegex(PrivateCaptureError,"Conflicting"):
            self.capture.preserve_secondary_observation(secondary_evidence(raw=altered),altered)
        self.assertEqual(len(self.capture.manifest()["records"]),1)

    def test_rejects_unsafe_sources_and_wrong_market(self):
        raw=serialized(sportsdb())
        for url in [
          "https://evil.example/irrelevant", "http://www.thesportsdb.com/api/v1/json/123/eventsday.php",
          SDURL+"&l=Other",SDURL+"&extra=1",
          "https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=2026-11-19",
          S.NFLVERSE+"?token=abc"
        ]:
            x=secondary_evidence()
            x["source_url"]=url
            with self.assertRaisesRegex(PrivateCaptureError,"allowlist"):
                self.capture.preserve_secondary_observation(x,raw)
        x=secondary_evidence();x["market"]="SCORELINE"
        with self.assertRaisesRegex(PrivateCaptureError,"market"):
            self.capture.preserve_secondary_observation(x,raw)

    def test_rejects_forged_certification_bad_hash_and_no_bytes(self):
        raw=serialized(sportsdb())
        for key,value in [("independently_verified",True),("betting_eligible",True),
            ("status","VERIFIED")]:
            x=secondary_evidence();x[key]=value
            with self.assertRaisesRegex(PrivateCaptureError,"eligible"):
                self.capture.preserve_secondary_observation(x,raw)
        x=secondary_evidence();x["response_sha256"]="0"*64
        with self.assertRaisesRegex(PrivateCaptureError,"hash"):
            self.capture.preserve_secondary_observation(x,raw)
        for invalid in [b"",bytearray(raw),b"x"*3_000_001]:
            with self.assertRaisesRegex(PrivateCaptureError,"bytes"):
                self.capture.preserve_secondary_observation(secondary_evidence(),invalid)

    def test_corrupt_original_second_source_file_invalidates_manifest(self):
        raw=serialized(sportsdb())
        self.capture.preserve_secondary_observation(secondary_evidence(),raw)
        item=self.capture.manifest()["records"][0]
        (self.path/item["relative_path"]).write_bytes(b"tampered")
        with self.assertRaisesRegex(PrivateCaptureError,"tampered"):
            self.capture.manifest()

    def test_sportsdb_collector_opt_in_requires_and_retains_actual_bytes(self):
        data=archive()
        status=S.collect(ledger(),data,NOW,fetcher=two_sources,private_capture=self.capture)
        self.assertEqual(status["new_secondary_claims"],1,status)
        self.assertEqual(status["private_capture_failures"],0)
        self.assertEqual(len(self.capture.manifest()["records"]),1)
        self.assertEqual(data["observations"][0]["source_url"],SDURL)
        self.assertFalse(data["observations"][0]["independently_verified"])

    def test_legacy_fetcher_two_fields_without_private_capture_remains_supported(self):
        data=archive()
        status=S.collect(ledger(),data,NOW,fetcher=lambda url:two_sources(url)[:2])
        self.assertEqual(status["new_secondary_claims"],1,status)
        self.assertEqual(status["private_capture_failures"],0)
        self.assertEqual(len(self.capture.manifest()["records"]),0)

    def test_two_field_secondary_with_private_capture_fails_closed(self):
        data=archive()
        status=S.collect(ledger(),data,NOW,fetcher=lambda url:two_sources(url)[:2],
                         private_capture=self.capture)
        self.assertEqual(status["new_secondary_claims"],0,status)
        self.assertGreater(status["source_errors"],0)
        self.assertEqual(data["observations"],[])

    def test_mismatched_secondary_original_bytes_fail_closed(self):
        data=archive()
        status=S.collect(ledger(),data,NOW,fetcher=lambda u:two_sources(u,"mismatch"),
                         private_capture=self.capture)
        self.assertEqual(status["new_secondary_claims"],0,status)
        self.assertGreater(status["source_errors"],0)
        self.assertEqual(self.capture.manifest()["records"],[])

    def test_wrong_secondary_capture_time_fails_closed(self):
        data=archive()
        status=S.collect(ledger(),data,NOW,fetcher=lambda u:two_sources(u,"late"),
                         private_capture=self.capture)
        self.assertEqual(status["new_secondary_claims"],0,status)
        self.assertGreater(status["source_errors"],0)

    def test_nflverse_private_fallback_preserves_csv(self):
        data=archive()
        b=nflverse_csv()
        fallback=lambda:(nflverse_index(),sha(b),b,C.iso(NOW))
        status=S.collect(ledger(),data,NOW,
                         fetcher=lambda url:two_sources(url,"no_result"),
                         schedules_fetcher=fallback,private_capture=self.capture)
        self.assertEqual(status["nflverse_claims"],1,status)
        self.assertEqual(data["observations"][0]["source_url"],S.NFLVERSE)
        self.assertEqual(self.capture.manifest()["records"][0]["side"],"second_source")

    def test_nflverse_private_fallback_without_raw_bytes_withheld(self):
        data=archive();b=nflverse_csv()
        status=S.collect(ledger(),data,NOW,
                         fetcher=lambda url:two_sources(url,"no_result"),
                         schedules_fetcher=lambda:(nflverse_index(),sha(b)),
                         private_capture=self.capture)
        self.assertEqual(status["nflverse_claims"],0,status)
        self.assertGreater(status["source_errors"],0)
        self.assertEqual(data["observations"],[])

    def test_no_live_provider_or_public_data_writes_in_private_test(self):
        data=archive()
        S.collect(ledger(),data,NOW,fetcher=two_sources,private_capture=self.capture)
        files={p.name for p in self.capture.receipts.glob("*.json")}
        self.assertEqual(len(files),1)
        self.assertEqual(data["publication_gate"],"BLOCKED")
        self.assertTrue(all(x["betting_eligible"] is False for x in data["observations"]))

if __name__=="__main__":unittest.main()
