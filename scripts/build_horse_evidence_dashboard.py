#!/usr/bin/env python3
"""Build a read-only, research-only racing evidence dashboard.

The output is a static HTML+JSON GitHub Actions artifact; it is NOT served on
the betting site. Source rows are validated before being included; figures
refer to archived observations, never independently attested announcements.
"""
import argparse
import datetime as dt
import html
import json
from collections import Counter, defaultdict
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint, when
from diff_racing_field_observations import evaluate, load_valid
from compare_horse_bsp_models import valid_forecast, BASE, V3
from audit_horse_field_revisions import reconcile

ROOT=Path(__file__).resolve().parents[1]
GATES={"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED"}

def load_json(paths):
    valid=[];failures=0
    for path in paths:
        try:valid.append(json.loads(path.read_text()))
        except (OSError,ValueError,UnicodeError):failures+=1
    return valid,failures

def build(field_paths,forecast_paths,v3_paths,reference_time):
    now=when(reference_time)
    day=now.date().isoformat()
    field_audit=evaluate(field_paths)
    groups,_=load_valid(field_paths)
    latest={}
    valid_captures=0
    for (race,start),items in groups.items():
        for at,row in items:
            valid_captures+=1
            if at<=now and (race,start) not in latest or ((race,start) in latest and latest[(race,start)][0]<at<=now):
                latest[(race,start)]=(at,row)
    date_rows=[(race,start,at,row) for (race,start),(at,row) in latest.items() if at.date().isoformat()==day]
    stale=sum(1 for _,_,at,_ in date_rows if (now-at).total_seconds()>3600)
    future_dates=sum(1 for _,_,at,_ in date_rows if at>now)
    today_changes=[r for r in field_audit["changes"] if r["later_observed_at_utc"][:10]==day and when(r["later_observed_at_utc"])<=now]
    all_forecasts,failed_reads=load_json([*forecast_paths,*v3_paths])
    model_counts=Counter();invalid_forecasts=0;valid_archives=[]
    for f in all_forecasts:
        try:
            key,at,probs=valid_forecast(f)
            if at>now:raise ValueError("Future forecast")
            model_counts[f["model"]]+=1
            valid_archives.append(f)
        except (KeyError,ValueError,TypeError,OverflowError):
            invalid_forecasts+=1
    if not all(f["model"] in (BASE,V3) for f in valid_archives):
        raise ValueError("Unexpected model")
    conflicts=reconcile(valid_archives)
    # Excluded historical field conflicts remain explicit; do not select a
    # retrospectively winning field or count resolved withdrawals from them.
    current=[{"race_id":race,"startUTC":start.isoformat(),
              "source_observed_at_utc":at.isoformat(),
              "minutes_since_observation":round((now-at).total_seconds()/60,1),
              "active_runners":len(row["active_runner_ids"]),
              "source_nonrunner_count":sum(r["runner_status"]!="RUNNER" for r in row["runners"]),
              "receipt_sha256":row["record_sha256"],
              "evidence_tier":"SINGLE_PUBLISHER_NOT_OFFICIAL"} 
             for race,start,at,row in sorted(date_rows,key=lambda x:(x[1],x[0]))]
    result={"schema_version":1,"type":"VALUE_WATCH_HORSE_RESEARCH_HEALTH_V1",
            **GATES,"betting_eligible":False,"report_generated_at_utc":now.isoformat(),
            "report_day_utc":day,
            "coverage":{"archived_field_files":len(field_paths),
                        "validated_v2_observations":valid_captures,
                        "unique_races_with_v2_observations":len(groups),
                        "current_day_races_with_source_observation":len(current),
                        "current_day_stale_last_observation_over_60m":stale,
                        "current_day_changes_observed":len(today_changes),
                        "v1_frozen_forecasts":model_counts[BASE],
                        "v3_frozen_forecasts":model_counts[V3],
                        "invalid_forecasts":invalid_forecasts+failed_reads,
                        "historical_conflicting_field_races":conflicts["unique_races_with_conflicting_fields"],
                        "historical_affected_forecast_revisions":conflicts["revisions_affected"],
                        "bsp_receipts_imported_into_this_dashboard":0,
                        "betting_candidates_approved":0},
            "quality":{"invalid_or_legacy_field_snapshots":field_audit["invalid_snapshots"],
                       "future_timed_today_rows_not_counted":future_dates,
                       "historical_conflict_classifications":conflicts["classifications"],
                       "source_refresh_health":"PARTIAL_OBSERVATION" if current else "NO_CURRENT_DAY_SOURCE_OBSERVATION",
                       "official_withdrawals_confirmed_by_this_dashboard":0},
            "latest_source_race_fields":current,
            "current_day_changes":today_changes,
            "evidence_gaps":[
                "Source-observed status does not establish official non-runner announcement or original source availability.",
                "Latest source observation over 60 minutes is labelled stale; 60 minutes is a dashboard display threshold, not model eligibility.",
                "V3 forecasts remain restricted to approved scope; absent V3 archives are not filled with guesses.",
                "Historical conflicting forecast fields are unresolved until independently verified.",
                "No authorized Betfair BSP field mapping is attached to this dashboard. This report does not claim an exchange-data audit.",
                "GitHub scheduled collection is best-effort; missed runs cannot be reconstructed as observations."],
            "limitations":["Static snapshot only; not a live stream or betting recommendation.",
                           "UTC reporting day; UK winter time matches UTC, but daily counts will differ in BST.",
                           "Research-only, unvalidated forecasts and source evidence; no calibrated edge."]}
    result["report_sha256"]=fingerprint(result)
    return result

def document(report):
    esc=lambda v:html.escape(str(v),quote=True)
    c=report["coverage"];q=report["quality"]
    cards=[("Source-observed races today",c["current_day_races_with_source_observation"]),
           ("Last observation stale >60m",c["current_day_stale_last_observation_over_60m"]),
           ("Publisher field changes today",c["current_day_changes_observed"]),
           ("Frozen V1 forecasts (all history)",c["v1_frozen_forecasts"]),
           ("Frozen V3 forecasts (all history)",c["v3_frozen_forecasts"]),
           ("Unresolved historical race fields",c["historical_conflicting_field_races"])]
    badges="".join('<article class="metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></article>' for label,value in cards)
    body="".join("<tr><td>"+esc(r["race_id"])+"</td><td>"+esc(r["startUTC"])+"</td><td>"+esc(r["source_observed_at_utc"])+"</td><td>"+esc(r["minutes_since_observation"])+"</td><td>"+esc(r["active_runners"])+"</td><td>"+esc(r["source_nonrunner_count"])+"</td></tr>" for r in report["latest_source_race_fields"])
    if not body:body='<tr><td colspan="6">No validated publisher-observed race fields for this UTC day.</td></tr>'
    changes="".join("<li>Race "+esc(r["race_id"])+": observed "+esc(len(r["removed_active_runner_ids"]))+" fewer active IDs and "+esc(len(r["added_active_runner_ids"]))+" newly active IDs; these are publisher changes, not official scratch confirmations.</li>" for r in report["current_day_changes"])
    if not changes:changes="<li>No eligible publisher field changes observed today; this is not evidence of no withdrawals.</li>"
    gaps="".join("<li>"+esc(x)+"</li>" for x in report["evidence_gaps"])
    return """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Value Watch — Horse Research Evidence Health</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0c1424;color:#e7edf8}
*{box-sizing:border-box}body{margin:0 auto;max-width:1180px;padding:30px 20px 60px}
h1{font-size:clamp(1.55rem,3vw,2.4rem);margin:.3rem 0}.muted{color:#a7b6cb}.pill{display:inline-block;border:1px solid #64748b;border-radius:18px;padding:5px 10px;color:#f4cf8c;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:24px 0}.metric,.panel{border:1px solid #293b55;background:#15233a;border-radius:16px;padding:18px}
.metric span{display:block;color:#b9c8d9;font-size:.87rem;min-height:40px}.metric strong{display:block;font-size:2rem;margin-top:10px}
.panel{margin:16px 0}h2{font-size:1.13rem;margin:0 0 12px}table{border-collapse:collapse;width:100%;font-size:.89rem}
th,td{padding:11px 9px;border-bottom:1px solid #2e415d;text-align:left}th{color:#c3d5e9}
.scroll{overflow-x:auto}li{margin:7px 0}.foot{font-size:.86rem;color:#a7b6cb}
</style></head><body>
<div class="pill">RESEARCH ONLY · UNVALIDATED · BETTING BLOCKED</div>
<h1>Value Watch — Racing Evidence Health</h1>
<p class="muted">Read-only snapshot for UTC day DAY; generated at GENERATED. Not live odds or model validation.</p>
<div class="grid">CARDS</div>
<section class="panel"><h2>Recent source-observed race fields</h2><div class="scroll"><table><thead><tr>
<th>Race ID</th><th>Race UTC</th><th>Source observed UTC</th><th>Age (min)</th><th>Active</th><th>Source non-runners</th>
</tr></thead><tbody>ROWS</tbody></table></div></section>
<section class="panel"><h2>Publisher field transitions today</h2><ul>CHANGES</ul></section>
<section class="panel"><h2>Evidence gaps and controls</h2><ul>GAPS</ul></section>
<p class="foot">Archive counts are historical, not all today's races. A source-observed non-runner is not a confirmed official regulator announcement. No BSP, edge, ROI, Kelly sizing or wagering advice is generated. Report hash: HASH.</p>
</body></html>""".replace("DAY",esc(report["report_day_utc"])).replace("GENERATED",esc(report["report_generated_at_utc"])).replace("CARDS",badges).replace("ROWS",body).replace("CHANGES",changes).replace("GAPS",gaps).replace("HASH",esc(report["report_sha256"]))

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--fields",type=Path,default=ROOT/"research/horse-v3/field-observation-archive")
    p.add_argument("--v1",type=Path,default=ROOT/"research/horse-form-archive/v1")
    p.add_argument("--v3",type=Path,default=ROOT/"research/horse-v3/live-archive")
    p.add_argument("--output",required=True,type=Path)
    p.add_argument("--at",type=str,default=None)
    a=p.parse_args()
    at=a.at or dt.datetime.now(dt.timezone.utc).isoformat()
    result=build(sorted(a.fields.glob("*/*.json")),sorted(a.v1.glob("*.json")),sorted(a.v3.glob("*/*.json")),at)
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/"index.html").write_text(document(result))
    (a.output/"evidence.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"report_day":result["report_day_utc"],"source_races_today":result["coverage"]["current_day_races_with_source_observation"],
                      "field_changes_today":result["coverage"]["current_day_changes_observed"],
                      "historical_v1":result["coverage"]["v1_frozen_forecasts"],"historical_v3":result["coverage"]["v3_frozen_forecasts"],
                      "publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
