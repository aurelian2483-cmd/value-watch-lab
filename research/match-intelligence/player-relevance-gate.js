'use strict';
// Stage 9: candidate relevance audit for prior-only signed player evidence.
// This does NOT certify causal influence, model calibration, or profitable bets.
// No estimates are derived from retrospective actual match XIs.
const {computeDynamicPlayerImpact}=require('./dynamic-player-impact');
function timestamp(x,label){
 if(typeof x!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)||!Number.isFinite(Date.parse(x)))
   throw Error(label+': timezone-aware timestamp required');
 return Date.parse(x);
}
function num(x,name,min,max){
 if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error(name+': value outside required range');
 return x;
}
function nonempty(x,label){
 if(typeof x!=='string'||!x.trim())throw Error(label+': non-empty string required');
 return x.trim();
}
function auditPlayerRelevance({fixture,cutoff_utc,players=[],minimum_matches=15,maximum_interval_width=.4}={}){
 if(!fixture||typeof fixture!=='object')throw Error('Fixture required');
 const home=nonempty(fixture.home,'home'),away=nonempty(fixture.away,'away');
 if(home===away)throw Error('Two distinct teams required');
 const kickoff=timestamp(fixture.kickoff_utc,'kickoff'),cutoff=timestamp(cutoff_utc,'cutoff');
 if(cutoff>=kickoff)throw Error('Cutoff must precede kickoff');
 if(!Array.isArray(players))throw Error('Players must be array');
 num(minimum_matches,'minimum_matches',1,10000);
 num(maximum_interval_width,'maximum_interval_width',.001,2);
 const seen=new Set(),rows=[];
 for(const p of players){
   if(!p||typeof p!=='object')throw Error('Player evidence required');
   const id=nonempty(p.id,'player id'),team=nonempty(p.team,'team');
   if(![home,away].includes(team))throw Error('Player team does not match fixture');
   const unique=team+':'+id;
   if(seen.has(unique))throw Error('Repeated player evidence');
   seen.add(unique);
   const known=timestamp(p.first_known_at_utc,'first_known_at'),observed=timestamp(p.observed_at_utc,'observed_at');
   const reasons=[];
   if(known>cutoff||observed>cutoff)reasons.push('EVIDENCE_AFTER_CUTOFF');
   if(typeof p.source_url!=='string'||!/^https:\/\/\S+$/.test(p.source_url))reasons.push('MISSING_HTTPS_PROVENANCE');
   if(!['ARCHIVED_PREMATCH','HYPOTHETICAL'].includes(p.evidence_class))throw Error('Invalid evidence class');
   const expected=p.expected_minutes===null?null:num(p.expected_minutes,'expected_minutes',0,90);
   const baseline=num(p.baseline_reference_minutes,'baseline_reference_minutes',0,90);
   if(expected===null)reasons.push('EXPECTED_MINUTES_UNKNOWN');
   const matches=num(p.training_matches,'training_matches',0,10000);
   if(matches<minimum_matches)reasons.push('INSUFFICIENT_MATCH_SAMPLE');
   const effect=num(p.effect_mean,'effect_mean',-1,1);
   if(!Array.isArray(p.effect_interval)||p.effect_interval.length!==2)throw Error('Effect interval [lower,upper] required');
   const lower=num(p.effect_interval[0],'lower effect',-1,1),upper=num(p.effect_interval[1],'upper effect',-1,1);
   if(lower>upper||effect<lower||effect>upper)throw Error('Effect interval must contain point estimate');
   if(lower<=0&&upper>=0)reasons.push('EFFECT_INCLUDES_ZERO');
   if(upper-lower>maximum_interval_width)reasons.push('EFFECT_UNCERTAINTY_TOO_WIDE');
   const form=num(p.form_multiplier,'form_multiplier',0,2),matchup=num(p.matchup_multiplier,'matchup_multiplier',0,2);
   if(p.evidence_class!=='ARCHIVED_PREMATCH')reasons.push('NOT_EMPIRICAL_PREMATCH_EVIDENCE');
   const reliability=matches/(matches+20);
   const shift=expected===null?null:(expected-baseline)/90*effect*form*matchup*reliability;
   const classification=reasons.length?'NOT_ELIGIBLE':'EXPLORATORY_RELEVANCE_CANDIDATE';
   rows.push({id,team,relevance_status:classification,reasons,
     signed_attack_example_shift:shift,reliability,sample_matches:matches,
     evidence_class:p.evidence_class,
     note:'Intervals and coefficients supplied externally. This gate does not validate how they were estimated.'});
 }
 return {fixture:{home,away,kickoff_utc:fixture.kickoff_utc},cutoff_utc,
   candidates:rows.filter(x=>x.relevance_status==='EXPLORATORY_RELEVANCE_CANDIDATE'),
   excluded:rows.filter(x=>x.relevance_status!=='EXPLORATORY_RELEVANCE_CANDIDATE'),
   model_validation:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true,
   probability_adjustment:null,player_effects_fitted_here:false,
   caveat:'Selection against confidence intervals is a conservative screening heuristic; no causal effect, independent calibration or predictive gain is established.'};
}
module.exports={auditPlayerRelevance};
