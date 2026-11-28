// Read-only audit of the catalogue's four generated snapshots.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath,pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
const cli=fileURLToPath(new URL('./catalogue.mjs',import.meta.url))
const targets=Object.freeze([['summary','progress.v1.json'],['ledger','evidence-ledger.v1.json'],['index','INDEX.md'],['reference','REFERENCE.md']])
export function verifySnapshots(){
 const reports=[]
 for(const [command,name] of targets){
  const generated=execFileSync(process.execPath,[cli,command],{encoding:'utf8',maxBuffer:32*1024*1024})
  const stored=readFileSync(new URL(name,import.meta.url),'utf8')
  if(name.endsWith('.json'))assert.deepEqual(JSON.parse(generated),JSON.parse(stored),name+' differs from generator')
  else assert.equal(generated.replace(/\r\n/g,'\n').trimEnd(),stored.replace(/\r\n/g,'\n').trimEnd(),name+' differs from generator')
  reports.push({name,status:'MATCH'})
 }
 return {kind:'CATALOGUE_SNAPSHOT_AUDIT',reports,researchOnly:true,executionAuthorized:false,publicationGate:'BLOCKED'}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(verifySnapshots(),null,2))}catch(e){console.error(e.message);process.exitCode=1}
}
