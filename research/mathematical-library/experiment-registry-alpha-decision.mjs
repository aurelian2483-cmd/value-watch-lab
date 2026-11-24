// Gate for scientific review only. This module does not recommend selections or allocate money.
export function researchDecision({performance=null,market=null,falseEdge=null}={}){
 const blockers=[]
 if(performance?.available!==true) blockers.push('MATCHED_PERFORMANCE_REPORT_UNAVAILABLE')
 else if(!Number.isSafeInteger(performance.matchedPairs)||performance.matchedPairs<=0)
   blockers.push('NO_ESTABLISHED_PAIRED_SAMPLE')
 if(performance?.calibrationEstablished!==true) blockers.push('INDEPENDENT_CALIBRATION_NOT_ESTABLISHED')
 if(market?.disagreement?.status!=='DESCRIPTIVE_ARCHIVE_ONLY') blockers.push('ALIGNED_ARCHIVE_DIAGNOSTIC_UNAVAILABLE')
 if(falseEdge?.checks?.length!==10||falseEdge.checks.some(c=>c?.status!=='PASSED')) blockers.push('FALSE_EDGE_INVESTIGATIONS_UNCLEARED')
 // Current implementation cannot verify a fitted posterior, a protected evaluation
 // partition or approval of a real-data protocol. No caller-supplied flag bypasses this.
 blockers.push('INDEPENDENT_PROTOCOL_AND_POSTERIOR_VALIDATION_NOT_IMPLEMENTED')
 return {kind:'ALPHA_RESEARCH_DECISION',status:'BLOCKED',blockers,
   estimates:{outcomeProbability:null,genuineEdgeProbability:null,persistenceProbability:null},
   researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,
   validationAuthorized:false,capitalAllocationAuthorized:false,
   notice:'This is a readiness decision, not an empirical conclusion or a financial recommendation.'}
}
