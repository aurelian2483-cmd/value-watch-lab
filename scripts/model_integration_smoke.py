#!/usr/bin/env python3
"""End-to-end model integration smoke test. Retrospective only; NEVER publish as prospective."""
import csv,datetime as dt,io,json,math,pathlib,urllib.request
import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL="https://www.football-data.co.uk/mmz4281/{season}/{div}.csv"
def download(season,div):
    req=urllib.request.Request(URL.format(season=season,div=div),headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=30) as response:
        content=response.read(2_000_000).decode("utf-8-sig")
    records=[]
    for r in csv.DictReader(io.StringIO(content)):
        if not all(r.get(k) for k in ("Date","HomeTeam","AwayTeam","FTHG","FTAG","FTR")):continue
        if r.get("Div")!=div:raise ValueError("wrong division")
        try: day=dt.datetime.strptime(r["Date"],"%d/%m/%Y").date()
        except ValueError: day=dt.datetime.strptime(r["Date"],"%d/%m/%y").date()
        h,a=int(r["FTHG"]),int(r["FTAG"])
        if r["FTR"]!=("H" if h>a else "A" if a>h else "D"):raise ValueError("score inconsistency")
        records.append((day,r["HomeTeam"],r["AwayTeam"],h,a))
    if len(records)<30:raise ValueError("insufficient matches")
    return sorted(records)
def fit(train,ridge):
    teams=sorted(set(r[1] for r in train)|set(r[2] for r in train))
    index={t:i for i,t in enumerate(teams)};n=len(teams)
    hi=np.array([index[r[1]] for r in train]);ai=np.array([index[r[2]] for r in train])
    hg=np.array([r[3] for r in train],float);ag=np.array([r[4] for r in train],float)
    w=np.array([r[5] for r in train],float)
    def obj(x):
        atk=x[:n];de=x[n:2*n]
        lh=np.exp(np.clip(x[-2]+atk[hi]-de[ai],-3,3))
        la=np.exp(np.clip(x[-1]+atk[ai]-de[hi],-3,3))
        return np.sum(w*(lh-hg*np.log(lh)+la-ag*np.log(la)))+ridge*(atk@atk+de@de)+x[-2]**2+x[-1]**2
    init=np.r_[np.zeros(2*n),np.log(np.average(hg,weights=w)),np.log(np.average(ag,weights=w))]
    result=minimize(obj,init,method="L-BFGS-B",options={"maxiter":85,"ftol":1e-6})
    if not result.success:raise RuntimeError(result.message)
    return {t:result.x[[i,n+i]] for t,i in index.items()},result.x[-2:]
def predict(home,away,model):
    strength,base=model
    h=strength[home];a=strength[away]
    lh=np.exp(np.clip(base[0]+h[0]-a[1],-3,3))
    la=np.exp(np.clip(base[1]+a[0]-h[1],-3,3))
    z=np.arange(14);joint=np.outer(poisson.pmf(z,lh),poisson.pmf(z,la));joint/=joint.sum()
    p=[float(np.tril(joint,-1).sum()),float(np.trace(joint)),float(np.triu(joint,1).sum())]
    if abs(sum(p)-1)>1e-8:raise ValueError("probabilities")
    return p
def main():
    results=[]
    for div,league,ridge in (("E0","Premier League",2.0),("E1","Championship",8.0)):
        prior=download("2526",div);current=download("2627",div)
        # Hold back last dated match group: ensures strict pre-match chronological testing.
        cutoff=max(r[0] for r in current)
        earlier=[r for r in current if r[0]<cutoff]
        withheld=[r for r in current if r[0]==cutoff]
        if len(earlier)<20 or not withheld:raise ValueError("insufficient pre-event training")
        train=[(*r,0.5) for r in prior]+[(*r,1.0) for r in earlier]
        model=fit(train,ridge)
        for r in withheld:
            p=predict(r[1],r[2],model)
            results.append({"league":league,"match_date":r[0].isoformat(),"home":r[1],"away":r[2],"prob_home":p[0],"prob_draw":p[1],"prob_away":p[2],"actual":"H" if r[3]>r[4] else "A" if r[4]>r[3] else "D","type":"RETROSPECTIVE_TEST_NOT_CHALLENGE"})
    print(json.dumps({"status":"PASS","mode":"RETROSPECTIVE_DRY_RUN","forecast_count":len(results),"records":results},indent=2))
if __name__=="__main__":main()
