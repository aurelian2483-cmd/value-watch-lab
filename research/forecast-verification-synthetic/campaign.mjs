// 250 fixed artificial assessment cases across eight existing catalogue entries.
import {brier,logLoss,rankedProbabilityScore,rocArea,fixedBinECE,pinball,intervalScore,calibrationOffset} from './metrics.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {flags} from '../automated-mathematical-research/campaign.mjs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const ids=['brier','log-loss','rps','auc-roc','ece','pinball','interval-score','calibration-in-large']
export function cases(){
 const rows=[]
 for(const method of ids)for(let i=0;i<(method==='calibration-in-large'?26:32);i++){
  const k=i+1
  let input
  if(['brier','log-loss','rps'].includes(method)){
   const x=k/64,z=(1-x)/2
   input={p:[[x,z,z],[0.25,0.5,0.25],[z,x,z]],y:[i%3,(i+1)%3,(i+2)%3]}
  }else if(method==='auc-roc')input={scores:[k,16,16,32,0,24],labels:[1,0,1,0,0,1]}
  else if(method==='ece')input={p:[0,k/64,0.25,0.5,0.75,1],y:[0,i%2,1,0,1,1],bins:i%2?4:8}
  else if(method==='pinball')input={q:k/4,y:(i%7)-2,tau:(1+i%7)/8}
  else if(method==='interval-score')input={l:k/4,u:k/4+2,y:(i%11)-1,alpha:(1+i%3)/8}
  else input={p:Array(32).fill(k/32),y:Array.from({length:32},(_,j)=>Number(j<1+i%25))}
  rows.push({id:method+'-'+String(k).padStart(3,'0'),method,input,tolerance:1e-9})
 }
 return rows
}
function evaluate(s){
 const p=s.input
 switch(s.method){
 case 'brier':return brier(p.p,p.y)
 case 'log-loss':return logLoss(p.p,p.y).value
 case 'rps':return rankedProbabilityScore(p.p,p.y)
 case 'auc-roc':return rocArea(p.scores,p.labels)
 case 'ece':return fixedBinECE(p.p,p.y,p.bins)
 case 'pinball':return pinball(p.q,p.y,p.tau)
 case 'interval-score':return intervalScore(p.l,p.u,p.y,p.alpha)
 case 'calibration-in-large':return calibrationOffset(p.p,p.y).offset
 default:throw Error('Unsupported fixed method')
 }
}
export function campaign(revision){
 if(typeof revision!=='string'||!/^[a-f0-9]{40}$/.test(revision))throw Error('Full checkout revision required')
 const rows=cases().map(s=>{
  let value=null,status='FAILED_COMPUTATION'
  try{const v=evaluate(s);if(Number.isFinite(v)){value=v;status='COMPUTED_PENDING_REFERENCE'}}catch{}
  return {...s,fixtureSha256:digest(s),value,status}
 })
 const computed=rows.filter(r=>r.status==='COMPUTED_PENDING_REFERENCE').length
 const payload={kind:'SYNTHETIC_FORECAST_VERIFICATION_CAMPAIGN',schemaVersion:1,declaredCodeRevision:revision,catalogueSourceRevision:'0b4773cd00f009416587aee6e95f058fb53026e5',rows,counts:{total:rows.length,computed,failed:rows.length-computed,distinctMethods:8},...flags,limitations:['Artificial cases only. Computation success is not numerical verification until checked against independent references.','RPS uses ordered artificial categories and unscaled cumulative squared error.','Calibration uses constant artificial probabilities with analytic offset; no fitting to real data.','No catalogue admission, empirical qualification or research execution authority.']}
 return {...payload,campaignSha256:digest(payload)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==3)throw Error('Usage: campaign.mjs <full revision>')
  const r=campaign(process.argv[2]);console.log(JSON.stringify(r,null,2));process.exitCode=r.counts.failed?1:0
 }catch(e){console.error(e.message);process.exitCode=2}
}
