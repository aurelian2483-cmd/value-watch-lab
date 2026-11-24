import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {controlCentre,renderControlCentre} from './experiment-registry-control-centre.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
function setup(t){const d=mkdtempSync(join(tmpdir(),'vw-control-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('consolidated report preserves separate evidence tiers and existing gates',t=>{
 const d=setup(t),path=join(root,'research/bottleneck/inventory.json'),before=readFileSync(path)
 const r=controlCentre(root,d)
 assert.deepEqual(r.systems.map(s=>s.id),['value-watch','bottleneck-lab','alpha-hunt'])
 assert.equal(r.systems[1].inventory.datasetEntries,Object.keys(JSON.parse(before).datasets).length)
 assert.equal(r.systems[2].stages.length,9)
 assert.equal(r.catalogue.remaining,Math.max(0,r.catalogue.readinessTarget-r.catalogue.registered))
 assert.equal(r.status,'RESEARCH_NOT_READY')
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.deepEqual(readFileSync(path),before)
 assert.deepEqual(readdirSync(d),[])
})
test('missing data remains unavailable and never activates research',t=>{
 const d=setup(t),r=controlCentre(d,join(d,'missing'))
 assert.equal(r.systems[0].historical,null)
 assert.equal(r.systems[0].prospective,null)
 assert.equal(r.systems[1].inventory.datasetEntries,null)
 assert.ok(r.blockers.includes('LOCAL_REGISTRY_UNAVAILABLE'))
 assert.equal(r.validationAuthorized,false)
 const html=renderControlCentre(d,join(d,'missing'))
 assert.match(html,/Research Control Centre/)
 assert.match(html,/Unavailable/)
 assert.doesNotMatch(html,/<script\b|<iframe\b|<form\b/i)
})
