'use strict';
(()=>{
 const status=document.getElementById('recommendation-status'),root=document.getElementById('recommendation-cards');
 const add=(p,t,s,c)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=String(s);if(c)e.className=c;p.append(e);return e};
 const fmt=s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(s))+' UK';
 let data=null;
 function render(){
  root.replaceChildren();const expired=Date.now()>=Date.parse(data.review_expires_at_utc);let host=root;if(expired){host=add(root,'details');host.id='earlier-race-decisions';add(host,'summary','Earlier reviewed race decisions ('+data.decisions.length+')');}
  status.textContent=(expired?'No fresh reviewed racing selection. Earlier review expired; last reviewed ':'Reviewed ')+fmt(data.reviewed_at_utc)+'. '+data.coverage;
  for(const d of data.decisions){
   const past=Date.now()>=Date.parse(d.startUTC)-300000,archived=expired||past,a=add(host,'article',undefined,'race');a.style.padding='18px 0';
   add(a,'small',(archived?'ARCHIVED / NOT CURRENT · ':'PRE-RACE PAPER RESEARCH · ')+d.race);
   add(a,'h3',d.selection);add(a,'strong',(archived?'Earlier verdict: ':'')+d.paper_verdict);add(a,'p',d.reason);
   add(a,'p','Main concern: '+d.counter,'note');add(a,'p','Price check: '+d.price,'note');add(a,'p',d.why_price_matters,'note');add(a,'p','Betting decision: '+d.betting_verdict,'note');
   const details=add(a,'details');details.id='decision-evidence-'+d.race_id;add(details,'summary','Supporting evidence');
   for(const s of d.sources){let u;try{u=new URL(s.url)}catch{continue}if(u.protocol!=='https:'||u.username||u.password)continue;const p=add(details,'p'),link=add(p,'a',s.label);link.href=u.href;link.target='_blank';link.rel='noopener noreferrer'}
   add(details,'p','Editorial research judgment. No independent calibrated probability, verified positive EV, real-money stake or official challenge credit. This review expires '+fmt(data.review_expires_at_utc)+'.','note');
  }
 }
 async function load(){try{
  const r=await fetch(status.dataset.feed||'recommendations.json',{cache:'no-store'});if(!r.ok)throw Error('No reviewed race decisions available.');const d=await r.json();
  if(d.schema_version!==1||d.research_only!==true||d.publication_gate!=='BLOCKED'||d.model_validation!=='UNVALIDATED'||!Number.isFinite(Date.parse(d.reviewed_at_utc))||Date.parse(d.reviewed_at_utc)>Date.now()+300000||!Number.isFinite(Date.parse(d.review_expires_at_utc))||Date.parse(d.review_expires_at_utc)<=Date.parse(d.reviewed_at_utc)||Date.parse(d.review_expires_at_utc)-Date.parse(d.reviewed_at_utc)>1800000||!Array.isArray(d.decisions)||d.decisions.some(x=>!Number.isFinite(Date.parse(x.startUTC))||Date.parse(x.startUTC)<=Date.parse(d.reviewed_at_utc)||!Array.isArray(x.sources)))throw Error('Race decisions failed review controls.');
  data=d;render();
 }catch(e){data=null;root.replaceChildren();status.textContent=e.message}}
 setInterval(()=>{if(data){const open=[...root.querySelectorAll('details[open]')].map(e=>e.id);render();for(const id of open){const e=document.getElementById(id);if(e)e.open=true}}},60000);load();
})();
