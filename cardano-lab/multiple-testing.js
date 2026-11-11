/* Cardano family-wise error and FDR audit. Research only; not a betting gate. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardanoMultipleTesting=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function audit(hypotheses,options={}){
 if(!Array.isArray(hypotheses)||!hypotheses.length||hypotheses.length>10000)throw Error('Nonempty hypothesis family of at most 10000 required');
 const alpha=options.alpha===undefined?.05:options.alpha;
 if(typeof alpha!=='number'||!Number.isFinite(alpha)||alpha<=0||alpha>=1)throw Error('alpha must be between 0 and 1');
 const ids=new Set();
 const ordered=hypotheses.map((h,i)=>{
  if(!h||typeof h!=='object'||Array.isArray(h)||typeof h.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(h.id)||ids.has(h.id))throw Error('Missing, invalid or duplicate hypothesis id');
  ids.add(h.id);
  if(typeof h.p_value!=='number'||!Number.isFinite(h.p_value)||h.p_value<0||h.p_value>1)throw Error('p_value must be between 0 and 1');
  if(h.pre_registered!==true&&h.pre_registered!==false)throw Error('Explicit pre_registered flag required');
  return {id:h.id,p_value:h.p_value,pre_registered:h.pre_registered,original_index:i};
 }).sort((a,b)=>a.p_value-b.p_value||a.original_index-b.original_index);
 const m=ordered.length;
 // Holm step-down controls FWER under arbitrary dependence for valid p-values.
 let holmMax=0,holmActive=true;
 const holm=ordered.map((h,i)=>{
  holmMax=Math.max(holmMax,Math.min(1,(m-i)*h.p_value));
  const threshold=alpha/(m-i);
  if(h.p_value>threshold)holmActive=false;
  return {id:h.id,adjusted_p:holmMax,reject:holmActive,threshold};
 });
 // Benjamini-Hochberg step-up FDR control requires independence or suitable positive dependence.
 let running=1;
 const bh=new Array(m);
 for(let i=m-1;i>=0;i--){running=Math.min(running,ordered[i].p_value*m/(i+1));bh[i]={id:ordered[i].id,adjusted_q:Math.min(1,running),reject:false}}
 let maxRejected=-1;
 for(let i=0;i<m;i++)if(ordered[i].p_value<=alpha*(i+1)/m)maxRejected=i;
 for(let i=0;i<=maxRejected;i++)bh[i].reject=true;
 const byId=new Map(ordered.map((h,i)=>[h.id,{id:h.id,p_value:h.p_value,pre_registered:h.pre_registered,holm_adjusted_p:holm[i].adjusted_p,holm_reject:holm[i].reject,bh_adjusted_q:bh[i].adjusted_q,bh_reject:bh[i].reject}]));
 return {hypothesis_count:m,alpha,results:hypotheses.map(h=>byId.get(h.id)),holm_rejections:holm.filter(x=>x.reject).length,bh_rejections:bh.filter(x=>x.reject).length,exploratory_count:ordered.filter(x=>!x.pre_registered).length,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true,notes:'Exploratory multiple-comparison adjustments only. Requires valid p-values and a complete predeclared family. BH FDR assumptions may fail with dependent sports outcomes. Does not correct data leakage, optional stopping, selection bias, or establish betting value.'};
}
return Object.freeze({audit});
});
