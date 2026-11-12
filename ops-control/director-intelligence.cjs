'use strict';
// V6 issue-backed history. No writes to Value Watch model files or Pages.
// Compact provenance-linked snapshots are kept in a single GitHub Director issue.
const MARKER='ops-director-history-v1';
const MAX=90; // ~45 days at 2 runs/day; more frequent manual runs reduce date coverage.
const ALLOWED_SECONDARY=new Set(['MEETING_LIST_MATCHED_NOT_CERTIFIED','DISCREPANCY','SECONDARY_UNAVAILABLE','PRIMARY_UNVERIFIED','PRIMARY_DATE_MISMATCH']);
function snapshot(report,runId){
 if(!report||report.kind!=='OPERATIONS_SCHEDULED_RESEARCH_AUDIT'||!Number.isFinite(Date.parse(report.generatedAt)))throw Error('Invalid scheduled audit envelope');
 if(!Array.isArray(report.issues)||!Array.isArray(report.feeds))throw Error('Missing audit inputs');
 const sourceStatus=String(report.secondaryRacingCoverage?.status||'UNKNOWN');
 const secondary=ALLOWED_SECONDARY.has(sourceStatus)?sourceStatus:'UNKNOWN';
 const codes=report.issues.map(x=>String(x.code||'').slice(0,90)).filter(Boolean).sort();
 const p1=report.issues.filter(x=>x.priority==='P1').length;
 const p2=report.issues.filter(x=>x.priority==='P2').length;
 const bad=report.feeds.filter(x=>x.state!=='OBSERVED').map(x=>String(x.id||'').slice(0,35)).sort();
 const discrepancy=report.secondaryRacingCoverage;
 return {at:report.generatedAt,runId:String(runId),p1,p2,codes,bad,secondary,
  mismatchCount:(discrepancy?.missing?.length||0)+(discrepancy?.unexpected?.length||0)+(discrepancy?.raceCountMismatches?.length||0)};
}
function read(body){
 const source=String(body||'');
 const matches=[...source.matchAll(/<!-- ops-director-history-v1:([^>]*?) -->/g)];
 if(source.includes('<!-- ops-director-history-v1:')&&matches.length!==1)throw Error('Cannot safely read existing Director history; malformed or duplicated history marker');
 if(!matches.length)return [];
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(matches[0][1]))throw Error('Cannot safely read existing Director history; invalid base64 history marker');
 try{
  const encoded=matches[0][1],bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('base64')!==encoded)throw Error('Non-canonical encoded history');
  const raw=bytes.toString('utf8');
  if(raw.length>50000)throw Error('Oversized state');
  const parsed=JSON.parse(raw);
  if(parsed.version!==1||!Array.isArray(parsed.records))throw Error('Invalid state');
  return parsed.records.filter(r=>r&&Number.isFinite(Date.parse(r.at))&&typeof r.runId==='string'&&Array.isArray(r.codes)&&Array.isArray(r.bad)&&typeof r.secondary==='string').slice(-MAX);
 }catch(e){throw Error('Cannot safely read existing Director history; no issue overwrite permitted: '+e.message)}
}
function append(history,current){
 const existing=history.find(x=>x.runId===current.runId);
 if(existing)return {records:history.slice(),duplicate:true};
 const records=[...history,current].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return {records:records.slice(-MAX),duplicate:false};
}
function assess(previous,current){
 if(!previous)return {changes:['HISTORY_BASELINE_STARTED'],alert:false};
 const changes=[];
 const oldCodes=new Set(previous.codes);
 const newCodes=current.codes.filter(x=>!oldCodes.has(x));
 if(newCodes.length)changes.push('NEW_ISSUES:'+newCodes.join(','));
 if(current.p1>previous.p1)changes.push('P1_INCREASED');
 const freshBad=current.bad.filter(x=>!previous.bad.includes(x));
 if(freshBad.length)changes.push('FEED_DETERIORATION:'+freshBad.join(','));
 if(current.secondary==='DISCREPANCY'&&previous.secondary!=='DISCREPANCY')changes.push('SECONDARY_DISCREPANCY');
 if(current.secondary==='SECONDARY_UNAVAILABLE'&&previous.secondary==='MEETING_LIST_MATCHED_NOT_CERTIFIED')changes.push('SECONDARY_CHECK_REGRESSED');
 if(current.mismatchCount>previous.mismatchCount)changes.push('RACING_MISMATCH_INCREASED');
 if(!changes.length)changes.push('NO_NEW_DETERIORATION');
 const alert=changes.some(x=>x.startsWith('NEW_ISSUES:')||['P1_INCREASED','SECONDARY_DISCREPANCY','SECONDARY_CHECK_REGRESSED','RACING_MISMATCH_INCREASED'].includes(x)||x.startsWith('FEED_DETERIORATION:'));
 return {changes,alert};
}
function trends(history){
 const rows=history.slice(-MAX);
 const days=new Set(rows.map(x=>x.at.slice(0,10)));
 const counts={totalRuns:rows.length,observedUTCDays:days.size,p1Runs:0,secondaryMatchRuns:0,secondaryUnavailableRuns:0,secondaryDiscrepancyRuns:0,cleanFeedsRuns:0};
 const perIssue=new Map();
 for(const row of rows){
  if(row.p1>0)counts.p1Runs++;
  if(row.bad.length===0)counts.cleanFeedsRuns++;
  if(row.secondary==='MEETING_LIST_MATCHED_NOT_CERTIFIED')counts.secondaryMatchRuns++;
  if(row.secondary==='SECONDARY_UNAVAILABLE')counts.secondaryUnavailableRuns++;
  if(row.secondary==='DISCREPANCY')counts.secondaryDiscrepancyRuns++;
  for(const code of row.codes){
   if(!perIssue.has(code))perIssue.set(code,{code,observedRuns:0,first:row.at,last:row.at});
   const issue=perIssue.get(code);issue.observedRuns++;issue.last=row.at;
  }
 }
 return {...counts,recurring:[...perIssue.values()].filter(x=>x.observedRuns>=2).sort((a,b)=>b.observedRuns-a.observedRuns).slice(0,8)};
}
function summary(history,current,delta){
 const t=trends(history);
 const lines=['## Director Intelligence V6 — central audit trend',
  '- **Coverage:** '+t.totalRuns+' stored audit(s) across '+t.observedUTCDays+' UTC date(s), not a guarantee of scheduled execution',
  '- **Secondary comparison:** '+t.secondaryMatchRuns+' matched-not-certified; '+t.secondaryUnavailableRuns+' unavailable; '+t.secondaryDiscrepancyRuns+' discrepant; all other statuses excluded from these counts',
  '- **Research feeds:** '+t.cleanFeedsRuns+'/'+t.totalRuns+' audits with all four sources in OBSERVED state',
  '- **P1 audits:** '+t.p1Runs+'/'+t.totalRuns,
  '- **Latest state:** '+current.p1+' P1, '+current.p2+' P2; racing secondary '+current.secondary,
  '- **Change detection:** '+delta.changes.join('; '),
  '- **GitHub notification comment:** '+(delta.alert?'Triggered for new/worsening evidence':'Suppressed: no new/worsening evidence'),
  '',
  '### Repeated observation codes (not employee performance measures)'];
 if(!t.recurring.length)lines.push('- No repeated warning code established yet.');
 for(const item of t.recurring)lines.push('- '+item.code+': '+item.observedRuns+' stored audit(s) from '+item.first+' to '+item.last);
 lines.push('','_GitHub issue history is shared across devices; only observed source warnings, not verified fixes or human manager actions. The last '+MAX+' audits are retained. Closed issues opt out of updates. Research safety gate remains BLOCKED._');
 return lines.join('\n');
}
function serialize(history){return '<!-- '+MARKER+':'+Buffer.from(JSON.stringify({version:1,records:history.slice(-MAX)})).toString('base64')+' -->'}
module.exports={MARKER,MAX,snapshot,read,append,assess,trends,summary,serialize};
