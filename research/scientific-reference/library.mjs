// Bibliographic provenance only; no downloads, inference, experiments or rights grants.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync,realpathSync} from 'node:fs'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(x)
const str=(x,max=500)=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x)
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
function validUrl(s){
 try{const u=new URL(s);return str(s,2048)&&u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search&&u.href===s}
 catch{return false}
}
const sourceKeys=['id','title','publisher','kind','url','version','doi','accessedOn','rightsStatus','contentSha256','topics']
const claimKeys=['id','sourceId','locator','statement','scope','reviewStatus','independentReview','empiricalEvidence']
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k))
export function validate(register){
 if(!exact(register,['kind','schemaVersion','scope','sources','claims',...Object.keys(flags)])||
    register.kind!=='SCIENTIFIC_REFERENCE_REGISTER'||register.schemaVersion!==1||register.scope!=='GENERAL_SCIENTIFIC_REFERENCE_ONLY'||
    !Object.entries(flags).every(([k,v])=>register[k]===v)||!Array.isArray(register.sources)||!Array.isArray(register.claims)||
    register.sources.length>1000||register.claims.length>5000)throw Error('Invalid register contract')
 const ids=new Set(),urls=new Set(),dois=new Set(),claimIds=new Set()
 for(const s of register.sources){
  if(!exact(s,sourceKeys)||!id(s.id)||ids.has(s.id)||!str(s.title)||!str(s.publisher)||!str(s.version)||
     !['institutional-reference','official-technical-documentation','technical-report','journal-article','book'].includes(s.kind)||
     !validUrl(s.url)||urls.has(s.url)||!date(s.accessedOn)||s.rightsStatus!=='NOT_REVIEWED'||s.contentSha256!==null||
     !(s.doi===null||(str(s.doi,256)&&/^10\.\d{4,9}\/\S+$/i.test(s.doi)&&!dois.has(s.doi.toLowerCase())))||
     !Array.isArray(s.topics)||!s.topics.length||s.topics.length>20||!s.topics.every(id)||new Set(s.topics).size!==s.topics.length)
   throw Error('Invalid or duplicate source')
  ids.add(s.id);urls.add(s.url);if(s.doi!==null)dois.add(s.doi.toLowerCase())
 }
 for(const c of register.claims){
  if(!exact(c,claimKeys)||!id(c.id)||claimIds.has(c.id)||!ids.has(c.sourceId)||!str(c.locator)||!str(c.statement,1000)||!str(c.scope,1000)||
     !['METADATA_INSPECTED','LOCATOR_INSPECTED','UNREVIEWED'].includes(c.reviewStatus)||c.independentReview!==false||c.empiricalEvidence!==false)
   throw Error('Invalid claim or source reference')
  claimIds.add(c.id)
 }
 return true
}
export function summarize(register){
 validate(register)
 const sources=register.sources.map(s=>({...s,claimCount:register.claims.filter(c=>c.sourceId===s.id).length}))
 const counts={sources:sources.length,claims:register.claims.length,locatorInspected:register.claims.filter(c=>c.reviewStatus==='LOCATOR_INSPECTED').length,
  metadataInspected:register.claims.filter(c=>c.reviewStatus==='METADATA_INSPECTED').length,independentlyReviewed:0,empiricallyQualified:0,rightsVerified:0}
 const payload={kind:'SCIENTIFIC_REFERENCE_PROVENANCE_SUMMARY',schemaVersion:1,registerSha256:hash(register),counts,sources,claims:register.claims,
  ...flags,limitations:['Recorded source metadata and locator checks are not independent peer review or empirical qualification.',
   'No source bytes archived; content digests are unavailable. Rights remain unreviewed.',
   'Register digest identifies metadata only, not external source content. No automatic access, execution or publication.']}
 return {...payload,summarySha256:hash(payload)}
}
export function search(register,query){
 validate(register)
 if(!str(query,200))throw Error('Search query required')
 const terms=query.toLowerCase().split(/\s+/)
 return register.sources.filter(s=>{const hay=[s.title,s.publisher,...s.topics,...register.claims.filter(c=>c.sourceId===s.id).map(c=>c.statement)].join(' ').toLowerCase();return terms.every(t=>hay.includes(t))})
}
export function load(){
 const p=fileURLToPath(new URL('./register.json',import.meta.url))
 if(realpathSync(p)!==p||!lstatSync(p).isFile()||lstatSync(p).size>4*1024*1024)throw Error('Unsafe reference register')
 const r=JSON.parse(readFileSync(p,'utf8'));validate(r);return r
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const r=load(),args=process.argv.slice(2)
  if(args.length===1&&args[0]==='summary')console.log(JSON.stringify(summarize(r),null,2))
  else if(args.length===2&&args[0]==='search')console.log(JSON.stringify(search(r,args[1]),null,2))
  else throw Error('Usage: node library.mjs summary | search "<query>"')
 }catch(e){console.error(e.message);process.exitCode=1}
}
