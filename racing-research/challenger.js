'use strict';
(()=>{
 let snapshot=null,sequence=0;
 const add=(p,t,c,s)=>{const e=document.createElement(t);if(c)e.className=c;if(s!==undefined)e.textContent=s;p.append(e);return e};
 const pct=p=>(100*p).toFixed(1)+'%';
 const time=s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(s));
 function draw(d){
  const root=document.getElementById('challenger-test'),cards=document.getElementById('challenger-cards');root.replaceChildren();cards.replaceChildren();
  const m=d.model,t=m.training_design;
  add(root,'p','empty',m.promotion_status==='NOT_PROMOTED_FAILED_RETROSPECTIVE_COMPARISON'?'NOT PROMOTED: the trained pilot performed worse than the original formula and equal chance on the later test sample. It remains a separate shadow experiment.':'Research only: prospective validation is still required.');
  add(root,'p','note',t.train_races+' training races · '+t.validation_races+' tuning races · '+t.test_races+' later test races. Test period: 16–31 October 2026.');
  add(root,'p','note','Retrospective reconstruction downloaded after the races, using final runner fields. Historical first availability is not attested. These results do not count as prospective evidence.');
  const table=add(add(root,'div','scroll'),'table'),head=add(add(table,'thead'),'tr');
  for(const s of ['Later test metric','Trained challenger','Original formula','Equal chance'])add(head,'th','',s);
  const body=add(table,'tbody');
  for(const [label,key]of [['Log loss','mean_log_loss'],['Brier score','mean_brier']]){const row=add(body,'tr');add(row,'td','',label);for(const method of ['challenger','form_baseline','uniform'])add(row,'td','',Number(m.retrospective_test[method][key]).toFixed(3))}
  add(root,'p','note','Lower scores are better. Small single-publisher test; no calibration or profitability claim. Current bookmaker prices are not model inputs.');
  const links=add(root,'p','note');for(const [label,url]of [['Method and reproducibility','../research/horse-challenger/README.md'],['Model and test records','../research/horse-challenger/model-v1.json']]){const a=add(links,'a','',label);a.href=url;add(links,'span','',' · ')}
  const upcoming=(d.forecasts||[]).filter(f=>Date.parse(f.startUTC)>Date.now());
  const details=add(cards,'details');details.id='shadow-challenger-fields';add(details,'summary','','Shadow experiment: upcoming challenger estimates');const fields=add(details,'div');
  add(fields,'p','note','This challenger failed the initial retrospective comparison. These archived estimates are for further testing, not an upgrade or a betting recommendation.');
  if(!upcoming.length)add(fields,'p','empty','No supported upcoming challenger forecasts in this snapshot. The model requires complete form, rating and weight for every runner in a GB all-weather handicap.');
  for(const f of upcoming){
   const a=add(fields,'article','race');add(a,'small','',time(f.startUTC)+' UK');add(a,'h3','',f.racecourse+' · '+f.race_name);
   if(!Array.isArray(f.runners)){add(a,'p','empty','Invalid field; withheld.');continue}
   const c=d.current_field_checks?.[f.record_sha256],age=Date.now()-Date.parse(c?.runner_observed_at_utc);
   const matching=JSON.stringify([...(c?.active_runner_ids||[])].sort())===JSON.stringify(f.runners.map(r=>r.horse_id).sort());
   if(c?.status!=='FRESH_MATCHING_FIELD'||!matching||!Number.isFinite(age)||age<0||age>1800000){add(a,'p','empty','Runner field is stale or unconfirmed. Current estimates withheld until a fresh matching field is published.');continue}
   add(a,'p','note','UNVALIDATED · '+f.active_runner_count+' runners · field checked '+time(c.runner_observed_at_utc)+' UK · forecast frozen '+time(f.generated_at_utc)+' UK.');
   if(!Array.isArray(f.runners)||f.runners.some(r=>!Number.isFinite(r.model_probability)||r.model_probability<=0||r.model_probability>=1)||Math.abs(f.runners.reduce((s,r)=>s+r.model_probability,0)-1)>1e-8){add(a,'p','empty','Invalid model vector; estimates withheld.');continue}
   const table=add(add(a,'div','scroll'),'table'),tr=add(add(table,'thead'),'tr');for(const s of ['Horse','Model estimate','Original form weight'])add(tr,'th','',s);const tbody=add(table,'tbody');
   for(const r of [...f.runners].sort((a,b)=>b.model_probability-a.model_probability)){const row=add(tbody,'tr');add(row,'td','',r.name);add(row,'td','prob',pct(r.model_probability));add(row,'td','',pct(r.baseline_form_weight))}
   add(a,'p','note',f.limitation);
  }
  add(cards,'p','note','Prospective challenger results: '+(d.performance?.scored_forecasts??0)+' scored races. Separate archive; no official challenge credit.');
 }
 async function load(){const n=++sequence;try{
  const r=await fetch('../horse-challenger-data.json',{cache:'no-store'});if(!r.ok)throw Error('Challenger feed not yet available.');const d=await r.json();
  const ts=Date.parse(d.generated_at_utc);
  if(d.research_only!==true||d.publication_gate!=='BLOCKED'||d.model_validation!=='UNVALIDATED'||d.official_challenge!=='0/100'||!Number.isFinite(ts)||ts>Date.now()+300000||Date.now()-ts>129600000||d.model?.model!=='AW_CONDITIONAL_LOGIT_PILOT_V1')throw Error('Challenger snapshot failed validation.');
  if(n===sequence){snapshot=d;draw(d)}
 }catch(e){if(n===sequence){snapshot=null;document.getElementById('challenger-test').textContent=e.message;document.getElementById('challenger-cards').replaceChildren()}}}
 document.getElementById('refresh').addEventListener('click',load);
 setInterval(()=>{if(snapshot){const opened=document.getElementById('shadow-challenger-fields')?.open;draw(snapshot);if(opened)document.getElementById('shadow-challenger-fields').open=true}},60000);load();
})();
