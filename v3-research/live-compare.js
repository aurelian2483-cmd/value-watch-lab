"use strict";
(()=>{
 const C=window.V3LiveCompare,region=document.getElementById("v3-live-snapshot"),status=document.getElementById("v3-live-status");
 if(!C||!region||!status)return;
 const elem=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text);return n};
 const pushCell=(tr,value)=>tr.append(elem("td",value));
 async function load(){
  region.replaceChildren();status.textContent="Checking current research snapshots…";
  try{
   const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),15000);
   let source,feed;
   try{
    const responses=await Promise.all(["../racing-research-data.json","../horse-model-data.json"].map(u=>fetch(u,{cache:"no-store",signal:controller.signal})));
    if(responses.some(r=>!r.ok))throw Error("Research snapshots unavailable");
    [source,feed]=await Promise.all(responses.map(r=>r.json()));
   }finally{clearTimeout(abort)}
   const now=Date.now();
   if(source.research_only!==true||source.publication_gate!=="BLOCKED"||source.model_validation!=="UNVALIDATED"||!Array.isArray(source.races)||feed.publication_gate!=="BLOCKED"||feed.model_validation!=="UNVALIDATED")throw Error("Source research safety gate rejected");
   const live=source.races.filter(r=>Number.isFinite(Date.parse(r.startUTC))&&Date.parse(r.startUTC)>now+300000).sort((a,b)=>Date.parse(a.startUTC)-Date.parse(b.startUTC)).slice(0,30);
   if(!live.length){region.append(elem("p","No upcoming races in the current source snapshot."));status.textContent="No comparable races currently available";return}
   const checked=live.map(r=>C.compare(r,feed,now));
   const usable=checked.filter(x=>x.v1Available||x.v3Available);
   const oddsOnly=checked.filter(x=>!x.v1Available&&!x.v3Available&&x.oddsAvailable);
   if(!usable.length){region.append(elem("p","No eligible V1 or V3 rankings in the current race snapshot. Both models correctly withhold predictions when the race type, runner observations, or historical form is outside their rules."));status.textContent=live.length+" upcoming races checked · 0 model-eligible races · "+oddsOnly.length+" odds-only races hidden from comparison";return}
   let dual=0,oddsCount=0;
   for(const race of usable.slice(0,12)){
    if(race.v1Available&&race.v3Available)dual++;
    if(race.oddsAvailable)oddsCount++;
    const card=elem("article","");card.className="panel";
    card.append(elem("h3",String(race.racecourse||"Race")+" · "+new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(race.startUTC))));
    card.append(elem("p","V1: "+(race.v1Available?"Available":"No eligible pre-race snapshot")+" · V3: "+(race.v3Available?"Experimental ranking available":race.v3Reason||"Unavailable")+" · Odds: "+(race.oddsAvailable?"Publisher-observed; not executable":"Unavailable")));
    const wrapper=elem("div","");wrapper.className="scroller";const table=document.createElement("table");const head=document.createElement("thead"),heading=document.createElement("tr");
    for(const t of ["Horse","V1 rank","V3 rank","V1 weight*","V3 weight*","Source odds†"])heading.append(elem("th",t));head.append(heading);table.append(head);
    const body=document.createElement("tbody");
    race.rows.sort((a,b)=>(a.v3Rank??99)-(b.v3Rank??99)||(a.v1Rank??99)-(b.v1Rank??99)).forEach(h=>{const tr=document.createElement("tr");for(const value of [h.name,h.v1Rank??"—",h.v3Rank??"—",h.v1Weight===null?"—":(100*h.v1Weight).toFixed(1)+"%",h.v3Weight===null?"—":(100*h.v3Weight).toFixed(1)+"%",h.sourceObservedOdds===null?"—":h.sourceObservedOdds.toFixed(2)])pushCell(tr,value);body.append(tr)});
    table.append(body);wrapper.append(table);card.append(wrapper);if(race.oddsAvailable)card.append(elem("p","† Sky Bet via publisher; source-observed only. Not an executable price, verified market edge, or bet recommendation. Observed: "+race.observedAt));region.append(card);
   }
   status.textContent=usable.length+" model-eligible races · "+dual+" with both V1 and V3 · "+oddsCount+" with publisher-observed prices · "+oddsOnly.length+" odds-only races hidden. No validated betting picks.";
  }catch(e){region.replaceChildren();region.append(elem("p","Live comparison unavailable. No odds or model selections inferred."));status.textContent=e?.name==="AbortError"?"Source request timed out":"Research feed could not be verified"}
 }
 document.getElementById("v3-refresh")?.addEventListener("click",load);
 load();
})();
