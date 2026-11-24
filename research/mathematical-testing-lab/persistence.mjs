// Persist fixed synthetic results only in an explicitly dedicated local directory.
// No arbitrary jobs, model evaluation, or automatic takeover of interrupted owners.
import {readFileSync,writeFileSync,lstatSync,realpathSync,readdirSync,unlinkSync,openSync,closeSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {manifest,register} from '../mathematical-library/experiment-registry.mjs'
import {history,append} from '../mathematical-library/experiment-registry-lifecycle.mjs'
import {saveCheckpoint,restoreCheckpoint} from '../mathematical-library/experiment-registry-checkpoint.mjs'
import {runSuite,suiteSpecifications} from './suite.mjs'
const sha=b=>createHash('sha256').update(b).digest('hex')
const marker='.synthetic-math-registry-v1',lock='.synthetic-math-lock'
const markerText='Dedicated synthetic math registry v1\n'
function inspect(path,kind){
 try{
  const s=lstatSync(path)
  if(s.isSymbolicLink()||(kind==='directory'?!s.isDirectory():!s.isFile()))throw Error('Unsafe registry path')
  return true
 }catch(e){if(e.code==='ENOENT')return false;throw e}
}
function checkTree(root){
 // Reject unexpected top-level entries and nonregular nested entries before calling inherited readers.
 const top=readdirSync(root)
 if(top.length>1000)throw Error('Registry entry bound exceeded')
 for(const n of top){
  const path=join(root,n)
  if(n===marker||n===lock||/^[a-f0-9]{64}\.json$/.test(n)){inspect(path,'file');continue}
  if(n==='artifacts'||/^[a-f0-9]{64}$/.test(n)){
   inspect(path,'directory')
   const names=readdirSync(path)
   if(names.length>5000)throw Error('Registry entry bound exceeded')
   for(const file of names){
    if(!(n==='artifacts'?/^[a-f0-9]{64}\.json$/:/^\d{8}\.json$/).test(file))throw Error('Unexpected registry entry')
    inspect(join(path,file),'file')
   }
   continue
  }
  throw Error('Not a dedicated synthetic registry')
 }
}
function withRegistry(directory,fn){
 const root=resolve(directory)
 if(realpathSync(root)!==root||!inspect(root,'directory'))throw Error('Require an existing, nonsymlink registry directory')
 const lockPath=join(root,lock)
 const fd=openSync(lockPath,'wx',0o600)
 try{
  closeSync(fd)
  if(!inspect(join(root,marker),'file')){
   if(readdirSync(root).some(n=>n!==lock))throw Error('Initial registry directory must be empty')
   writeFileSync(join(root,marker),markerText,{flag:'wx',mode:0o600})
  }
  if(readFileSync(join(root,marker),'utf8')!==markerText)throw Error('Invalid dedicated registry marker')
  checkTree(root)
  return fn(root)
 }finally{unlinkSync(lockPath)}
}
function checkArtifact(root,id,artifactHash,row){
 if(typeof artifactHash!=='string'||!/^[a-f0-9]{64}$/.test(artifactHash))throw Error('Invalid result artifact reference')
 const file=join(root,'artifacts',artifactHash+'.json')
 if(!inspect(file,'file'))throw Error('Missing result artifact')
 const bytes=readFileSync(file)
 if(bytes.length>4*1024*1024||sha(bytes)!==artifactHash)throw Error('Result artifact integrity failure')
 const a=JSON.parse(bytes)
 if(a.schemaVersion!==1||a.experimentId!==id||a.state?.kind!=='SYNTHETIC_FIXTURE_RESULT'||
  JSON.stringify(a.state.result)!==JSON.stringify(row))throw Error('Stored result differs from current fixed fixture')
 return artifactHash
}
export function persistSuite(directory,revision,{recover=false,pauseAfterCheckpoint=false}={}){
 // The five inexpensive fixed benchmarks are recomputed to cross-check any existing evidence.
 const report=runSuite(revision),specs=suiteSpecifications(revision)
 return withRegistry(directory,root=>{
  const records=[]
  for(let index=0;index<specs.length;index++){
   const spec=specs[index],row=report.results[index],id=manifest(spec).experimentId
   if(id!==row.experimentId)throw Error('Fixture identity mismatch')
   register(root,spec)
   let h=history(root,id),action='RECORDED',artifactHash
   if(h.status==='COMPLETED'||h.status==='FAILED'){
    const terminal=h.events.at(-1)
    if((h.status==='COMPLETED')!==(row.status==='PASS'))throw Error('Terminal verdict mismatch')
    artifactHash=checkArtifact(root,id,terminal.details.artifactHash,row)
    records.push({experimentId:id,fixtureId:row.id,lifecycle:h.status,action:'REUSED_VERIFIED',artifactHash,verdict:row.status})
    continue
   }
   if(h.status==='REGISTERED'){
    append(root,id,'RUNNING',{scope:'FIXED_SYNTHETIC_ONLY'})
    artifactHash=saveCheckpoint(root,id,{kind:'SYNTHETIC_FIXTURE_RESULT',result:row}).details.artifactHash
    if(pauseAfterCheckpoint){
     records.push({experimentId:id,fixtureId:row.id,lifecycle:'CHECKPOINTED',action:'PAUSED',artifactHash,verdict:row.status})
     break
    }
   }else if(h.status==='CHECKPOINTED'&&recover===true){
    const checkpoint=restoreCheckpoint(root,id)
    artifactHash=checkArtifact(root,id,checkpoint.artifactHash,row)
    action='RECOVERED_CHECKPOINT'
   }else{
    // A running or interrupted owner is not silently reclaimed.
    throw Error('Existing nonterminal experiment requires explicit review: '+h.status)
   }
   checkArtifact(root,id,artifactHash,row)
   append(root,id,'RUNNING',{scope:'FINALIZE_VERIFIED_CHECKPOINT'})
   const terminal=row.status==='PASS'?'COMPLETED':'FAILED'
   append(root,id,terminal,row.status==='PASS'?{artifactHash}:{artifactHash,reason:'Synthetic known-answer criterion failed'})
   records.push({experimentId:id,fixtureId:row.id,lifecycle:terminal,action,artifactHash,verdict:row.status})
  }
  return {kind:'SYNTHETIC_PERSISTENCE_REPORT',schemaVersion:1,declaredCodeRevision:revision,
   benchmarkReportSha256:report.reportSha256,records,expectedFixtures:specs.length,complete:records.length===specs.length&&records.every(r=>['COMPLETED','FAILED'].includes(r.lifecycle)),
   researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,
   limitations:['Local dedicated store; no authenticated owner or OS isolation. A stale lock requires explicit operator review.',
    'Recovery finalizes verified fixture-level checkpoints, not solver iterations. Fixed fixtures are recomputed for evidence comparison.',
    'No real data or empirical qualification.']}
 })
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(![4,5].includes(process.argv.length)||(process.argv.length===5&&process.argv[4]!=='--recover')){console.error('Usage: node persistence.mjs <existing-dedicated-directory> <revision> [--recover]');process.exitCode=2}
 else{try{const r=persistSuite(process.argv[2],process.argv[3],{recover:process.argv[4]==='--recover'});console.log(JSON.stringify(r,null,2));if(!r.complete||r.records.some(x=>x.verdict!=='PASS'))process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
