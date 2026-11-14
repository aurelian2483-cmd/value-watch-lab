'use strict';
// Stage 8B — dynamic player-impact SCENARIO engine, not a calibrated forecast.
// Inputs are hypothetical or independently estimated signed coefficients.
// This module does not access outcomes, future lineups or bookmaker prices.
function finite(x,name){if(typeof x!=='number'||!Number.isFinite(x))throw Error(name+' must be finite');return x;}
function range(x,min,max,name){finite(x,name);if(x<min||x>max)throw Error(name+' outside allowed range');return x;}
function text(x,name){if(typeof x!=='string'||!x.trim())throw Error(name+' required');return x;}
const factorial=Array.from({length:12},(_,i)=>i===0?1:0);for(let i=1;i<12;i++)factorial[i]=factorial[i-1]*i;
function poisson1x2(lh,la){
 range(lh,.15,4,'home goals');range(la,.15,4,'away goals');
 const p=[0,0,0];for(let h=0;h<12;h++)for(let a=0;a<12;a++){
   const v=Math.exp(-lh)*lh**h/factorial[h]*Math.exp(-la)*la**a/factorial[a];
   p[h>a?0:h===a?1:2]+=v;
 }
 const sum=p.reduce((a,b)=>a+b,0);
 return {home:p[0]/sum,draw:p[1]/sum,away:p[2]/sum};
}
function computeDynamicPlayerImpact({lambda_home,lambda_away,home_players=[],away_players=[],shrinkage_k=20}={}){
 const lh=range(lambda_home,.15,4,'lambda_home'),la=range(lambda_away,.15,4,'lambda_away');
 range(shrinkage_k,1,10000,'shrinkage_k');
 if(!Array.isArray(home_players)||!Array.isArray(away_players))throw Error('Player arrays required');
 const all=new Set();
 const map=(players,team)=>{
   let attack=0,defence=0,ready=true;
   const rows=players.map(player=>{
     if(!player||typeof player!=='object')throw Error('Player object required');
     const id=text(player.id,'player id');if(all.has(id))throw Error('Duplicate player id');all.add(id);
     // Effects are changes relative to minutes already implied by the baseline.
     const n=range(player.training_matches,0,10000,'training_matches');
     const a=range(player.attack_effect,-1,1,'attack_effect');
     const d=range(player.defence_effect,-1,1,'defence_effect');
     const form=range(player.form_multiplier,0,2,'form_multiplier');
     const matchup=range(player.matchup_multiplier,0,2,'matchup_multiplier');
     const expected=player.expected_minutes===null?null:range(player.expected_minutes,0,90,'expected_minutes');
     const reference=range(player.baseline_reference_minutes,0,90,'baseline_reference_minutes');
     if(expected===null){ready=false;return {id,team,status:'MISSING_MINUTES',attack_shift:null,defence_shift:null};}
     const exposure=(expected-reference)/90;
     const reliability=n/(n+shrinkage_k);
     // A negative attack effect can make extra minutes harmful; the opposite for lost minutes.
     const attackShift=exposure*a*form*matchup*reliability;
     const defenceShift=exposure*d*form*matchup*reliability;
     attack+=attackShift;defence+=defenceShift;
     return {id,team,status:'SCENARIO_ONLY',reliability,exposure,attack_shift:attackShift,defence_shift:defenceShift};
   });
   return {attack,defence,ready,rows};
 };
 const home=map(home_players,'HOME'),away=map(away_players,'AWAY');
 const result={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
   coefficient_provenance:'UNVERIFIED_SCENARIO_INPUTS',baseline:{lambda_home:lh,lambda_away:la,probabilities:poisson1x2(lh,la)},
   player_contributions:[...home.rows,...away.rows],adjusted:null,probability_change:null,
   note:'Counterfactual scenario, NOT a calibrated player-impact model or bet recommendation.'};
 if(!home.ready||!away.ready)return {...result,status:'INSUFFICIENT_EVIDENCE'};
 // Defence effect = protective ability: more away defence reduces home expected goals.
 const rawHome=lh*Math.exp(home.attack-away.defence),rawAway=la*Math.exp(away.attack-home.defence);
 const newHome=Math.max(.15,Math.min(4,rawHome)),newAway=Math.max(.15,Math.min(4,rawAway));
 const p=poisson1x2(newHome,newAway),base=result.baseline.probabilities;
 return {...result,status:'SCENARIO_COMPUTED_NOT_VALIDATED',
   adjusted:{lambda_home:newHome,lambda_away:newAway,probabilities:p},
   probability_change:{home:p.home-base.home,draw:p.draw-base.draw,away:p.away-base.away}};
}
module.exports={computeDynamicPlayerImpact,poisson1x2};
