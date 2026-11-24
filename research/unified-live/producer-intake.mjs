// Opt-in local signed producer intake. No networking, producer execution or private keys.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep,join} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {readBounded,synchronise} from './sync.mjs'
import {verifyAuthentication} from './authentication.mjs'
export {signatureMessage} from './authentication.mjs'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
export function signedSynchronise(inboxDir,stateDir,trustPath,trustedTrustSha256,trustedApprovalSha256,{now=new Date().toISOString(),expectedPreviousStateSha256=undefined}={}){
 const inbox=root(inboxDir),state=root(stateDir),trustFile=resolve(trustPath)
 need(!within(inbox,state)&&!within(state,inbox),'Input and state must be separate')
 need(!within(inbox,trustFile)&&!within(state,trustFile)&&realpathSync(trustFile)===trustFile,'Trust registry must be separate')
 need(utc(now)&&hex(trustedTrustSha256)&&hex(trustedApprovalSha256),'Invalid trusted inputs')
 const trustBytes=readBounded(trustFile,65536)
 need(sha(trustBytes)===trustedTrustSha256,'Trust registry fingerprint mismatch')
 const aBytes=readBounded(join(inbox,'approval.json'),65536)
 need(sha(aBytes)===trustedApprovalSha256,'Approval fingerprint mismatch')
 const a=JSON.parse(aBytes.toString('utf8'))
 need(a.kind==='APPROVED_SUMMARY_BATCH'&&a.schemaVersion===1&&Number.isSafeInteger(a.sequence)&&a.sequence>0&&utc(a.approvedAt)&&Date.parse(a.approvedAt)<=Date.parse(now)&&Array.isArray(a.sources)&&a.sources.length===6,'Invalid approval')
 const sigBytes=readBounded(join(inbox,'producer-signatures.json'),65536)
 const authentication={kind:'SIGNED_LOCAL_ACCEPTANCE_V1',trustSha256:trustedTrustSha256,trustBytes:trustBytes.toString('base64'),signatureBundleSha256:sha(sigBytes),signatureBundleBytes:sigBytes.toString('base64')}
 const receipts=verifyAuthentication(authentication,a,trustedApprovalSha256,now)
 let stage
 try{
  stage=realpathSync(mkdtempSync(join(tmpdir(),'signed-research-')))
  writeFileSync(join(stage,'approval.json'),aBytes,{flag:'wx',mode:0o600})
  for(let i=0;i<pins.length;i++){
   const p=pins[i],s=a.sources[i],report=readBounded(join(inbox,p.file))
   need(sha(report)===s.summarySha256,'Summary fingerprint mismatch')
   writeFileSync(join(stage,p.file),report,{flag:'wx',mode:0o600})
  }
  need(readBounded(trustFile,65536).equals(trustBytes)&&readBounded(join(inbox,'approval.json'),65536).equals(aBytes)&&readBounded(join(inbox,'producer-signatures.json'),65536).equals(sigBytes),'Input metadata changed')
  for(let i=0;i<pins.length;i++)need(sha(readBounded(join(inbox,pins[i].file)))===a.sources[i].summarySha256,'Input report changed')
  const result=synchronise(stage,state,trustedApprovalSha256,{now,authentication,expectedPreviousStateSha256})
  return {kind:'SIGNED_LOCAL_INTAKE_RECEIPT',status:result.status,sequence:result.state.sequence,stateSha256:result.state.stateSha256,trustSha256:trustedTrustSha256,approvalSha256:trustedApprovalSha256,signatureBundleSha256:sha(sigBytes),producers:receipts,measurementFreshness:'UNKNOWN',modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,repairAuthorized:false,limitations:['Authenticates possession of separately trusted local signing keys, not source accuracy or original GitHub artifact identity.','Public proof retained atomically with accepted state; no independent trust recheck or automatic approval or producer service.']}
 }finally{if(stage)rmSync(stage,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length!==5)throw Error('Usage: producer-intake.mjs <inbox> <state-dir> <trust-file> <trusted-trust-sha256> <trusted-approval-sha256>')
  console.log(JSON.stringify(signedSynchronise(...args),null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
