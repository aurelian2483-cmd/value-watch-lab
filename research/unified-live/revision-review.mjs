// Isolated compatibility review only. Never changes active pins, approval state or producer configuration.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {readBounded} from './sync.mjs'
import {project} from '../unified-control-centre/overview.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const pinsRaw=readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url))
const pins=JSON.parse(pinsRaw)
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const commit=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const positive=x=>Number.isSafeInteger(x)&&x>0
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
export function reviewRevision(candidateDir,manifestPath,trustedManifestSha256){
 const root=resolve(candidateDir),manifestFile=resolve(manifestPath)
 need(realpathSync(root)===root&&lstatSync(root).isDirectory(),'Unsafe candidate directory')
 need(!within(root,manifestFile)&&realpathSync(manifestFile)===manifestFile,'Review manifest must be separate')
 need(hex(trustedManifestSha256),'Invalid trusted manifest fingerprint')
 const raw=readBounded(manifestFile,65536)
 need(sha(raw)===trustedManifestSha256,'Review manifest fingerprint mismatch')
 const manifest=JSON.parse(raw.toString('utf8'))
 need(keys(manifest,['kind','schemaVersion','baselinePinsSha256','sources'])&&manifest.kind==='SOURCE_REVISION_REVIEW'&&manifest.schemaVersion===1&&manifest.baselinePinsSha256===sha(pinsRaw)&&Array.isArray(manifest.sources)&&manifest.sources.length===6,'Invalid baseline or candidate coverage')
 const rows=[],runIds=new Set(),artifactIds=new Set()
 for(let i=0;i<pins.length;i++){
  const p=pins[i],s=manifest.sources[i]
  need(keys(s,['id','head','reportRevision','run','artifact','summarySha256'])&&s.id===p.id&&commit(s.head)&&positive(s.run)&&hex(s.summarySha256),'Invalid candidate identity')
  need(p.reportRevision===null?s.reportRevision===null:commit(s.reportRevision),'Unsupported report revision contract')
  need(p.artifact===null?s.artifact===null:positive(s.artifact),'Unsupported artifact contract')
  need(!runIds.has(s.run)&&(s.artifact===null||!artifactIds.has(s.artifact)),'Duplicate candidate evidence identity')
  runIds.add(s.run);if(s.artifact!==null)artifactIds.add(s.artifact)
  const changed=s.head!==p.head
  if(changed){
   need(s.run!==p.run&&(p.artifact===null||s.artifact!==p.artifact),'New revision requires distinct workflow and artifact evidence')
   if(p.reportRevision!==null)need(s.reportRevision!==p.reportRevision,'New revision requires distinct report revision')
  }else need(s.run===p.run&&s.artifact===p.artifact&&s.reportRevision===p.reportRevision,'Same-head evidence substitution requires separate review')
  if(p.id==='catalogue')need(s.head===s.reportRevision,'Catalogue revision mismatch')
  const bytes=readBounded(join(root,p.file))
  need(sha(bytes)===s.summarySha256,'Candidate summary fingerprint mismatch: '+p.id)
  // Reuse existing source-specific restrictions; newer schemas/dates may need a separate adapter revision.
  let projected
  try{projected=project({...p,head:s.head,reportRevision:s.reportRevision,run:s.run,artifact:s.artifact},JSON.parse(bytes.toString('utf8')))}
  catch{throw Error('Candidate summary contract rejected: '+p.id)}
  rows.push({id:p.id,change:changed?'REVISION_CHANGE':'PIN_UNCHANGED',oldHead:p.head,candidateHead:s.head,reportRevision:s.reportRevision,run:s.run,artifact:s.artifact,summarySha256:s.summarySha256,contractStatus:projected.status,originStatus:'DECLARED_REVIEW_INPUT_NOT_INDEPENDENTLY_VERIFIED'})
 }
 need(readBounded(manifestFile,65536).equals(raw),'Review manifest changed')
 for(let i=0;i<pins.length;i++)need(sha(readBounded(join(root,pins[i].file)))===manifest.sources[i].summarySha256,'Candidate report changed')
 const count=rows.filter(r=>r.change==='REVISION_CHANGE').length
 const payload={kind:'SOURCE_REVISION_COMPATIBILITY_REVIEW',schemaVersion:1,status:count?'COMPATIBLE_CANDIDATE_REQUIRES_INDEPENDENT_REVIEW':'NO_REVISION_CHANGE',baselinePinsSha256:manifest.baselinePinsSha256,manifestSha256:trustedManifestSha256,changedSources:count,rows,activePinsModified:false,promotionAuthorized:false,executionAuthorized:false,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',limitations:['Contract compatibility and byte matching only. Workflow success, archive origin, branch ancestry and scientific claims require independent verification.','No active pin changes, migration or automatic promotion. Existing adapter constraints remain in force.']}
 return {...payload,reviewSha256:digest(payload)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length!==3)throw Error('Usage: revision-review.mjs <candidate-dir> <external-manifest> <trusted-manifest-sha256>')
  console.log(JSON.stringify(reviewRevision(...args),null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
