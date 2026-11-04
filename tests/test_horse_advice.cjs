const assert=require('node:assert/strict'),C=require('../racing-research/advice-core.js');
const entry=(id,horse='Politely',author='One',url='https://forum.punterslounge.com/topic/1/')=>({id,horse,author,url,stance:'support',race_id:'1',group:'forum',startUTC:'2026-11-03T19:00:00Z',event:'Race',summary:'A paraphrased research note.',original_excerpt:'A sufficiently long verbatim original excerpt shared by these entries.',topics:['surface']});
let a=C.aggregate([entry('a'),entry('a'),entry('b','Politely','One')]);assert.equal(a.groups[0].authors,1);assert.equal(a.groups[0].repeated,false);assert.equal(a.rejected,1);
a=C.aggregate([entry('a'),entry('b','POLITELY (IRE)','Two')]);assert.equal(a.groups.length,1);assert.equal(a.groups[0].authors,2);assert.equal(a.groups[0].publishers,1);assert.equal(a.groups[0].repeatedText,true);assert.equal(a.groups[0].independence,'NOT_ESTABLISHED');
a=C.aggregate([entry('a','Woodstock'),entry('b','Woodstock City')]);assert.equal(a.groups.length,2);assert(a.groups.every(x=>x.divided));
a=C.aggregate([entry('a'),{...entry('b'),race_id:'2'}]);assert.equal(a.groups.length,2);
a=C.aggregate([entry('a'),{...entry('b','Politely','Two','https://www.attheraces.com/tips/x'),stance:'against'}]);assert.equal(a.groups[0].publishers,2);assert.equal(a.groups[0].support,1);assert.equal(a.groups[0].against,1);assert(a.groups[0].divided);
a=C.aggregate([entry('a'),{...entry('b'),startUTC:'2026-11-04T19:00:00Z'}]);assert.equal(a.rejected,1);assert.equal(C.normalise({...entry('x'),url:'javascript:alert(1)'}),null);assert.equal(C.name('Oh So Perfect'), 'oh so perfect');
a=C.aggregate([{...entry('a'),original_excerpt:undefined},{...entry('b','Politely','Two'),original_excerpt:undefined}]);assert.equal(a.groups[0].repeatedText,false);
console.log('Horse-advice identity, duplicate, source-family, stance and same-race controls passed');

for(const stance of [undefined,"unknown"]){const g=C.aggregate([{...entry("neutral"),stance}]).groups[0];assert.equal(g.support,0);assert.equal(g.mentions,1)}
