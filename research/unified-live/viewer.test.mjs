import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,realpathSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {request} from 'node:http'
import {startViewer} from './viewer.mjs'
function call(port,path='/',method='GET',headers={}){
 return new Promise((ok,fail)=>{
  const req=request({host:'127.0.0.1',port,path,method,headers},res=>{
   let body='';res.setEncoding('utf8');res.on('data',x=>body+=x);res.on('end',()=>ok({code:res.statusCode,headers:res.headers,body}))
  });req.on('error',fail);req.end()
 })
}
test('viewer is loopback-only, no accepted evidence stays unknown, read-only routes',async t=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'live-viewer-')))
 const server=await startViewer(root,{port:0})
 t.after(async()=>{await new Promise(ok=>server.close(ok));rmSync(root,{recursive:true,force:true})})
 assert.equal(server.address().address,'127.0.0.1')
 const port=server.address().port
 const home=await call(port)
 assert.equal(home.code,200);assert.match(home.body,/NO_ACCEPTED_BATCH/);assert.match(home.body,/Measurement freshness: UNKNOWN/);assert.match(home.body,/PUBLICATION BLOCKED/)
 assert.equal(home.headers['cache-control'],'no-store')
 const s=JSON.parse((await call(port,'/status')).body)
 assert.equal(s.snapshot,null);assert.equal(s.executionAuthorized,false);assert.equal(s.publicationGate,'BLOCKED')
 assert.equal((await call(port,'/status','HEAD')).body,'')
 assert.equal((await call(port,'/status','POST')).code,405)
 assert.equal((await call(port,'/status','GET',{Host:'untrusted.example'})).code,403)
 assert.equal((await call(port,'/status','GET',{Origin:'https://untrusted.example'})).code,403)
 assert.equal((await call(port,'/status','GET',{'Sec-Fetch-Site':'cross-site'})).code,403)
 assert.equal((await call(port,'/unknown')).code,404)
})
