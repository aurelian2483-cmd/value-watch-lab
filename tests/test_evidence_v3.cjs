#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const code=fs.readFileSync(root+'/paper-lab/evidence-v3.js','utf8');
const context={window:{},URL};vm.runInNewContext(code,context);
const gate=context.window.ValueWatchEvidenceV3.evaluate;
const event={sport:'football',startUTC:'2026-11-08T15:00:00Z',choices:[{id:'a',quote:{decimal:1.5}},{id:'b',quote:{decimal:3}}],communityTips:[]};
const run=()=>gate(event,event.choices[0]);
assert.equal(run().green,'PROVISIONAL');assert.equal(run().blue,'NOT_AWARDED');assert.equal(run().yellow,'NOT_AWARDED');
const post=(author,verified=true)=>({choiceId:'a',type:'forum',sourceUrl:'https://example.org/thread/42#'+author,author,publishedAt:'2026-11-08T12:00:00Z',primaryPostVerified:verified,explicitBetSelectionVerified:true,timestampVerified:true,valueBackingVerified:true,verifiedThreadId:'thread42'});
event.communityTips=[post('Alice',false)];assert.equal(run().blue,'NOT_AWARDED');
event.communityTips=[post('Alice')];assert.equal(run().blue,'VERIFIED');assert.equal(run().yellow,'NOT_AWARDED');
event.communityTips.push(post('Bob'));assert.equal(run().yellow,'MULTI_USER_CONSENSUS');
event.communityTips[1].verifiedThreadId='another-thread';assert.equal(run().yellow,'NOT_AWARDED');
event.communityTips=[post('Alice'),post('Alice')];assert.equal(run().yellow,'NOT_AWARDED');
event.communityTips=[post('Alice'),{...post('Bob'),publishedAt:'2026-11-09T12:00:00Z'}];assert.equal(run().yellow,'NOT_AWARDED');
event.communityTips=[{...post('Alice'),sourceUrl:'https://example.org/'},post('Bob')];assert.equal(run().yellow,'NOT_AWARDED');
for(const sport of ['racing','tennis','nfl']){event.sport=sport;event.communityTips=[];assert.equal(run().blue,'NOT_AWARDED');}
const html=fs.readFileSync(root+'/paper-lab/index.html','utf8');
assert.match(html,/evidence-v3\.js/);assert.match(html,/desk\.js/);
assert.match(code,/primaryPostVerified/);
console.log('Evidence v3 unit regression passed (all four sports, blocked/unlocked cases, same-thread gate).');
