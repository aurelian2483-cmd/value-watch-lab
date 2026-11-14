'use strict';
// Stage 6: source claims about an EARLIER match cannot be promoted to current match availability.
// Descriptive provenance evaluation only. No numeric player impact, no bookmaker output.
const {collectSourceCatalog}=require('./source-catalog.js');
function time(x,label) {
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x)||!Number.isFinite(Date.parse(x)))throw Error('Invalid '+label);
 return Date.parse(x);
}
const CLAIM_STATUS=new Set(['OUT_FOR_PRIOR_FIXTURE','DOUBTFUL_FOR_PRIOR_FIXTURE','RETURNED_FOR_PRIOR_FIXTURE','TRAINING_ONLY','INTERNATIONAL_DUTY','AVAILABLE_FOR_TARGET','OUT_FOR_TARGET','DOUBTFUL_FOR_TARGET']);
function buildAvailabilitySnapshot({fixture,as_of_utc,claims=[]}={}) {
 if(!fixture||typeof fixture!=='object'||!fixture.home||!fixture.away||fixture.home===fixture.away)throw Error('Invalid fixture');
 const kick=time(fixture.kickoff_utc,'kickoff'),cut=time(as_of_utc,'cutoff');
 if(cut>=kick)throw Error('Snapshot must predate fixture kickoff');
 if(!Array.isArray(claims))throw Error('Claims array required');
 const retained=[],excluded=[],ids=new Set();
 for(const [index,c] of claims.entries()){
   if(!c||typeof c!=='object'||!c.id||ids.has(c.id))throw Error('Duplicate or missing claim id');
   ids.add(c.id);
   if(![fixture.home,fixture.away].includes(c.team)||typeof c.player!=='string'||!c.player.trim()||!CLAIM_STATUS.has(c.status))throw Error('Invalid claim '+index);
   if(typeof c.source_url!=='string'||!/^https:\/\/\S+$/.test(c.source_url)||typeof c.source_title!=='string'||!c.source_title.trim())throw Error('Source metadata required '+index);
   if(typeof c.published_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.published_date)||!Number.isFinite(Date.parse(c.published_date+'T00:00:00Z')))throw Error('Publication date required');
   if(typeof c.content_note!=='string'||!c.content_note.trim())throw Error('Claim paraphrase required');
   if(!['PRIOR_MATCH','TRAINING_UPDATE','INTERNATIONAL_SCHEDULE','TARGET_MATCH'].includes(c.scope))throw Error('Scope required');
   if(c.published_date>as_of_utc.slice(0,10)){
     excluded.push({id:c.id,reason:'PUBLICATION_DATE_AFTER_SNAPSHOT'});continue;
   }
   if(c.published_at_utc&&time(c.published_at_utc,'publication time')>cut){
     excluded.push({id:c.id,reason:'PUBLICATION_TIME_AFTER_SNAPSHOT'});continue;
   }
   if(c.status.endsWith('_FOR_TARGET')&&c.scope!=='TARGET_MATCH')throw Error('Target availability requires target-specific source scope');
   const isTarget=c.scope==='TARGET_MATCH';
   retained.push({
     ...c,
     confidence_in_pre_cutoff_timing:c.published_at_utc?'TIME_RECORDED':'DATE_ONLY_NOT_ATTESTED',
     target_match_readiness:isTarget?'TARGET_MATCH_CLAIM_REQUIRES_CONTENT_VERIFICATION':'HISTORICAL_CONTEXT_ONLY',
     projected_status:null,
     estimated_player_impact:null
   });
 }
 const teams=[fixture.home,fixture.away].map(team=>{
   const context=retained.filter(c=>c.team===team);
   return {team,historical_context_count:context.filter(c=>c.scope!=='TARGET_MATCH').length,
     target_match_claim_count:context.filter(c=>c.scope==='TARGET_MATCH').length,
     confirmed_target_absences:[],confirmed_target_availability:[],
     injury_impact:null,estimated_lineup:null,confidence:'INSUFFICIENT_VERIFIED_TARGET_EVIDENCE'};
 });
 return {fixture,as_of_utc,retained_claims:retained,excluded_claims:excluded,teams,
   model_validation:'UNVALIDATED',research_only:true,publication_gate:'BLOCKED',
   probability_adjustment:null,expected_value:null,
   caveat:'Prior match news, old injury notes, training reports and international schedules do not establish availability on the target date. Source text must be verified separately.'};
}
module.exports={buildAvailabilitySnapshot};
