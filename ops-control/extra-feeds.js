'use strict';
(function (root) {
  const specs = [
    {id:'racing-forecasts',label:'Racing forecast coverage',filename:'horse-predictions-data.json',owner:'Horse Racing Manager',maxAgeHours:6},
    {id:'darts',label:'Darts fixtures',filename:'darts/feed.json',owner:'Darts Manager',maxAgeHours:48},
    {id:'darts-analysis',label:'Darts analysis',filename:'darts/analysis.json',owner:'Darts Manager',maxAgeHours:48},
    {id:'rugby',label:'Rugby provider fixtures',filename:'rugby-research-data.json',owner:'Rugby Manager',maxAgeHours:48},
    {id:'hybrid-prices',label:'Football price pairs',filename:'paper-lab/hybrid-market-data.json',owner:'Football Manager',maxAgeHours:0.5},
    {id:'fixture-prices',label:'Darts and Rugby price pairs',filename:'paper-lab/fixture-market-evidence.json',owner:'Darts / Rugby Managers',maxAgeHours:0.5}
  ];
  const priceSources=['hybrid-prices','fixture-prices'];
  function priceTimes(record, hybrid) {
    return [record?.benchmark,record?.sky_bet].map(quote => Date.parse(hybrid ?
      quote?.observed_at_utc : quote?.updated_at_utc || quote?.captured_at_utc));
  }
  function context(id, data, now) {
    if (id==='darts-analysis' && data.status==='AWAITING_PAGINATED_COLLECTION') {
      return {pending:'Darts historical analysis is awaiting complete pagination.'};
    }
    if (!priceSources.includes(id)) return {};
    const times=Array.isArray(data.records) ? data.records.map(record => {
      const [benchmark,sky]=priceTimes(record,id==='hybrid-prices');
      const start=Date.parse(record?.start_utc);
      return benchmark<=now && sky<=now && benchmark<start && sky<start && now<start ? Math.min(benchmark,sky) : NaN;
    }).filter(Number.isFinite) : [];
    const newest=times.length ? new Date(Math.max(...times)).toISOString() : null;
    const valid=data.schema_version===1 && Array.isArray(data.records) &&
      (id==='hybrid-prices' || (data.research_only===true && data.publication_gate==='BLOCKED'));
    return {observedAt:newest, gateOK:valid, ...(!newest && valid ? {pending:'No current pre-event price pair in this snapshot.'} : {})};
  }
  const api = {specs,context};
  if (typeof module === 'object' && module.exports) module.exports=api;
  else root.ValueWatchExtraFeeds=api;
})(globalThis);
