import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {alphaMarket} from './experiment-registry-alpha-market.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
test('existing market inventory preserves source bytes and gates',()=>{
 const path=join(root,'paper-lab/hybrid-market-data.json')
 const before=readFileSync(path)
 const r=alphaMarket(root)
 assert.equal(r.available,true)
 assert.equal(r.counts.archiveRows,JSON.parse(before).records.length)
 assert.equal(r.counts.observations,Object.values(r.sourceCounts).reduce((a,b)=>a+b,0))
 assert.equal(r.sources.length,3)
 assert.equal(r.disagreement.eligibleFixtures+r.disagreement.withheldFixtures,r.disagreement.elapsedFixtures)
 assert.ok(r.disagreement.eligibleFixtures<=r.counts.matchedFixtures)
 assert.ok(Object.values(r.disagreement.bySource).every(x=>x.meanTotalVariation>=0&&x.meanTotalVariation<=1))
 assert.equal(r.disagreement.executionAuthorized,false)
 assert.equal(r.disagreement.publicationGate,'BLOCKED')
 assert.equal(r.publicationGate,'BLOCKED')
 assert.equal(r.executionAuthorized,false)
 assert.deepEqual(readFileSync(path),before)
})
test('unavailable and future sources do not become zero observations',t=>{
 const d=mkdtempSync(join(tmpdir(),'alpha-market-'))
 t.after(()=>rmSync(d,{recursive:true,force:true}))
 assert.equal(alphaMarket(d).counts,null)
 assert.equal(alphaMarket(d).reason,'SOURCE_MISSING')
 assert.equal(alphaMarket(root,0).available,false)
 assert.equal(alphaMarket(root,NaN).reason,'INVALID_AS_OF')
})
