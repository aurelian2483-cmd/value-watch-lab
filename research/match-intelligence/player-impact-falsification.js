'use strict';
// Stage 8C: controlled Poisson player-effect recovery experiment.
// ALL match records are synthetic; this is not empirical football validation.
const {poisson1x2}=require('./dynamic-player-impact');
const clamp=x=>Math.max(.15,Math.min(4,x));
function fit(samples,{ridge=20,maxIterations=250,step=0.02,features=2}={}){
 if(!Array.isArray(samples)||samples.length<50)throw Error('At least 50 prior-only training matches required');
 if(!Number.isInteger(features)||features<1||features>16)throw Error('Feature count out of range');
 if(!(Number.isFinite(ridge)&&ridge>=0&&Number.isInteger(maxIterations)&&maxIterations>=1&&maxIterations<=10000&&step>0&&step<=.1))throw Error('Bad training configuration');
 const coeff=Array(features).fill(0),m=samples.length;
 for(const [i,s] of samples.entries()){
   if(!s||!Array.isArray(s.x)||s.x.length!==features||s.x.some(x=>!Number.isFinite(x)||Math.abs(x)>1))throw Error('Invalid feature row '+i);
   if(!Number.isInteger(s.home_goals)||s.home_goals<0||s.home_goals>30||!Number.isInteger(s.away_goals)||s.away_goals<0||s.away_goals>30)throw Error('Invalid final score');
   if(!(Number.isFinite(s.baseline_home)&&s.baseline_home>=.15&&s.baseline_home<=4&&Number.isFinite(s.baseline_away)&&s.baseline_away>=.15&&s.baseline_away<=4))throw Error('Invalid baseline lambda');
   if(s.features_known_before_kickoff!==true||s.baseline_known_before_kickoff!==true)throw Error('No proof of pre-match input status');
 }
 // Candidate is a symmetric log-lambda adjustment: home exp(+score), away exp(-score).
 // Gradient of Poisson negative log-likelihood with a ridge prior (not xG).
 for(let t=0;t<maxIterations;t++){
   const grad=coeff.map((v,i)=>2*ridge*v/m);
   for(const s of samples){
     const score=s.x.reduce((v,x,j)=>v+x*coeff[j],0);
     const h=clamp(s.baseline_home*Math.exp(score)),a=clamp(s.baseline_away*Math.exp(-score));
     // Derivatives vanish for clipped goal means.
     const gh=h===.15||h===4?0:h-s.home_goals;
     const ga=a===.15||a===4?0:s.away_goals-a;
     for(let k=0;k<features;k++)grad[k]+=s.x[k]*(gh+ga)/m;
   }
   for(let k=0;k<features;k++)coeff[k]=Math.max(-.7,Math.min(.7,coeff[k]-step*grad[k]));
 }
 return {coefficients:coeff,training_count:m,ridge,model:'POISSON_SIGNED_PLAYER_RIDGE_SIMULATION',
   research_only:true,publication_gate:'BLOCKED',real_world_validated:false};
}
function evaluate(samples,fitResult){
 if(!Array.isArray(samples)||!samples.length)throw Error('Evaluation rows required');
 const coeff=fitResult.coefficients;let baseLL=0,modelLL=0,baseBr=0,modelBr=0;
 for(const s of samples){
   if(s.features_known_before_kickoff!==true||s.baseline_known_before_kickoff!==true)throw Error('Unknown prematch features');
   if(!Array.isArray(s.x)||s.x.length!==coeff.length)throw Error('Feature mismatch');
   const z=s.x.reduce((v,x,j)=>v+x*coeff[j],0);
   const p0=poisson1x2(s.baseline_home,s.baseline_away);
   const p1=poisson1x2(clamp(s.baseline_home*Math.exp(z)),clamp(s.baseline_away*Math.exp(-z)));
   const actual=s.home_goals>s.away_goals?0:s.home_goals===s.away_goals?1:2;
   const a=[p0.home,p0.draw,p0.away],b=[p1.home,p1.draw,p1.away];
   baseLL-=Math.log(Math.max(1e-15,a[actual]));modelLL-=Math.log(Math.max(1e-15,b[actual]));
   baseBr+=a.reduce((v,x,i)=>v+(x-(i===actual?1:0))**2,0);
   modelBr+=b.reduce((v,x,i)=>v+(x-(i===actual?1:0))**2,0);
 }
 return {matches:samples.length,baseline_log_loss:baseLL/samples.length,
  challenger_log_loss:modelLL/samples.length,baseline_brier:baseBr/samples.length,challenger_brier:modelBr/samples.length,
  log_loss_improvement:(baseLL-modelLL)/samples.length,
  validated_for_real_football:false,publication_gate:'BLOCKED'};
}
function rng(seed=20261114){let state=seed>>>0;return ()=>{state=(1664525*state+1013904223)>>>0;return (state+.5)/4294967296;};}
function poisson(lambda,random){let l=Math.exp(-lambda),p=1,k=0;do{k++;p*=random();}while(p>l);return k-1;}
function syntheticMatches({seed=20261114,count=4000,trueCoefficients=[.27,-.19]}={}){
 if(count<1||!trueCoefficients.every(Number.isFinite))throw Error('Invalid simulation');
 const random=rng(seed),out=[];
 for(let i=0;i<count;i++){
   // independent 50/50 features; neither condition is a real player's identity
   const x=trueCoefficients.map(()=>random()<.5?-1:1);
   const baseHome=1.20+random()*.75,baseAway=.80+random()*.65;
   const z=x.reduce((s,v,j)=>s+v*trueCoefficients[j],0);
   out.push({x,baseline_home:baseHome,baseline_away:baseAway,
    home_goals:poisson(clamp(baseHome*Math.exp(z)),random),
    away_goals:poisson(clamp(baseAway*Math.exp(-z)),random),
    features_known_before_kickoff:true,baseline_known_before_kickoff:true,synthetic:true,
    sample_order:i});
 }
 return out;
}
function runSimulation({seed=20261114,count=4000,trueCoefficients=[.27,-.19]}={}){
 const data=syntheticMatches({seed,count,trueCoefficients}),split=Math.floor(count*.65);
 const training=data.slice(0,split),test=data.slice(split);
 const estimate=fit(training,{ridge:20,maxIterations:600,step:.03,features:trueCoefficients.length});
 return {type:'SYNTHETIC_FALSIFICATION_ONLY',seed,trueCoefficients,
  estimated:estimate.coefficients,train:training.length,test:test.length,
  holdout:evaluate(test,estimate),no_effect_holdout:evaluate(test,{coefficients:Array(trueCoefficients.length).fill(0)}),
  real_world_validation:'NOT_ATTEMPTED',publication_gate:'BLOCKED'};
}
if(require.main===module){
 const alternatives=[[.27,-.19],[0,0],[-.25,.15]];
 for(let i=0;i<alternatives.length;i++)console.log(JSON.stringify(runSimulation({seed:20261114+i,count:4000,trueCoefficients:alternatives[i]})));
}
module.exports={fit,evaluate,syntheticMatches,runSimulation};
