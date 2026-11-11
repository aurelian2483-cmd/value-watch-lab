'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{ValueWatchEvidenceV3:{selectionAvailability:()=>({preRaceAvailabilityVerified:false})}},URL};vm.runInNewContext(fs.readFileSync('paper-lab/community-evidence.js','utf8'),context);
const C=context.window.CommunityEvidence;
const event={sport:'racing',providerEventId:'r1',startUTC:'2026-11-11T15:00:00Z',choices:[{label:'Horse A'},{label:'Horse B'},null]};
const base={race_id:'r1',startUTC:event.startUTC,horse:'Horse A',market:'WIN',group:'tipster',publisher:'Publisher',author:'Author',stance:'support',verification:'PUBLIC_SELECTION_OBSERVED',url:'https://example.org/tip',publication_date:'2026-11-11',observed_at_utc:'2026-11-11T12:00:00Z'};
let s=C.summarize([],event);assert.equal(s.raw,null);assert.equal(s.opposition,null);assert.equal(s.latest,null);
assert.equal(C.date('2026-02-30'),null);assert.equal(C.date('2026-11-11T24:00:00Z'),null);assert.equal(C.date('2026-11-11T12:00:00'),null);assert.equal(C.date({}),null);assert.equal(C.date('2024-02-29').precision,'date');
assert.equal(C.url('javascript:alert(1)'),null);assert.equal(C.url('https://user:password@example.org/tip'),null);assert.equal(C.canonical('https://example.org/tip?utm_source=feed&x=2'),'https://example.org/tip?x=2');
assert.equal(C.match([null,{},base,{...base,race_id:'other'},{...base,startUTC:'2026-11-12T15:00:00Z'},{...base,horse:'Other'}],event).length,1);
assert.equal(C.match([base],{...event,sport:'football'}).length,0);
s=C.summarize([base,{...base,url:base.url+'?utm_source=x',observed_at_utc:'2026-11-11T13:00:00Z'}],event);assert.equal(s.raw,2);assert.equal(s.unique,1);assert.equal(s.rows[0].captures,2);assert.equal(s.rows[0].observed.value,'2026-11-11T13:00:00Z');assert.equal(s.support,1);assert.equal(s.opposition,null);assert.equal(s.explicitOrigins,null);
s=C.summarize([base,{...base,id:'same',stance:'oppose',counter:'some prose'},{...base,horse:'Horse B',stance:'unknown',counter:'opposition is not a stance'}],event);assert.equal(s.support,1);assert.equal(s.opposition,1);assert.equal(s.unknown,1);
s=C.summarize([{...base,url:'https://one.example/tip',origin_url:'https://original.example/tip'},{...base,url:'https://two.example/tip',origin_url:'https://original.example/tip'}],event);assert.equal(s.unique,2);assert.equal(s.groups.length,1);assert.equal(s.explicitOrigins,1);assert.equal(s.support,1,'Syndicated opinions do not inflate support');
s=C.summarize([base,{...base,url:'https://example.org/other'}],event);assert.equal(s.groups.length,2);assert.equal(s.unknownRelationshipGroups,2);assert.equal(s.publishers,1,'Pages are not additional publishers');
s=C.summarize([{...base,publication_date:'2026-02-30',published_at_utc:'broken',url:'javascript:alert(1)',stance:'SUPPORT'}],event);assert.equal(s.latest,null);assert.equal(s.rows[0].url,null);assert.equal(s.support,null);
s=C.summarize([{...base,publication_date:'2026-11-12',observed_at_utc:'2026-11-11T12:00:00Z'}],event);assert.equal(s.latest,null);assert.equal(s.chronologyConflicts,1);assert.equal(s.rows[0].pub.value,'2026-11-12','Original date preserved for inspection');
s=C.summarize([{...base,publication_date:'2026-11-11',observed_at_utc:'2026-11-11T00:01:00Z'}],event);assert.equal(s.chronologyConflicts,0);assert.equal(s.latest.precision,'date','Same-day date-only publication does not assert a later exact time');
s=C.summarize([{...base,published_at_utc:'2026-11-11T14:00:00Z',observed_at_utc:'2026-11-11T12:00:00Z'}],event);assert.equal(s.latest,null);assert.equal(s.chronologyConflicts,1);
s=C.summarize([{...base,extraction_method:'OLBG_PUBLIC_WIN_TIPS_V1',publication_date:'2026-11-11'}],event);assert.equal(s.latest,null);assert.equal(s.rows[0].pub,null);assert.equal(s.rows[0].capturedRaceDate,'2026-11-11','OLBG legacy race date is not presented as publication');

// Eligibility boundary: review-required, invalid URLs, unsupported status and
// retrospectively observed archive records remain visible but never add support.
const excluded=[
  {...base,url:'https://review.example/tip',verification:'RSS_EXPLICIT_MENTION_REVIEW_REQUIRED'},
  {...base,url:'javascript:alert(1)'},
  {...base,url:'https://badstatus.example/tip',verification:'UNKNOWN_STATUS'},
  {...base,url:'https://late.example/tip',observed_at_utc:'2026-11-11T16:00:00Z'},
  {...base,url:'https://wronggroup.example/tip',group:'unrecognised'}
];
s=C.summarize(excluded,event);
assert.equal(s.support,null);assert.equal(s.eligible,null);assert.equal(s.excluded,5);assert.equal(s.rows.length,5);
for(const entry of excluded)assert.equal(C.eligible(entry,event),false);
assert.equal(C.eligible(base,event),true);
s=C.summarize([base,{...base,url:'https://opposition.example/tip',stance:'oppose'},...excluded],event);
assert.equal(s.support,1);assert.equal(s.opposition,1);assert.equal(s.excluded,5);assert.equal(s.eligible,2);
assert.equal(s.publishers,1);
// Minimal DOM verifies safe text construction and native collapsed disclosure.
class Element{constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.textContent='';this.open=false;this.attrs={};}append(n){this.children.push(n);}setAttribute(k,v){this.attrs[k]=v;}querySelector(){return null;}}
const doc={createElement(tag){return new Element(tag,doc);}},parent=new Element('div',doc);
C.render(parent,[{...base,publisher:'<script>bad()</script>',url:'javascript:bad()',observed_at_utc:'2026-11-11T16:00:00Z'}, {...base,url:'https://other.example/tip',stance:'oppose'}],event);
const flatten=n=>[n,...n.children.flatMap(flatten)],nodes=flatten(parent);
assert.equal(nodes.filter(n=>n.tagName==='script').length,0);assert(nodes.some(n=>n.textContent.includes('<script>bad()</script>')));assert(nodes.some(n=>n.tagName==='details'&&!n.open));assert(nodes.some(n=>n.textContent.includes('retrospective evidence only')));assert(nodes.filter(n=>n.tagName==='a').every(n=>n.href.startsWith('https:')&&n.rel==='noopener noreferrer'));
for(const path of ['index.html','paper-lab/index.html']){const html=fs.readFileSync(path,'utf8');assert(html.indexOf('community-evidence.js')>=0);assert(html.indexOf('community-evidence.js')<html.indexOf('desk.js'));}
for(const path of ['index.html','paper-lab/index.html']){const html=fs.readFileSync(path,'utf8');assert(html.includes('community-evidence.js?v=2'),'Current community evidence asset revision required');assert(html.includes('desk.js?v=3.4.61'),'Current desk revision required');assert(html.includes('style.css?v=3.4.46'),'Current changed stylesheet revision required');assert(html.includes('journal.js?v=2'),'Current changed journal revision required');}
const desk=fs.readFileSync('paper-lab/desk.js','utf8');assert.match(desk,/CommunityEvidence\?\.render\(record.racingPanel, communityEntries, event\)/);assert.match(desk,/entry.stance === 'support'/,'Model badge support matcher remains unchanged');assert.match(desk,/if \(typeof eligible !== 'function'\) return \[\]/,'Missing optional community script fails closed');assert.match(desk,/if\(!eligible\(entry,event\)\)return false;\s*return entry\.stance === 'support'/,'Invalid archive records rejected before stance access');
console.log('Community evidence: missing data, strict dates, safe links, exact race matching, explicit dissent, duplicate/syndicated grouping and native disclosure passed');
