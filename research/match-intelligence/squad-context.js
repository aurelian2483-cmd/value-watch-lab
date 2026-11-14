'use strict';
// Stage 4: strictly descriptive, cutoff-safe squad and match context.
// NO numerical player-impact coefficients or betting probabilities are inferred.
const STATUS=new Set(['CONFIRMED_OUT','CONFIRMED_AVAILABLE','DOUBTFUL','UNKNOWN']);
const SOURCE_TYPES=new Set(['CLUB','LEAGUE','FEDERATION','LICENSED_PROVIDER']);
const MATCH_TYPES=new Set(['LINEUP','INJURY','SUSPENSION','TRANSFER','MANAGER','REST']);
function millis(s,label){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s))throw Error(label+': timezone-aware timestamp required');
  const v=Date.parse(s);if(!Number.isFinite(v))throw Error(label+': invalid timestamp');return v;
}
function key(v,label){if(typeof v!=='string'||!v.trim())throw Error(label+': nonempty string required');return v.trim();}
function assessMatchContext({fixture,as_of_utc,records=[]}={}){
  if(!fixture||typeof fixture!=='object')throw Error('Fixture required');
  const home=key(fixture.home,'home'),away=key(fixture.away,'away');
  if(home===away)throw Error('Distinct teams required');
  const kickoff=millis(fixture.kickoff_utc,'kickoff_utc'),cutoff=millis(as_of_utc,'as_of_utc');
  if(cutoff>=kickoff)throw Error('Snapshot must precede kickoff');
  if(!Array.isArray(records))throw Error('Records must be an array');
  const accepted=[],rejected=[],seen=new Set();
  for(let i=0;i<records.length;i++){
    const r=records[i];
    if(!r||typeof r!=='object')throw Error('Invalid record '+i);
    const type=r.type,team=r.team;
    if(!MATCH_TYPES.has(type)||![home,away].includes(team))throw Error('Unknown record type or team at '+i);
    const subject=key(r.subject,'subject');
    const id=key(r.record_id,'record_id');
    if(seen.has(id))throw Error('Duplicate record_id '+id);seen.add(id);
    if(!STATUS.has(r.status))throw Error('Unknown availability status at '+i);
    if(!SOURCE_TYPES.has(r.source_type))throw Error('Unknown source type at '+i);
    if(typeof r.source_url!=='string'||!/^https:\/\/[^\s]+/.test(r.source_url))throw Error('HTTPS source required at '+i);
    const firstKnown=millis(r.first_known_at_utc,'first_known_at_utc');
    const observed=millis(r.observed_at_utc,'observed_at_utc');
    if(firstKnown>cutoff||observed>cutoff){
      rejected.push({record_id:id,reason:'NOT_KNOWN_BEFORE_SNAPSHOT'});continue;
    }
    // Confirmed lineups can only be counted if the record is an explicit LINEUP fact.
    // A doubtful player's absence is never silently treated as confirmed.
    const record={record_id:id,type,team,subject,status:r.status,source_type:r.source_type,
      source_url:r.source_url,first_known_at_utc:r.first_known_at_utc,observed_at_utc:r.observed_at_utc};
    accepted.push(record);
  }
  const teams=[home,away].map(team=>{
    const r=accepted.filter(x=>x.team===team);
    const lineup=r.filter(x=>x.type==='LINEUP');
    // Lineup completeness is intentionally NOT inferred from arbitrary record count.
    const confirmedOut=r.filter(x=>x.status==='CONFIRMED_OUT'&&['INJURY','SUSPENSION'].includes(x.type));
    const questionable=r.filter(x=>x.status==='DOUBTFUL');
    return {team,source_backed_items:r.length,confirmed_out:confirmedOut.map(x=>x.subject),
      questionable:questionable.map(x=>x.subject),lineup_items:lineup.length,
      lineup_status:'NOT_CERTIFIED',squad_strength_delta:null,
      tactical_effect:null,manager_effect:null};
  });
  return {fixture:{home,away,kickoff_utc:fixture.kickoff_utc},as_of_utc,
    teams,accepted_records:accepted,rejected_records:rejected,
    completeness:'PARTIAL_EVIDENCE_ONLY',research_only:true,model_validation:'UNVALIDATED',
    publication_gate:'BLOCKED',probability_adjustment:null,expected_value:null,
    explanation:'Source existence is not a calibrated strength effect; missing player impact stays null.'};
}
module.exports={assessMatchContext,MATCH_TYPES,STATUS,SOURCE_TYPES};
