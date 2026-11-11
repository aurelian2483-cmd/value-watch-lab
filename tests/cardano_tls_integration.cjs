'use strict';
const assert=require('node:assert/strict');
const https=require('node:https');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cardano-tls-'));
 let server;
 try{
  const key=path.join(dir,'key.pem'),cert=path.join(dir,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',key,'-out',cert,'-subj','/CN=example.org','-addext','subjectAltName=DNS:example.org'],{stdio:'ignore'});
  server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(_req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end('tls-ok')});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const port=server.address().port;
  const lookup=(hostname,opts,callback)=>{assert.equal(hostname,'example.org');if(opts&&opts.all)return callback(null,[{address:'127.0.0.1',family:4}]);callback(null,'127.0.0.1',4)};
  const request=(hostname,ca)=>new Promise((resolve,reject)=>{
   const selectedLookup=hostname==='example.org'?lookup:(_host,opts,cb)=>opts&&opts.all?cb(null,[{address:'127.0.0.1',family:4}]):cb(null,'127.0.0.1',4);
   const req=https.get({hostname,port,path:'/',lookup:selectedLookup,servername:hostname,agent:false,rejectUnauthorized:true,ca,timeout:2000},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,body}))});
   req.on('error',reject);req.on('timeout',()=>req.destroy(Error('TLS test timeout')));
  });
  const ok=await request('example.org',fs.readFileSync(cert));
  assert.deepEqual(ok,{status:200,body:'tls-ok'});
  await assert.rejects(()=>request('example.org',undefined),/self-signed certificate|unable to verify/i);
  await assert.rejects(()=>request('different.example',fs.readFileSync(cert)),/hostname\/IP does not match|altname/i);
  console.log('PASS Cardano local TLS: trusted hostname, untrusted certificate, hostname mismatch');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
