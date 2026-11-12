'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const S=require('../ops-control/racing-secondary.cjs');
const date='2026-11-12',now=new Date('2026-11-12T20:00:00Z');
const html='<html><h1>Thursday 12 November 2026 · UK time</h1><h2>All meetings today</h2><p>3 meetings · 21 races</p><ul><li>Thurles IRE 11:43–15:48 · 8 races · Scheduled</li><li>Market Rasen UK 12:06–15:36 · 7 races · Scheduled</li><li>Hereford UK 12:30–15:25 · 6 races · Scheduled</li></ul><h2>Racing on TV now</h2></html>';
const primary={race_date_uk:date,coverage_verified:false,discovery_coverage:{included_meetings:[{racecourse:'Thurles',source_race_count:8},{racecourse:'Market Rasen',source_race_count:7},{racecourse:'Hereford',source_race_count:6}]},races:[{race_id:'a'}]};
(async()=>{
 const parsed=S.extract(html,date);
 assert.equal(parsed.status,'SOURCE_OBSERVED');
 assert.equal(parsed.meetings.length,3);assert.equal(parsed.expectedRaces,21);
 const matched=S.reconcile(primary,parsed,now.toISOString());
 assert.equal(matched.status,'MEETING_LIST_MATCHED_NOT_CERTIFIED');
 assert.equal(matched.decision,'RETAIN_P2','secondary agreement must not certify full racing coverage');
 const abandoned=S.extract(html.replace('3 meetings · 21 races','4 meetings · 21 races').replace('</ul>','<li>Taunton UK 12:00–15:00 · 0 races · Abandoned</li></ul>'),date);
 assert.equal(abandoned.status,'SOURCE_OBSERVED');
 const cancelled=S.reconcile(primary,abandoned,now.toISOString());
 assert.deepEqual(cancelled.secondaryAbandoned,['Taunton']);assert.deepEqual(cancelled.missing,[]);
 const missing=S.reconcile({...primary,discovery_coverage:{included_meetings:primary.discovery_coverage.included_meetings.slice(0,2)}},parsed,now.toISOString());
 assert.equal(missing.status,'DISCREPANCY');assert.deepEqual(missing.missing,['Hereford']);
 const wrongDay=S.extract(html,'2026-11-13');assert.equal(wrongDay.status,'DATE_UNVERIFIED');
 const changed=S.extract(html.replace('3 meetings · 21 races','4 meetings · 21 races'),date);assert.equal(changed.status,'SCHEMA_UNVERIFIED');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'racing-secondary-'));
 try{
  const input=path.join(tmp,'primary.json'),output=path.join(tmp,'secondary.json');
  fs.writeFileSync(input,JSON.stringify(primary));
  const fetchOK=async()=>({ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html});
  const result=await S.run(input,output,fetchOK,now);
  assert.equal(result.sourceCheck.status,'MEETING_LIST_MATCHED_NOT_CERTIFIED');
  assert.equal(result.sourceCheck.decision,'RETAIN_P2');assert.equal(result.publicationGate,'BLOCKED');
  assert.equal(JSON.parse(fs.readFileSync(output)).sourceCheck.receipt.sha256.length,64);
  const original=fs.readFileSync(input,'utf8');
  const resultFail=await S.run(input,output,async()=>{throw Error('Blocked by provider')},now);
  assert.equal(resultFail.sourceCheck.status,'SECONDARY_UNAVAILABLE');
  assert.equal(original,fs.readFileSync(input,'utf8'),'secondary comparison may not mutate primary');
  const mismatch=await S.run(input,output,fetchOK,new Date('2026-11-13T12:00:00Z'));
  assert.equal(mismatch.sourceCheck.status,'PRIMARY_DATE_MISMATCH');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
 console.log('PASS: date-scoped independent secondary race list, abandoned meetings, missing venues, fail-closed provider errors and no source mutations');
})().catch(e=>{console.error(e);process.exitCode=1});
