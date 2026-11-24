// Revalidate the exact public trust registry and signed approval evidence at acceptance time.
// A locally persisted trust receipt is not an independent external trust anchor.
import {createHash,createPublicKey,verify} from 'node:crypto'
import {readFileSync} from 'node:fs'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
function decoded(s,max){
 need(typeof s==='string'&&s.length>0&&s.length<=Math.ceil(max/3)*4,'Invalid encoded evidence')
 const b=Buffer.from(s,'base64')
 need(b.length<=max&&b.toString('base64')===s,'Invalid base64')
 return b
}
export function signatureMessage({id,head,reportRevision,run,artifact,summarySha256,approvalSha256,sequence,signedAt,expiresAt,keySha256}){
 return Buffer.from(JSON.stringify(['UNIFIED_RESEARCH_PRODUCER_REPORT_V1',id,head,reportRevision,run,artifact,summarySha256,approvalSha256,sequence,signedAt,expiresAt,keySha256]),'utf8')
}
export function verifyAuthentication(proof,a,approvalSha256,acceptedAt){
 need(keys(proof,['kind','trustSha256','trustBytes','signatureBundleSha256','signatureBundleBytes'])&&proof.kind==='SIGNED_LOCAL_ACCEPTANCE_V1'&&hex(proof.trustSha256)&&hex(proof.signatureBundleSha256)&&hex(approvalSha256)&&utc(acceptedAt),'Invalid authentication proof')
 const trustRaw=decoded(proof.trustBytes,65536),bundleRaw=decoded(proof.signatureBundleBytes,65536)
 need(sha(trustRaw)===proof.trustSha256&&sha(bundleRaw)===proof.signatureBundleSha256,'Authentication evidence fingerprint mismatch')
 const trust=JSON.parse(trustRaw.toString('utf8')),bundle=JSON.parse(bundleRaw.toString('utf8'))
 need(keys(trust,['kind','schemaVersion','producers'])&&trust.kind==='TRUSTED_RESEARCH_PRODUCERS'&&trust.schemaVersion===1&&Array.isArray(trust.producers)&&trust.producers.length===6,'Invalid trust registry')
 need(keys(bundle,['kind','schemaVersion','signatures'])&&bundle.kind==='SIGNED_RESEARCH_SUMMARIES'&&bundle.schemaVersion===1&&Array.isArray(bundle.signatures)&&bundle.signatures.length===6,'Incomplete signatures')
 need(a?.kind==='APPROVED_SUMMARY_BATCH'&&a.schemaVersion===1&&Number.isSafeInteger(a.sequence)&&a.sequence>0&&utc(a.approvedAt)&&Date.parse(a.approvedAt)<=Date.parse(acceptedAt)&&Array.isArray(a.sources)&&a.sources.length===6,'Invalid approval')
 const seen=new Set(),receipts=[]
 for(let i=0;i<pins.length;i++){
  const p=pins[i],k=trust.producers[i],s=a.sources[i],e=bundle.signatures[i]
  need(s?.id===p.id&&s.head===p.head&&s.reportRevision===p.reportRevision&&s.run===p.run&&s.artifact===p.artifact&&hex(s.summarySha256),'Unapproved source identity')
  need(keys(k,['id','publicKeyDer','keySha256'])&&k.id===p.id&&hex(k.keySha256)&&!seen.has(k.keySha256),'Invalid or duplicated producer key')
  const der=decoded(k.publicKeyDer,768)
  need(sha(der)===k.keySha256,'Key fingerprint mismatch')
  const key=createPublicKey({key:der,format:'der',type:'spki'})
  need(key.asymmetricKeyType==='ed25519'&&key.export({format:'der',type:'spki'}).equals(der),'Unsupported key')
  seen.add(k.keySha256)
  need(keys(e,['id','keySha256','signedAt','expiresAt','signature'])&&e.id===p.id&&e.keySha256===k.keySha256&&utc(e.signedAt)&&utc(e.expiresAt),'Invalid signature envelope')
  const start=Date.parse(e.signedAt),end=Date.parse(e.expiresAt),time=Date.parse(acceptedAt)
  need(start>=Date.parse(a.approvedAt)&&start<=time&&time<end&&end>start&&end-start<=3600000,'Signature expired or outside allowed time window')
  const sig=decoded(e.signature,96)
  need(sig.length===64&&verify(null,signatureMessage({...s,approvalSha256,sequence:a.sequence,signedAt:e.signedAt,expiresAt:e.expiresAt,keySha256:k.keySha256}),key,sig),'Producer signature verification failed')
  receipts.push({id:p.id,keySha256:k.keySha256,summarySha256:s.summarySha256,signedAt:e.signedAt,expiresAt:e.expiresAt})
 }
 return receipts
}
