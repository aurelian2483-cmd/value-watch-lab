/* Value Watch method signatures: permanent colour identities and honest overlap only.
   This module does not validate any model, prices, EV or betting opportunity. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValueWatchMethodStars=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const methods=Object.freeze([
    Object.freeze({id:'current',name:'Engine 2.5',colour:'#55ece2',kind:'model'}),
    Object.freeze({id:'experimental',name:'Engine 3.0',colour:'#eda1ff',kind:'model'}),
    Object.freeze({id:'hybrid',name:'Hybrid 3.1',colour:'#ffca71',kind:'model'}),
    Object.freeze({id:'compare',name:'Side-by-Side Compare',colour:'#9ca8ff',kind:'tool'}),
    Object.freeze({id:'reliability',name:'Historical Reliability',colour:'#c9ed91',kind:'form-screen'}),
    Object.freeze({id:'bottleneck',name:'Bottleneck Lab',colour:'#efac88',kind:'readiness'}),
    Object.freeze({id:'racing-top-four',name:'Racing Top Four',colour:'#ff90b4',kind:'place-model'}),
    Object.freeze({id:'alpha-hunt',name:'Alpha Hunt',colour:'#e8df86',kind:'separate-unconnected'})
  ]);
  const byId=new Map(methods.map(item=>[item.id,item]));
  const outcomes=['home','draw','away'];
  function directionFromVector(values,ids){
    if(!Array.isArray(values)||!Array.isArray(ids)||values.length!==ids.length||values.length<2)return null;
    if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)return null;
    if(values.some(p=>typeof p!=='number'||!Number.isFinite(p)||p<0||p>1)||Math.abs(values.reduce((a,b)=>a+b,0)-1)>.002)return null;
    const ranked=values.map((probability,i)=>({probability,id:ids[i]})).sort((a,b)=>b.probability-a.probability);
    return ranked[0].probability-ranked[1].probability>1e-10?ranked[0].id:null;
  }
  function experimentalDirection(event,now=Date.now()){
    // Engine 3.0 is a market/recent-form blend and requires the original
    // documented complete, same-source, still fresh source observations.
    if(event?.sport!=='football'||!Array.isArray(event.choices)||event.choices.length!==3||
      !/poisson\.form\.alpha\.0[.]025\.v1/i.test(event.model?.name||''))return null;
    const start=Date.parse(event.startUTC);
    if(!(start>now+300000))return null;
    const choices=outcomes.map(id=>event.choices.find(choice=>choice.id===id));
    if(choices.some(x=>!x)||new Set(choices.map(x=>x.id)).size!==3)return null;
    const source=choices[0]?.quote?.source,bookmaker=choices[0]?.quote?.bookmaker;
    if(!source||!bookmaker)return null;
    const clean=choices.every(c=>{
      const q=c.quote,seen=Date.parse(q?.observedAt);
      return Number.isFinite(c.probability)&&c.probability>=0&&c.probability<=1&&
        q?.status==='SOURCE_OBSERVED_UNVERIFIED'&&Number.isFinite(q.decimal)&&q.decimal>1&&
        q.source===source&&q.bookmaker===bookmaker&&Number.isFinite(seen)&&
        seen<=now&&now-seen<=1800000&&seen<start-300000;
    });
    if(!clean)return null;
    const recent=choices.map(c=>c.probability),odds=choices.map(c=>c.quote.decimal);
    if(Math.abs(recent.reduce((a,b)=>a+b,0)-1)>.002)return null;
    const market=odds.map(x=>1/x),sum=market.reduce((a,b)=>a+b,0);
    const blended=recent.map((p,i)=>.5*p+.5*market[i]/sum);
    return directionFromVector(blended,outcomes);
  }
  function evaluate(event,{selected=[],leaderId=null,reliability=null,hybrid=null,now=Date.now()}={}){
    const result={byChoice:{},overlaps:[],count:0};
    if(!event||!Array.isArray(event.choices)||new Set(selected).size!==selected.length)return result;
    const start=Date.parse(event.startUTC),seen=Date.parse(event.observedAt);
    if(!(start>now+300000)||!(seen<=now)||!Number.isFinite(seen))return result;
    const allowed=new Set(event.choices.map(c=>c.id));
    const emit=(id,choice)=>{
      if(!selected.includes(id)||!allowed.has(choice))return;
      (result.byChoice[choice] ||= []).push(byId.get(id));
    };
    // Source model's unique first choice. A racing context weight is a ranking,
    // not a probability and is never compared with a win/1X2 model here.
    if(event.model?.probabilityKind!=='EXPERIMENTAL_CONTEXT_WEIGHT'&&
       event.model?.validation==='UNVALIDATED'){
      if(typeof leaderId==='string'&&leaderId)emit('current',leaderId);
    }
    const exp=experimentalDirection(event,now);
    if(exp)emit('experimental',exp);
    // A Hybrid direction exists only if the strict verified market benchmark
    // evaluator successfully yielded a complete normalized estimate.
    if(event.sport==='football'&&hybrid&&Array.isArray(hybrid.probabilities)&&
       event.choices.length===3){
      const h=directionFromVector(hybrid.probabilities,outcomes);
      if(h)emit('hybrid',h);
    }
    // This is a historical-form *direction*, not a model probability.
    if(event.sport==='football'&&reliability?.status==='FORM_CANDIDATE'){
      if(reliability.side==='HOME'||reliability.side==='AWAY')emit('reliability',reliability.side.toLowerCase());
    }
    // No agreement stars for Compare (a UI), Bottleneck (readiness), Racing
    // Top Four (a different *place* market), or Alpha Hunt (separate/unconnected).
    result.overlaps=Object.entries(result.byChoice).filter(([id,items])=>
      items.length>1&&items.every(item=>item.kind==='model'||item.kind==='form-screen'))
      .map(([choice,items])=>({choice,methods:items.map(item=>item.id)}));
    result.count=Object.values(result.byChoice).reduce((n,items)=>n+items.length,0);
    return result;
  }
  return Object.freeze({methods,byId,directionFromVector,experimentalDirection,evaluate});
});