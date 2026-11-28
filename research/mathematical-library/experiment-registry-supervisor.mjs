// Operational readiness only. No automatic repair, execution or validation.
import { monitor } from './experiment-registry-monitor.mjs'
import { restoreCheckpoint } from './experiment-registry-checkpoint.mjs'
export function supervise(directory) {
 const snapshot=monitor(directory)
 const incidents=[]
 if(!snapshot.available) incidents.push({code:'STORE_UNAVAILABLE',severity:'BLOCK'})
 for(const error of snapshot.errors) incidents.push({...error,severity:'BLOCK'})
 for(const record of snapshot.records){
   if(record.status==='RUNNING'){
     incidents.push({experimentId:record.experimentId,code:'RUNNING_OWNER_UNVERIFIED',severity:'REVIEW'})
   }
   if(['CHECKPOINTED','INTERRUPTED'].includes(record.status)){
     try{
       const saved=restoreCheckpoint(directory,record.experimentId)
       if(!saved) incidents.push({experimentId:record.experimentId,code:'NO_CHECKPOINT',severity:'REVIEW'})
     }catch{
       incidents.push({experimentId:record.experimentId,code:'CHECKPOINT_UNAVAILABLE_OR_INVALID',severity:'BLOCK'})
     }
   }
 }
 return {researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,
   status:incidents.some(i=>i.severity==='BLOCK')?'BLOCKED':incidents.length?'REVIEW_REQUIRED':'NO_DETECTED_INCIDENTS',
   incidents,snapshot}
}
