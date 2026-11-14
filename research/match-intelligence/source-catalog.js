'use strict';
// Stage 5: source discovery and date-only provenance. No live requests or betting output.
const {assessMatchContext}=require('./squad-context.js');
const ACCEPTED=new Set(['CLUB','LEAGUE','FEDERATION','LICENSED_PROVIDER']);
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d\d-\d\d$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Invalid source publication date');return s;}
function timestamp(s,label){if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error('Invalid '+label);return Date.parse(s);}
function collectSourceCatalog({fixture,as_of_utc,sources=[]}={}){
 if(!fixture||typeof fixture!=='object'||!fixture.home||!fixture.away||fixture.home===fixture.away)throw Error('Two teams required');
 const cutoff=timestamp(as_of_utc,'snapshot'),kickoff=timestamp(fixture.kickoff_utc,'kickoff');
 if(cutoff>=kickoff)throw Error('Pre-kickoff snapshot required');
 if(!Array.isArray(sources))throw Error('Sources array required');
 let ids=new Set(),accepted=[],review=[],excluded=[];
 for(const s of sources){
   if(!s||typeof s!=='object'||typeof s.id!=='string'||!s.id.trim()||ids.has(s.id))throw Error('Missing or duplicate source identifier');
   ids.add(s.id);
   if(!ACCEPTED.has(s.source_type)||typeof s.url!=='string'||!/^https:\/\/[^\s]+$/.test(s.url)||typeof s.title!=='string'||!s.title.trim())throw Error('Invalid source metadata');
   if(!['FIXTURE','INJURY','LINEUP','MANAGER','INTERNATIONAL','OTHER'].includes(s.topic))throw Error('Unknown source topic');
   const day=validDate(s.published_date);
   if(day>as_of_utc.slice(0,10)){excluded.push({id:s.id,reason:'SOURCE_PUBLISHED_AFTER_CUTOFF_DATE'});continue;}
   // A known date does not establish a precise publication/first-known instant.
   if(s.published_at_utc){
      const known=timestamp(s.published_at_utc,'source published timestamp');
      if(known>cutoff){excluded.push({id:s.id,reason:'SOURCE_PUBLISHED_AFTER_SNAPSHOT'});continue;}
      accepted.push({...s,provenance_state:'TIMESTAMP_AVAILABLE_NOT_CONTENT_AUTHENTICATED'});
   } else {
      review.push({...s,provenance_state:'DATE_ONLY_REQUIRES_TIME_ATTESTATION'});
   }
 }
 return {fixture,as_of_utc,accepted_timestamped:accepted,requires_review:review,excluded,
   model_validation:'UNVALIDATED',research_only:true,publication_gate:'BLOCKED',probability_adjustment:null,
   warning:'Catalog entries are source metadata only. Neither URL nor title validates substantive assertions or player availability.'};
}
module.exports={collectSourceCatalog};
