import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderAlphaPreview } from './experiment-registry-alpha-preview.mjs'
import { alphaReadiness } from './experiment-registry-alpha-readiness.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
function setup(t){const d=mkdtempSync(join(tmpdir(),'vw-alpha-preview-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('static preview uses actual counts and never enables execution',t=>{
 const d=setup(t),r=alphaReadiness(root,d),html=renderAlphaPreview(root,d)
 assert.match(html,/UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED/)
 assert.ok(html.includes('<strong>'+r.evidence.historical.counts.input+'</strong>'))
 assert.ok(html.includes('<strong>'+r.evidence.prospective.counts.predictionInput+'</strong>'))
 for(const s of r.stages)assert.ok(html.includes(s.name))
 assert.match(html,/Genuine-edge probability: unavailable/)
 assert.match(html,/Research decision/)
 assert.ok(html.includes('INDEPENDENT_PROTOCOL_AND_POSTERIOR_VALIDATION_NOT_IMPLEMENTED'))
 assert.match(html,/SYNTHETIC_ACCOUNTING_COMPONENT/)
 assert.ok(r.falseEdgeChecks.every(c=>html.includes(c.blocker)))
 assert.doesNotMatch(html,/<script\b|<form\b|<iframe\b/i)
 assert.deepEqual(readdirSync(d),[])
})
test('missing sources are reported as unavailable rather than zero',t=>{
 const d=setup(t),html=renderAlphaPreview(d,join(d,'missing'))
 assert.match(html,/Inventory status: INCOMPLETE/)
 assert.equal((html.match(/<strong>Unavailable<\/strong>/g)||[]).length,6)
 assert.match(html,/Genuine-edge probability: unavailable/)
})
