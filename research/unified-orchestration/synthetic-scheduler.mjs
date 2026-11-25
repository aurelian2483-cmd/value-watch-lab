// Serial fixed synthetic QA scheduler, separate from research producers and queue.
import {createHash,randomUUID} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync,mkdirSync,rmSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs'
import {resolve,join,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {spawnSync} from 'node:child_process'
import {readBounded} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const script=fileURLToPath(new URL('./synthetic-resource-qa.py',import.meta.url))
const modes=['known-answer','memory-limit','cpu-limit','wall-timeout']
const observations=['KNOWN_ANSWER_AND_LIMITS_MATCHED','OVERSIZED_ALLOCATION_REJECTED','CPU_LIMIT_TERMINATED_PROCESS','PARENT_TIMEOUT_KILLED_AND_REAPED']
const flags={researchOnly:true,executionAuthorized:false,dispatchAuthorized:false,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,validationAuthorized:false,publicationGate:'BLOCKED',modelValidation:'UNVALIDATED',measurementFreshness:'UNKNOWN'}
const need=(x,m)=>{if(!x)throw Error(m)}
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const sha=b=>createHash('sha256').update(b).digest('hex')
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const same=(a,b)=>digest(a)===digest(b)
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
function context(directory,planPath,expected){
 const root=resolve(directory),file=resolve(planPath)
 need(realpathSync(root)===root&&lstatSync(root).isDirectory()&&realpathSync(file)===file&&!within(root,file),'Unsafe synthetic QA paths')
 need(hex(expected),'Trusted QA plan fingerprint required')
 const raw=readBounded(file,65536),p=JSON.parse(raw.toString('utf8'))
 need(sha(raw)===expected&&keys(p,['kind','schemaVersion','scriptSha256','probes'])&&p.kind==='APPROVED_FIXED_SYNTHETIC_QA'&&p.schemaVersion===1&&hex(p.scriptSha256)&&same(p.probes,modes),'Invalid fixed QA plan')
 const verify=()=>need(readBounded(file,65536).equals(raw)&&sha(readBounded(script,65536))===p.scriptSha256,'QA plan or implementation changed')
 verify()
 return {root,expected,verify}
}
function envelope(c,rows,inflight){
 const p={kind:'SYNTHETIC_QA_SCHEDULE',schemaVersion:1,planSha256:c.expected,rows,inflight,...flags}
 return {...p,scheduleSha256:digest(p)}
}
function row(mode,i,observed){
 need(mode===modes[i]&&observed===observations[i],'Unexpected synthetic probe result')
 return {probe:mode,status:'PASS',observed}
}
function load(c){
 let raw
 try{raw=readBounded(join(c.root,'schedule.json'),65536)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const s=JSON.parse(raw.toString('utf8'))
 need(Array.isArray(s.rows)&&s.rows.length<=modes.length,'Invalid schedule rows')
 const rows=s.rows.map((r,i)=>row(r.probe,i,r.observed))
 need(s.inflight===null||(s.rows.length<modes.length&&keys(s.inflight,['probe','startedAt'])&&s.inflight.probe===modes[s.rows.length]&&utc(s.inflight.startedAt)),'Invalid in-flight record')
 need(same(s,envelope(c,rows,s.inflight)),'Synthetic schedule integrity mismatch')
 return s
}
function atomic(c,s){
 const p=join(c.root,'.pending-'+randomUUID())
 try{const fd=openSync(p,'wx',0o600);try{writeFileSync(fd,JSON.stringify(s,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}renameSync(p,join(c.root,'schedule.json'))}finally{rmSync(p,{force:true})}
}
function view(c,s){
 return {kind:'SYNTHETIC_QA_STATUS',planSha256:c.expected,scheduleSha256:s?.scheduleSha256??null,completed:s?.rows.length??0,total:4,status:s?.inflight?'INTERRUPTED_OR_FAILED_MANUAL_REVIEW':s?.rows.length===4?'FIXED_QA_COMPLETE':'FIXED_QA_PENDING',inflight:s?.inflight??null,rows:s?.rows??[],...flags}
}
export function inspectSchedule(dir,plan,expected,{trustedScheduleSha256=undefined}={}){
 const c=context(dir,plan,expected),s=load(c)
 if(trustedScheduleSha256!==undefined)need(hex(trustedScheduleSha256)&&s?.scheduleSha256===trustedScheduleSha256,'Schedule external anchor mismatch')
 return view(c,s)
}
export function advanceSchedule(dir,plan,expected,previous){
 need(process.platform==='linux','Fixed resource QA scheduler requires Linux')
 need(previous===null||hex(previous),'Explicit previous schedule anchor required')
 const c=context(dir,plan,expected),lock=join(c.root,'.qa-lock')
 mkdirSync(lock,{mode:0o700})
 try{
  const s=load(c);need((s?.scheduleSha256??null)===previous,'Previous schedule anchor mismatch')
  need(!s?.inflight,'Interrupted or failed QA requires manual review; no automatic retry')
  const rows=s?.rows??[]
  if(rows.length===4)return view(c,s)
  const mode=modes[rows.length]
  c.verify();atomic(c,envelope(c,rows,{probe:mode,startedAt:new Date().toISOString()}))
  // Fixed reviewed executable path; no user-supplied command, dataset or network access.
  const result=spawnSync('/usr/bin/python3',['-I','-B',script,'--probe',mode],{encoding:'utf8',timeout:10000,maxBuffer:65536,env:{LANG:'C',LC_ALL:'C'},cwd:c.root})
  need(!result.error&&result.status===0,'Fixed synthetic probe failed or timed out; manual review required')
  const receipt=JSON.parse(result.stdout)
  need(receipt.kind==='FIXED_SYNTHETIC_RESOURCE_QA'&&receipt.passed===1&&Array.isArray(receipt.checks)&&receipt.checks.length===1&&receipt.checks[0].status==='PASS'&&Object.entries(flags).every(([k,v])=>receipt[k]===v),'Unexpected synthetic QA receipt')
  const r=row(receipt.checks[0].probe,rows.length,receipt.checks[0].observed)
  c.verify();const next=envelope(c,[...rows,r],null);atomic(c,next)
  return view(c,load(c))
 }finally{rmSync(lock,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [cmd,...a]=process.argv.slice(2)
  let r
  if(cmd==='status'&&(a.length===3||a.length===4))r=inspectSchedule(...a.slice(0,3),{trustedScheduleSha256:a[3]})
  else if(cmd==='advance'&&a.length===4)r=advanceSchedule(...a.slice(0,3),a[3]==='NEW'?null:a[3])
  else throw Error('Usage: synthetic-scheduler.mjs status <directory> <plan> <plan-sha> [schedule-sha] | advance <same three args> <NEW-or-previous-sha>')
  console.log(JSON.stringify(r,null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
