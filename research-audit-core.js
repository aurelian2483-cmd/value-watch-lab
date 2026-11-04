(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ResearchAudit=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SHA=/^[a-f0-9]{64}$/i,leagues=new Set(['PL','E1','SP1','D1','I1','F1','UCL']);
const text=s=>typeof s==='string'&&s.trim().length>0&&s.length<=500;
const utc=s=>typeof s==='string'&&/T.*(?:Z|[+]00:00)$/.test(s)&&Number.isFinite(Date.parse(s));
const guarded=d=>d?.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED';
function url(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u:null}catch{return null}}
function freshness(timestamp,maxAgeMs,now=Date.now()){
 const ageMs=now-Date.parse(timestamp),valid=utc(timestamp)&&Number.isFinite(now)&&Number.isFinite(maxAgeMs)&&maxAgeMs>=0&&ageMs>=-300000;
 return {valid,fresh:valid&&ageMs<=maxAgeMs,ageMs:valid?ageMs:null};
}
function validateOtherEvent(e,sport,snapshot,now=Date.now()){
 const u=url(e?.source),path=sport==='tennis'?/^\/apis\/site\/v2\/sports\/tennis\/(atp|wta)\/scoreboard$/:/^\/apis\/site\/v2\/sports\/football\/nfl\/scoreboard$/;
 return ['tennis','nfl'].includes(sport)&&text(e?.id)&&text(e?.name)&&text(e?.competition)&&u?.hostname==='site.api.espn.com'&&path.test(u.pathname)&&utc(e?.startUTC)&&Date.parse(e.startUTC)>now+300000&&freshness(snapshot,36*3600000,now).fresh&&Date.parse(snapshot)<Date.parse(e.startUTC)-300000;
}
function validateOtherForecast(e,sport,snapshot,now=Date.now()){
 if(!validateOtherEvent(e,sport,snapshot,now))return false;
 const f=e.forecast,ps=e.participants,os=f?.outcomes;
 if(!f||!Array.isArray(ps)||ps.length!==2||ps.some(p=>!text(p.id)||!text(p.name))||new Set(ps.map(p=>p.id)).size!==2)return false;
 if(f.model!=='FIXED_ELO_K24_V1'||f.calibrated!==false||f.odds!==null||f.expected_value!==null||!SHA.test(f.training_sha256||'')||!Number.isInteger(f.training_matches)||f.training_matches<8)return false;
 if(!utc(f.training_latest_start_utc)||Date.parse(f.training_latest_start_utc)>Date.parse(snapshot)-6*3600000)return false;
 if(f.generated_at_utc!==undefined&&(!utc(f.generated_at_utc)||Date.parse(f.generated_at_utc)>Date.parse(snapshot)||Date.parse(f.generated_at_utc)>=Date.parse(e.startUTC)-300000))return false;
 if(f.market!==(sport==='nfl'?'GAME_RESULT_INCLUDING_OVERTIME':'MATCH_WINNER')||!Array.isArray(os)||os.length!==(sport==='nfl'?3:2)||new Set(os.map(o=>o?.id)).size!==os.length)return false;
 if(os.some(o=>!text(o?.id)||!text(o?.name)||typeof o.probability!=='number'||!Number.isFinite(o.probability)||o.probability<=0||o.probability>=1)||Math.abs(os.reduce((s,o)=>s+o.probability,0)-1)>1e-8)return false;
 const competitors=os.filter(o=>o.id!=='tie');
 if(competitors.length!==2||competitors.some(o=>!ps.some(p=>p.id===o.id&&p.name===o.name)||!Number.isInteger(o.prior_matches)||o.prior_matches<8||o.prior_matches>f.training_matches))return false;
 return sport!=='nfl'||os.some(o=>o.id==='tie'&&o.name==='Tie after overtime');
}
function normalizeRows(rows,now){
 const candidates=[];
 for(const r of rows){
  const start=r.kickoff_utc,receipts=r.source_receipts;
  if(!leagues.has(r.league)||!text(r.home)||!text(r.away)||r.home.trim().toLowerCase()===r.away.trim().toLowerCase()||!utc(start)||Date.parse(start)>now||!text(r.model)||!SHA.test(r.record_sha256||'')||r.verification!=='TWO_SOURCE_REGULATION_TIME_FINAL')continue;
  if(!['score_home','score_away'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)||!Array.isArray(receipts)||receipts.length<2)continue;
  const clean=receipts.map(s=>{const u=url(s?.url),seen=s?.observed_at_utc||s?.received_at_utc;return u&&SHA.test(s.sha256||'')&&utc(seen)&&Date.parse(seen)>=Date.parse(start)&&Date.parse(seen)<=now+300000?{url:u.href,sha256:s.sha256,observed_at_utc:seen}:null});
  if(clean.some(s=>!s)||new Set(clean.map(s=>url(s.url).hostname.replace(/^www\./,''))).size<2)continue;
  // A source-result receipt and digest reference do not independently verify a forecast vector.
  const id=[r.league,r.home.trim().toLowerCase(),r.away.trim().toLowerCase(),new Date(start).toISOString()].join('|');
  candidates.push({id,sport:'football',league:r.league,home:r.home,away:r.away,startUTC:start,score_home:r.score_home,score_away:r.score_away,record_sha256:r.record_sha256,model:r.model,result_verification:'TWO_PUBLISHER_RESULT_CORROBORATED',source_receipts:clean,challenge_eligible:0,forecast_vector_verified:false});
 }
 const grouped=new Map();for(const r of candidates){if(!grouped.has(r.id))grouped.set(r.id,[]);grouped.get(r.id).push(r)}
 return [...grouped.values()].filter(rs=>rs.every(r=>r.score_home===rs[0].score_home&&r.score_away===rs[0].score_away)).map(rs=>rs[0]).sort((a,b)=>Date.parse(b.startUTC)-Date.parse(a.startUTC));
}
function normalizeFootballResults(document,now=Date.now()){
 if(!guarded(document)||!freshness(document.generated_at_utc,Number.MAX_SAFE_INTEGER,now).valid)return [];
 return normalizeRows(Array.isArray(document.performance?.entries)?document.performance.entries:[],now);
}
function normalizeFootballHistory(document,now=Date.now()){
 if(!guarded(document)||!freshness(document.generated_at_utc,Number.MAX_SAFE_INTEGER,now).valid||!Array.isArray(document.entries))return [];
 // Legacy aliases/models are not additional matches; retain the established PL baseline lane only.
 return normalizeRows(document.entries.filter(r=>r.model==='POISSON_BASELINE_2025_26_V1'&&r.publication_gate==='BLOCKED'&&r.challenge_eligible===0).map(r=>({...r,league:'PL',verification:'TWO_SOURCE_REGULATION_TIME_FINAL'})),now);
}
return {freshness,validateOtherEvent,validateOtherForecast,normalizeFootballResults,normalizeFootballHistory};
});
