#!/usr/bin/env python3
"""Experiment 19: actual pre-match Poisson probabilities, dry-run only.
Uses prior and current completed matches, enforces cutoff and never publishes.
"""
import datetime as dt,json,pathlib
from model_integration_smoke import download,fit,predict
from experiment18_team_check import FIXTURES,ALIASES
def main():
    now=dt.datetime.now(dt.timezone.utc)
    previous=download("2526","E0");current=download("2627","E0")
    # Training must precede the generation timestamp and each fixture.
    prior=[(*r,0.5) for r in previous]
    current_train=[(*r,1.0) for r in current if r[0]<now.date()]
    if len(current_train)<20:raise ValueError("insufficient prior current-season results")
    model=fit(prior+current_train,2.0)
    out=[]
    for home,away,kickoff in FIXTURES:
        when=dt.datetime.fromisoformat(kickoff.replace("Z","+00:00"))
        if when<=now:raise ValueError("fixture started: refusing forecast")
        h=home if home in model[0] else ALIASES.get(home,home)
        a=away if away in model[0] else ALIASES.get(away,away)
        if h not in model[0] or a not in model[0]:raise ValueError(f"unrecognised model team: {home}/{away}")
        p=predict(h,a,model)
        out.append({"home":home,"away":away,"kickoff_utc":kickoff,"generated_at_utc":now.isoformat(),"prob_home":round(p[0],6),"prob_draw":round(p[1],6),"prob_away":round(p[2],6),"status":"DRY_RUN_UNVALIDATED_NOT_CHALLENGE"})
    dest=pathlib.Path("/tmp/experiment19-dry-run.json")
    dest.write_text(json.dumps({"count":len(out),"forecasts":out,"publication_enabled":False,"challenge_eligible":0},indent=2)+"\n")
    print(f"PASS: generated {len(out)} pre-match research forecasts; 0 committed")
if __name__=="__main__":main()
