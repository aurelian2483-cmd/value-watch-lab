// General synthetic assessment metrics, consistent with the registered catalogue definitions.
// No event data, actual predictions, recommendations, producer dispatch or model fitting on real data.
import {bisect} from '../mathematical-testing-lab/numerical.mjs'
const need=(x,m)=>{if(!x)throw RangeError(m)}
const finite=Number.isFinite
const bounded=a=>Array.isArray(a)&&a.length>=1&&a.length<=256
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length
const probabilities=a=>bounded(a)&&a.length<=32&&a.every(p=>finite(p)&&p>=0&&p<=1)&&Math.abs(a.reduce((s,p)=>s+p,0)-1)<=1e-12
function categorical(p,y){
 need(bounded(p)&&bounded(y)&&p.length===y.length&&p.every(r=>probabilities(r)&&r.length>=2&&r.length===p[0].length)&&y.every(k=>Number.isSafeInteger(k)&&k>=0&&k<p[0].length),'Invalid aligned categorical forecasts')
}
function binary(p,y){
 need(bounded(p)&&bounded(y)&&p.length===y.length&&p.every(x=>finite(x)&&x>=0&&x<=1)&&y.every(x=>x===0||x===1),'Invalid aligned binary forecasts')
}
export function brier(p,y){
 categorical(p,y)
 return mean(p.map((r,i)=>r.reduce((s,v,k)=>s+(v-Number(y[i]===k))**2,0)))
}
export function logLoss(p,y){
 categorical(p,y)
 if(p.some((r,i)=>r[y[i]]===0))return {status:'INFINITE_LOSS',value:null}
 return {status:'FINITE',value:mean(p.map((r,i)=>-Math.log(r[y[i]])))}
}
export function rankedProbabilityScore(p,y){
 categorical(p,y)
 return mean(p.map((r,i)=>{
  let cum=0,s=0
  for(let k=0;k<r.length-1;k++){cum+=r[k];s+=(cum-Number(y[i]<=k))**2}
  return s
 }))
}
export function rocArea(scores,labels){
 need(bounded(scores)&&bounded(labels)&&scores.length===labels.length&&scores.every(finite)&&labels.every(x=>x===0||x===1),'Invalid aligned ROC scores')
 const npos=labels.reduce((s,x)=>s+x,0),nneg=labels.length-npos
 need(npos>0&&nneg>0,'ROC requires both classes')
 const ordered=scores.map((score,i)=>({score,label:labels[i]})).sort((a,b)=>a.score-b.score)
 let rankSum=0
 for(let i=0;i<ordered.length;){
  let j=i+1
  while(j<ordered.length&&ordered[j].score===ordered[i].score)j++
  const rank=(i+1+j)/2
  for(let k=i;k<j;k++)rankSum+=rank*ordered[k].label
  i=j
 }
 return (rankSum-npos*(npos+1)/2)/(npos*nneg)
}
export function fixedBinECE(p,y,bins){
 binary(p,y);need(Number.isSafeInteger(bins)&&bins>=2&&bins<=32,'Invalid fixed bin count')
 const totals=Array.from({length:bins},()=>({p:0,y:0}))
 for(let i=0;i<p.length;i++){
  const b=Math.min(bins-1,Math.floor(p[i]*bins))
  totals[b].p+=p[i];totals[b].y+=y[i]
 }
 return totals.reduce((s,b)=>s+Math.abs(b.y-b.p),0)/p.length
}
export function pinball(q,y,tau){
 need([q,y,tau].every(finite)&&tau>0&&tau<1,'Invalid quantile loss')
 const d=y-q,value=d*(tau-Number(d<0))
 need(finite(value),'Nonfinite loss')
 return value
}
export function intervalScore(l,u,y,alpha){
 need([l,u,y,alpha].every(finite)&&u>=l&&alpha>0&&alpha<1,'Invalid interval score')
 const value=u-l+(2/alpha)*(Math.max(0,l-y)+Math.max(0,y-u))
 need(finite(value),'Nonfinite interval score')
 return value
}
const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x))
export function calibrationOffset(p,y){
 binary(p,y);need(p.every(x=>x>0&&x<1)&&y.includes(0)&&y.includes(1),'Calibration requires interior probabilities and both outcomes')
 const logits=p.map(x=>Math.log(x)-Math.log1p(-x)),target=y.reduce((s,x)=>s+x,0)
 const equation=a=>logits.reduce((s,x)=>s+sigmoid(a+x),0)-target
 const r=bisect(equation,-80,80,{tolerance:1e-12,maxIterations:160})
 need(r.converged&&Math.abs(equation(r.root))<=1e-9,'Calibration root not established')
 return {offset:r.root,residual:Math.abs(equation(r.root))}
}
