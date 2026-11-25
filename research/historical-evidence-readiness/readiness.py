"""Verify the accepted aggregate data archive without reading source datasets."""
import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path

ARCHIVE_SHA="a7bbd094720c3c3daf1c3ce0759563ffee2802f1da001b6259f355c6e9d6ce34"
REVISION="cb8ca042a91c7127361ec0277caf467766d3fab2"
BASE="38378e3c66f26a43b019314586fdbd03ec97b2ab"
MANIFEST_SHA="6d897815e295ce795b1f06eb640cf4c3391c16d3fa44c084f3bfb733f9bee1f7"
PACKET_SHA="2d47ed4e42b94e00e11e0e2932c819490c7fb65978c1a75fbd5bde832ef5cc89"
MEMBERS={"documentary-review-packet.json","index.html","integrated-status.html","integrated-status.json","manifest.json","quality-report.json","source-audit.json"}
# Git tree metadata independently inspected for both exact checkouts.
BLOBS={
 "historical-reliability-data.json":("858bb6857402b1f63a5ae943d71bd949c60e7157",348423),
 "prediction-ledger.json":("5698ae6d7f4af10adf6bcd00b8c024ce3454e687",84612),
 "results-feed.json":("5feddf86ef85f0c1b67da2e867d6c504bc255e23",226),
 "research/result-review-status.json":("2a6e58f299105a3900ab18b8d9b3bc534873e5ce",29480),
 "football-expanded-data.json":("b83290b2b82ece640264ba410e4511650d894277",538431),
 "international-football-data.json":("d96fd18b4257d04cabdb8f5ba1850c2ad743229a",16391),
 "darts/feed.json":("71700b0d1a24f29380511f88822d7096394b33bc",41222),
 "rugby-research-data.json":("9ae6070ddb30df54bdc710f2c2b75fbb34c626bd",207557),
 "other-sports-data.json":("5758b324a8a3bb3647bae67d384d10f3dc33a142",78118),
}
FLAGS={"researchOnly":True,"modelValidation":"UNVALIDATED","publicationGate":"BLOCKED","executionAuthorized":False,"dispatchAuthorized":False,"accessAuthorized":False,"validationAuthorized":False,"repairAuthorized":False,"sourceMutationAuthorized":False}
def need(ok,msg):
    if not ok:raise ValueError(msg)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def digest(obj,sort=True):
    return sha(json.dumps(obj,sort_keys=sort,ensure_ascii=False,separators=(",",":"),allow_nan=False).encode())
def hex64(s):return isinstance(s,str) and re.fullmatch("[a-f0-9]{64}",s) is not None
def gate(obj):
    need(obj.get("researchOnly") is True and obj.get("publicationGate")=="BLOCKED" and obj.get("executionAuthorized") is False and obj.get("validationAuthorized") is False,"Unsafe archive report")
def tree_rows(tree):
    need(tree.get("truncated") is False and isinstance(tree.get("tree"),list),"Incomplete Git tree")
    result={}
    for row in tree["tree"]:
        name=row.get("path")
        if name in BLOBS:
            need(name not in result and row.get("type")=="blob" and row.get("mode")=="100644","Unexpected source tree object")
            result[name]=(row.get("sha"),row.get("size"))
    need(result==BLOBS,"Source Git metadata changed")
    return result

def review(raw,old_tree,new_tree):
    need(0<len(raw)<=1024*1024 and sha(raw)==ARCHIVE_SHA,"Pinned archive fingerprint mismatch")
    tree_rows(old_tree);tree_rows(new_tree)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        members=z.infolist()
        need(len(members)==len(MEMBERS) and {i.filename for i in members}==MEMBERS,"Archive inventory mismatch")
        need(all(not i.is_dir() and 0<i.file_size<=1024*1024 for i in members),"Invalid archive member")
        def read(name):return json.loads(z.read(name))
        m,q,p,i=(read(n) for n in ("manifest.json","quality-report.json","documentary-review-packet.json","integrated-status.json"))
    for obj in (m,q,p,i):
        gate(obj);need(obj.get("declaredSourceRevision")==REVISION,"Report revision mismatch")
    need(m.get("kind")=="CENTRAL_DATA_INTEGRITY_MANIFEST" and q.get("kind")=="CENTRAL_DATA_QUALITY_REPORT" and p.get("kind")=="SOURCE_DOCUMENTARY_REVIEW_PACKET" and i.get("kind")=="INTEGRATED_RESEARCH_DATA_STATUS","Report identity mismatch")
    need(m["sourceStableDuringInspection"] is True and q["inspectionConsistent"] is True and p["inspectionConsistent"] is True and i["dataQuality"]["aggregateCountsAgree"] is True,"Inconsistent inspection")
    need(m["manifestSha256"]==q["manifestSha256"]==p["manifestSha256"]==i["dataQuality"]["manifestSha256"]==MANIFEST_SHA,"Manifest binding mismatch")
    need(digest({k:v for k,v in m.items() if k!="manifestSha256"})==MANIFEST_SHA,"Manifest canonical mismatch")
    need(p["packetSha256"]==PACKET_SHA and digest({k:v for k,v in p.items() if k!="packetSha256"},False)==PACKET_SHA,"Packet hash mismatch")
    sources=q["sources"];tasks=p["tasks"];claims=q["provenanceReview"]["sources"]
    need(all(len(rows)==9 and {r["path"] for r in rows}==set(BLOBS) for rows in (sources,tasks,claims)),"Source identity mismatch")
    receipt_by_path={s["path"]:s for s in sources}
    for path in BLOBS:
        s=receipt_by_path[path];t=next(x for x in tasks if x["path"]==path);c=next(x for x in claims if x["path"]==path)
        need(s["status"]=="PRESENT" and s["bytes"]==BLOBS[path][1] and hex64(s["sha256"]),"Source receipt mismatch")
        binding={"path":path,"sourceSha256":s["sha256"],"declaredRevision":REVISION,"manifestSha256":MANIFEST_SHA}
        need(all(t.get(k)==v for k,v in binding.items()) and t["taskId"]==digest(binding,False),"Task binding mismatch")
        need(t["status"]=="DOCUMENTARY_REVIEW_REQUIRED" and t["independentReviewRecorded"] is False and t["accessAuthorized"] is False,"Unexpected review permission")
        need(c["status"]=="NO_RECORDED_CLAIM" and c["claimCount"]==0 and all(c[k] is False for k in ("provenanceVerified","rightsVerified","independenceVerified","accessAuthorized")),"Unexpected source authorization")
    for s in m["sources"]:
        need(all(s[k]==receipt_by_path[s["path"]][k] for k in ("status","sha256","bytes")),"Structural source binding mismatch")
    h=q["historical"]["counts"];v=q["prospective"]["counts"];states=q["prospective"]["reviewStatusCounts"]
    need(m["historical"]==q["historical"] and m["prospective"]==q["prospective"] and h==i["dataQuality"]["historical"] and v==i["dataQuality"]["prospective"],"Aggregate count mismatch")
    need(h=={"input":782,"accepted":782,"duplicates":0,"conflicting":0,"rejected":0},"Unexpected historical counts")
    need(v=={"predictionInput":80,"structurallyAccepted":80,"rejected":0,"duplicateOrConflict":0,"reviewInput":80,"matchedReview":80,"unmatchedAccepted":0,"outcomeFeedInput":0},"Unexpected prospective counts")
    need(states=={"READY_FOR_HUMAN_REVIEW":36,"AWAITING_PRIMARY_FINAL":2,"AWAITING_INDEPENDENT_SOURCE":20,"AWAITING_EVENT":22},"Unexpected review states")
    need(q["historical"]["evidenceTier"]=="SINGLE_SOURCE_UNVERIFIED" and q["historical"]["timePrecision"]=="DATE_ONLY_END_OF_DAY","Unexpected evidence tier")
    payload={"kind":"HISTORICAL_EVALUATION_READINESS","schemaVersion":1,"status":"BLOCKED_PENDING_EVIDENCE_REVIEW",
     "archiveSha256":ARCHIVE_SHA,"archiveReportRevision":REVISION,"comparedResearchRevision":BASE,
     "sourceGitMetadataMatches":9,"sourceContentsRehashed":False,"sourceClaimsRecorded":0,
     "historicalStructurallyAccepted":h["accepted"],"historicalTier":q["historical"]["evidenceTier"],
     "historicalTimePrecision":q["historical"]["timePrecision"],"prospectiveStructurallyAccepted":v["structurallyAccepted"],
     "archivedOutcomeFeedRows":v["outcomeFeedInput"],"archivedReviewStates":states,"realEvaluationEligibleRows":0,
     "blockers":["APPLICABLE_SOURCE_RIGHTS_UNVERIFIED","INDEPENDENT_SOURCE_AUTHENTICITY_UNVERIFIED","NO_ARCHIVED_VERIFIED_OUTCOMES","PROTECTED_SPLIT_NOT_AUTHORIZED","HISTORICAL_EXACT_AVAILABILITY_UNESTABLISHED"],
     "candidateSource":"OpenLigaDB — ODbL 1.0 documented; separate bounded pilot requires review and authorization",
     **FLAGS,"limitations":["Historical report checkpoint, not a live-main inventory.","Git tree metadata compared without opening source files; source SHA-256 claims are not rehashed here.","No outcome, prediction vector, protected partition or provider feed read. No grant of rights or permission."]}
    return {**payload,"reviewSha256":digest(payload)}

if __name__=="__main__":
    try:
        need(len(sys.argv)==4,"Usage: readiness.py <archive> <old-tree-json> <research-tree-json>")
        archive=Path(sys.argv[1])
        need(archive.stat().st_size<=1024*1024,"Archive too large")
        print(json.dumps(review(archive.read_bytes(),*(json.loads(Path(x).read_text(encoding="utf-8")) for x in sys.argv[2:])),indent=2,allow_nan=False))
    except (OSError,ValueError,KeyError,TypeError,zipfile.BadZipFile) as e:
        print(str(e),file=sys.stderr);sys.exit(1)
