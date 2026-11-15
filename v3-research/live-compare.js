"use strict";
(()=>{
 const C=window.V3LiveCompare,R=window.RaceCards,region=document.getElementById("v3-live-snapshot"),status=document.getElementById("v3-live-status");
 if(!C||!region||!status)return;
 const elem=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text);return n};
 const pushCell=(tr,value)=>tr.append(elem("td",value));
 async function load(){
  region.replaceChildren();status.textContent="Checking current research snapshots…";
  try{
   const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),15000);
   let source,feed,contextFeed;
   try{
    const responses=await Promise.all(["../racing-research-data.json","../horse-model-data.json","../horse-predictions-data.json"].map(u=>fetch(u,{cache:"no-store",signal:controller.signal})));
    if(responses.some(r=>!r.ok))throw Error("Research snapshots unavailable");
    [source,feed,contextFeed]=await Promise.all(responses.map(r=>r.json()));
   }finally{clearTimeout(abort)}
   const now=Date.now();
   if(source.research_only!==true||source.publication_gate!=="BLOCKED"||source.model_validation!=="UNVALIDATED"||!Array.isArray(source.races)||feed.publication_gate!=="BLOCKED"||feed.model_validation!=="UNVALIDATED")throw Error("Source research safety gate rejected");
   const live=source.races.filter(r=>Number.isFinite(Date.parse(r.startUTC))&&Date.parse(r.startUTC)>now+300000).sort((a,b)=>Date.parse(a.startUTC)-Date.parse(b.startUTC)).slice(0,30);
   if(!live.length){region.append(elem("p","No upcoming races in the current source snapshot."));status.textContent="No comparable races currently available";return}
   const checked=live.map(r=>C.compare(r,feed,now));
   const usable=checked.filter(x=>x.v1Available||x.v3Available);
   const oddsOnly=checked.filter(x=>!x.v1Available&&!x.v3Available&&x.oddsAvailable);
   const contextResults=[];
   if(R&&typeof R.contextForecast==="function"&&contextFeed?.research_only===true&&contextFeed.publication_gate==="BLOCKED"&&contextFeed.model_validation==="UNVALIDATED"){
    for(const r of live){
     const c=R.contextForecast(r,contextFeed,now);
     if(!c?.valid||!c.fresh||!c.record||!Array.isArray(c.record.runners))continue;
     const ranked=[...c.record.runners].sort((a,b)=>b.model_probability-a.model_probability||String(a.horse_id).localeCompare(String(b.horse_id)));
     if(ranked.length<4||ranked.some(h=>typeof h.model_probability!=="number"||!Number.isFinite(h.model_probability)))continue;
     contextResults.push({race:r,ranked,odds:C.observedOdds(r,now)});
    }
   }
   if(!usable.length){region.append(elem("p","No eligible all-weather V1 or V3 rankings at present. We are not replacing missing forecasts with guesses."))}
   let dual=0,oddsCount=0;
   for(const race of usable.slice(0,12)){
    if(race.v1Available&&race.v3Available)dual++;
    if(race.oddsAvailable)oddsCount++;
    const card=elem("article","");card.className="panel";
    card.append(elem("h3",String(race.racecourse||"Race")+" · "+new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(race.startUTC))));
    card.append(elem("p","V1: "+(race.v1Available?"Available":"No eligible pre-race snapshot")+" · V3: "+(race.v3Available?"Experimental ranking available":race.v3Reason||"Unavailable")+" · Odds: "+(race.oddsAvailable?"Publisher-observed; not executable":"Unavailable")));
    const topPanel=elem("section","");topPanel.className="v3-top4";topPanel.setAttribute("aria-label","Predicted first to fourth places");
    topPanel.append(elem("h4","Predicted finishing order · 1st–4th"));
    const board=elem("div","");board.className="v3-top4-grid";
    for(const [name,key,available] of [["V1 · Frozen form","v1Rank",race.v1Available],["V3 · Experimental","v3Rank",race.v3Available]]){
     const column=elem("div","");column.className="v3-top4-model";column.append(elem("h5",name));
     if(!available||race.rows.length<4){
      column.append(elem("p",race.rows.length<4?"Fewer than four confirmed runners.":"No eligible full-field ranking."));
     }else{
      for(let place=1;place<=4;place++){
       const horse=race.rows.find(h=>h[key]===place),entry=elem("div","");
       entry.className="v3-place";
       entry.append(elem("span",["🥇 1st","🥈 2nd","🥉 3rd","4️⃣ 4th"][place-1]));
       entry.append(elem("strong",horse?.name||"Unavailable"));
       column.append(entry);
      }
     }
     board.append(column);
    }
    topPanel.append(board);
    topPanel.append(elem("p","Rank order only; not a validated exact finish forecast or evidence that four places are paid."));
    card.append(topPanel);
    const wrapper=elem("div","");wrapper.className="scroller";const table=document.createElement("table");const head=document.createElement("thead"),heading=document.createElement("tr");
    for(const t of ["Horse","V1 rank","V3 rank","V1 weight*","V3 weight*","Source odds†"])heading.append(elem("th",t));head.append(heading);table.append(head);
    const body=document.createElement("tbody");
    race.rows.sort((a,b)=>(a.v3Rank??99)-(b.v3Rank??99)||(a.v1Rank??99)-(b.v1Rank??99)).forEach(h=>{const tr=document.createElement("tr");for(const value of [h.name,h.v1Rank??"—",h.v3Rank??"—",h.v1Weight===null?"—":(100*h.v1Weight).toFixed(1)+"%",h.v3Weight===null?"—":(100*h.v3Weight).toFixed(1)+"%",h.sourceObservedOdds===null?"—":h.sourceObservedOdds.toFixed(2)])pushCell(tr,value);body.append(tr)});
    table.append(body);wrapper.append(table);card.append(wrapper);if(race.oddsAvailable)card.append(elem("p","† Sky Bet via publisher; source-observed only. Not an executable price, verified market edge, or bet recommendation. Observed: "+race.observedAt));region.append(card);
   }
   
   if(contextResults.length){
    const heading=elem("h3","Other racing disciplines · Context Form V1 (separate model)");
    region.append(heading);
    region.append(elem("p","This is the existing context-form research model, not frozen all-weather V1 and not V3. It only appears when pre-race runner and context checks are fresh. Uncalibrated relative weights; no betting advice."));
    for(const item of contextResults.slice(0,8)){
     const card=elem("article","");card.className="panel";
     const start=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(item.race.startUTC));
     card.append(elem("h4",String(item.race.racecourse||"Race")+" · "+start+" · Context Form V1"));
     const board=elem("div","");board.className="v3-top4-model";
     board.append(elem("h5","Experimental ranked top four · 1st–4th"));
     const odds=new Map((item.odds?.quotes||[]).map(q=>[String(q.horse_id),q.decimal]));
     item.ranked.slice(0,4).forEach((horse,i)=>{
      const row=elem("div","");row.className="v3-place";
      row.append(elem("span",["🥇 1st","🥈 2nd","🥉 3rd","4️⃣ 4th"][i]));
      const observed=odds.get(String(horse.horse_id));
      row.append(elem("strong",String(horse.name)+(observed===undefined?"":" · observed "+observed.toFixed(2))));
      board.append(row);
     });
     card.append(board);
     card.append(elem("p","Experimental context ranking, not validated win/place probabilities. Observed odds, if present, are non-executable publisher observations."));
     region.append(card);
    }
   }
   if(!usable.length&&!contextResults.length){region.append(elem("p","No fresh, eligible context-model forecast either. Existing bookmaker quotes alone cannot establish predicted finishing positions."))}
   status.textContent=usable.length+" Flat model-eligible races · "+dual+" with both V1 and V3 · "+contextResults.length+" fresh separate context-model races · "+oddsOnly.length+" odds-only races hidden. No validated betting picks.";
  }catch(e){region.replaceChildren();region.append(elem("p","Live comparison unavailable. No odds or model selections inferred."));status.textContent=e?.name==="AbortError"?"Source request timed out":"Research feed could not be verified"}
 }
 document.getElementById("v3-refresh")?.addEventListener("click",load);
 load();
})();
