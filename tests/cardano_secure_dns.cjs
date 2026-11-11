'use strict';
const assert=require('node:assert/strict');
const D=require('../cardano-lab/secure-dns.js');
(async()=>{
 const resolver=async(host,opts)=>{assert.equal(host,'example.org');assert.equal(opts.all,true);return [{address:'8.8.8.8',family:4},{address:'1.1.1.1',family:4}]};
 const pinned=await D.resolvePinned('example.org',resolver);
 assert.equal(pinned.address,'8.8.8.8');
 await new Promise((resolve,reject)=>pinned.lookup('example.org',{},(e,a,f)=>{if(e)return reject(e);assert.equal(a,'8.8.8.8');assert.equal(f,4);resolve()}));
 await new Promise(resolve=>pinned.lookup('unexpected.org',{},e=>{assert.match(e.message,/Unexpected/);resolve()}));
 await assert.rejects(()=>D.resolvePinned('example.org',async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]),/unsafe/);
 await assert.rejects(()=>D.resolvePinned('example.org',async()=>[]),/1..32/);
 await assert.rejects(()=>D.resolvePinned('example.org',()=>new Promise(()=>{}),10),/DNS resolution timed out/);
 await assert.rejects(()=>D.resolvePinned('example.org',resolver,0),/Invalid DNS timeout/);
 await new Promise(resolve=>pinned.lookup('example.org',{family:6},e=>{assert.match(e.message,/family mismatch/);resolve()}));
 await assert.rejects(()=>D.resolvePinned('127.0.0.1',resolver),/hostname/);
 console.log('PASS Cardano pinned DNS mock tests');
})().catch(e=>{console.error(e);process.exitCode=1});
