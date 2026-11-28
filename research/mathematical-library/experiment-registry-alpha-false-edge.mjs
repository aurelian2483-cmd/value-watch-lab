// Readiness assessment, not an empirical false-edge test or model.
const definitions=Object.freeze([
 ['randomness','Independent paired observations and a prespecified uncertainty analysis'],
 ['overfitting','Frozen model specification, complete tuning history and untouched evaluation partition'],
 ['sample-size','Contract-matched observations and a prespecified power or precision requirement'],
 ['data-leakage','Point-in-time source receipts, training provenance and independent chronology audit'],
 ['bookmaker-margin','Complete market observations with matching market identity and settlement terms'],
 ['selection-bias','Complete sampling frame, inclusion rules and records of rejected cases'],
 ['market-drift','Comparable dated observations and a prespecified drift assessment'],
 ['multiple-testing','Complete experiment registry, including failed trials, and prespecified multiplicity control'],
 ['data-quality','Independent source verification, identity reconciliation and resolution of conflicts'],
 ['variable-correlation','Aligned feature observations, lineage and a dependency assessment']
])
const natural=n=>Number.isSafeInteger(n)&&n>=0?n:null
export function falseEdgeReadiness({historical=null,prospective=null,performance=null,market=null}={}){
 const context={
  historicalRejected:natural(historical?.counts?.rejected),
  historicalConflicting:natural(historical?.counts?.conflicting),
  predictionRejected:natural(prospective?.counts?.rejected),
  predictionDuplicateOrConflict:natural(prospective?.counts?.duplicateOrConflict),
  matchedPairs:performance?.available===true?natural(performance.matchedPairs):null,
  marketObservations:market?.available===true?natural(market.counts?.observations):null
 }
 const counts=Object.values(context)
 const integrityIssues=[context.historicalRejected,context.historicalConflicting,context.predictionRejected,context.predictionDuplicateOrConflict].some(n=>n!==null&&n>0)
 return {status:'UNCERTAIN',executionAuthorized:false,publicationGate:'BLOCKED',context,
  checks:definitions.map(([id,requirement])=>({
   id,status:'UNCERTAIN',evidence:null,requirement,
   blocker:id==='data-quality'&&integrityIssues?'STRUCTURAL_ISSUES_REQUIRE_REVIEW':
    ['randomness','sample-size'].includes(id)&&context.matchedPairs===0?'NO_CONTRACT_MATCHED_PAIRS':
    id==='bookmaker-margin'&&context.marketObservations===0?'NO_MATCHED_MARKET_OBSERVATIONS':
    'INDEPENDENT_TEST_EVIDENCE_REQUIRED'
  })),
  notice:'Inventory counts are diagnostic context only; they cannot clear any empirical investigation. Missing values remain null.'}
}
