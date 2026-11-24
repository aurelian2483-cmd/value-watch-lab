// Synthetic accounting fixture only. No sports inputs, stake sizing or transactions.
const idPattern=/^[a-z0-9][a-z0-9-]{0,127}$/
const integer=Number.isSafeInteger
const limit=1_000_000_000
export function virtualLedger({mode,initialUnits,entries}={}){
 if(mode!=='SYNTHETIC_ACCOUNTING_TEST')throw new Error('Only synthetic accounting tests are supported')
 if(!integer(initialUnits)||initialUnits<=0||initialUnits>limit)throw new RangeError('Invalid initial virtual balance')
 if(!Array.isArray(entries)||entries.length>250)throw new RangeError('Invalid synthetic entry count')
 const ids=new Set()
 let balance=initialUnits,peak=initialUnits,maxDrawdown=0,maxDrawdownFraction=0
 let lossRun=0,longestLossRun=0
 const history=[]
 for(let i=0;i<entries.length;i++){
  const row=entries[i]
  if(!row||typeof row.id!=='string'||!idPattern.test(row.id)||ids.has(row.id)||
     row.sequence!==i+1||!integer(row.deltaUnits)||Math.abs(row.deltaUnits)>limit)
   throw new TypeError('Invalid or duplicate synthetic accounting entry')
  const next=balance+row.deltaUnits
  if(!integer(next)||next<0||next>limit)throw new RangeError('Virtual balance outside permitted bounds')
  ids.add(row.id);balance=next;peak=Math.max(peak,balance)
  const drawdown=peak-balance
  maxDrawdown=Math.max(maxDrawdown,drawdown)
  maxDrawdownFraction=Math.max(maxDrawdownFraction,drawdown/peak)
  lossRun=row.deltaUnits<0?lossRun+1:0
  longestLossRun=Math.max(longestLossRun,lossRun)
  history.push({id:row.id,sequence:row.sequence,deltaUnits:row.deltaUnits,balance,drawdown})
 }
 return {kind:'SYNTHETIC_VIRTUAL_ACCOUNTING',initialUnits,finalUnits:balance,netUnits:balance-initialUnits,
  peakUnits:peak,maxDrawdownUnits:maxDrawdown,maxDrawdownFraction,longestLossRun,history,
  synthetic:true,researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,
  capitalAllocationAuthorized:false,
  limitations:['Entries are supplied fictional accounting changes, not simulated sports outcomes.',
   'No stakes, probabilities, odds, real-money transactions or capital recommendations are calculated.',
   'Accounting correctness does not establish predictive performance or financial advantage.']}
}
