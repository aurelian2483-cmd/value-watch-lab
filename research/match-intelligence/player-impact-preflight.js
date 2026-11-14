'use strict';
// Stage 8: fixture-to-retrospective-lineup matching and player-impact readiness audit.
// Never uses starting XI as a pre-match feature unless its availability was timestamped.
const {normalizeHistoricalAvailability}=require('./historical-availability.js');
function iso(v,name) {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v))throw Error(name+': timezone-aware ISO timestamp required');
 let n=Date.parse(v);if(!Number.isFinite(n))throw Error(name+': invalid time');return n;
}
function requireText(v,name){if(typeof v!=='string'||!v.trim())throw Error(name+': non-empty text required');return v.trim();}
function buildPlayerImpactPreflight({archive,fixtures,fixtureMapping,availabilityEvidence=[]}={}){
 const source=normalizeHistoricalAvailability(archive);
 if(!Array.isArray(fixtures)||!Array.isArray(fixtureMapping)||!Array.isArray(availabilityEvidence))throw Error('Fixture, mapping and evidence arrays required');
 const knownIds=new Set(),fixtureById=new Map(),issues=[],mapped=new Map();
 for(const f of fixtures){
   if(!f||typeof f!=='object')throw Error('Invalid fixture');
   const id=requireText(f.fixture_id,'fixture_id'), home=requireText(f.home,'home'),away=requireText(f.away,'away');
   if(knownIds.has(id))throw Error('Duplicate fixture ID');knownIds.add(id);
   if(home===away)throw Error('Same team in fixture');
   iso(f.kickoff_utc,'kickoff_utc');
   if(!/^\d{4}$/.test(String(f.season))||f.competition!=='GB1')throw Error('Fixture season/competition required');
   fixtureById.set(id,{...f,fixture_id:id});
 }
 const mappedIds=new Set();
 for(const m of fixtureMapping){
   if(!m||typeof m!=='object'||!Number.isInteger(m.round)||m.round<1||m.round>38)throw Error('Invalid mapping round');
   const id=requireText(m.fixture_id,'mapping fixture_id');
   if(mappedIds.has(id))throw Error('Duplicate mapping fixture ID');mappedIds.add(id);
   const f=fixtureById.get(id);
   if(!f)throw Error('Mapping references unknown fixture');
   if(String(f.season)!==source.season||f.competition!==source.competition||![f.home,f.away].includes(source.club))throw Error('Fixture does not match archive club and season');
   if(!['CLUB','LEAGUE'].includes(m.verifier_type)||typeof m.verifier_url!=='string'||!/^https:\/\/\S+$/.test(m.verifier_url))throw Error('Official fixture mapping evidence required');
   if(mapped.has(m.round)){issues.push({fixture_id:id,reason:'ROUND_MAPPED_TO_MULTIPLE_FIXTURES'});continue;}
   mapped.set(m.round,{fixture_id:id,mapping:m,fixture:f});
 }
 const evidenceByMatch=new Map(),evidenceIds=new Set();
 for(const e of availabilityEvidence){
   if(!e||typeof e!=='object')throw Error('Invalid availability record');
   const id=requireText(e.record_id,'availability record_id');
   if(evidenceIds.has(id))throw Error('Duplicate availability evidence ID');evidenceIds.add(id);
   if(!fixtureById.has(e.fixture_id))throw Error('Availability references unknown fixture');
   const f=fixtureById.get(e.fixture_id),known=iso(e.first_known_at_utc,'first_known_at_utc'),
     observed=iso(e.observed_at_utc,'observed_at_utc'),kickoff=iso(f.kickoff_utc,'kickoff');
   const cutoff=iso(e.forecast_cutoff_utc,'forecast_cutoff_utc');
   if(cutoff>=kickoff)throw Error('Forecast cutoff must precede kickoff');
   if(!Number.isInteger(e.player_id)||e.player_id<=0||!['AVAILABLE','OUT','DOUBTFUL'].includes(e.status))throw Error('Invalid availability status or player');
   if(e.source_url==null||typeof e.source_url!=='string'||!/^https:\/\/\S+$/.test(e.source_url))throw Error('Availability source URL required');
   const issue=known>cutoff||observed>cutoff?'POST_CUTOFF_EVIDENCE':null;
   const row={record_id:id,fixture_id:e.fixture_id,player_id:e.player_id,status:e.status,valid_before_cutoff:!issue,issue};
   if(!evidenceByMatch.has(e.fixture_id))evidenceByMatch.set(e.fixture_id,[]);
   evidenceByMatch.get(e.fixture_id).push(row);
 }
 const matches=source.rounds.map(r=>{
   const link=mapped.get(r.round),problems=[...r.issues];
   if(!link)problems.push('MISSING_VERIFIED_FIXTURE_MAPPING');
   const found=link?(evidenceByMatch.get(link.fixture_id)||[]):[];
   if(found.some(e=>!e.valid_before_cutoff))problems.push('POST_CUTOFF_PLAYER_EVIDENCE');
   if(!found.length)problems.push('NO_ARCHIVED_PREMATCH_AVAILABILITY');
   if(source.errors.length)problems.push('SOURCE_INVALID_PLAYER_ROWS');
   return {round:r.round,fixture_id:link?.fixture_id||null,starting_player_ids:r.starting_player_ids,
     retrospective_starting_xi_count:r.starters,prematch_evidence_records:found.length,
     verified_cutoff_evidence_records:found.filter(x=>x.valid_before_cutoff).length,
     issues:problems,training_eligible:false,forecast_eligible:false};
 });
 const unmapped=fixtures.filter(x=>!mappedIds.has(x.fixture_id)).map(x=>x.fixture_id);
 return {club:source.club,season:source.season,competition:source.competition,matches,
    unmapped_fixture_ids:unmapped,mapping_conflicts:issues,player_impact_coefficients:null,
    model_training_executed:false,probability_adjustment:null,validation:'UNVALIDATED',
    publication_gate:'BLOCKED',research_only:true,
    note:'Round mapping, timing, official source crosschecks, source rights and independent data validation are required before predictive use. Observed XI is NOT a prematch feature.'};
}
module.exports={buildPlayerImpactPreflight};
