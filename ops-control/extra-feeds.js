'use strict';
(function (root) {
  const specs = [
    {id:'racing-future',label:'Seven-day racing coverage',filename:'racing-future-coverage.json',owner:'Horse Racing Manager',maxAgeHours:6},
    {id:'racing-forecasts',label:'Racing forecast coverage',filename:'horse-predictions-data.json',owner:'Horse Racing Manager',maxAgeHours:6},
    {id:'darts',label:'Darts fixtures',filename:'darts/feed.json',owner:'Darts Manager',maxAgeHours:48},
    {id:'darts-analysis',label:'Darts analysis',filename:'darts/analysis.json',owner:'Darts Manager',maxAgeHours:48},
    {id:'rugby',label:'Rugby provider fixtures',filename:'rugby-research-data.json',owner:'Rugby Manager',maxAgeHours:48},
    {id:'hybrid-prices',label:'Football price pairs',filename:'paper-lab/hybrid-market-data.json',owner:'Football Manager',maxAgeHours:0.5},
    {id:'fixture-prices',label:'Darts and Rugby price pairs',filename:'paper-lab/fixture-market-evidence.json',owner:'Darts / Rugby Managers',maxAgeHours:0.5}
  ];
  const priceSources=['hybrid-prices','fixture-prices'];
  function parseEvidenceTime(value) {
    if (typeof value!=='string' || value.length>64 ||
        !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return null;
    const day=value.slice(0,10), midnight=new Date(day+'T00:00:00Z');
    const instant=Date.parse(value);
    return Number.isFinite(instant) && Number.isFinite(+midnight) &&
      midnight.toISOString().slice(0,10)===day ? instant : null;
  }
  function priceTimes(record, hybrid) {
    return [record?.benchmark,record?.sky_bet].map(quote => parseEvidenceTime(hybrid ?
      quote?.observed_at_utc : quote?.updated_at_utc ?? quote?.captured_at_utc));
  }
  function context(id, data, now) {
    if (id==='racing-future' && Array.isArray(data.days)) {
      const gaps=data.days.filter(day=>['SOURCE_DATE_MISMATCH','COLLECTION_FAILED'].includes(day?.index_status));
      const recovered=gaps.filter(day=>Number.isInteger(day.meeting_page_races)&&day.meeting_page_races>0);
      if(gaps.length)return {pending:'Racing index failed on '+gaps.length+' dated requests. Dated meeting pages supplied provisional cards on '+recovered.length+' of those dates.'};
    }
    if (id==='darts-analysis' && data.status==='AWAITING_PAGINATED_COLLECTION') {
      return {pending:'Darts historical analysis is awaiting complete pagination.'};
    }
    if (!priceSources.includes(id)) return {};
    let latest=null;
    if (Array.isArray(data.records)) for (const record of data.records) {
      const [benchmark,sky]=priceTimes(record,id==='hybrid-prices');
      const start=parseEvidenceTime(record?.start_utc);
      if (benchmark===null||sky===null||start===null||benchmark>now||sky>now||now>=start) continue;
      const observed=Math.min(benchmark,sky);
      if (latest===null||latest<observed) latest=observed;
    }
    const newest=latest===null ? null : new Date(latest).toISOString();
    const valid=data.schema_version===1 && Array.isArray(data.records) &&
      (id==='hybrid-prices' || (data.research_only===true && data.publication_gate==='BLOCKED'));
    return {observedAt:newest, gateOK:valid, ...(!newest && valid ? {pending:'No current pre-event price pair in this snapshot.'} : {})};
  }
  const api = {specs,context,parseEvidenceTime};
  if (typeof module === 'object' && module.exports) module.exports=api;
  else root.ValueWatchExtraFeeds=api;
})(globalThis);
