"""Bounded retrospective development benchmark; never reads an existing protected partition."""
import hashlib
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, build_opener
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "research" / "openligadb-pilot"))
from pilot import NoRedirect, USER_AGENT
from scripts.read_openligadb_bundesliga import kickoff, positive_id

OLD = "https://api.openligadb.de/getmatchdata/bl1/2024"
OPEN = "https://raw.githubusercontent.com/openfootball/football.json/bd189ea365936c8e9c6c64261fcdd608e3cec3c5/2024-25/de.1.json"
OPEN_BLOB = "9921b1d8485429913ff6d161500beb519d8b0e51"
OPEN_SIZE = 88232
METHODS = ("uniform", "expanding_frequency", "league_poisson", "venue_poisson", "venue_poisson_form")
SEASON_START, SEASON_END = date(2024,7,1), date(2025,7,1)
BERLIN = ZoneInfo("Europe/Berlin")
FLAGS = {"researchOnly":True,"modelValidation":"UNVALIDATED","publicationGate":"BLOCKED",
         "executionAuthorized":False,"dispatchAuthorized":False,"validationAuthorized":False,
         "protectedEvaluationAuthorized":False,"productionPromotionAuthorized":False}
ALIASES = {
    "bayern":("FC Bayern München","Bayern München","FC Bayern Munich","Bayern Munich","FC Bayern Muenchen","Bayern"),
    "leverkusen":("Bayer 04 Leverkusen","Bayer Leverkusen","Leverkusen"),
    "dortmund":("Borussia Dortmund","BVB","Dortmund"),
    "leipzig":("RB Leipzig","RasenBallsport Leipzig","Leipzig"),
    "frankfurt":("Eintracht Frankfurt","Frankfurt"),
    "stuttgart":("VfB Stuttgart","Stuttgart"),
    "freiburg":("SC Freiburg","Sport-Club Freiburg","Freiburg"),
    "mainz":("1. FSV Mainz 05","FSV Mainz 05","Mainz 05","Mainz"),
    "wolfsburg":("VfL Wolfsburg","Wolfsburg"),
    "gladbach":("Borussia Mönchengladbach","Borussia Moenchengladbach","Borussia M'gladbach","Borussia M'Gladbach","Borussia Mgladbach","Mönchengladbach","Gladbach"),
    "bremen":("SV Werder Bremen","Werder Bremen","Bremen"),
    "augsburg":("FC Augsburg","Augsburg"),
    "union":("1. FC Union Berlin","FC Union Berlin","Union Berlin"),
    "stpauli":("FC St. Pauli","St. Pauli","FC Sankt Pauli","FC St. Pauli 1910"),
    "hoffenheim":("TSG 1899 Hoffenheim","TSG Hoffenheim","1899 Hoffenheim","Hoffenheim"),
    "heidenheim":("1. FC Heidenheim 1846","1. FC Heidenheim","FC Heidenheim","Heidenheim"),
    "kiel":("Holstein Kiel","KSV Holstein Kiel","Kiel"),
    "bochum":("VfL Bochum 1848","VfL Bochum","Bochum"),
}

def need(ok, message):
    if not ok:
        raise ValueError(message)

def normalized(s):
    need(isinstance(s,str) and 1<=len(s)<=100,"Invalid club name")
    return re.sub(r"[^a-z0-9]","",unicodedata.normalize("NFKD",s.casefold()).encode("ascii","ignore").decode())

MAP = {normalized(alias):code for code,aliases in ALIASES.items() for alias in aliases}
need(all(MAP[normalized(a)]==k for k,aliases in ALIASES.items() for a in aliases),"Ambiguous alias table")

def team(name):
    value=MAP.get(normalized(name))
    need(value is not None,"Unknown explicit club alias")
    return value

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw):
    return hashlib.sha1(("blob %d\0"%len(raw)).encode()+raw).hexdigest()

def score(values):
    need(isinstance(values,list) and len(values)==2 and all(type(x) is int and 0<=x<=30 for x in values),"Invalid final score")
    return tuple(values)

def date_value(value):
    need(isinstance(value,str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}",value),"Invalid date")
    d=date.fromisoformat(value)
    need(SEASON_START<=d<SEASON_END,"Outside season")
    return d

def round_value(value):
    if type(value) is int:
        result=value
    else:
        need(isinstance(value,str),"Invalid matchday")
        m=re.fullmatch(r"(?:Matchday |Regular Season - )(\d{1,2})",value)
        need(m is not None,"Unrecognized matchday label")
        result=int(m[1])
    need(1<=result<=34,"Outside regular season")
    return result

def validate_grid(rows):
    need(len(rows)==306,"Expected exactly 306 regular season matches")
    pairs=[(r["home"],r["away"]) for r in rows]
    need(len(set(pairs))==306 and all(a!=b for a,b in pairs),"Duplicate or invalid ordered pairing")
    need(set(x for pair in pairs for x in pair)==set(ALIASES),"Unexpected team set")
    need(all(n==17 for n in Counter(a for a,b in pairs).values()) and
         all(n==17 for n in Counter(b for a,b in pairs).values()),"Home/away count mismatch")
    rounds=defaultdict(list)
    for r in rows:
        rounds[r["round"]].extend((r["home"],r["away"]))
    need(set(rounds)==set(range(1,35)) and all(len(v)==18 and len(set(v))==18 for v in rounds.values()),"Matchday count or team mismatch")
    return {(r["home"],r["away"]):r for r in rows}

def primary(raw):
    data=json.loads(raw)
    need(isinstance(data,list) and len(data)==306,"Incomplete OpenLigaDB season")
    provider_ids={}; event_ids=set(); rows=[]
    for x in data:
        need(x.get("leagueShortcut")=="bl1" and x.get("leagueSeason")==2024 and x.get("matchIsFinished") is True,"Invalid source season or finality")
        mid=positive_id(x["matchID"])
        need(mid not in event_ids,"Duplicate provider event")
        event_ids.add(mid)
        h,a=team(x["team1"]["teamName"]),team(x["team2"]["teamName"])
        for code,obj in ((h,x["team1"]),(a,x["team2"])):
            tid=positive_id(obj["teamId"])
            need(provider_ids.get(code,tid)==tid,"Conflicting provider club identity")
            provider_ids[code]=tid
        dt=datetime.fromisoformat(kickoff(x["matchDateTimeUTC"]).replace("Z","+00:00"))
        need(dt.tzinfo is not None and dt.utcoffset()==timedelta(0),"UTC kickoff required")
        day=date_value(dt.astimezone(BERLIN).date().isoformat())
        results=x.get("matchResults")
        need(isinstance(results,list) and 1<=len(results)<=10,"Invalid result list")
        final=[q for q in results if q.get("resultTypeID")==2 or q.get("resultName")=="Endergebnis"]
        need(len(final)==1 and type(final[0].get("resultTypeID")) is int and final[0]["resultTypeID"]==2 and final[0].get("resultName")=="Endergebnis","Ambiguous final score contract")
        ft=score([final[0].get("pointsTeam1"),final[0].get("pointsTeam2")])
        rows.append({"home":h,"away":a,"round":round_value(x["group"]["groupOrderID"]),"day":day,"kickoff":dt,"ft":ft})
    need(len(provider_ids)==18 and len(set(provider_ids.values()))==18,"Nonunique provider club IDs")
    return validate_grid(rows)

def secondary(raw):
    data=json.loads(raw)
    need(isinstance(data,dict) and isinstance(data.get("matches"),list) and len(data["matches"])==306,"Incomplete Openfootball season")
    rows=[]
    for x in data["matches"]:
        h,a=team(x["team1"]),team(x["team2"])
        rows.append({"home":h,"away":a,"round":round_value(x["round"]),"day":date_value(x["date"]),"ft":score(x["score"]["ft"])})
    return validate_grid(rows)

def reconcile(a,b):
    need(set(a)==set(b),"Ordered pairing inventory mismatch")
    counts=Counter({"total_pairs":len(a),"concordant":0,"quarantined_adjudication":0,"identity_date_round_conflict":0,"score_conflict":0})
    ordinary=[]
    for key,left in a.items():
        right=b[key]
        if key==("union","bochum"):
            need(left["day"]==date(2024,12,14) and right["day"]==date(2024,12,14),"Special adjudication identity not established")
            counts["quarantined_adjudication"]+=1
        elif left["day"]!=right["day"] or left["round"]!=right["round"]:
            counts["identity_date_round_conflict"]+=1
        elif left["ft"]!=right["ft"]:
            counts["score_conflict"]+=1
        else:
            ordinary.append(left);counts["concordant"]+=1
    need(sum(v for k,v in counts.items() if k!="total_pairs")==counts["total_pairs"],"Reconciliation mismatch")
    return sorted(ordinary,key=lambda r:(r["kickoff"],r["home"],r["away"])),dict(counts)

def label(ft):
    return 0 if ft[0]>ft[1] else 1 if ft[0]==ft[1] else 2

def bounded_rate(x):
    return min(4,max(.15,x))

def poisson(h,a):
    def terms(rate):
        p=[math.exp(-rate)]
        for i in range(1,31):
            p.append(p[-1]*rate/i)
        return p
    p=[0.,0.,0.]
    for i,x in enumerate(terms(h)):
        for j,y in enumerate(terms(a)):
            p[label((i,j))]+=x*y
    total=sum(p)
    return [x/total for x in p]

def forecast(prior,h,a):
    """Only history and ordered participant codes are accepted; no target score argument."""
    need(len(prior)>=90,"Insufficient history")
    hm=[x for x in prior if x["home"]==h]
    am=[x for x in prior if x["away"]==a]
    need(len(hm)>=3 and len(am)>=3,"Insufficient venue history")
    cnt=Counter(label(x["ft"]) for x in prior)
    league_h=sum(x["ft"][0] for x in prior)/len(prior)
    league_a=sum(x["ft"][1] for x in prior)/len(prior)
    need(league_h>0 and league_a>0,"Invalid historical scoring rates")
    def rate(rows,i,base):
        return (sum(x["ft"][i] for x in rows)+5*base)/(len(rows)+5)
    # Conceded away goals are in ft[0]; conceded home goals are in ft[1].
    ha,hd=rate(hm,0,league_h),rate(hm,1,league_a)
    aa,ad=rate(am,1,league_a),rate(am,0,league_h)
    lh=bounded_rate(ha*ad/league_h)
    la=bounded_rate(aa*hd/league_a)
    def form(code):
        last=[x for x in prior if code in (x["home"],x["away"])][-5:]
        return sum((x["ft"][0]-x["ft"][1])*(1 if x["home"]==code else -1) for x in last)/len(last)
    delta=form(h)-form(a)
    return {
        "uniform":[1/3]*3,
        "expanding_frequency":[(cnt[i]+1)/(len(prior)+3) for i in range(3)],
        "league_poisson":poisson(league_h,league_a),
        "venue_poisson":poisson(lh,la),
        "venue_poisson_form":poisson(bounded_rate(lh*math.exp(.025*delta)),bounded_rate(la*math.exp(-.025*delta))),
    }

def loss(p,y):
    need(len(p)==3 and all(math.isfinite(v) and 0<v<=1 for v in p) and abs(sum(p)-1)<=1e-12,"Invalid probability vector")
    best=max(p)
    ties=[i for i,x in enumerate(p) if abs(x-best)<=1e-15]
    return (-math.log(p[y]),sum((v-int(i==y))**2 for i,v in enumerate(p)),1/len(ties) if y in ties else 0)

def benchmark(rows, *, date_only=False):
    need(len(rows)>=290,"Insufficient concordant ordinary fixtures")
    ordered=sorted(rows,key=lambda r:(r["day"] if date_only else r["kickoff"],r["home"],r["away"]))
    totals={m:[0.,0.,0.] for m in METHODS}
    periods=Counter()
    excluded=Counter({"warmup":0,"venue_history":0})
    n=0
    for target in ordered:
        if date_only:
            # Date-only records: two complete intervening calendar days. No invented kickoff time.
            prior=[r for r in ordered if r["day"]<=target["day"]-timedelta(days=3)]
        else:
            cutoff=target["kickoff"]-timedelta(hours=48)
            prior=[r for r in ordered if r["kickoff"]<=cutoff and r["day"]<target["day"]]
        if len(prior)<90:
            excluded["warmup"]+=1;continue
        if sum(x["home"]==target["home"] for x in prior)<3 or sum(x["away"]==target["away"] for x in prior)<3:
            excluded["venue_history"]+=1;continue
        probabilities=forecast(prior,target["home"],target["away"])
        y=label(target["ft"])
        for m in METHODS:
            values=loss(probabilities[m],y)
            for j,v in enumerate(values):totals[m][j]+=v
        n+=1
        periods[target["day"].strftime("%Y-%m")]+=1
    need(n>0 and n+sum(excluded.values())==len(ordered),"Evaluation count mismatch")
    metrics={m:{"n":n,"mean_log_loss":totals[m][0]/n,"mean_multiclass_brier":totals[m][1]/n,"tie_adjusted_top1":totals[m][2]/n,
                "paired_log_loss_minus_frequency":(totals[m][0]-totals["expanding_frequency"][0])/n} for m in METHODS}
    return {"status":"RETROSPECTIVE_DEVELOPMENT_COMPARISON_COMPLETED","paired_targets":n,"excluded_before_scoring":dict(excluded),"targets_by_calendar_month":dict(sorted(periods.items())),"metrics":metrics,
            "empirically_qualified_methods":0,"protected_holdout_opened":False,"parameter_tuning_performed":False}

def retrieve(opener,url,limit):
    req=Request(url,headers={"Accept":"application/json","User-Agent":USER_AGENT})
    with opener(req,timeout=25) as response:
        need(response.geturl()==url,"Redirected response")
        need(response.headers.get_content_type() in ("application/json","text/plain","application/octet-stream"),"Unexpected response media type")
        raw=response.read(limit+1)
        need(0<len(raw)<=limit,"Response size out of bounds")
        return raw

def run():
    # One request per exact source; no retry/fallback and no raw files written.
    opener=build_opener(NoRedirect()).open
    raw_open=retrieve(opener,OPEN,256*1024)
    need(len(raw_open)==OPEN_SIZE and git_blob(raw_open)==OPEN_BLOB,"Pinned Openfootball bytes changed")
    raw_old=retrieve(opener,OLD,4*1024*1024)
    captured=datetime.now(timezone.utc).isoformat()
    a,b=primary(raw_old),secondary(raw_open)
    rows,counts=reconcile(a,b)
    result=benchmark(rows) if len(rows)>=290 else {"status":"BLOCKED_INSUFFICIENT_CONCORDANCE","paired_targets":0,"empirically_qualified_methods":0}
    return {"kind":"HISTORICAL_DEVELOPMENT_BENCHMARK","schemaVersion":1,"observedAt":captured,
            "season":"2024/25","source_receipts":[{"source":OLD,"bytes":len(raw_old),"sha256":sha(raw_old),"license":"ODbL 1.0","attribution":"Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0"},
            {"source":OPEN,"bytes":len(raw_open),"sha256":sha(raw_open),"gitBlob":OPEN_BLOB,"license":"CC0 1.0 (publisher declaration)"}],
            "reconciliation":counts,"comparison":result,"independently_certified_rows":0,"source_independence_verified":False,
            "network_requests":2,"raw_records_published":False,"research_computation_performed":result["paired_targets"]>0,
            "limitations":["Retrospective public development cohort; the actual availability of every historical result at each cutoff is not established.",
                           "Agreement between separately published datasets does not establish upstream independence or legal certification.",
                           "The special adjudicated fixture and all other disagreements are excluded from history and scoring.",
                           "No raw response retained after process exit; source hashes cannot establish an immutable replay of mutable API bytes.",
                           "No empirical qualification, untouched holdout, model promotion, odds, wagering, or production research dispatch."],**FLAGS}

if __name__=="__main__":
    try:
        need(sys.argv[1:]==["--authorized-development-only"],"Explicit development-only scope required")
        print(json.dumps(run(),indent=2,allow_nan=False))
    except Exception as error:
        # Avoid leaking individual records or uncontrolled provider error bodies in public CI logs.
        if isinstance(error,ValueError) and type(error) is ValueError:
            message=str(error)
            # Only fixed program diagnostics; do not expose JSON decoder or arbitrary strings.
            if len(message)<100 and re.fullmatch(r"[A-Za-z0-9 /-]+",message):print("Pilot blocked: "+message,file=sys.stderr)
            else:print("Pilot blocked: invalid source or scope",file=sys.stderr)
        else:print("Pilot blocked: "+type(error).__name__,file=sys.stderr)
        sys.exit(1)
