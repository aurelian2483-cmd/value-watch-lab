#!/usr/bin/env python3
"""Experiment 76: isolated recovery test; never delete live artifacts or archive."""
import hashlib,json,pathlib,subprocess,sys,tempfile,shutil,os
ROOT=pathlib.Path(__file__).resolve().parents[1]
ORIGINAL=ROOT/"research/forecast-archive/v1"
REGISTRY=ROOT/"scripts/experiment69_forecast_registry.py"
def run_case(base,expect_success):
 env=dict(os.environ)
 p=subprocess.run([sys.executable,str(REGISTRY)],cwd=base,text=True,capture_output=True,env=env)
 if (p.returncode==0)!=expect_success:
  raise AssertionError("unexpected registry outcome: "+p.stdout+" "+p.stderr)
 return p
def main():
 files=sorted(ORIGINAL.glob("*.json"))
 if not files:raise AssertionError("no archived forecasts to test")
 with tempfile.TemporaryDirectory(prefix="experiment76-") as td:
  wd=pathlib.Path(td);dest=wd/"research/forecast-archive/v1";dest.mkdir(parents=True)
  for f in files:shutil.copy2(f,dest/f.name)
  history=pathlib.Path("/tmp/experiment68-history");history.mkdir(parents=True,exist_ok=True)
  (history/"artifact-inventory.json").write_text('{"artifacts":[]}')
  p=run_case(wd,True)
  registry=json.loads((history/"registry.json").read_text())
  assert registry["complete"] is True
  assert registry["experiment63_artifact_count"]==0
  assert registry["archive_record_count"]==len(files)
  assert len(registry["forecasts"])==len(files)
  assert registry["duplicate_records"]==[]
  assert all(r["experiment"]==74 for r in registry["forecasts"])
  assert registry["challenge_eligible"]==0 and registry["publication_gate"]=="BLOCKED"
  first=files[0]
  target=dest/first.name
  x=json.loads(target.read_text());x["prob_home"]=0.99
  target.write_text(json.dumps(x))
  p=run_case(wd,False)
  failed=json.loads((history/"registry-report.json").read_text())
  assert failed["status"]=="BLOCKED_AUDIT_ERROR"
  assert "integrity mismatch" in failed["error"]
  report={"experiment":76,"status":"ARCHIVE_ONLY_RECOVERY_AND_TAMPER_REJECTION_PASSED",
   "archived_records_tested":len(files),"artifact_inventory_count":0,
   "duplicate_records":0,"corruption_rejected":True,
   "model_validation":"UNVALIDATED","publication_gate":"BLOCKED","challenge_eligible":0}
  pathlib.Path("/tmp/experiment76-report.json").write_text(json.dumps(report,indent=2)+"\n")
  print(json.dumps(report))
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(json.dumps({"experiment":76,"status":"FAILED","error":str(e)}));sys.exit(1)
