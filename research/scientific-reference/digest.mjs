// Canonical JSON metadata fingerprint, shared across all reference reports.
import {createHash} from 'node:crypto'
const canonical=x=>Array.isArray(x)?x.map(canonical):x!==null&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x
export const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex')
