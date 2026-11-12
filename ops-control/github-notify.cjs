'use strict';
// GitHub issue reporting is the only remote mutation allowed by the scheduled monitor.
// Do not use this module for source files, models, betting approvals, or Pages deployment.
const TITLE='[Operations Control Centre] Director scheduled briefing';
async function publish({github,context,core,reportMarkdown}){
 if(!github?.rest?.issues||!context?.repo||!Number.isFinite(Number(context.runId)))throw Error('Missing verified GitHub issue context');
 const {owner,repo}=context.repo,marker='<!-- ops-monitor-run:'+context.runId+' -->';
 const message=String(reportMarkdown||'');
 if(!message.includes('# Operations Director — scheduled briefing')||message.length>60000)throw Error('Missing or oversized Director audit report');
 const entries=await github.paginate(github.rest.issues.listForRepo,{owner,repo,state:'all',per_page:100});
 const issue=entries.find(i=>!i.pull_request&&i.title===TITLE);
 if(issue?.state==='closed'){
  core.notice('Director issue closed by owner; issue notifications disabled, report still retained in Actions.');
  return {status:'CLOSED_OPT_OUT',issueNumber:issue.number};
 }
 if(issue?.body?.includes(marker)){
  core.notice('Duplicate workflow run suppressed.');
  return {status:'DUPLICATE',issueNumber:issue.number};
 }
 const footer='\n\n---\nScheduled GitHub Actions audit. Checks published repository snapshots, not live Pages uptime or independently verified betting edges. Close this issue to opt out of comments.';
 const body=marker+'\n'+message+footer;
 if(!issue){
  const result=await github.rest.issues.create({owner,repo,title:TITLE,body});
  core.notice('Director briefing issue created #'+result.data.number);
  return {status:'CREATED',issueNumber:result.data.number};
 }
 await github.rest.issues.update({owner,repo,issue_number:issue.number,body});
 await github.rest.issues.createComment({owner,repo,issue_number:issue.number,body:marker+'\n'+message});
 core.notice('Director briefing issue updated #'+issue.number);
 return {status:'UPDATED',issueNumber:issue.number};
}
module.exports={TITLE,publish};
