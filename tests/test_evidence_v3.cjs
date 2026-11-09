#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const code=fs.readFileSync(root+'/paper-lab/evidence-v3.js','utf8');
const context={window:{},URL};vm.runInNewContext(code,context);
const gate=context.window.ValueWatchEvidenceV3.evaluate;
const now=Date.parse('2026-11-08T13:00:00Z');
const observedAt='2026-11-08T12:59:00Z';
const event={sport:'football',startUTC:'2026-11-08T15:00:00Z',choices:[{id:'a',quote:{decimal:1.5,observedAt}},{id:'b',quote:{decimal:3,observedAt}}],communityTips:[]};
const run=()=>gate(event,event.choices[0],now);
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
const main=fs.readFileSync(root+'/index.html','utf8');
assert.match(main,/evidence-v3\.js/,'The public entrypoint must load the colour evaluator');
assert(main.indexOf('evidence-v3.js')<main.indexOf('/desk.js'));
assert.match(code,/primaryPostVerified/);
const forecasts={...event,sport:'racing',choices:event.choices.map(c=>({id:c.id,quote:null,forecastPrice:{kind:'PUBLISHER_BETTING_FORECAST',decimal:c.quote.decimal,observedAt}})),communityTips:[post('Alice'),post('Bob')]};
const fg=gate(forecasts,forecasts.choices[0],now);
assert.equal(fg.green,'PROVISIONAL');assert.equal(fg.greenBasis,'PUBLISHER_BETTING_FORECAST');assert.equal(fg.blue,'EXPERIMENTAL');
assert.equal(fg.yellow,'EXPERIMENTAL_AGREEMENT','A forecast favourite may match an experimental source leader without claiming verified consensus');
assert.equal(gate(forecasts,forecasts.choices[0],now+31*60000).green,'NOT_ESTABLISHED');
assert.equal(gate({...forecasts,choices:[forecasts.choices[0],{id:'b'}]},forecasts.choices[0],now).green,'NOT_ESTABLISHED');
const primaryEvent={...event,providerEventId:'paper-qa',choices:[{id:'1',label:'Synthetic Horse 1'},{id:'2',label:'Synthetic Horse 2'}]};
const url='https://www.fatjockey.com/forum/topic/42#post-1';
const primary={verification:'PRIMARY_POST_CAPTURED',url,author:'Synthetic Alice',horse:'Synthetic Horse 2',published_at_utc:'2026-11-08T12:00:00Z',
  primary_capture:{method:'JSONLD_DISCUSSION_POST_V1',post_url:url,author:'Synthetic Alice',race_id:'paper-qa',race_start_utc:event.startUTC,horse_id:'2',
    published_at_utc:'2026-11-08T12:00:00Z',explicit_selection:true,explicit_value_backing:true,thread_url:'https://www.fatjockey.com/forum/topic/42',
    text_sha256:'c'.repeat(64),receipt:{url,sha256:'d'.repeat(64),observed_at_utc:observedAt}}};
const checked=context.window.ValueWatchEvidenceV3.communityEvidence(primary,primaryEvent,now);
assert.equal(checked.primaryPostVerified,true);assert.equal(checked.verifiedThreadId,'https://www.fatjockey.com/forum/topic/42');
assert.equal(context.window.ValueWatchEvidenceV3.communityEvidence({...primary,verification:'RSS_EXPLICIT_HEADLINE_UNVERIFIED'},primaryEvent,now).primaryPostVerified,false);
assert.equal(context.window.ValueWatchEvidenceV3.communityEvidence({...primary,primary_capture:{...primary.primary_capture,receipt:{url,sha256:'invalid',observed_at_utc:observedAt}}},primaryEvent,now).primaryPostVerified,false);
const nativeUrl='https://www.reddit.com/r/HorseRacingUK/comments/post42/mondays_tips/comment2/';
const nativeFeed='https://www.reddit.com/r/HorseRacingUK/comments/post42/mondays_tips/.rss';
const native={...primary,url:nativeUrl,source_feed:nativeFeed,primary_capture:{...primary.primary_capture,
  method:'NATIVE_FORUM_FEED_V1',native_platform:'REDDIT_ATOM',feed_entry_id:'t1_comment2',post_url:nativeUrl,
  thread_url:'https://www.reddit.com/r/HorseRacingUK/comments/post42/mondays_tips/',receipt:{url:nativeFeed,sha256:'d'.repeat(64),observed_at_utc:observedAt}}};
assert.equal(context.window.ValueWatchEvidenceV3.communityEvidence(native,primaryEvent,now).primaryPostVerified,true);
assert.equal(context.window.ValueWatchEvidenceV3.communityEvidence({...native,primary_capture:{...native.primary_capture,feed_entry_id:'t1_other'}},primaryEvent,now).primaryPostVerified,false);
console.log('Evidence v3 unit regression passed (all four sports, blocked/unlocked cases, same-thread gate).');

const experimental={...forecasts,communityTips:[{...post('Publisher',false),type:'tipster',observedAt,sourceSelectionObserved:true}]};
assert.equal(gate(experimental,experimental.choices[0],now).blue,'EXPERIMENTAL');
assert.equal(gate(experimental,experimental.choices[0],now).yellow,'EXPERIMENTAL_AGREEMENT');
experimental.communityTips.push({...experimental.communityTips[0],choiceId:'b',sourceUrl:'https://other.example/tip/2'});
assert.equal(gate(experimental,experimental.choices[0],now).yellow,'NOT_AWARDED','Equal support cannot create a unique agreement');
experimental.communityTips=[{...experimental.communityTips[0],publishedAt:'2026-11-09T12:00:00Z'}];
assert.equal(gate(experimental,experimental.choices[0],now).blue,'NOT_AWARDED','Future posts stay excluded');
experimental.communityTips=[{...post('Publisher',false),type:'tipster',sourceSelectionObserved:false}];
assert.equal(gate(experimental,experimental.choices[0],now).blue,'NOT_AWARDED','A mere mention is not a selection');
