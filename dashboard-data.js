'use strict';
(()=>{
 const $=id=>document.getElementById(id),add=(p,t,s,c)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=String(s);if(c)e.className=c;p.append(e);return e};
 const full=s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(s))+' UK';
 const short=s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s));
 const pct=p=>(p*100).toFixed(1)+'%',safe=d=>d?.research_only===true&&d.publication_gate==='BLOCKED'&&d.model_validation==='UNVALIDATED'&&Number.isFinite(Date.parse(d.generated_at_utc))&&Date.parse(d.generated_at_utc)<=Date.now()+300000;
 const validVector=r=>[r.prob_home,r.prob_draw,r.prob_away].every(p=>Number.isFinite(p)&&p>0&&p<1)&&Math.abs(r.prob_home+r.prob_draw+r.prob_away-1)<1e-8;
 const names={PL:'Premier League',E1:'Championship',SP1:'La Liga',D1:'Bundesliga',I1:'Serie A',F1:'Ligue 1',UCL:'Champions League'};
 let state={view:'selections',sport:'all',league:'all',query:'',limit:8},games=[],races=[],feeds=[],horse=null,loaded=false;
 function hash(s){let n=2166136261;for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619)}return (n>>>0).toString(16)}
 function paperId(r,outcome){return r.kind==='football'?'paper-football-'+hash([r.league,r.home,r.away,r.kickoff_utc].join('|'))+'-'+outcome:'paper-racing-'+r.race_id+'-'+outcome}
 function current(r){const now=Date.now(),age=now-Date.parse(r.kind==='football'?r.snapshot:r.fieldChecked);return Date.parse(r.kind==='football'?r.kickoff_utc:r.startUTC)>now+300000&&Number.isFinite(age)&&age>=-300000&&age<=(r.kind==='football'?36*3600000:1800000)}
 function sync(){
  document.querySelectorAll('.paper-count').forEach(e=>e.textContent=selected.length);
  document.querySelectorAll('[data-paper-record]').forEach(b=>{const yes=selected.includes(b.dataset.paperRecord);b.classList.toggle('is-selected',yes);b.setAttribute('aria-pressed',String(yes));b.querySelector('.outcome-caption').textContent=yes?'IN PAPER LIST':'UNPRICED';b.disabled=!yes&&(selected.length>=12||localReadFailed)});
 }
 function openPaper(){document.body.classList.add('paper-open');document.querySelectorAll('[data-paper-open]').forEach(b=>b.setAttribute('aria-expanded','true'));if(matchMedia('(max-width:760px)').matches)$('paper-close').focus();else $('paper-aside').scrollIntoView({behavior:'smooth',block:'start'})}
 function closePaper(){document.body.classList.remove('paper-open');document.querySelectorAll('[data-paper-open]').forEach(b=>b.setAttribute('aria-expanded','false'))}
 function views(){
  for(const id of ['selections','results','research'])$(id+'-view').hidden=state.view!==id;
  document.querySelectorAll('[data-app-view]').forEach(b=>{const active=b.dataset.appView===state.view;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false')});
  document.querySelectorAll('[data-sport]').forEach(b=>{const active=state.sport===b.dataset.sport;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  document.querySelectorAll('[data-league]').forEach(b=>b.classList.toggle('active',state.league===b.dataset.league));$('league-filter').value=state.league;
 }
 function outcomeButton(parent,r,option,label,p){const id=paperId(r,option),b=add(parent,'button',undefined,'outcome');b.type='button';b.dataset.eventKey=r.uid;b.dataset.paperOutcome=option;b.dataset.paperRecord=id;b.setAttribute('aria-label','Add '+label+' for '+(r.kind==='football'?r.home+' versus '+r.away:r.racecourse)+' to paper list; '+(r.kind==='football'?'experimental model estimate ':'form-only weight ')+pct(p));add(b,'small',label);add(b,'b',pct(p));add(b,'span','UNPRICED','outcome-caption');return b}
 function footballCard(r){
  const a=add($('sports-event-list'),'article',undefined,'event-card'),top=add(a,'div',undefined,'event-card-top');add(top,'strong','⚽ '+r.league_name);add(top,'span',short(r.kickoff_utc)+' UK','event-time');
  const body=add(a,'div',undefined,'match-content'),teams=add(body,'div');for(const name of [r.home,r.away]){const line=add(teams,'div',undefined,'team-line');add(line,'span',name[0],'team-mark');add(line,'span',name)}
  const choices=add(body,'div',undefined,'outcomes');outcomeButton(choices,r,'home','Home',r.prob_home);outcomeButton(choices,r,'draw','Draw',r.prob_draw);outcomeButton(choices,r,'away','Away',r.prob_away);
  const foot=add(a,'div',undefined,'event-card-foot');add(foot,'span','EXPERIMENTAL · 1X2','paper-label');add(foot,'span','Tap a model % to record a paper outcome');
  const details=add(a,'details');add(details,'summary','Model and source information');add(details,'p','Model: '+r.model+'. Published '+full(r.snapshot)+'. Unvalidated model distribution; not bookmaker odds, calibrated win probabilities or evidence of positive EV.');const link=add(details,'a','Open full football research evidence');link.href=r.league==='PL'?'./research-lab/':'./football-leagues/';
 }
 function racingCard(r){
  const a=add($('sports-event-list'),'article',undefined,'event-card'),top=add(a,'div',undefined,'event-card-top');add(top,'strong','♞ '+r.racecourse);add(top,'span',short(r.startUTC)+' UK','event-time');add(a,'h3',r.race_name,'racing-title');
  add(a,'p','FORM-ONLY WEIGHTS · not calibrated win probabilities','source-stamp').style.margin='7px 12px';
  for(const h of [...r.runners].sort((a,b)=>b.model_probability-a.model_probability)){const row=add(a,'div',undefined,'racing-row'),name=add(row,'div');add(name,'strong',h.name);add(name,'small',(h.form_features?.usable_runs??'—')+' usable prior runs · research only');outcomeButton(row,r,h.horse_id,'Form weight',h.model_probability)}
  const foot=add(a,'div',undefined,'event-card-foot');add(foot,'span','EXPERIMENTAL · WIN HYPOTHESIS','paper-label');add(foot,'span',r.runners.length+' runners · field checked '+short(r.fieldChecked)+' UK');
 }
 function sportPresentation(){
  const football=state.sport==='football',racing=state.sport==='racing',available=['all','football','racing'].includes(state.sport);
  $('football-competition-filter').hidden=!football;
  $('league-filter').disabled=!football;
  document.querySelectorAll('.competition-sidebar > h2,.competition-sidebar > [data-league]').forEach(e=>e.hidden=!football);
  document.querySelectorAll('.sidebar-tools a').forEach(a=>{const href=a.getAttribute('href');a.hidden=state.sport!=='all'&&(href.includes('racing-research')? !racing:href.includes('football-leagues')? !football:false)});
  const legend=document.querySelector('.model-legend');legend.hidden=!available;legend.replaceChildren();
  if(available){add(legend,'span',racing?'FORM WEIGHT %':'MODEL %');add(legend,'span',racing?'Untrained form weights; not calibrated win probabilities or bookmaker odds.':'Percentages are experimental estimates, not bookmaker odds.').style.fontWeight='normal';const b=add(legend,'button','How to read these cards');b.type='button';b.dataset.appView='research'}
  const stamps=feeds.map(f=>f.label+' snapshot '+full(f.generated_at_utc)).join(' · '),racingStamp=horse?'Horse racing snapshot '+full(horse.generated_at_utc)+'. Only recent matching pre-race fields can appear.':'A verified horse racing snapshot is unavailable.';
  $('event-source-status').textContent=state.sport==='nfl'?'NFL research feed is not connected.':state.sport==='tennis'?'Tennis research feed is not connected.':racing?racingStamp:state.sport==='all'?(stamps?stamps+'. ':'')+racingStamp+' No live odds feed.':stamps?stamps+'. No live odds feed.':'Published football sources could not be verified. No model cards are shown.';
  const search=$('event-search');search.placeholder=racing?'Search races, courses or horses':football?'Search teams or football competitions':state.sport==='tennis'?'Search tennis players or tournaments':state.sport==='nfl'?'Search NFL teams':'Search teams, races or horses';search.setAttribute('aria-label',search.placeholder);
 }
 function renderEvents(){
  sportPresentation();
  $('race-decisions').hidden=!['all','racing'].includes(state.sport);
  const root=$('sports-event-list');root.replaceChildren();const query=state.query.toLocaleLowerCase().trim();
  const football=games.filter(r=>current(r)&&(state.league==='all'||state.league===r.league)&&(!query||(r.home+' '+r.away+' '+r.league_name).toLocaleLowerCase().includes(query)));
  const racing=races.filter(r=>current(r)&&(!query||(r.race_name+' '+r.racecourse+' '+r.runners.map(h=>h.name).join(' ')).toLocaleLowerCase().includes(query)));
  let list=[];if(state.sport==='all'||state.sport==='football')list.push(...football);if(state.league==='all'&&(state.sport==='all'||state.sport==='racing'))list.push(...racing);
  list.sort((a,b)=>Date.parse(a.kickoff_utc||a.startUTC)-Date.parse(b.kickoff_utc||b.startUTC));
  $('event-heading').textContent=state.sport==='all'?'Upcoming experiments':state.sport==='football'?'Football experiments':state.sport==='racing'?'Horse racing experiments':state.sport==='tennis'?'Tennis experiments':'NFL experiments';
  $('event-count').textContent=loaded?list.length+' available card'+(list.length===1?'':'s')+(query?' matching “'+state.query+'”':''):'Loading published cards…';
  if(!list.length&&loaded){let text='No published experiments match these filters.';if(state.sport==='racing')text='No racing field currently passes the 30-minute freshness and pre-race checks. Earlier forecasts remain in the Racing Lab.';if(['tennis','nfl'].includes(state.sport))text='A verified research feed is not connected for this sport yet. No events or prices have been invented.';add(root,'div',text,'empty')}
  for(const r of list.slice(0,state.limit)){if(r.kind==='football')footballCard(r);else racingCard(r)}
  $('load-more-events').hidden=list.length<=state.limit;sync();
 }
 function recordPaper(key,option){
  const r=[...games,...races].find(r=>r.uid===key);if(!r||!current(r)){$('paper-action-status').textContent='This event is no longer available for a pre-event paper record.';renderEvents();return}
  const id=paperId(r,option);if(selected.includes(id)){selected=selected.filter(x=>x!==id);save();render();sync();return}
  if(localReadFailed||selected.length>=12){$('paper-action-status').textContent=localReadFailed?'Saved data needs recovery before new records can be stored.':'Your paper list already has 12 selections.';return}
  let selection,start,p,description;if(r.kind==='football'){const ps={home:r.prob_home,draw:r.prob_draw,away:r.prob_away};if(!Object.hasOwn(ps,option))return;selection=option==='home'?r.home+' — Win':option==='away'?r.away+' — Win':'Draw';p=ps[option];start=r.kickoff_utc;description=r.home+' vs '+r.away}else{const h=r.runners.find(h=>h.horse_id===option);if(!h)return;selection=h.name+' — Win';p=h.model_probability;start=r.startUTC;description=r.racecourse+' · '+r.race_name}
  const existing=data.find(x=>x.id===id);if(existing&&(existing.selection!==selection||existing.startUTC!==start)){$('paper-action-status').textContent='Record identity mismatch; no saved item was overwritten.';return}
  if(!existing){if(data.length>=100){$('paper-action-status').textContent='Your stored research has reached 100 records. Export a backup before making room.';return}data.push({id,sport:r.kind==='football'?'⚽ Football':'🐎 Horses',event:description+' · '+full(start),startUTC:start,selection,support:(r.kind==='football'?'Experimental model estimate: ':'Untrained form-only weight: ')+pct(p)+'. Source snapshot '+r.snapshot+'.',counter:'No verified bookmaker quote, calibrated independent probability or qualified EV. This is a user-selected paper hypothesis.',model:r.model||'FORM_PERCENTILE_SOFTMAX_RESEARCH_V1',status:'PAPER RESEARCH · UNPRICED · UNVALIDATED',sample:false})}
  selected.push(id);save();render();sync();$('paper-action-status').textContent=selection+' added to your paper list. No bet has been placed.';
 }
 function renderResults(){const summary=$('sports-results-summary'),list=$('sports-results-list');summary.replaceChildren();list.replaceChildren();const rows=horse?.settled_forecasts||[];for(const [label,value]of [['Provisionally scored',horse?.performance?.scored_forecasts??'—'],['Two-publisher checks',horse?.performance?.cross_source_verified_results??'—'],['Priced paper yield','Unavailable']]){const a=add(summary,'article',label);add(a,'strong',value)}if(!rows.length)add(list,'div','No verified result snapshot available.','empty');
  for(const r of rows.slice(0,10)){const winner=r.runners?.find(h=>h.horse_id===r.winner_horse_id);if(!winner)continue;const a=add(list,'article',undefined,'result-card');add(a,'small',full(r.startUTC)+' · COMPLETED RESEARCH');add(a,'h3',r.racecourse+' · '+r.race_name);add(a,'p','Winner: '+winner.name,'result-winner');add(a,'p',(r.result_verification==='TWO_PUBLISHER_CORROBORATED'?'Winner and field corroborated by two publishers.':'Single-source provisional result.')+' Original forecast frozen '+full(r.generated_at_utc)+'. No priced betting return or official challenge credit.');}
 }
 function renderResearch(){const summary=$('lab-summary'),out=$('autofeedfixtures');summary.replaceChildren();out.replaceChildren();for(const [label,value,text]of [['Published upcoming football vectors',games.filter(current).length,'Experimental model estimates; not qualified betting selections.'],['Racing provisionally scored',horse?.performance?.scored_forecasts??'—',horse?'Snapshot '+full(horse.generated_at_utc):'Snapshot unavailable.'],['Racing two-publisher checks',horse?.performance?.cross_source_verified_results??'—','Data-origin independence is not established.'],['Official challenge','0/100','Separate eligibility requirements apply.']]){const a=add(summary,'article');add(a,'span',label,'small');add(a,'strong',value);add(a,'p',text,'small')}
  $('dashboard-state').textContent='Published sources loaded; models remain unvalidated.';$('autofeedstatus').textContent=feeds.length?'Published snapshot':'Unavailable';$('autofeednote').textContent=feeds.map(f=>f.label+': '+full(f.generated_at_utc)).join(' · ')+'. Scheduled fixture observations, not live scores.';for(const r of games.filter(current).slice(0,8)){const a=add(out,'div',undefined,'card');add(a,'strong',r.home+' vs '+r.away);add(a,'p',r.league_name+' · '+full(r.kickoff_utc),'small')}
 }
 async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Snapshot unavailable');return r.json()}
 async function load(){const results=await Promise.allSettled([get('./research-dashboard-data.json'),get('./football-expanded-data.json'),get('./horse-model-data.json')]);const maps=new Map();feeds=[];horse=null;
  results.slice(0,2).forEach((v,i)=>{if(v.status!=='fulfilled'||!safe(v.value)||!Array.isArray(v.value.experimental_model_forecasts))return;const f=v.value;feeds.push({label:i===0?'Premier League':'Additional leagues',generated_at_utc:f.generated_at_utc});if(Date.now()-Date.parse(f.generated_at_utc)>36*3600000)return;for(const r of f.experimental_model_forecasts){if(!r||!validVector(r)||!Number.isFinite(Date.parse(r.kickoff_utc)))continue;const league=r.league||(i===0?'PL':'OTHER'),uid=[league,r.home,r.away,r.kickoff_utc].join('|');maps.set(uid,{...r,kind:'football',uid,league,league_name:r.league_name||names[league]||'Football',snapshot:f.generated_at_utc})}});games=[...maps.values()];races=[];
  if(results[2].status==='fulfilled'&&safe(results[2].value)){horse=results[2].value;for(const r of horse.form_forecasts||[]){const c=horse.current_field_checks?.[r.record_sha256],age=Date.now()-Date.parse(c?.runner_observed_at_utc);if(c?.status!=='FRESH_MATCHING_FIELD'||!Number.isFinite(age)||age<0||age>1800000||!Array.isArray(r.runners)||JSON.stringify([...(c.active_runner_ids||[])].sort())!==JSON.stringify(r.runners.map(x=>x.horse_id).sort())||r.runners.some(x=>!Number.isFinite(x.model_probability)||x.model_probability<=0||x.model_probability>=1)||Math.abs(r.runners.reduce((s,x)=>s+x.model_probability,0)-1)>1e-8)continue;races.push({...r,kind:'racing',uid:'race|'+r.race_id,snapshot:horse.generated_at_utc,fieldChecked:c.runner_observed_at_utc})}}
  loaded=true;$('event-source-status').textContent=feeds.length?feeds.map(f=>f.label+' snapshot '+full(f.generated_at_utc)).join(' · ')+'. No live odds feed.':'Published football sources could not be verified. No model cards are shown.';renderEvents();renderResults();renderResearch();
 }
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.appView){state.view=b.dataset.appView;views()}if(b.dataset.sport){state.query='';$('event-search').value='';state.sport=b.dataset.sport;state.view='selections';state.league='all';state.limit=8;views();renderEvents()}if(b.dataset.league){state.league=b.dataset.league;state.sport='football';state.view='selections';state.limit=8;views();renderEvents()}if(b.hasAttribute('data-paper-open'))openPaper();if(b.dataset.paperOutcome)recordPaper(b.dataset.eventKey,b.dataset.paperOutcome)});
 $('paper-close').onclick=closePaper;document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePaper();document.body.classList.remove('search-open');$('search-toggle').setAttribute('aria-expanded','false')}});
 $('search-toggle').onclick=()=>{const yes=document.body.classList.toggle('search-open');$('search-toggle').setAttribute('aria-expanded',String(yes));if(yes)$('event-search').focus()};
 $('event-search').oninput=e=>{state.query=e.target.value;state.limit=8;state.view='selections';views();renderEvents()};$('league-filter').onchange=e=>{if(state.sport!=='football')return;state.league=e.target.value;state.limit=8;views();renderEvents()};$('load-more-events').onclick=()=>{state.limit+=8;renderEvents()};$('refresh-dashboard').onclick=()=>window.location.reload();
 new MutationObserver(sync).observe($('basket'),{childList:true,subtree:true});setInterval(()=>{renderEvents();renderResearch()},60000);views();sync();load();
})();


