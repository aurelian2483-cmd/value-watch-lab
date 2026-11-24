import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync,copyFileSync,mkdirSync,symlinkSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {buildManifest,verifyManifest,compareManifests} from './manifest.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
const revision='daafe0383664d0a339595a4c537043ceb40bd0e4'
const paths=['historical-reliability-data.json','prediction-ledger.json','results-feed.json','research/result-review-status.json']
function fixture(t,copy=false){
 const d=mkdtempSync(join(tmpdir(),'central-data-'))
 t.after(()=>rmSync(d,{recursive:true,force:true}))
 if(copy){mkdirSync(join(d,'research'));for(const p of paths)copyFileSync(join(root,p),join(d,p))}
 return d
}
test('repository inventories reconcile and yield deterministic read-only fingerprint',()=>{
 const before=paths.map(p=>readFileSync(join(root,p)))
 const m=buildManifest(root,revision)
 assert.equal(m.status,'INVENTORIES_RECONCILED')
 assert.ok(verifyManifest(m))
 assert.equal(m.manifestSha256,buildManifest(root,revision).manifestSha256)
 const h=m.historical.counts,p=m.prospective.counts
 assert.equal(h.input,h.accepted+h.duplicates+h.conflicting+h.rejected)
 assert.equal(p.predictionInput,p.structurallyAccepted+p.rejected+p.duplicateOrConflict)
 assert.equal(p.structurallyAccepted,p.matchedReview+p.unmatchedAccepted)
 assert.equal(m.validationAuthorized,false)
 assert.equal(m.sourceRevisionAuthenticated,false)
 assert.ok(m.gaps.includes('SOURCE_RIGHTS_NOT_ESTABLISHED'))
 assert.deepEqual(paths.map(p=>readFileSync(join(root,p))),before)
 assert.ok(!JSON.stringify(m).includes('probabilities'))
 assert.ok(!verifyManifest({...m,status:'VALIDATED'}))
 assert.ok(!verifyManifest({...m,executionAuthorized:true}))
 assert.throws(()=>buildManifest(root,'main'))
})
test('missing files remain unknown, not empty datasets',t=>{
 const d=fixture(t),m=buildManifest(d,revision)
 assert.equal(m.status,'INCOMPLETE')
 assert.equal(m.historical.counts,null)
 assert.equal(m.prospective.counts,null)
 assert.ok(m.sources.every(s=>s.status==='MISSING'&&s.sha256===null))
 assert.deepEqual(readdirSync(d),[])
 assert.ok(compareManifests(m,m).changes.every(c=>c.status==='UNAVAILABLE_FOR_COMPARISON'))
})
test('corrupt source isolated and changed bytes identified',t=>{
 const d=fixture(t,true),a=buildManifest(d,revision)
 writeFileSync(join(d,paths[0]),'{invalid')
 const b=buildManifest(d,revision)
 assert.equal(b.historical.status,'INVALID_OR_CHANGED_SOURCE')
 assert.equal(b.historical.counts,null)
 assert.equal(b.prospective.status,'STRUCTURALLY_RECONCILED')
 const c=compareManifests(a,b)
 assert.equal(c.changes[0].status,'CONTENT_CHANGED')
 assert.ok(c.changes.slice(1).every(x=>x.status==='UNCHANGED'))
 assert.throws(()=>compareManifests({...a,manifestSha256:'0'.repeat(64)},b))
})
test('symlink source is rejected instead of reading an outside file',t=>{
 const d=fixture(t)
 symlinkSync(join(root,paths[0]),join(d,paths[0]))
 const m=buildManifest(d,revision)
 assert.equal(m.sources[0].status,'UNSAFE_PATH')
 assert.equal(m.historical.counts,null)
})
