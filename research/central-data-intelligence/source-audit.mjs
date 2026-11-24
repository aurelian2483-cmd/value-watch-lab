// Read-only byte integrity audit of an explicit source allowlist.
// No individual records, modelling, data acquisition or financial operations.
import {readFileSync,realpathSync,lstatSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
const sha=b=>createHash('sha256').update(b).digest('hex')
const isSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const isRevision=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
export const sourcePaths=Object.freeze([
 'historical-reliability-data.json','prediction-ledger.json','results-feed.json',
 'research/result-review-status.json','football-expanded-data.json',
 'international-football-data.json','darts/feed.json','rugby-research-data.json','other-sports-data.json'
])
const indexPath='research/bottleneck/inventory.json'
function inspect(root,path,parse=false){
 try{
  const file=resolve(root,path),actual=realpathSync(file),rel=relative(root,actual)
  if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||actual!==file||!lstatSync(file).isFile())
   return {path,status:'UNSAFE_PATH',sha256:null,bytes:null}
  const b=readFileSync(file)
  const result={path,status:'PRESENT',sha256:sha(b),bytes:b.length}
  if(parse){try{return {...result,data:JSON.parse(b)}}catch{return {...result,status:'INVALID_JSON'}}}
  return result
 }catch(e){return {path,status:e?.code==='ENOENT'?'MISSING':'UNREADABLE',sha256:null,bytes:null}}
}
export function auditSources(root){
 root=realpathSync(root)
 const index=inspect(root,indexPath,true)
 const d=index.data
 const valid=index.status==='PRESENT'&&d&&isRevision(d.input_revision)&&d.datasets&&
  typeof d.datasets==='object'&&!Array.isArray(d.datasets)
 const rows=sourcePaths.map(path=>{
  const receipt=inspect(root,path)
  const indexed=!!(valid&&Object.hasOwn(d.datasets,path))
  const archived=indexed?d.datasets[path]:null
  const archiveValid=archived&&archived.path===path&&isSha(archived.sha256)&&isRevision(archived.revision)
  const comparison=receipt.status!=='PRESENT'?'CURRENT_UNAVAILABLE':
   !valid?'ARCHIVE_UNAVAILABLE':!indexed?'NOT_INDEXED':
   !archiveValid?'ARCHIVE_RECEIPT_INVALID':receipt.sha256===archived.sha256?'MATCHES_ARCHIVED_BYTES':'DIFFERS_FROM_ARCHIVED_BYTES'
  return {...receipt,archiveSha256:archiveValid?archived.sha256:null,
   archiveRevision:archiveValid?archived.revision:null,comparison}
 })
 const after=inspect(root,indexPath)
 const stable=after.sha256===index.sha256&&
   (index.status==='INVALID_JSON'?after.status==='PRESENT':after.status===index.status)&&
   rows.every(r=>{const b=inspect(root,r.path);return b.status===r.status&&b.sha256===r.sha256&&b.bytes===r.bytes})
 const counts=Object.create(null)
 for(const row of rows)counts[row.comparison]=(counts[row.comparison]??0)+1
 return {kind:'CENTRAL_DATA_SOURCE_AUDIT',schemaVersion:1,
  status:stable?(valid&&rows.every(r=>r.status==='PRESENT')?'INVENTORY_AVAILABLE':'INCOMPLETE'):'SOURCE_CHANGED_DURING_INSPECTION',
  sourceStableDuringInspection:stable,archive:{path:indexPath,status:valid?'INDEX_AVAILABLE':'INDEX_UNAVAILABLE_OR_INVALID',
   sha256:index.sha256,declaredInputRevision:valid?d.input_revision:null,
   declaredEntries:valid?Object.keys(d.datasets).length:null},
  rows,counts,researchOnly:true,publicationGate:'BLOCKED',validationAuthorized:false,
  executionAuthorized:false,sourceMutationAuthorized:false,
  limitations:['Allowlisted byte receipts only; no new JSON schema or row-level certification is implied.',
   'Archived hashes and revision labels are source claims, not independently authenticated.',
   'Different bytes may be a normal update, not corruption or statistical drift.',
   'Source rights and protected partition access are not established by this audit.',
   'Before/after checks do not constitute an atomic snapshot.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3){console.error('Usage: node source-audit.mjs <source-root>');process.exitCode=2}
 else{try{console.log(JSON.stringify(auditSources(process.argv[2]),null,2))}catch(e){console.error(e.message);process.exitCode=1}}
}
