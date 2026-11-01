#!/usr/bin/env python3
"""Experiment 42: independently verify completed Experiment 41 GitHub run/artifact.
Read-only, fail-closed. Never commits forecasts, publishes, or counts challenges.
"""
import datetime as dt,hashlib,io,json,os,pathlib,sys,subprocess,zipfile
from experiment21_ledger import check_record,identity,timestamp
from experiment39_training_inclusion_audit import canonical,sha

OUT=pathlib.Path("/tmp/experiment42")
REPO="aurelian2483-cmd/value-watch-lab"
RUN_ID=41260673856
EXPECTED_SHA="c691c78122ae89408ba12d22935129df5aa1e5cb"
ARTIFACT="experiment41-server-witnessed-review"
EXPECTED_CANDIDATES="3830e30e44356d608da9d469889e9a000e03da3ab6209cc9df57c168a5d4cf5f"
EXPECTED_BINDINGS="7901f1ca6ae9948234a508aba009f34f69918b7a706bdc4860c434e771fa95bc"
EXPECTED_MANIFEST="5256b4983c40bb9a79c772e676af6662d6e7b00886702e00f8146155e80bfe71"
KICKOFFS={"Everton":"2026-11-06T20:00:00Z","Leeds United":"2026-11-07T12:30:00Z",
          "Fulham":"2026-11-07T15:00:00Z","Nottingham Forest":"2026-11-07T17:30:00Z"}
def api(url,limit=3000000):
    token=os.environ.get("GH_TOKEN")
    if not token or not token.strip():
        raise ValueError("GH_TOKEN unavailable; authenticated GitHub API required")
    if not url.startswith("https://api.github.com/repos/"+REPO+"/"):
        raise ValueError("unexpected GitHub API endpoint")
    # GitHub CLI handles token authentication and artifact download redirects.
    # Never print token, response body, or authenticated request headers.
    try:
        p=subprocess.run(["gh","api",url,"--method","GET",
            "-H","Accept: application/vnd.github+json"],
            capture_output=True,timeout=50,check=False)
    except (OSError,subprocess.TimeoutExpired) as exc:
        raise ValueError("GitHub CLI API request unavailable: "+type(exc).__name__) from None
    if p.returncode:
        detail=p.stderr.decode("utf-8","replace")
        # Avoid exposing response details, including any unexpected credentials.
        raise ValueError("GitHub CLI API request failed for "+url.split("/repos/",1)[1].split("?",1)[0]+
                         " (exit "+str(p.returncode)+", authentication or permission may be denied)")
    if len(p.stdout)>limit:raise ValueError("GitHub response exceeds size limit")
    return p.stdout
def read_json(url):return json.loads(api(url))
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":42,"status":"BLOCKED_PENDING","mode":"READ_ONLY_FAIL_CLOSED",
            "publishing_enabled":False,"challenge_eligible":0,"publication_gate":"BLOCKED",
            "independent_training_cutoff_established":False,"run_id":RUN_ID}
    try:
        if os.environ.get("GITHUB_ACTIONS")!="true" or os.environ.get("GITHUB_REPOSITORY")!=REPO:
            raise ValueError("must execute within authorised repository GitHub Actions")
        if os.environ.get("GITHUB_REF")!="refs/heads/research/prospective-100":
            raise ValueError("unexpected branch")
        base="https://api.github.com/repos/"+REPO
        run=read_json(base+"/actions/runs/"+str(RUN_ID))
        if run.get("id")!=RUN_ID or run.get("head_sha")!=EXPECTED_SHA:
            raise ValueError("target run ID or exact head SHA mismatch")
        if run.get("head_branch")!="research/prospective-100" or run.get("event") not in ("push","workflow_dispatch"):
            raise ValueError("target run branch/event mismatch")
        if run.get("status")!="completed" or run.get("conclusion")!="success":
            raise ValueError("target run not successfully completed")
        if run.get("run_attempt")!=1:
            raise ValueError("rerun attempt requires separate audit")
        if run.get("path","").split("@")[0]!=".github/workflows/experiment41-server-witnessed-dry-run.yml":
            raise ValueError("wrong workflow path")
        jobs=read_json(base+"/actions/runs/"+str(RUN_ID)+"/jobs?per_page=100").get("jobs",[])
        if len(jobs)!=1 or jobs[0].get("conclusion")!="success" or jobs[0].get("status")!="completed":
            raise ValueError("unexpected target job completion")
        arts=read_json(base+"/actions/runs/"+str(RUN_ID)+"/artifacts?per_page=100").get("artifacts",[])
        found=[a for a in arts if a.get("name")==ARTIFACT and a.get("workflow_run",{}).get("id")==RUN_ID]
        if len(found)!=1 or found[0].get("expired") is not False:
            raise ValueError("artifact missing, ambiguous or expired")
        art=found[0]
        if art["workflow_run"].get("head_sha")!=EXPECTED_SHA:
            raise ValueError("artifact head SHA mismatch")
        zipraw=api(base+"/actions/artifacts/"+str(art["id"])+"/zip",10000000)
        ziphash=sha(zipraw)
        digest=art.get("digest")
        if not digest or digest!="sha256:"+ziphash:
            raise ValueError("GitHub artifact digest mismatch")
        with zipfile.ZipFile(io.BytesIO(zipraw)) as z:
            names=z.namelist()
            expected={"candidate-records-review.json","fixture-bindings-review.json",
                      "manifest-review.json","report.json"}
            if set(names)!=expected or len(names)!=4:raise ValueError("unexpected ZIP file entries")
            if any(z.getinfo(n).file_size>1000000 for n in names):
                raise ValueError("oversized artifact entry")
            content={n:z.read(n) for n in names}
        manifest=json.loads(content["manifest-review.json"])
        prior=json.loads(content["report.json"])
        records=json.loads(content["candidate-records-review.json"])
        bindings=json.loads(content["fixture-bindings-review.json"])
        if sha(canonical(manifest))!=EXPECTED_MANIFEST or prior.get("manifest_sha256")!=EXPECTED_MANIFEST:
            raise ValueError("manifest hash mismatch")
        if sha(canonical(records))!=EXPECTED_CANDIDATES or manifest.get("candidate_records_sha256")!=EXPECTED_CANDIDATES:
            raise ValueError("candidate records hash mismatch")
        if sha(canonical(bindings))!=EXPECTED_BINDINGS or manifest.get("fixture_bindings_sha256")!=EXPECTED_BINDINGS:
            raise ValueError("fixture binding hash mismatch")
        if prior.get("status")!="SERVER_RUN_CREATED_PREKICKOFF_DRY_RUN_CUTOFF_BLOCKED":
            raise ValueError("unexpected Experiment 41 status")
        if manifest.get("run_id")!=RUN_ID or manifest.get("head_sha")!=EXPECTED_SHA or manifest.get("repository")!=REPO:
            raise ValueError("manifest GitHub identity mismatch")
        if manifest.get("candidate_count")!=4 or len(records)!=4 or len(bindings)!=4:
            raise ValueError("unexpected candidate count")
        if any(x.get("challenge_eligible")!=0 for x in (manifest,prior)):
            raise ValueError("challenge eligibility changed")
        created=timestamp(run["created_at"])
        completed=timestamp(run["updated_at"])
        forecast_finished=dt.datetime.fromisoformat(manifest["forecast_completed_before_utc"].replace("Z","+00:00"))
        uploaded=timestamp(art["created_at"])
        if not created<=forecast_finished<=uploaded<=completed:
            raise ValueError("server and forecast timestamp ordering invalid")
        indexed={tuple(b["fixture_identity"]):b for b in bindings}
        if len(indexed)!=4:raise ValueError("ambiguous fixture binding identities")
        for r in records:
            check_record(r,completed)
            if r["home"] not in KICKOFFS or r["kickoff_utc"]!=KICKOFFS[r["home"]]:
                raise ValueError("unexpected fixture")
            if not completed<timestamp(r["kickoff_utc"]):
                raise ValueError("GitHub completion not pre-kickoff")
            b=indexed.get(identity(r))
            if not b or b.get("candidate_original_sha256")!=sha(canonical(r)):
                raise ValueError("fixture binding does not match exact candidate")
            if b.get("binding_status")!="TWO_SOURCE_BOUND_REVIEW_ONLY":
                raise ValueError("unverified fixture binding")
        report.update(status="EXPERIMENT41_COMPLETED_ARTIFACT_VERIFIED_REVIEW_ONLY_CUTOFF_BLOCKED",
                      head_sha=EXPECTED_SHA,artifact_id=art["id"],artifact_name=ARTIFACT,
                      artifact_zip_sha256=ziphash,github_run_created_at_utc=run["created_at"],
                      github_run_completed_at_utc=run["updated_at"],
                      artifact_uploaded_at_utc=art["created_at"],
                      candidate_records_sha256=EXPECTED_CANDIDATES,
                      fixture_bindings_sha256=EXPECTED_BINDINGS,
                      manifest_sha256=EXPECTED_MANIFEST,
                      pre_kickoff_completed=True,verified_candidates=4,
                      server_receipt_gate="COMPLETED_RUN_AND_ARTIFACT_VERIFIED_REVIEW_ONLY",
                      missing_requirements=["Historical first-available result timestamps remain unverified",
                          "Review artifact is not an immutable committed forecast ledger",
                          "No publication authority or model validation"])
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","verified_candidates","artifact_id","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
