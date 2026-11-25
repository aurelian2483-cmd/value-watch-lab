"""Separate, single-source development study; never retries the OpenLigaDB API."""
import json
import sys
from datetime import date, datetime, timezone
from urllib.request import build_opener
from benchmark import (OPEN, OPEN_BLOB, OPEN_SIZE, FLAGS, NoRedirect,
                       retrieve, git_blob, secondary, benchmark, sha, need)

def analyze(raw):
    need(len(raw)==OPEN_SIZE and git_blob(raw)==OPEN_BLOB,"Pinned source bytes changed")
    rows=secondary(raw)
    special=rows[("union","bochum")]
    need(special["day"]==date(2024,12,14),"Adjudicated fixture identity not established")
    ordinary=[v for k,v in rows.items() if k!=("union","bochum")]
    result=benchmark(ordinary,date_only=True)
    need(result["paired_targets"]+sum(result["excluded_before_scoring"].values())==305,"Count mismatch")
    return {"kind":"SINGLE_SOURCE_HISTORICAL_DEVELOPMENT_STUDY","schemaVersion":1,
            "observedAt":datetime.now(timezone.utc).isoformat(),"season":"2024/25",
            "source":{"url":OPEN,"sha256":sha(raw),"gitBlob":OPEN_BLOB,"bytes":len(raw),
                      "license":"CC0 1.0 publisher declaration"},
            "source_structure_accepted":306,"quarantined_adjudication":1,"development_cohort":305,
            "independently_certified_rows":0,"cross_source_agreement_established":False,
            "comparison":result,"history_policy":"Date-only source; at least two complete intervening calendar days",
            "network_requests":1,"openligadb_requests":0,"raw_records_published":False,
            "research_computation_performed":True,
            "limitations":["Separate development-only diagnostic after two-source pilot stopped at an unrecognized alias.",
                           "No source independence or historical label-availability attestation.",
                           "Public retrospective data are not a protected or untouched holdout.",
                           "Fixed method scores only; no model qualification, selection or deployment."],**FLAGS}

if __name__=="__main__":
    try:
        need(sys.argv[1:]==["--single-source-development-only"],"Explicit scope required")
        opener=build_opener(NoRedirect()).open
        raw=retrieve(opener,OPEN,256*1024)
        print(json.dumps(analyze(raw),indent=2,allow_nan=False))
    except Exception as error:
        print("Single-source study blocked: "+type(error).__name__,file=sys.stderr)
        sys.exit(1)
