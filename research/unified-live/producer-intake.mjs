// Opt-in local signed producer intake. No networking, producer execution or private keys.
import {createHash,createPublicKey,verify} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep,join} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {readBounded,synchronise} from './sync.mjs'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
const strictBase64=(s,max)=>{need(typeof s==='string'&&s.length<=max&&s.length>0,'Invalid encoded value');const b=Buffer.from(s,'base64');need(b.toString('base64')===s,'Invalid base64');return b}
export function signatureMessage({id,head,reportRevision,run,artifact,summarySha256,approvalSha256,sequence,signedAt,expiresAt,keySha256}){
 return Buffer.from(JSON.stringify(['UNIFIED_RESEARCH_PRODUCER_REPORT_V1',id,head,reportRevision,run,artifact,summarySha256,approvalSha256,sequence,signedAt,expiresAt,keySha256]),'utf8')
}
export function signedSynchronise(inboxDir,stateDir,trustPath,trustedTrustSha256,trustedApprovalSha256,{now=new Date().toISOString()}={}){
 const inbox=root(inboxDir),state=root(stateDir),trustFile=resolve(trustPath)
 need(!within(inbox,state)&&!within(state,inbox),'Input and state must be separate')
 need(!within(inbox,trustFile)&&!within(state,trustFile)&&realpathSync(trustFile)===trustFile,'Trust registry must be separate')
 need(utc(now)&&hex(trustedTrustSha256)&&hex(trustedApprovalSha256),'Invalid trusted inputs')
 const trustBytes=readBounded(trustFile,65536)
 need(sha(trustBytes)===trustedTrustSha256,'Trust registry fingerprint mismatch')
 const trust=JSON.parse(trustBytes.toString('utf8'))
 need(keys(trust,['kind','schemaVersion','producers'])&&trust.kind==='TRUSTED_RESEARCH_PRODUCERS'&&trust.schemaVersion===1&&Array.isArray(trust.producers)&&trust.producers.length===6,'Invalid trust registry')
 const publicKeys=new Map(),seen=new Set()
 for(let i=0;i<pins.length;i++){
  const p=pins[i],k=trust.producers[i]
  need(keys(k,['id','publicKeyDer','keySha256'])&&k.id===p.id&&hex(k.keySha256)&&!seen.has(k.keySha256),'Invalid or duplicated producer key')
  const der=strictBase64(k.publicKeyDer,1024)
  need(sha(der)===k.keySha256,'Key fingerprint mismatch')
  const key=createPublicKey({key:der,format:'der',type:'spki'})
  need(key.asymmetricKeyType==='ed25519'&&key.export({format:'der',type:'spki'}).equals(der),'Unsupported key')
  seen.add(k.keySha256);publicKeys.set(p.id,{key,sha:k.keySha256})
 }
 const aBytes=readBounded(join(inbox,'approval.json'),65536)
 need(sha(aBytes)===trustedApprovalSha256,'Approval fingerprint mismatch')
 const a=JSON.parse(aBytes.toString('utf8'))
 need(a.kind==='APPROVED_SUMMARY_BATCH'&&a.schemaVersion===1&&Number.isSafeInteger(a.sequence)&&a.sequence>0&&utc(a.approvedAt)&&Date.parse(a.approvedAt)<=Date.parse(now)&&Array.isArray(a.sources)&&a.sources.length===6,'Invalid approval')
 const sigBytes=readBounded(join(inbox,'producer-signatures.json'),65536)
 const bundle=JSON.parse(sigBytes.toString('utf8'))
 need(keys(bundle,['kind','schemaVersion','signatures'])&&bundle.kind==='SIGNED_RESEARCH_SUMMARIES'&&bundle.schemaVersion===1&&Array.isArray(bundle.signatures)&&bundle.signatures.length===6,'Incomplete signatures')
 let stage
 try{
  stage=realpathSync(mkdtempSync(join(tmpdir(),'signed-research-')))
  writeFileSync(join(stage,'approval.json'),aBytes,{flag:'wx',mode:0o600})
  const receipts=[]
  for(let i=0;i<pins.length;i++){
   const p=pins[i],s=a.sources[i],e=bundle.signatures[i],k=publicKeys.get(p.id)
   need(s?.id===p.id&&s.head===p.head&&s.reportRevision===p.reportRevision&&s.run===p.run&&s.artifact===p.artifact&&hex(s.summarySha256),'Unapproved source identity')
   need(keys(e,['id','keySha256','signedAt','expiresAt','signature'])&&e.id===p.id&&e.keySha256===k.sha&&utc(e.signedAt)&&utc(e.expiresAt),'Invalid signature envelope')
   const start=Date.parse(e.signedAt),end=Date.parse(e.expiresAt),time=Date.parse(now)
   need(start>=Date.parse(a.approvedAt)&&start<=time&&time<end&&end>start&&end-start<=3600000,'Signature expired or outside allowed time window')
   const report=readBounded(join(inbox,p.file))
   need(sha(report)===s.summarySha256,'Summary fingerprint mismatch')
   const message=signatureMessage({...s,approvalSha256:trustedApprovalSha256,sequence:a.sequence,signedAt:e.signedAt,expiresAt:e.expiresAt,keySha256:k.sha})
   const sig=strictBase64(e.signature,128)
   need(sig.length===64&&verify(null,message,k.key,sig),'Producer signature verification failed')
   writeFileSync(join(stage,p.file),report,{flag:'wx',mode:0o600})
   receipts.push({id:p.id,keySha256:k.sha,summarySha256:s.summarySha256,signedAt:e.signedAt,expiresAt:e.expiresAt})
  }
  need(readBounded(trustFile,65536).equals(trustBytes)&&readBounded(join(inbox,'approval.json'),65536).equals(aBytes)&&readBounded(join(inbox,'producer-signatures.json'),65536).equals(sigBytes),'Input metadata changed')
  for(let i=0;i<pins.length;i++)need(sha(readBounded(join(inbox,pins[i].file)))===a.sources[i].summarySha256,'Input report changed')
  const result=synchronise(stage,state,trustedApprovalSha256,{now})
  return {kind:'SIGNED_LOCAL_INTAKE_RECEIPT',status:result.status,sequence:result.state.sequence,stateSha256:result.state.stateSha256,trustSha256:trustedTrustSha256,approvalSha256:trustedApprovalSha256,signatureBundleSha256:sha(sigBytes),producers:receipts,measurementFreshness:'UNKNOWN',modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,repairAuthorized:false,limitations:['Authenticates possession of separately trusted local signing keys, not source accuracy or original GitHub artifact identity.','Receipt returned to operator; inherited state remains declared provenance. No automatic approval or producer service.']}
 }finally{if(stage)rmSync(stage,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length!==5)throw Error('Usage: producer-intake.mjs <inbox> <state-dir> <trust-file> <trusted-trust-sha256> <trusted-approval-sha256>')
  console.log(JSON.stringify(signedSynchronise(...args),null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
