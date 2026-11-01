#!/usr/bin/env python3
"""Experiment 36: bind two-source fixture evidence to model candidates, audit cutoff.
READ-ONLY. Never authorises publication or creates an immutable ledger record.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,sys
from experiment23_pipeline import main as build
from experiment21_ledger import check_record,identity
from sky_espn_strict_crosscheck import Sky,fetch,get_espn,sky_match,espn_match,parse_time,URL

OUT=pathlib.Path("/tmp/experiment36")
def sha(b):return hashlib.sha256(b).hexdigest()
def canonical(obj):return json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()
def audit_csv(path,generated):
    raw=path.read_bytes()
    reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    required={"Date","HomeTeam","AwayTeam","FTHG","FTAG","FTR"}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):
        raise ValueError("training input missing required fields")
    complete=[];future=[];malformed=[]
    for number,row in enumerate(reader,2):
        if not any((v or "").strip() for v in row.values() if isinstance(v,str)):continue
        try:
            day=dt.datetime.strptime(row["Date"],"%d/%m/%Y").date()
            present=all(row.get(k) not in (None,"") for k in required)
            if present:
                h,a=int(row["FTHG"]),int(row["FTAG"])
                if h<0 or a<0 or row["FTR"]!=("H" if h>a else "A" if a>h else "D"):
                    raise ValueError("result inconsistency")
            if day>=generated.date():
                future.append(number)
            elif present:complete.append(day)
            else:malformed.append(number)
        except Exception:
            malformed.append(number)
    if malformed:raise ValueError(f"{path.name}: malformed/incomplete rows; first lines {malformed[:10]}")
    if future:raise ValueError(f"{path.name}: dated today/future rows present in input snapshot; cannot establish complete input cutoff; first lines {future[:10]}")
    if not complete:raise ValueError(f"{path.name}: no complete historical matches")
    return {"file":path.name,"sha256":sha(raw),"completed_rows":len(complete),
            "latest_completed_match_date":max(complete).isoformat(),
            "date_granularity":"DAY_ONLY_NO_INDEPENDENT_COMPLETION_TIMES",
            "independent_training_cutoff_established":False}
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    now=dt.datetime.now(dt.timezone.utc)
    report={"experiment":36,"mode":"READ_ONLY_FAIL_CLOSED","started_at_utc":now.isoformat(),
            "challenge_eligible":0,"publishing_enabled":False,
            "publication_gate":"BLOCKED","server_receipt_gate":"BLOCKED_NO_IMMUTABLE_RECORD",
            "status":"BLOCKED_PENDING_AUDIT","fixtures":[],"missing_requirements":[]}
    try:
        build()
        upstream=json.loads(pathlib.Path("/tmp/experiment23/review.json").read_text())
        if upstream.get("commit_enabled") is not False or upstream.get("challenge_eligible")!=0:
            raise ValueError("unsafe upstream publication contract")
        candidates=upstream.get("records")
        if not isinstance(candidates,list) or len(candidates)!=4:
            raise ValueError("expected exactly four real model candidates")
        if len({identity(r) for r in candidates})!=4:raise ValueError("duplicate fixture identities")
        for r in candidates:check_record(r,dt.datetime.now(dt.timezone.utc))
        # The model uses only dates strictly before today's UTC date. This
        # checks input snapshots; it cannot establish per-match completion times.
        training=[]
        for filename in ("E0_2526.csv","E0_2627.csv"):
            training.append(audit_csv(pathlib.Path("/tmp/experiment23")/filename,now))
        report["training_input_audit"]=training
        sky_raw=fetch();sky=Sky();sky.feed(sky_raw.decode("utf-8","replace"))
        evidence=[]
        for r in candidates:
            kickoff=parse_time(r["kickoff_utc"])
            if kickoff<=dt.datetime.now(dt.timezone.utc):raise ValueError("kickoff already passed")
            match=sky_match(sky,r["home"],r["away"],kickoff)
            espn_raw=get_espn(kickoff)
            espn_match(r["home"],r["away"],kickoff,espn_raw)
            verified_at=dt.datetime.now(dt.timezone.utc).isoformat()
            entry={"fixture_key":list(identity(r)),"sky_source":URL,"sky_sha256":sha(sky_raw),
                   "sky_heading":match["date_heading"],"sky_teams":match["teams"],
                   "sky_time":match["time"][0],
                   "espn_source":"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates="+kickoff.strftime("%Y%m%d")+"&limit=100",
                   "espn_sha256":sha(espn_raw),"verified_at_utc":verified_at,
                   "source_binding_status":"EVIDENCE_SIDECAR_ONLY_CANDIDATE_SOURCE_NOT_REPLACED",
                   "candidate_fixture_source":r["fixture_source"],
                   "candidate_source_verified_at_utc":r["source_verified_at_utc"],
                   "candidate_generated_at_utc":r["generated_at_utc"],
                   "model_sha256":r["model_sha256"],"data_sha256":r["data_sha256"],
                   "publication_gate":"BLOCKED"}
            evidence.append(entry)
        report["fixtures"]=evidence
        report["two_source_matches"]=len(evidence)
        report["candidate_records_sha256"]=sha(canonical(candidates))
        report["evidence_sha256"]=sha(canonical(evidence))
        report["model_inputs"]=upstream.get("inputs")
        report["missing_requirements"]=[
            "Training CSV has date-only match data; independent per-match completion cutoff not established",
            "Candidate fixture_source and source_verified_at_utc remain unbound to independently generated evidence",
            "No immutable pre-kickoff committed forecast record",
            "No independently audited GitHub Actions server receipt or exact committed record bytes",
            "No append-only ledger uniqueness and full publication-gate approval"]
        report["status"]="FOUR_FIXTURES_BOUND_TO_REVIEW_EVIDENCE_PUBLICATION_BLOCKED"
        (OUT/"candidates-review.json").write_bytes(canonical(candidates)+b"\n")
        (OUT/"evidence-review.json").write_bytes(canonical(evidence)+b"\n")
    except Exception as exc:
        report["error"]=str(exc)
        report["status"]="BLOCKED_AUDIT_FAILED"
    finally:
        report["finished_at_utc"]=dt.datetime.now(dt.timezone.utc).isoformat()
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({"status":report["status"],"two_source_matches":report.get("two_source_matches",0),"challenge_eligible":0,"publishing_enabled":False,"error":report.get("error")}))
    if report["status"]=="BLOCKED_AUDIT_FAILED":sys.exit(1)
if __name__=="__main__":main()
