// Descriptive aggregate diagnostic only, not a forecast, selection or validation.
const sides=['home','draw','away']
const vector=a=>Array.isArray(a)&&a.length===3&&a.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1)&&Math.abs(a.reduce((s,x)=>s+x,0)-1)<=1e-8
export function distributionDistance(a,b){
 if(!vector(a)||!vector(b))throw new RangeError('Invalid probability distribution')
 return Math.min(1,a.reduce((s,p,i)=>s+Math.abs(p-b[i]),0)/2)
}
// Input is the output of the existing football market verifier, not arbitrary source rows.
export function summarizeDisagreement(matches,asOf){
 if(!Array.isArray(matches)||!Number.isFinite(asOf))throw new TypeError('Invalid diagnostic input')
 const bySource=new Map(),seen=new Set()
 let elapsedFixtures=0,eligibleFixtures=0,withheldFixtures=0
 for(const m of matches){
  if(!Number.isFinite(m.fixture?.start)||m.fixture.start>=asOf)continue
  elapsedFixtures++
  const model=m.model
  const p=sides.map(side=>model?.row?.['prob_'+side])
  if(model?.cutoffReason!==null||!vector(p)||!Number.isFinite(model.observed)||
     !Number.isFinite(m.fixture.marketCutoff)||model.observed>=m.fixture.marketCutoff){
   withheldFixtures++;continue
  }
  // At most one observation per source per fixture; ambiguous histories are withheld.
  const groups=new Map()
  for(const h of m.sourceHistories??[]){
   if(!groups.has(h.sourceId))groups.set(h.sourceId,[])
   groups.get(h.sourceId).push(h)
  }
  let used=false
  for(const [source,hs] of groups){
   if(!['SKY_BET','PINNACLE_VIA_GOLDEDGE'].includes(source)||hs.length!==1)continue
   const o=hs[0].latest
   const key=JSON.stringify([m.fixture.id,source])
   const q=sides.map(side=>o?.metrics?.proportionalNoVig?.[side])
   if(seen.has(key)||!vector(q)||!Number.isFinite(o?.observed)||!Number.isFinite(o?.snapshot)||
      o.observed<model.observed||o.observed>o.snapshot||o.snapshot>=m.fixture.marketCutoff||
      o.snapshot>asOf)continue
   seen.add(key);used=true
   const group=bySource.get(source)??{pairs:0,sum:0}
   group.pairs++;group.sum+=distributionDistance(p,q)
   bySource.set(source,group)
  }
  if(used)eligibleFixtures++;else withheldFixtures++
 }
 const summaries=Object.fromEntries([...bySource].map(([source,g])=>[source,{pairs:g.pairs,meanTotalVariation:g.sum/g.pairs}]))
 return {status:eligibleFixtures?'DESCRIPTIVE_ARCHIVE_ONLY':'NO_ALIGNED_ARCHIVE_PAIRS',
  elapsedFixtures,eligibleFixtures,withheldFixtures,bySource:summaries,
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,
  notice:'Elapsed kickoff is not proof of final settlement. Distances measure unsigned differences between distributions, not accuracy, calibration or value. Sources may overlap on fixtures.'}
}
