"""Synthetic chronological admission contract. No real data access or model execution."""
from datetime import datetime,timedelta,timezone
from collections import Counter,defaultdict
import json
import re
from readiness import FLAGS,digest,need

PARTITIONS=("development","calibration","holdout")
FIELDS={"eventId","groupId","contract","precision","issuedAt","eventAt","featureAvailableAt",
        "labelAvailableAt","trainingCutoffAt","trainingManifestSha256","partition"}
def utc(s):
    need(isinstance(s,str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z",s),"Explicit UTC second required")
    d=datetime.strptime(s,"%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    need(d.strftime("%Y-%m-%dT%H:%M:%SZ")==s,"Noncanonical UTC")
    return d

def plan_windows(plan,expected):
    need(isinstance(plan,dict) and set(plan)=={"kind","schemaVersion","embargoSeconds","windows","contract"},"Invalid plan fields")
    need(plan["kind"]=="SYNTHETIC_TEMPORAL_PLAN" and type(plan["schemaVersion"]) is int and plan["schemaVersion"]==1 and plan["contract"]=="ARTIFICIAL_BINARY_V1","Synthetic plan only")
    need(digest(plan)==expected,"Plan anchor mismatch")
    gap=plan["embargoSeconds"]
    need(type(gap) is int and 86400<=gap<=30*86400,"Invalid embargo")
    windows=plan["windows"]
    need(isinstance(windows,list) and len(windows)==3,"Three windows required")
    out={}
    prior=None
    for name,w in zip(PARTITIONS,windows):
        need(isinstance(w,dict) and set(w)=={"partition","start","end"} and w["partition"]==name,"Invalid window identity")
        start,end=utc(w["start"]),utc(w["end"])
        need(start<end and (prior is None or start-prior>=timedelta(seconds=gap)),"Chronological windows overlap or embargo insufficient")
        out[name]=(start,end);prior=end
    return out

def identifier(s):
    return isinstance(s,str) and re.fullmatch(r"synthetic-[a-z0-9-]{1,80}",s) is not None

def admission(plan,expected,rows):
    windows=plan_windows(plan,expected)
    need(isinstance(rows,list) and len(rows)<=1000,"Bounded synthetic rows required")
    preliminary=[]
    seen=Counter()
    groups=defaultdict(set)
    for row in rows:
        need(isinstance(row,dict) and set(row)==FIELDS and identifier(row["eventId"]) and identifier(row["groupId"]),"Unexpected record schema or non-synthetic identifier")
        seen[row["eventId"]]+=1
        reason=None;actual=None
        try:
            times={k:utc(row[k]) for k in ("issuedAt","eventAt","featureAvailableAt","labelAvailableAt","trainingCutoffAt")}
            t=times["eventAt"]
            actual=next((name for name,(start,end) in windows.items() if start<=t<end),None)
            if actual is not None:groups[row["groupId"]].add(actual)
            if row["precision"]!="EXACT_SECOND":reason="TIME_PRECISION_UNSUPPORTED"
            elif row["contract"]!=plan["contract"]:reason="CONTRACT_MISMATCH"
            elif actual is None:reason="OUTSIDE_WINDOWS"
            elif row["partition"]!=actual:reason="PARTITION_MISMATCH"
            elif not (windows[actual][0]<=times["issuedAt"]<t<times["labelAvailableAt"]<windows[actual][1]):reason="ISSUE_OR_LABEL_WINDOW_INVALID"
            elif times["featureAvailableAt"]>times["issuedAt"]:reason="FEATURE_LOOKAHEAD"
            elif times["trainingCutoffAt"]>times["issuedAt"]:reason="TRAINING_LOOKAHEAD"
            elif actual!="development" and times["trainingCutoffAt"]>=windows[PARTITIONS[PARTITIONS.index(actual)-1]][1]:reason="TRAINING_CUTOFF_NOT_FROZEN"
            elif not isinstance(row["trainingManifestSha256"],str) or not re.fullmatch(r"[0-9a-f]{64}",row["trainingManifestSha256"]):reason="INVALID_TRAINING_MANIFEST"
        except (ValueError,TypeError,OverflowError):
            reason="TIMESTAMP_INVALID"
        preliminary.append((row,actual,reason))
    accepted=Counter({k:0 for k in PARTITIONS});rejected=Counter()
    for row,actual,reason in preliminary:
        if seen[row["eventId"]]!=1:reason="DUPLICATE_EVENT"
        elif len(groups[row["groupId"]])>1:reason="CROSS_PARTITION_GROUP"
        if reason:rejected[reason]+=1
        else:accepted[actual]+=1
    need(sum(accepted.values())+sum(rejected.values())==len(rows),"Count mismatch")
    payload={"kind":"SYNTHETIC_TEMPORAL_ADMISSION_QA","schemaVersion":1,"planSha256":expected,
      "input":len(rows),"accepted":sum(accepted.values()),"rejected":sum(rejected.values()),
      "acceptedByPartition":dict(accepted),"rejectedByReason":dict(sorted(rejected.items())),
      "realEvaluationEligibleRows":0,**FLAGS,
      "limitations":["Artificial identifiers and metadata only; no real partition or outcomes opened.",
      "Declared training manifest is format-checked, not independently authenticated. No model fitting or actual holdout approval.",
      "A partition assignment cannot establish underlying provider rights, label accuracy or timestamp authenticity."]}
    return {**payload,"reviewSha256":digest(payload)}

def fixture():
    plan={"kind":"SYNTHETIC_TEMPORAL_PLAN","schemaVersion":1,"embargoSeconds":86400,"contract":"ARTIFICIAL_BINARY_V1",
          "windows":[{"partition":"development","start":"2020-01-01T00:00:00Z","end":"2020-01-10T00:00:00Z"},
                     {"partition":"calibration","start":"2020-01-11T00:00:00Z","end":"2020-01-20T00:00:00Z"},
                     {"partition":"holdout","start":"2020-01-21T00:00:00Z","end":"2020-01-30T00:00:00Z"}]}
    rows=[]
    for i,(partition,day,train) in enumerate(zip(PARTITIONS,(2,12,22),(1,9,19))):
        rows.append({"eventId":"synthetic-event-"+str(i),"groupId":"synthetic-group-"+str(i),"contract":"ARTIFICIAL_BINARY_V1",
                     "precision":"EXACT_SECOND","partition":partition,"issuedAt":f"2020-01-{day:02d}T09:00:00Z",
                     "eventAt":f"2020-01-{day:02d}T12:00:00Z","featureAvailableAt":f"2020-01-{day:02d}T08:00:00Z",
                     "labelAvailableAt":f"2020-01-{day:02d}T14:00:00Z","trainingCutoffAt":f"2020-01-{train:02d}T00:00:00Z",
                     "trainingManifestSha256":str(i+1)*64})
    return plan,rows

if __name__=="__main__":
    plan,rows=fixture()
    print(json.dumps(admission(plan,digest(plan),rows),indent=2))
