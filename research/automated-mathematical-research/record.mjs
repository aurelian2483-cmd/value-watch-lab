// Content-addressed immutable campaign records, no source or registry mutation.
import {createHash} from 'node:crypto'
import {openSync,closeSync,writeFileSync,fsyncSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path'
import {pathToFileURL} from 'node:url'
import {readBounded} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {runCampaign,flags} from './campaign.mjs'
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
export function validateCampaign(report,reference){
 need(report&&reference&&report.kind==='FIXED_NUMERICAL_CAMPAIGN'&&reference.kind==='INDEPENDENT_RATIONAL_CAMPAIGN_REVIEW'&&reference.schemaVersion===1,'Invalid report kinds')
 need(hex(report.campaignSha256)&&digest(runCampaign(report.declaredCodeRevision))===digest(report),'Campaign differs from fixed deterministic re-execution')
 need(reference.declaredCodeRevision===report.declaredCodeRevision&&reference.campaignSha256===report.campaignSha256&&Object.entries(flags).every(([k,v])=>reference[k]===v),'Reference binding or safeguards mismatch')
 need(Array.isArray(reference.rows)&&reference.rows.length===250,'Incomplete independent reference review')
 const counts={}
 for(let i=0;i<report.rows.length;i++){
  const r=report.rows[i],v=reference.rows[i]
  need(v.id===r.id&&['PASS','FAIL'].includes(v.status)&&!(r.status==='FAIL'&&v.status==='PASS'),'Invalid reference result identity or verdict')
  need(v.referenceAbsoluteError===null||typeof v.referenceAbsoluteError==='string'&&/^\d+(?:\/[1-9]\d*)?$/.test(v.referenceAbsoluteError)&&v.referenceAbsoluteError.length<=128,'Invalid rational error')
  need(v.status!=='PASS'||v.referenceAbsoluteError!==null,'Missing passing reference error')
  const c=counts[r.method]??={total:0,passed:0,failed:0}
  c.total++;c.passed+=Number(v.status==='PASS');c.failed+=Number(v.status==='FAIL')
 }
 const passed=reference.rows.filter(x=>x.status==='PASS').length
 need(digest(counts)===digest(reference.byMethod)&&digest(reference.counts)===digest({total:250,passed,failed:250-passed,distinctMethods:4}),'Reference count mismatch')
 return {status:report.counts.failed===0&&passed===250?'SYNTHETIC_CAMPAIGN_PASSED':'SYNTHETIC_CAMPAIGN_FAILED',campaignCounts:report.counts,referenceCounts:reference.counts}
}
export function recordCampaign(campaignFile,referenceFile,storeDir,trustedCampaignBytesSha,trustedReferenceBytesSha){
 const c=resolve(campaignFile),r=resolve(referenceFile),store=resolve(storeDir)
 need(c!==r&&realpathSync(c)===c&&realpathSync(r)===r&&realpathSync(store)===store&&lstatSync(store).isDirectory()&&!within(store,c)&&!within(store,r),'Unsafe or overlapping record paths')
 need(hex(trustedCampaignBytesSha)&&hex(trustedReferenceBytesSha),'Explicit trusted file fingerprints required')
 const raw=readBounded(c,2*1024*1024),ref=readBounded(r,2*1024*1024)
 need(sha(raw)===trustedCampaignBytesSha&&sha(ref)===trustedReferenceBytesSha,'Input fingerprint mismatch')
 const report=JSON.parse(raw),reference=JSON.parse(ref),verdict=validateCampaign(report,reference)
 const payload={kind:'SYNTHETIC_CAMPAIGN_RECORD',schemaVersion:1,declaredCodeRevision:report.declaredCodeRevision,campaignSha256:report.campaignSha256,campaignBytesSha256:trustedCampaignBytesSha,referenceBytesSha256:trustedReferenceBytesSha,...verdict,...flags,limitations:['Report replay validates fixed code; the reference file hash is supplied by operator/CI and is not a signature.','Synthetic mathematical correctness does not qualify a predictive method.','This receipt is an immutable file, not an autonomous worker, scientific publication or production queue.']}
 const record={...payload,recordSha256:digest(payload)},bytes=Buffer.from(JSON.stringify(record,null,2)+'\n'),path=join(store,record.recordSha256+'.json')
 need(readBounded(c,2*1024*1024).equals(raw)&&readBounded(r,2*1024*1024).equals(ref),'Campaign input changed')
 let fd
 try{fd=openSync(path,'wx',0o600)}catch(e){
  if(e.code!=='EEXIST')throw e
  need(readBounded(path,65536).equals(bytes),'Existing record integrity mismatch')
  return record
 }
 try{writeFileSync(fd,bytes);fsyncSync(fd)}finally{closeSync(fd)}
 need(readBounded(path,65536).equals(bytes),'Record write verification failed')
 return record
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==7)throw Error('Usage: record.mjs <campaign> <reference> <store> <campaign-byte-sha> <reference-byte-sha>')
  console.log(JSON.stringify(recordCampaign(...process.argv.slice(2)),null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
