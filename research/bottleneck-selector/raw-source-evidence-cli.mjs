#!/usr/bin/env node
// Read-only verification of a saved source dossier against optional LOCAL
// original-response files. No network requests, no output of raw source bytes.
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {dirname,join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditRawSourceEvidence} from './raw-source-evidence.mjs';

const LIMIT=3_000_000;
function fileWithinManifestRoot(folder,relative){
  assert(typeof relative==='string'&&relative.length>0&&
    relative.length<=500&&!isAbsolute(relative)&&!relative.includes('\\')&&
    !relative.includes('\0'),'Invalid relative evidence filename');
  const segments=relative.split('/');
  assert(segments.every(s=>s!=='.'&&s!=='..'&&s.length>0&&s!=='.git'),
    'Unsafe evidence path traversal');
  let current=folder;
  for(let i=0;i<segments.length;i++){
    current=join(current,segments[i]);
    const stat=lstatSync(current);
    assert(!stat.isSymbolicLink(),'Symlink in private evidence path rejected');
    if(i===segments.length-1){
      assert(stat.isFile()&&stat.size>0&&stat.size<=LIMIT,
        'Invalid or oversized original-source file');
    } else assert(stat.isDirectory(),'Non-directory in private evidence path');
  }
  return current;
}
export function loadLocalOriginalEvidence(manifestPath){
  if(manifestPath===undefined||manifestPath===null)return [];
  assert(typeof manifestPath==='string'&&manifestPath.trim().length>0,
    'Invalid local manifest path');
  const path=resolve(manifestPath),folder=dirname(path);
  const stat=lstatSync(path);
  assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=1_000_000,
    'Invalid private evidence manifest');
  const doc=JSON.parse(readFileSync(path,'utf8'));
  assert(doc?.schema_version===1&&doc.kind==='PRIVATE_RESULT_SOURCE_BYTES_V1'&&
    Array.isArray(doc.records)&&doc.records.length<=50_000,
    'Invalid private evidence manifest schema');
  return doc.records.map(r=>{
    assert(typeof r?.prediction_id==='string'&&r.prediction_id.length>0&&
      ['first_source','second_source'].includes(r.side)&&
      typeof r.source_url==='string'&&typeof r.observed_at_utc==='string',
      'Invalid private response entry');
    const filename=fileWithinManifestRoot(folder,r.relative_path);
    return {
      prediction_id:r.prediction_id,side:r.side,
      source_url:r.source_url,observed_at_utc:r.observed_at_utc,
      bytes:readFileSync(filename)
    };
  });
}
function main(){
  const input=process.argv[2];
  assert(input,'Usage: node raw-source-evidence-cli.mjs <dossier.json> [private-source-manifest.json]');
  const dossier=JSON.parse(readFileSync(resolve(input),'utf8'));
  const evidence=loadLocalOriginalEvidence(process.argv[3]);
  const result=auditRawSourceEvidence(dossier,evidence);
  assert(result.independently_verified_results_added===0&&
    result.selected_method===null&&result.scoring_authorised===false&&
    result.betting_eligible===false,'Unsafe outcome promotion');
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
