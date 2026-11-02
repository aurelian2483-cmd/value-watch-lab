(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const fmt = x => new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(x));
  const add = (parent, tag, text, cls) => {
    const child = document.createElement(tag); if(text!==undefined) child.textContent=String(text); if(cls)child.className=cls; parent.append(child); return child;
  };
  let reports=[];
  async function json(path) {
    if(!/^[a-z0-9.-]+\.json$/.test(path)) throw Error('Invalid report path');
    const response=await fetch('./'+path,{cache:'no-store'}); if(!response.ok)throw Error('Report file unavailable'); return response.json();
  }
  function normalise(meta,d) {
    if(meta.format==='MASTER_V1'||meta.format==='MASTER_V2') {
      if(d.kind!=='MASTER_RESEARCH_REPORT'||d.modelValidated!==false||d.qualifiedCount!==0)throw Error('Invalid saved master report');
      const entries=[...(d.preselected||[]).map(p=>({event:p.event,selection:p.market,status:p.status,support:p.support,counter:p.counter,eventStartUTC:p.startUTC})),...(d.builders||[]).map(b=>({event:b.event,selection:b.title,status:b.status,support:b.provenance,counter:b.counter,legs:b.legs.map(l=>l.selection),eventStartUTC:b.startUTC}))];
      return {...meta,date:meta.reportedAtUTC?.slice(0,10)||meta.reportedDate,recoveryNote:'Previously published snapshot. Retained for reference; prices, probabilities and outcomes are not validated by archiving it.',entries};
    }
    if(d.kind!=='RECOVERED_CHAT_REPORT'||d.research_only!==true||d.publication_gate!=='BLOCKED'||d.model_validation!=='UNVALIDATED'||d.qualifiedCount!==0||d.id!==meta.id||!Array.isArray(d.entries)||d.entries.length!==meta.entries)throw Error('Recovered report controls failed');
    return {...meta,...d,date:d.reportedAtUTC.slice(0,10)};
  }
  function render() {
    const search=el('search').value.trim().toLowerCase(),day=el('date').value,root=el('reports');root.replaceChildren();
    const filtered=reports.filter(r=>(day==='all'||r.date===day)&&JSON.stringify([r.title,r.entries]).toLowerCase().includes(search));
    el('matches').textContent=filtered.length+(filtered.length===1?' report shown · ':' reports shown · ')+filtered.reduce((n,r)=>n+r.entries.length,0)+' recovered/published mentions';
    if(!filtered.length)add(root,'p','No reports match this filter.','empty');
    for(const report of filtered) {
      const details=add(root,'details',undefined,'report');details.id=report.id;details.open=Boolean(search)||location.hash==='#'+report.id;
      add(details,'summary',report.date+' · '+report.title+' · '+report.entries.length+(report.entries.length===1?' entry':' entries'));
      add(details,'p',report.reportedAtUTC?'Original report timestamp: '+fmt(report.reportedAtUTC)+' UK. This is not the event start.':'Original report date: '+report.date+'. Exact report time was not retained.','note');
      add(details,'p',report.recoveryNote,'note');
      for(const item of report.entries) {
        const card=add(details,'article');add(card,'h3',item.selection);add(card,'p','Event as reported: '+item.event);add(card,'span',item.status||'HISTORICAL RESEARCH — UNVERIFIED','tag');
        if(item.legs?.length){const list=add(card,'ol');for(const leg of item.legs)add(list,'li',leg);}
        add(card,'p',item.reportedEventTime?'Reported event time: '+item.reportedEventTime:item.eventStartUTC?'Event time retained in the saved snapshot: '+fmt(item.eventStartUTC)+' UK. Not a fresh schedule check.':'Event date / kickoff: not recovered.','note');
        add(card,'p','Reported support: '+(item.support||'Not recovered.'),'note');
        add(card,'p','Counter-evidence / gaps: '+(item.counter||'Not recovered.'),'note');
        add(card,'p','Verified price: unavailable · Validated probability / joint probability: unavailable · EV: unknown','note');
      }
    }
  }
  async function load() {
    try {
      const index=await json('index.json');
      if(index.kind!=='CHAT_RESEARCH_ARCHIVE'||index.research_only!==true||index.publication_gate!=='BLOCKED'||index.qualifiedCount!==0)throw Error('Archive controls failed');
      const metadata=[...index.reports,...index.existingPublications],ids=new Set();
      for(const meta of metadata){if(!/^[a-z0-9-]+$/.test(meta.id)||ids.has(meta.id))throw Error('Duplicate/invalid report identity');ids.add(meta.id);}
      const loaded=await Promise.allSettled(metadata.map(async meta=>normalise(meta,await json(meta.path))));
      reports=loaded.filter(r=>r.status==='fulfilled').map(r=>r.value).sort((a,b)=>(b.reportedAtUTC||b.date).localeCompare(a.reportedAtUTC||a.date));
      const failures=loaded.filter(r=>r.status==='rejected').length;
      el('coverage').textContent=index.additionalRecoveredReports+' newly recovered reports · '+index.recoveredEntries+' restored entries · '+index.existingPublications.length+' earlier publications · '+index.gaps.length+' recovery gap'+(failures?' · '+failures+' report files unavailable':'');
      for(const day of [...new Set(reports.map(r=>r.date))].sort().reverse()){const option=add(el('date'),'option',day);option.value=day;}
      const gaps=el('gaps');gaps.replaceChildren();
      for(const gap of index.gaps){add(gaps,'h3',gap.date+' · '+gap.title);add(gaps,'p',gap.reason,'note');}
      el('search').oninput=render;el('date').onchange=render;render();
    } catch(error) {el('coverage').textContent='Archive unavailable: '+error.message;el('reports').replaceChildren();el('gaps').textContent='Recovery status unavailable.';}
  }
  load();
})();
