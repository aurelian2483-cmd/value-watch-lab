'use strict';
/* Loopback-only integration: test adapter maps validated public DNS to a local TLS fixture.
 * The adapter is test-only and must never be used for real capture. */
const assert=require('node:assert/strict');
const https=require('node:https'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const C=require('../cardano-lab/source-capture.js');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cardano-capture-tls-'));
 let server;
 try{
  const key=path.join(dir,'key.pem'),cert=path.join(dir,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',key,'-out',cert,'-subj','/CN=example.org','-addext','subjectAltName=DNS:example.org'],{stdio:'ignore'});
  let mode='ok';
  server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(_req,res)=>{
   if(mode==='redirect'){res.writeHead(302,{Location:'https://example.org/other'});return res.end()}
   if(mode==='empty'){res.writeHead(200);return res.end()}
   if(mode==='large'){res.writeHead(200);return res.end(Buffer.alloc(C.MAX_BYTES+1))}
   res.writeHead(200,{'Content-Type':'text/plain'});res.end('fixture-result');
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const port=server.address().port;
  const resolver=async()=>[{address:'8.8.8.8',family:4}];
  const adapter=(ca)=>({get(url,opts,cb){
   assert.equal(url.hostname,'example.org');
   assert.equal(opts.servername,'example.org');
   assert.equal(opts.rejectUnauthorized,true);
   opts.lookup('example.org',{},(err,address,family)=>{assert.ifError(err);assert.equal(address,'8.8.8.8');assert.equal(family,4)});
   return https.get({hostname:url.hostname,port,path:url.pathname,servername:opts.servername,lookup:(_host,lookupOpts,done)=>lookupOpts&&lookupOpts.all?done(null,[{address:'127.0.0.1',family:4}]):done(null,'127.0.0.1',4),agent:false,rejectUnauthorized:opts.rejectUnauthorized,ca,timeout:opts.timeout},cb);
  }});
  const capture=(transport)=>C.capture('https://example.org/result',{allowedHosts:['example.org'],resolver,transport});
  const trusted=adapter(fs.readFileSync(cert));
  const result=await capture(trusted);
  assert.equal(result.bytes.toString(),'fixture-result');
  assert.equal(result.receipt.publisher_authenticated,false);
  assert.equal(result.receipt.outcome_verified,false);
  assert.equal(result.receipt.publication_gate,'BLOCKED');
  await assert.rejects(()=>capture(adapter(undefined)),/self-signed certificate|unable to verify/i);
  mode='redirect';await assert.rejects(()=>capture(trusted),/redirects/);
  mode='empty';await assert.rejects(()=>capture(trusted),/Empty/);
  mode='large';await assert.rejects(()=>capture(trusted),/size limit/);
  console.log('PASS Cardano collector TLS fixture and response rejection tests (test-only adapter)');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
