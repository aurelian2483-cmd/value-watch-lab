'use strict';
/* Descriptive archive view only. Never supplies model inputs or evidence badges. */
(function(root){
  const text=x=>typeof x==='string'?x.trim():'';
  function url(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;return u.href;}catch{return null;}}
  function canonical(value){const safe=url(value);if(!safe)return null;const u=new URL(safe);for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.href;}
  function date(value){
    if(typeof value!=='string')return null;
    const day=/^\d{4}-\d{2}-\d{2}$/.test(value),instant=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    if(!day&&!instant)return null;
    if(instant&&(Number(value.slice(11,13))>23||Number(value.slice(14,16))>59||Number(value.slice(17,19))>59))return null;
    const ms=Date.parse(day?value+'T00:00:00Z':value);
    if(!Number.isFinite(ms)||new Date(Date.parse(value.slice(0,10)+'T00:00:00Z')).toISOString().slice(0,10)!==value.slice(0,10))return null;
    return {value,ms,precision:day?'date':'time'};
  }
  const dateLabel=d=>!d?'Not available':d.precision==='date'?d.value+' (time not available)':new Date(d.ms).toISOString().replace('T',' ').replace('.000Z',' UTC').replace('Z',' UTC');
  function match(entries,event){
    if(event?.sport!=='racing'||!event.providerEventId||!date(event.startUTC)||!Array.isArray(entries))return [];
    return entries.filter(e=>e&&typeof e==='object'&&String(e.race_id)===String(event.providerEventId)&&date(e.startUTC)?.ms===date(event.startUTC).ms&&Array.isArray(event.choices)&&event.choices.some(c=>text(c?.label).toLowerCase()===text(e.horse).toLowerCase()&&text(e.horse)));
  }
  function summarize(entries,event){
    const matched=match(entries,event),seen=new Map(),groups=new Map(),publishers=new Set();
    for(const e of matched){
      const page=canonical(e.url),raceDateOnly=e.extraction_method==='OLBG_PUBLIC_WIN_TIPS_V1',pub=date(e.published_at_utc)||(raceDateOnly?null:date(e.publication_date)),observed=date(e.observed_at_utc);
      // IDs alone are not trusted: conflicting records with reused IDs stay visible.
      const fingerprint=JSON.stringify([page||text(e.url),text(e.horse),text(e.market),text(e.stance),text(e.author),text(e.publisher),pub?.value||null,text(e.summary),text(e.verification),canonical(e.origin_url)||canonical(e.original_source_url),text(e.syndication_origin_id)||text(e.origin_id)]);
      const prior=seen.get(fingerprint);
      if(prior){prior.captures++;if(observed&&(!prior.observed||observed.ms>prior.observed.ms))prior.observed=observed;continue;}
      const origin=canonical(e.origin_url)||canonical(e.original_source_url),originId=text(e.syndication_origin_id)||text(e.origin_id);
      const groupKey=origin?'origin-url:'+origin:originId?'origin-id:'+originId:page?'page:'+page+'|'+text(e.author):'unknown:'+seen.size;
      const row={groupKey,capturedRaceDate:raceDateOnly?text(e.publication_date):null,type:text(e.group),horse:text(e.horse),market:text(e.market)||'Not available',publisher:text(e.publisher)||'Not available',author:text(e.author)||'Not available',url:url(e.url),pub,observed,stance:['support','oppose','disagree'].includes(e.stance)?e.stance:'unknown',captures:1,verification:text(e.verification)||'Not available'};
      seen.set(fingerprint,row);
      if(text(e.publisher))publishers.add(text(e.publisher).toLowerCase());
      const group=groups.get(groupKey)||{reason:origin||originId?'Shared origin explicitly recorded':'Same captured page and author; source relationship unknown',origin:origin||originId||null,rows:[]};group.rows.push(row);groups.set(groupKey,group);
    }
    const rows=[...seen.values()];
    // A date-only claim is an interval: same-day observation is compatible,
    // but a later claimed publication day cannot already have been observed.
    const chronologyConflict=r=>Boolean(r.pub&&r.observed&&r.pub.ms>r.observed.ms);
    const publications=rows.filter(r=>!chronologyConflict(r)).map(r=>r.pub).filter(Boolean),latest=publications.sort((a,b)=>b.ms-a.ms)[0]||null;
    const opinionCount=stances=>new Set(rows.filter(r=>stances.includes(r.stance)).map(r=>JSON.stringify([r.groupKey,r.horse.toLowerCase(),r.market.toUpperCase(),r.stance==='support'?'support':'oppose']))).size;
    const support=opinionCount(['support']),opposition=opinionCount(['oppose','disagree']);
    const count=types=>{const n=matched.filter(e=>types.includes(e.group)).length;return n||null;};
    return {raw:matched.length||null,unique:rows.length||null,publishers:publishers.size||null,tipsters:count(['tipster','blog']),forums:count(['forum','social_forum']),support:support||null,opposition:opposition||null,unknown:rows.filter(r=>r.stance==='unknown').length,latest,missingPublication:rows.filter(r=>!r.pub).length,chronologyConflicts:rows.filter(chronologyConflict).length,explicitOrigins:[...groups.values()].filter(g=>g.origin).length||null,unknownRelationshipGroups:[...groups.values()].filter(g=>!g.origin).length,groups:[...groups.values()],rows};
  }
  function render(parent,entries,event){
    const doc=parent.ownerDocument,add=(p,tag,value,cls)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;p.append(n);return n;};
    const s=summarize(entries,event),box=add(parent,'section',undefined,'community-evidence-summary');
    box.setAttribute('aria-label','Community evidence');add(box,'strong','Community Evidence');
    add(box,'p','Research signals only; not verified consensus or proof of positive expected value.','small');
    const grid=add(box,'dl',undefined,'community-evidence-metrics');
    const metric=(label,value)=>{const cell=add(grid,'div');add(cell,'dt',label);add(cell,'dd',value===null?'Not available':String(value));};
    metric('Captured mentions',s.raw);metric('Named publishers',s.publishers);metric('Supporting groups',s.support);metric('Disagreement groups',s.opposition);
    add(box,'p','Latest compatible source publication: '+dateLabel(s.latest)+(s.chronologyConflicts?' · '+s.chronologyConflicts+' conflicting date record(s); see sources.':''),'small');
    const open=parent.querySelector?.('.community-source-list')?.open||false;
    const detail=add(box,'details',undefined,'community-source-list');detail.open=open;add(detail,'summary','Original sources, captured dates & grouping ('+(s.unique===null?'Not available':s.unique+' unique records')+')');
    add(detail,'p','Tipster / blog mentions: '+(s.tipsters??'Not available')+' · Forum mentions: '+(s.forums??'Not available')+' · Explicitly recorded origins: '+(s.explicitOrigins??'Not available'),'small');
    add(detail,'p','Counts cover this partial archive across named horses and markets. Different selections are not automatically opposing opinions. Repeated opinions with an explicitly shared origin count once per horse and market. Distinct publishers do not establish independent origins. Odds remain separate unverified observations.','small');
    if(s.unknownRelationshipGroups)add(detail,'p',s.unknownRelationshipGroups+' page/author groups: source relationship unknown.','small');
    if(s.missingPublication)add(detail,'p',s.missingPublication+' records have no valid publication date.','small');
    if(!s.rows.length)add(detail,'p','Not available · no matching captured records. This does not establish absence of community opinions.','small');
    for(const group of s.groups){
      const part=add(detail,'div',undefined,'community-source-group');add(part,'p',group.reason,'small');
      if(group.origin){const original=url(group.origin);if(original){const link=add(part,'a','Recorded original source ↗');link.href=original;link.target='_blank';link.rel='noopener noreferrer';}else add(part,'p','Recorded origin identity: '+group.origin,'small');}
      for(const r of group.rows){
        const item=add(part,'div',undefined,'community-source-record');add(item,'strong',r.horse+' · '+r.market+' · '+(r.stance==='unknown'?'Stance: Not available':r.stance));
        if(r.url){const a=add(item,'a',r.publisher+' ↗');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';}else add(item,'span',r.publisher+' · source link: Not available');
        if(r.capturedRaceDate)add(item,'p','Captured race-date field: '+r.capturedRaceDate+' · not a publication date.','small');
        add(item,'p','Author: '+r.author+' · Published: '+dateLabel(r.pub)+' · Observed: '+dateLabel(r.observed),'small');
        add(item,'p','Record status: '+r.verification+' · '+r.captures+' captured occurrence'+(r.captures===1?'':'s')+' · repeated identical content grouped','small');
        if(r.observed&&r.observed.ms>=date(event.startUTC).ms)add(item,'p','Captured at or after race start; retrospective evidence only.','small');
        if(r.pub&&r.observed&&r.pub.ms>r.observed.ms)add(item,'p','Publication is later than observation; chronology unresolved.','small');
      }
    }
    return box;
  }
  root.CommunityEvidence=Object.freeze({url,canonical,date,dateLabel,match,summarize,render});
})(typeof window==='object'?window:globalThis);
