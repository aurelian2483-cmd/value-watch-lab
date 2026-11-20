#!/usr/bin/env node
// Strict catalogue structure checker; offline, no access to forecasts or deployment.
import fs from 'node:fs';
const path=new URL('./catalogue.v0.json',import.meta.url);
const doc=JSON.parse(fs.readFileSync(path,'utf8'));
const allowed=new Set(['IDEA','SPECIFIED','IMPLEMENTED','TESTED','VALIDATED','REJECTED','RETIRED']);
if(doc.schema_version!=='0.1'||doc.status!=='RESEARCH_ONLY'||!Array.isArray(doc.methods))throw Error('Invalid research catalogue header');
const ids=new Set(),knownSports=new Set(['football','horse-racing','tennis','nfl','darts','rugby']);
for(const m of doc.methods){
 if(typeof m.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(m.id)||ids.has(m.id))throw Error('Missing/duplicate/invalid formula ID: '+m.id);
 ids.add(m.id);
 if(!m.name||!m.family||!allowed.has(m.status))throw Error('Missing description or unknown status: '+m.id);
 if(!Array.isArray(m.sports)||!m.sports.length||m.sports.some(s=>!knownSports.has(s)))throw Error('Invalid sport tags: '+m.id);
 if(!Array.isArray(m.required_inputs)||!m.required_inputs.length)throw Error('No input requirements: '+m.id);
 if(typeof m.note!=='string'||!m.note||typeof m.reference_status!=='string')throw Error('Missing limitations/provenance: '+m.id);
 if(m.status==='VALIDATED'&&!Object.keys(m.validation_by_sport||{}).length)throw Error('False claim of validation: '+m.id);
}
console.log('PASS: '+ids.size+' unique indexed research entries; statuses and sport tags checked. No empirical validity inferred.');

// PR #112 continues to use the original v0 checks above.
const { loadCatalogue } = await import('./validate-v1.mjs');
const { entries } = loadCatalogue();
console.log('PASS: ' + entries.length + ' total v1 catalogue specifications.');
