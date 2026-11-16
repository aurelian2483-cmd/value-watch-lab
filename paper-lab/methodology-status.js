'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.ValueWatchMethodologyStatus=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const planned=Object.freeze({
    football:['Dixon-Coles goals','xG ratings','Market-adjusted challenger'],
    racing:['Conditional logit','Market-adjusted challenger'],
    tennis:['Surface-specific Elo','Serve/return challenger'],
    nfl:['Quarterback-adjusted efficiency','Market-adjusted challenger']
  });
  function forEvent(event){
    if(!event || !Object.prototype.hasOwnProperty.call(planned,event.sport)) return [];
    const live=Array.isArray(event.choices) && event.choices.some(choice=>typeof choice.probability==='number' && Number.isFinite(choice.probability)) && typeof event.model?.name==='string' && event.model.name.trim()
      ? [{name:event.model.name.trim().slice(0,100),status:'EXPERIMENTAL_ACTIVE',detail:'Source model estimate; UNVALIDATED'}]
      : [{name:'Existing source model',status:'NO_MODEL_ESTIMATE',detail:'No event-level model estimate available'}];
    return live.concat(planned[event.sport].map(name=>({name,status:'NOT_CONNECTED',detail:'Proposed challenger; no event-level output or validated comparison'})));
  }
  return Object.freeze({forEvent});
});
