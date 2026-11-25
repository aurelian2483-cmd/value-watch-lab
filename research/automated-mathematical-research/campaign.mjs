// Fixed, reproducible numerical campaign. General mathematics only; no research dispatch.
import {bisect,integratePolynomialRule,powerIteration} from '../mathematical-testing-lab/numerical.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
export const flags=Object.freeze({researchOnly:true,executionAuthorized:false,dispatchAuthorized:false,validationAuthorized:false,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED'})
const revision=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x)
const specs=[]
for(let i=0;i<64;i++){
 const k=i+1
 specs.push({id:'BIS-'+String(k).padStart(3,'0'),method:'bisection',input:{k,denominator:17,a:0,b:5,rootTolerance:1e-12,maxIterations:100},tolerance:1e-12})
}
for(let i=0;i<64;i++){
 const k=i+1
 specs.push({id:'TRAP-'+String(k).padStart(3,'0'),method:'composite-trapezoid',input:{a:0,b:1+i%4,n:16+2*(i%16),quadratic:i%9-4,linear:i%7-3,constant:i%5-2},tolerance:1e-10})
}
for(let i=0;i<64;i++){
 const k=i+1
 specs.push({id:'SIMP-'+String(k).padStart(3,'0'),method:'composite-simpson',input:{a:0,b:1+i%4,n:16+2*(i%16),cubic:i%11-5,quadratic:i%9-4,linear:i%7-3,constant:i%5-2},tolerance:1e-10})
}
for(let i=0;i<58;i++){
 const k=i+1
 specs.push({id:'POWER-'+String(k).padStart(3,'0'),method:'power-iteration-eigenvector',input:{dominant:(i%2===0?1:-1)*(5+i%13),secondary:(i%3===0?-1:1)*(1+i%3),start:[1,1],residualTolerance:1e-10,maxIterations:200},tolerance:1e-9})
}
export const specifications=()=>structuredClone(specs)
function evaluate(s){
 const p=s.input
 if(s.method==='bisection'){
  const target=p.k/p.denominator
  const r=bisect(x=>x*x-target*target,p.a,p.b,{tolerance:p.rootTolerance,maxIterations:p.maxIterations})
  return {value:r.root,expected:target,converged:r.converged,diagnostics:{iterations:r.iterations,bracketWidth:r.bracketWidth}}
 }
 if(s.method==='composite-trapezoid'||s.method==='composite-simpson'){
  const cubic=p.cubic??0,b=p.b
  const exact=cubic*b**4/4+p.quadratic*b**3/3+p.linear*b*b/2+p.constant*b
  // The exact discrete trapezoidal rule differs from the continuous integral for a quadratic.
  const expected=s.method==='composite-trapezoid'?exact+p.quadratic*b**3/(6*p.n*p.n):exact
  const value=integratePolynomialRule(x=>((cubic*x+p.quadratic)*x+p.linear)*x+p.constant,p.a,b,p.n,s.method==='composite-trapezoid'?'trapezoid':'simpson')
  return {value,expected,converged:true,diagnostics:{subintervals:p.n}}
 }
 const a=p.dominant,b=p.secondary
 const matrix=[[(9*a+16*b)/25,12*(a-b)/25],[12*(a-b)/25,(16*a+9*b)/25]]
 const r=powerIteration(matrix,p.start,{tolerance:p.residualTolerance,maxIterations:p.maxIterations})
 return {value:r.eigenvalue,expected:a,converged:r.converged,diagnostics:{iterations:r.iterations,residual:r.residual}}
}
export function runCampaign(codeRevision){
 if(!revision(codeRevision))throw Error('Full declared checkout revision required')
 const rows=specs.map(s=>{
  const base={id:s.id,method:s.method,input:structuredClone(s.input),fixtureSha256:digest(s),tolerance:s.tolerance,backend:'CPU_NODE'}
  try{
   const v=evaluate(s),error=Math.abs(v.value-v.expected)
   return {...base,...v,absoluteError:Number.isFinite(error)?error:null,status:v.converged&&Number.isFinite(error)&&error<=s.tolerance?'PASS':'FAIL'}
  }catch{return {...base,value:null,expected:null,converged:false,diagnostics:null,absoluteError:null,status:'FAIL'}}
 })
 const byMethod=Object.fromEntries([...new Set(specs.map(s=>s.method))].map(method=>{
  const subset=rows.filter(r=>r.method===method),passed=subset.filter(r=>r.status==='PASS').length
  return [method,{total:subset.length,passed,failed:subset.length-passed}]
 }))
 const passed=rows.filter(r=>r.status==='PASS').length
 const payload={kind:'FIXED_NUMERICAL_CAMPAIGN',schemaVersion:1,campaign:'numerical-known-answer-v1',declaredCodeRevision:codeRevision,rows,byMethod,counts:{total:rows.length,passed,failed:rows.length-passed,distinctMethods:4},...flags,limitations:['250 fixed synthetic cases across four existing methods, not 250 unique methods or empirical qualifications.','Trapezoid expected value is the discrete formula; continuous-integration bias is not erased.','Power iteration fixtures have a known dominant eigenpair and nonorthogonal start; this does not prove general convergence.','CPU only for these fixed scalar/2x2 cases; no GPU speedup or general scheduling policy established.']}
 return {...payload,campaignSha256:digest(payload)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==3)throw Error('Usage: node campaign.mjs <full-declared-revision>')
  const report=runCampaign(process.argv[2]);console.log(JSON.stringify(report,null,2));process.exitCode=report.counts.failed?1:0
 }catch(e){console.error(e.message);process.exitCode=2}
}
