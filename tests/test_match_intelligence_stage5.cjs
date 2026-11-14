'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {collectSourceCatalog}=require('../research/match-intelligence/source-catalog');
const f={home:'Chelsea',away:'Leeds United',kickoff_utc:'2026-11-21T15:00:00Z'};
const base={fixture:f,as_of_utc:'2026-11-14T18:00:00Z'};
const source={id:'club-1',topic:'INJURY',source_type:'CLUB',title:'Official dated article',url:'https://example.org/report',published_date:'2026-11-09'};
test('date-only article must not be counted as timestamp-verified',()=>{
 const x=collectSourceCatalog({...base,sources:[source]});
 assert.equal(x.requires_review.length,1);
 assert.equal(x.accepted_timestamped.length,0);
 assert.equal(x.publication_gate,'BLOCKED');
});
test('known publication time before snapshot is accepted as metadata only',()=>{
 const x=collectSourceCatalog({...base,sources:[{...source,published_at_utc:'2026-11-09T15:00:00Z'}]});
 assert.equal(x.accepted_timestamped.length,1);
 assert.equal(x.probability_adjustment,null);
});
test('later publication time or date cannot pass snapshot',()=>{
 const a=collectSourceCatalog({...base,sources:[{...source,published_at_utc:'2026-11-14T19:00:00Z'}]});
 assert.equal(a.excluded[0].reason,'SOURCE_PUBLISHED_AFTER_SNAPSHOT');
 const b=collectSourceCatalog({...base,sources:[{...source,published_date:'2026-11-15'}]});
 assert.equal(b.excluded[0].reason,'SOURCE_PUBLISHED_AFTER_CUTOFF_DATE');
});
test('reject duplicate or unsupported source metadata',()=>{
 assert.throws(()=>collectSourceCatalog({...base,sources:[source,source]}),/duplicate/);
 assert.throws(()=>collectSourceCatalog({...base,sources:[{...source,url:'http://not-secure.test'}]}),/metadata/);
 assert.throws(()=>collectSourceCatalog({...base,sources:[{...source,published_date:'2026-02-30'}]}),/date/);
});
test('cutoff cannot be at or after kickoff',()=>{
 assert.throws(()=>collectSourceCatalog({...base,as_of_utc:f.kickoff_utc}),/Pre-kickoff/);
});
test('real recorded official-source catalog remains date-only',()=>{
 const cat=require('../research/match-intelligence/official-source-catalog-2026-11-14.json');
 assert.ok(cat.sources.length>=4);
 const x=collectSourceCatalog({...base,sources:cat.sources});
 assert.equal(x.accepted_timestamped.length,0);
 assert.equal(x.requires_review.length,cat.sources.length);
});
