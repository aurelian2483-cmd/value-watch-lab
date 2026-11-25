"""One-shot, approval-bound fixed QA admission. Not a production scheduler."""
import hashlib
import json
from controller import REV,HEX,MAX_TIME,need

JOBS=(("probe","cpu-probe","CPU","QUEUED"),("local","local-qa","CPU","QUEUED"),("gpu","gpu-qa","GPU","BLOCKED_GPU"))
def encode(plan):
    return json.dumps(plan,sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8")
def digest(plan):
    return hashlib.sha256(encode(plan)).hexdigest()
def validate(plan,anchor,revision):
    need(type(plan) is dict and set(plan)=={"schema","revision","opensAt","closesAt","scope"},"Invalid plan")
    need(type(plan["schema"]) is int and plan["schema"]==1 and plan["scope"]=="FIXED_QA_ONLY","Unapproved scope")
    need(isinstance(plan["revision"],str) and REV.fullmatch(plan["revision"]) and plan["revision"]==revision,"Revision mismatch")
    start,end=plan["opensAt"],plan["closesAt"]
    need(type(start) is int and type(end) is int and 0<=start<end<=MAX_TIME and end-start<=3600,"Invalid admission window")
    need(isinstance(anchor,str) and HEX.fullmatch(anchor) and digest(plan)==anchor,"Approval anchor mismatch")
    return start,end

class Scheduler:
    def __init__(self,service,operator,plan,anchor):
        start,end=validate(plan,anchor,service._revision)
        self.service=service
        self.anchor=anchor
        self.start,self.end=start,end
        self.revision=plan["revision"]
        with service._controller.tx() as db:
            service._guard("operator",operator,scope=True)(db)
            db.execute("CREATE TABLE IF NOT EXISTS qa_schedule(id INTEGER PRIMARY KEY CHECK(id=1), anchor TEXT NOT NULL, revision TEXT NOT NULL, opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('WAITING','ADMITTED','MISSED','CANCELLED')), decided_at INTEGER)")
            row=db.execute("SELECT * FROM qa_schedule WHERE id=1").fetchone()
            if row is None:
                need(not db.execute("SELECT 1 FROM jobs LIMIT 1").fetchone(),"Schedule requires a fresh queue")
                db.execute("INSERT INTO qa_schedule VALUES(1,?,?,?,?,'WAITING',NULL)",(anchor,self.revision,start,end))
            else:
                self.check(row)
    def check(self,row):
        need(row is not None and (row["anchor"],row["revision"],row["opens_at"],row["closes_at"])==(self.anchor,self.revision,self.start,self.end),"Schedule policy mismatch")
    def read(self,db):
        row=db.execute("SELECT * FROM qa_schedule WHERE id=1").fetchone()
        self.check(row)
        return {"kind":"FIXED_QA_ADMISSION","approvalSha256":self.anchor,"revision":self.revision,"opensAt":self.start,"closesAt":self.end,
                "state":row["state"],"decidedAt":row["decided_at"],"homePcRequired":False,"gpuDispatchAuthorized":False,
                "productionDispatchAuthorized":False,"publicationGate":"BLOCKED","researchStatus":"UNVALIDATED"}
    def status(self,observer):
        c=self.service._controller
        # Reuse read-only status transaction and its observer authorization.
        import sqlite3
        db=sqlite3.connect(c.path.resolve().as_uri()+"?mode=ro",uri=True,timeout=10)
        db.row_factory=sqlite3.Row
        try:
            db.execute("BEGIN")
            self.service._guard("observer",observer,scope=True)(db)
            return self.read(db)
        finally:
            db.close()
    def poll(self,operator,*,cancel=False):
        need(type(cancel) is bool,"Invalid cancellation")
        c=self.service._controller
        with c.tx() as db:
            self.service._guard("operator",operator,scope=True)(db)
            now=self.service._clock()
            c.tick(db,now)
            row=self.read(db)
            if row["state"]!="WAITING":
                return row
            if cancel:
                state="CANCELLED"
            elif now>=self.end:
                state="MISSED"
            elif now<self.start:
                return row
            else:
                need(not db.execute("SELECT 1 FROM jobs LIMIT 1").fetchone(),"Queue already populated; review required")
                for job,kind,backend,state in JOBS:
                    db.execute("INSERT INTO jobs(id,revision,kind,backend,state) VALUES(?,?,?,?,?)",(job,self.revision,kind,backend,state))
                    c.event(db,job,"ENQUEUED",now)
                state="ADMITTED"
            db.execute("UPDATE qa_schedule SET state=?,decided_at=? WHERE id=1",(state,now))
            return self.read(db)
