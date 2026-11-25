"""Synthetic tests of cohort reconciliation and the frozen retrospective protocol."""
import copy
import io
import json
import math
import unittest
from datetime import date, datetime, timedelta, timezone
from email.message import Message
from unittest.mock import Mock
from benchmark import (ALIASES, METHODS, OLD, OPEN, team, score, primary, secondary, reconcile,
                       validate_grid, benchmark, forecast, loss, retrieve, poisson)

def fixtures():
    clubs=list(ALIASES)
    schedule=[]
    rotation=clubs[:]
    for r in range(17):
        for i in range(9):
            a,b=rotation[i],rotation[-1-i]
            schedule.append((r+1,a,b))
        rotation=[rotation[0],rotation[-1],*rotation[1:-1]]
    schedule += [(r+17,b,a) for r,a,b in schedule[:]]
    a,b=[],[]
    for idx,(r,h,v) in enumerate(schedule):
        d=date(2024,8,17)+timedelta(days=(r-1)*7)
        if (h,v)==("union","bochum"):
            d=date(2024,12,14)
        ft=[(idx+r)%4,(idx+2*r)%3]
        a.append({"leagueShortcut":"bl1","leagueSeason":2024,"matchIsFinished":True,
                  "matchID":idx+1,"team1":{"teamId":clubs.index(h)+1,"teamName":ALIASES[h][0]},
                  "team2":{"teamId":clubs.index(v)+1,"teamName":ALIASES[v][0]},
                  "matchDateTimeUTC":d.isoformat()+"T13:30:00Z","group":{"groupOrderID":r},
                  "matchResults":[{"resultTypeID":2,"resultName":"Endergebnis","pointsTeam1":ft[0],"pointsTeam2":ft[1]}]})
        b.append({"round":"Matchday "+str(r),"date":d.isoformat(),"team1":ALIASES[h][-1],
                  "team2":ALIASES[v][-1],"score":{"ft":ft[:]}})
    return a,{"name":"Synthetic","matches":b}

def raw(x):
    return json.dumps(x).encode()

class HistoricalDevelopmentTests(unittest.TestCase):
    def test_complete_grid_and_predeclared_exclusion(self):
        a,b=fixtures()
        rows,counts=reconcile(primary(raw(a)),secondary(raw(b)))
        self.assertEqual(counts,{"total_pairs":306,"concordant":305,"quarantined_adjudication":1,
                                 "identity_date_round_conflict":0,"score_conflict":0})
        self.assertNotIn(("union","bochum"),[(r["home"],r["away"]) for r in rows])

    def test_disagreements_never_enter_history_or_scoring(self):
        a,b=fixtures()
        ordinary=[i for i,x in enumerate(b["matches"]) if (team(x["team1"]),team(x["team2"]))!=("union","bochum")]
        i,j=ordinary[:2]
        b["matches"][i]["score"]["ft"][0]+=1
        b["matches"][j]["date"]=(date.fromisoformat(b["matches"][j]["date"])+timedelta(days=1)).isoformat()
        rows,c=reconcile(primary(raw(a)),secondary(raw(b)))
        self.assertEqual(c["score_conflict"],1)
        self.assertEqual(c["identity_date_round_conflict"],1)
        self.assertEqual(len(rows),303)
        for k in (i,j):
            self.assertNotIn((team(b["matches"][k]["team1"]),team(b["matches"][k]["team2"])),[(r["home"],r["away"]) for r in rows])

    def test_bad_source_fails_closed(self):
        a,b=fixtures()
        for mutation in ("partial","repeat","unfinished","invalid_score","wrong_league","unknown_alias","ambiguous_final","provider_identity"):
            x=copy.deepcopy(a)
            if mutation=="partial":x.pop()
            elif mutation=="repeat":x[-1]=x[0]
            elif mutation=="unfinished":x[0]["matchIsFinished"]=False
            elif mutation=="invalid_score":x[0]["matchResults"][0]["pointsTeam1"]=True
            elif mutation=="wrong_league":x[0]["leagueShortcut"]="bl2"
            elif mutation=="unknown_alias":x[0]["team1"]["teamName"]="Unknown club"
            elif mutation=="ambiguous_final":x[0]["matchResults"].append(copy.deepcopy(x[0]["matchResults"][0]))
            else:x[0]["team1"]["teamId"]=99999
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                primary(raw(x))
        x=copy.deepcopy(b);x["matches"].pop()
        with self.assertRaises(ValueError):secondary(raw(x))

    def test_fixed_paired_study_and_determinism(self):
        a,b=fixtures()
        rows,_=reconcile(primary(raw(a)),secondary(raw(b)))
        r=benchmark(rows)
        self.assertGreater(r["paired_targets"],0)
        self.assertEqual(r["paired_targets"]+sum(r["excluded_before_scoring"].values()),305)
        self.assertEqual(set(r["metrics"]),set(METHODS))
        self.assertTrue(all(x["n"]==r["paired_targets"] for x in r["metrics"].values()))
        self.assertAlmostEqual(r["metrics"]["uniform"]["mean_log_loss"],math.log(3))
        self.assertAlmostEqual(r["metrics"]["uniform"]["mean_multiclass_brier"],2/3)
        self.assertAlmostEqual(r["metrics"]["uniform"]["tie_adjusted_top1"],1/3)
        self.assertEqual(r["empirically_qualified_methods"],0)
        self.assertFalse(r["protected_holdout_opened"])
        self.assertEqual(r,benchmark(list(reversed(rows))))
        with self.assertRaises(ValueError):benchmark(rows[:289])

    def test_forecasts_take_only_prior_history_and_valid_vectors(self):
        a,b=fixtures()
        rows,_=reconcile(primary(raw(a)),secondary(raw(b)))
        target=rows[-1]
        prior=[r for r in rows if r["kickoff"]<=target["kickoff"]-timedelta(hours=48) and r["day"]<target["day"]]
        p=forecast(prior,target["home"],target["away"])
        altered=copy.deepcopy(target);altered["ft"]=(30,0)
        self.assertEqual(p,forecast(prior,altered["home"],altered["away"]))
        for probs in p.values():
            self.assertAlmostEqual(sum(probs),1)
            self.assertTrue(all(0<v<=1 for v in probs))
        equal=poisson(1.5,1.5)
        self.assertAlmostEqual(equal[0],equal[2])
        self.assertEqual(loss([.6,.2,.2],0)[2],1)
        self.assertAlmostEqual(loss([1/3]*3,1)[2],1/3)
        with self.assertRaises(ValueError):loss([.4,.4,.4],0)
        with self.assertRaises(ValueError):forecast(prior[:10],target["home"],target["away"])

    def test_bounded_get_no_retry(self):
        class Response(io.BytesIO):
            def __init__(self,data,url,media="application/json"):
                super().__init__(data);self.url=url;self.headers=Message()
                self.headers["Content-Type"]=media
            def geturl(self):return self.url
        opener=Mock(return_value=Response(b"{}",OPEN))
        self.assertEqual(retrieve(opener,OPEN,10),b"{}")
        opener.assert_called_once()
        self.assertEqual(opener.call_args.args[0].get_method(),"GET")
        self.assertEqual(opener.call_args.kwargs["timeout"],25)
        for response in (Response(b"x"*11,OLD),Response(b"{}",OPEN),Response(b"{}",OLD,"text/html")):
            opener=Mock(return_value=response)
            with self.assertRaises(ValueError):retrieve(opener,OLD,10)
            opener.assert_called_once()

if __name__=="__main__":unittest.main()
