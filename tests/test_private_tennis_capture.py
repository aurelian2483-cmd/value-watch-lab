"""Offline private tennis original-byte and archive identity tests."""
import hashlib
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime,timezone
from pathlib import Path

SCRIPTS=Path(__file__).resolve().parents[1]/"scripts"
sys.path.insert(0,str(SCRIPTS))
from private_result_capture import PrivateResultCapture,PrivateCaptureError
from ingest_private_tennis_secondary import ingest

WHEN="2026-11-23T15:17:50Z"
PRED="tennis:atp-187503:MATCH_WINNER:FIXED_ELO_K24_V1"
WTA="tennis:wta-186789:MATCH_WINNER:FIXED_ELO_K24_V1"
ATP_URL="https://www.nittoatpfinals.com/en/news/zverev-shelton-nitto-atp-finals-2026-tuesday"
WTA_URL="https://wtafiles.wtatennis.com/pdf/draws/2026/2076/MDS.pdf"
HTML=b"<!DOCTYPE html><html><head><title>Example results</title></head><body>Illustrative source only</body></html>"
PDF=b"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n"
def sha(data):return hashlib.sha256(data).hexdigest()
def row(sport="atp",data=None):
    wta=sport=="wta"
    original=PDF if wta else HTML
    return {
        "prediction_id": WTA if wta else PRED,
        "sport":"tennis","event_id":"wta-186789" if wta else "atp-187503",
        "market":"MATCH_WINNER","actual_outcome":"2375","status":"SECONDARY_UNVERIFIED",
        "independently_verified":False,"betting_eligible":False,
        "participant_ids":["2375","9250"],"observed_at_utc":WHEN,
        "source_url":WTA_URL if wta else ATP_URL,
        "response_sha256":sha(original if data is None else data),
        "receipt_kind":"PROVIDER_PDF" if wta else "REVIEWED_SOURCE_FACTS",
        "source_match_status":"COMPLETED_SINGLES_RESULT","source_competition":"Tennis test",
        "source_match_players":["Player A","Player B"],"source_match_winner":"Player A"
    }
def archive(records):
    return {"schema_version":1,"research_only":True,
      "model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
      "observations":records}
class TennisPrivateCapture(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix="bottleneck-tennis-")
        self.root=Path(self.tmp.name)/"private"
        self.root.mkdir(mode=0o700)
        self.store=PrivateResultCapture(self.root,Path(__file__).resolve().parents[1])
        self.source=Path(self.tmp.name)/"source.html"
        self.source.write_bytes(HTML)
        os.chmod(self.source,0o600)
        self.secondary=Path(self.tmp.name)/"secondary.json"
        self.secondary.write_text(json.dumps(archive([row()])))
    def tearDown(self):self.tmp.cleanup()
    def test_atp_article_original_bytes(self):
        got=self.store.preserve_tennis_secondary_observation(row(),HTML)
        self.assertEqual(got["status"],"TENNIS_ORIGINAL_BYTES_MATCH_PRIVATE_RECEIPT_UNATTESTED")
        self.assertFalse(got["independently_authenticated"])
        self.assertFalse(got["historical_capture_time_attested"])
        manifest=self.store.manifest()
        self.assertEqual(manifest["records"][0]["side"],"second_source")
        self.assertEqual((self.root/manifest["records"][0]["relative_path"]).read_bytes(),HTML)
    def test_wta_pdf_original_bytes(self):
        self.store.preserve_tennis_secondary_observation(row("wta"),PDF)
        self.assertEqual(self.store.manifest()["records"][0]["source_url"],WTA_URL)
    def test_both_tennis_types_and_manifest_sorted(self):
        self.store.preserve_tennis_secondary_observation(row(),HTML)
        self.store.preserve_tennis_secondary_observation(row("wta"),PDF)
        self.assertEqual(len(self.store.manifest()["records"]),2)
        self.assertEqual({r["prediction_id"] for r in self.store.manifest()["records"]},{PRED,WTA})
    def test_same_receipt_idempotent_and_conflicting_bytes_refused(self):
        self.store.preserve_tennis_secondary_observation(row(),HTML)
        self.assertFalse(self.store.preserve_tennis_secondary_observation(row(),HTML)["raw_object_new"])
        alternate=HTML+b" "
        with self.assertRaisesRegex(PrivateCaptureError,"Conflicting"):
            self.store.preserve_tennis_secondary_observation(row(data=alternate),alternate)
    def test_bad_hash_or_non_original_source_format_fails(self):
        x=row();x["response_sha256"]="f"*64
        with self.assertRaisesRegex(PrivateCaptureError,"fingerprint"):
            self.store.preserve_tennis_secondary_observation(x,HTML)
        with self.assertRaisesRegex(PrivateCaptureError,"format"):
            self.store.preserve_tennis_secondary_observation(row(data=PDF),PDF)
    def test_untrusted_url_and_kind_refused(self):
        for url in ["http://www.nittoatpfinals.com/en/news/example",
          "https://evil.example/en/news/anything",
          ATP_URL+"?client=1",
          "https://www.nittoatpfinals.com/en/private/sensitive"]:
            x=row();x["source_url"]=url
            with self.assertRaisesRegex(PrivateCaptureError,"source"):
                self.store.preserve_tennis_secondary_observation(x,HTML)
        x=row();x["receipt_kind"]="PROVIDER_PDF"
        with self.assertRaisesRegex(PrivateCaptureError,"source"):
            self.store.preserve_tennis_secondary_observation(x,HTML)
    def test_invalid_participants_and_winner_refused(self):
        for modify in [
          lambda x:x.update(source_match_players=["one","one"]),
          lambda x:x.update(source_match_winner="Unknown"),
          lambda x:x.update(participant_ids=["2375","2375"]),
          lambda x:x.update(actual_outcome="outside"),
          lambda x:x.update(source_competition="")
        ]:
            x=row();modify(x)
            with self.assertRaisesRegex(PrivateCaptureError,"identity"):
                self.store.preserve_tennis_secondary_observation(x,HTML)
    def test_no_false_certification(self):
        for field,v in [("independently_verified",True),
                        ("betting_eligible",True),
                        ("status","VERIFIED"),
                        ("market","OUTRIGHT")]:
            x=row();x[field]=v
            with self.assertRaisesRegex(PrivateCaptureError,"eligible"):
                self.store.preserve_tennis_secondary_observation(x,HTML)
    def test_cli_ingests_only_exact_matching_archived_receipt(self):
        out=ingest(self.root,self.source,PRED,self.secondary)
        self.assertEqual(out["body_sha256"],sha(HTML))
        self.assertEqual(len(self.store.manifest()["records"]),1)
    def test_cli_fails_on_unknown_or_duplicate_archive_id(self):
        with self.assertRaisesRegex(PrivateCaptureError,"Missing or duplicate"):
            ingest(self.root,self.source,"unknown",self.secondary)
        self.secondary.write_text(json.dumps(archive([row(),row()])))
        with self.assertRaisesRegex(PrivateCaptureError,"Missing or duplicate"):
            ingest(self.root,self.source,PRED,self.secondary)
    def test_cli_rejects_exposed_source_file_and_symlink(self):
        os.chmod(self.source,0o644)
        with self.assertRaisesRegex(PrivateCaptureError,"owner-only"):
            ingest(self.root,self.source,PRED,self.secondary)
        os.chmod(self.source,0o600)
        linked=Path(self.tmp.name)/"link.html"
        linked.symlink_to(self.source)
        with self.assertRaisesRegex(PrivateCaptureError,"regular"):
            ingest(self.root,linked,PRED,self.secondary)
    def test_no_original_bytes_kept_in_public_or_marked_verified(self):
        self.store.preserve_tennis_secondary_observation(row(),HTML)
        result=self.store.manifest()
        self.assertNotIn("Illustrative source",json.dumps(result))
        self.assertTrue(all("relative_path" in x and x["side"]=="second_source" for x in result["records"]))
        self.assertFalse(self.store.preserve_tennis_secondary_observation(row(),HTML)["independently_authenticated"])
if __name__=="__main__":unittest.main()
