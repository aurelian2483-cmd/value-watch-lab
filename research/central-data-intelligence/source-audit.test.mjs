import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync,readdirSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {auditSources,sourcePaths} from './source-audit.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
const rev='a'.repeat(40),index='research/bottleneck/inventory.json'
const hash=s=>createHash('sha256').update(s).digest('hex')
function setup(t){const d=mkdtempSync(join(tmpdir(),'source-audit-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
function put(d,p,s){mkdirSync(dirname(join(d,p)),{recursive:true});writeFileSync(join(d,p),s)}
test('checked-in archive and allowlisted sources are read only',()=>{
 const before=readFileSync(join(root,index))
 const r=auditSources(root)
 assert.equal(r.rows.length,9)
 assert.equal(r.archive.declaredEntries,Object.keys(JSON.parse(before).datasets).length)
 assert.equal(Object.values(r.counts).reduce((a,b)=>a+b,0),sourcePaths.length)
 assert.ok(r.rows.every(x=>sourcePaths.includes(x.path)))
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.deepEqual(readFileSync(join(root,index)),before)
})
test('matching, changed, invalid, not indexed and missing are separate states',t=>{
 const d=setup(t),[a,b,c,e]=sourcePaths
 for(const p of [a,b,c,e])put(d,p,'{}')
 put(d,index,JSON.stringify({input_revision:rev,datasets:{
  [a]:{path:a,sha256:hash('{}'),revision:rev},
  [b]:{path:b,sha256:hash('old'),revision:rev},
  [c]:{path:c,sha256:'bad',revision:rev},
  '../secret':{path:'../secret',sha256:hash('secret'),revision:rev}
 }}))
 const r=auditSources(d)
 assert.deepEqual(r.rows.slice(0,5).map(x=>x.comparison),['MATCHES_ARCHIVED_BYTES','DIFFERS_FROM_ARCHIVED_BYTES','ARCHIVE_RECEIPT_INVALID','NOT_INDEXED','CURRENT_UNAVAILABLE'])
 assert.ok(!JSON.stringify(r).includes('../secret'))
 assert.equal(r.status,'INCOMPLETE')
})
test('missing index does not fabricate archived receipts; symlinks rejected',t=>{
 const d=setup(t)
 put(d,sourcePaths[0],'{}')
 mkdirSync(join(d,'darts'))
 symlinkSync(join(root,'darts/feed.json'),join(d,'darts/feed.json'))
 const r=auditSources(d)
 assert.equal(r.rows[0].comparison,'ARCHIVE_UNAVAILABLE')
 assert.equal(r.rows.find(x=>x.path==='darts/feed.json').status,'UNSAFE_PATH')
 assert.equal(r.archive.declaredEntries,null)
 assert.equal(r.validationAuthorized,false)
})

test('explicit null archive receipt is invalid, not absent',t=>{
 const d=setup(t),p=sourcePaths[0]
 put(d,p,'{}')
 put(d,index,JSON.stringify({input_revision:rev,datasets:{[p]:null}}))
 assert.equal(auditSources(d).rows[0].comparison,'ARCHIVE_RECEIPT_INVALID')
})
