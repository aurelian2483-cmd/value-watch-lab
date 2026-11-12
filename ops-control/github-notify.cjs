'use strict';
// Only the dedicated Director GitHub issue can be written by the scheduled monitor.
// No write to Value Watch source data, betting models, Pages or qualification gates.
const TITLE='[Operations Control Centre] Director scheduled briefing';
const I=require('./director-intelligence.cjs');
async function publish({github,context,core,reportMarkdown,reportJson}){
 if(!github?.rest?.issues||!context?.repo||!Number.isFinite(Number(context.runId)))throw Error('Missing verified GitHub issue context');
 const {owner,repo}=context.repo,marker='<!-- ops-monitor-run:'+context.runId+' -->';
 const message=String(reportMarkdown||'');
 if(!message.includes('# Operations Director — scheduled briefing')||message.length>60000)throw Error('Missing or oversized Director audit report');
 const current=I.snapshot(reportJson,context.runId);
 const entries=await github.paginate(github.rest.issues.listForRepo,{owner,repo,state:'all',per_page:100});
 const issue=entries.find(i=>!i.pull_request&&i.title===TITLE);
 if(issue?.state==='closed'){
  core.notice('Director issue closed; preserving opt-out. Report remains in Actions artifact and summary.');
  return {status:'CLOSED_OPT_OUT',issueNumber:issue.number};
 }
 if(issue?.body?.includes(marker)){
  core.notice('This workflow run is already recorded; duplicate suppressed.');
  return {status:'DUPLICATE',issueNumber:issue.number};
 }
 // Fail closed: corrupt existing history must not be replaced with an empty baseline.
 const historical=I.read(issue?.body||'');
 const {records,duplicate}=I.append(historical,current);
 if(duplicate)return {status:'DUPLICATE',issueNumber:issue?.number};
 const previous=historical.at(-1)||null,delta=I.assess(previous,current);
 const section=I.summary(records,current,delta);
 const footer='\n\n---\nGitHub issue-backed historical monitoring. Snapshots reflect repository research feeds, not live Pages uptime or independent betting advice. Close this issue to opt out of report updates.';
 const body=marker+'\n'+message+'\n\n'+section+'\n\n'+I.serialize(records)+footer;
 if(body.length>120000)throw Error('Director report history size exceeds safety limit; no update posted');
 if(!issue){
  const result=await github.rest.issues.create({owner,repo,title:TITLE,body});
  core.notice('Created Director briefing issue #'+result.data.number);
  return {status:'CREATED',issueNumber:result.data.number,alert:true,changes:delta.changes};
 }
 await github.rest.issues.update({owner,repo,issue_number:issue.number,body});
 if(delta.alert){
  await github.rest.issues.createComment({owner,repo,issue_number:issue.number,body:marker+'\n## Director alert — changed evidence\n'+delta.changes.map(x=>'- '+x).join('\n')+'\n\n'+section});
  core.notice('Exception comment sent to Director issue #'+issue.number);
 }else core.notice('Latest report and central history updated without a routine notification comment.');
 return {status:delta.alert?'UPDATED_ALERT':'UPDATED_SILENT',issueNumber:issue.number,alert:delta.alert,changes:delta.changes};
}
module.exports={TITLE,publish};
