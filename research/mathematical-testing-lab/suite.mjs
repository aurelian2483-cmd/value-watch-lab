// Fixed, general mathematical known-answer suite, with no external data or arbitrary input execution.
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {manifest} from '../mathematical-library/experiment-registry.mjs'
import {bisect,integratePolynomialRule,powerIteration} from './numerical.mjs'
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const cases=[
 {id:'sqrt-two',formulaId:'bisection',input:{function:'x^2-2',a:1,b:2,tolerance:1e-12,maxIterations:100},expected:Math.SQRT2,tolerance:1e-12,
  run:f=>{const r=bisect(x=>x*x-2,f.a,f.b,f);return {value:r.root,converged:r.converged,diagnostics:{iterations:r.iterations,bracketWidth:r.bracketWidth}}}},
 {id:'linear-integral',formulaId:'composite-trapezoid',input:{function:'2*x+1',a:0,b:3,n:32},expected:12,tolerance:1e-12,
  run:f=>({value:integratePolynomialRule(x=>2*x+1,f.a,f.b,f.n,'trapezoid'),converged:true,diagnostics:{subintervals:f.n}})},
 {id:'quadratic-trapezoid',formulaId:'composite-trapezoid',input:{function:'x^2',a:0,b:1,n:100},expected:1/3,tolerance:1.667e-5,
  run:f=>({value:integratePolynomialRule(x=>x*x,f.a,f.b,f.n,'trapezoid'),converged:true,diagnostics:{subintervals:f.n}})},
 {id:'cubic-simpson',formulaId:'composite-simpson',input:{function:'x^3',a:0,b:2,n:32},expected:4,tolerance:1e-12,
  run:f=>({value:integratePolynomialRule(x=>x*x*x,f.a,f.b,f.n,'simpson'),converged:true,diagnostics:{subintervals:f.n}})},
 {id:'negative-dominant-eigenvalue',formulaId:'power-iteration-eigenvector',input:{matrix:[[-5,0],[0,2]],start:[1,1],tolerance:1e-10,maxIterations:200},expected:-5,tolerance:1e-9,
  run:f=>{const r=powerIteration(f.matrix,f.start,f);return {value:r.eigenvalue,converged:r.converged,diagnostics:{residual:r.residual,iterations:r.iterations}}}}
]
export function evaluateKnownAnswer({expected,tolerance,value,converged}){
 if(!Number.isFinite(expected)||!Number.isFinite(tolerance)||tolerance<0)throw RangeError('Invalid benchmark criterion')
 const absoluteError=Number.isFinite(value)?Math.abs(value-expected):null
 return {absoluteError,status:converged===true&&absoluteError!==null&&Number.isFinite(absoluteError)&&absoluteError<=tolerance?'PASS':'FAIL'}
}
function caseSpec(c,codeRevision){
 const fixture={id:c.id,input:c.input,expected:c.expected,tolerance:c.tolerance}
 return {formulaId:c.formulaId,codeRevision,datasetHash:hash(fixture),configuration:{suite:'synthetic-math-v1',fixtureId:c.id,absoluteTolerance:c.tolerance},seed:0,primaryMetric:'absolute-error',partition:'development'}
}
export function suiteSpecifications(codeRevision){return cases.map(c=>caseSpec(c,codeRevision))}
export function runSuite(codeRevision){
 const results=cases.map(c=>{
  const identity=manifest(caseSpec(c,codeRevision))
  const base={id:c.id,formulaId:c.formulaId,experimentId:identity.experimentId,fixtureSha256:identity.datasetHash,expected:c.expected,tolerance:c.tolerance}
  try{
   const observed=c.run(c.input),verdict=evaluateKnownAnswer({...observed,expected:c.expected,tolerance:c.tolerance})
   return {...base,observed:observed.value,diagnostics:observed.diagnostics,converged:observed.converged,...verdict}
  }catch(e){return {...base,observed:null,diagnostics:null,converged:false,absoluteError:null,status:'FAIL',reason:e instanceof Error?e.message:'Unknown failure'}}
 })
 const report={kind:'SYNTHETIC_MATHEMATICAL_BENCHMARKS',schemaVersion:1,suite:'synthetic-math-v1',declaredCodeRevision:codeRevision,
  results,counts:{total:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length},
  researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,
  limitations:['Only fixed mathematical fixtures are executed. No sports data, predictive experiments, holdouts or real-data evaluation.',
   'Experiment IDs reuse the existing manifest identity function; no persistent experiment lifecycle is created by this runner.',
   'Revision is caller-declared. Synthetic correctness is not empirical qualification or a comprehensive algorithm proof.']}
 return {...report,reportSha256:hash(report)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3){console.error('Usage: node suite.mjs <declared-code-revision>');process.exitCode=2}
 else{try{const r=runSuite(process.argv[2]);console.log(JSON.stringify(r,null,2));if(r.counts.failed)process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
