/* Cardano HTTPS source capture. Explicit allowlist, bounded response, no redirects. */
'use strict';
const https=require('node:https');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const MAX_BYTES=2*1024*1024;
const {resolvePinned}=require('./secure-dns.js');
function validateTarget(sourceUrl,allowedHosts){
 if(!Array.isArray(allowedHosts)||!allowedHosts.length||allowedHosts.some(h=>typeof h!=='string'||!/^[a-z0-9.-]+$/.test(h)))throw Error('Explicit valid hostname allowlist required');
 let url;try{url=new URL(sourceUrl)}catch{throw Error('Invalid source URL')}
 if(url.protocol!=='https:'||url.port&&url.port!=='443'||url.username||url.password||url.hash||!allowedHosts.includes(url.hostname.toLowerCase()))throw Error('Source URL outside approved HTTPS host policy');
 return url;
}
function capture(sourceUrl,options={}){
 const url=validateTarget(sourceUrl,options.allowedHosts);
 const timeoutMs=options.timeoutMs===undefined?10000:options.timeoutMs;
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)throw Error('Invalid timeout');
 const transport=options.transport||https;
 return resolvePinned(url.hostname,options.resolver).then(pinned=>new Promise((resolve,reject)=>{
  let settled=false,req;
  const fail=e=>{if(settled)return;settled=true;reject(e instanceof Error?e:new Error(String(e)))};
  try{
   req=transport.get(url,{timeout:timeoutMs,lookup:pinned.lookup,agent:false,rejectUnauthorized:true,servername:url.hostname,headers:{'Accept':'application/json, text/plain;q=0.9, text/html;q=0.8','Accept-Encoding':'identity','User-Agent':'CardanoResearchCapture/1.0'}},res=>{
    const status=res.statusCode;
    if(status!==200){res.resume();return fail(Error('HTTP status '+status+'; redirects are not followed'))}
    const chunks=[];let length=0;
    res.on('data',chunk=>{length+=chunk.length;if(length>MAX_BYTES){req.destroy();fail(Error('Evidence response exceeds size limit'))}else chunks.push(chunk)});
    res.on('error',fail);
    res.on('end',()=>{
     if(settled)return;
     if(!length)return fail(Error('Empty source response'));
     settled=true;
     const bytes=Buffer.concat(chunks);
     resolve({bytes,receipt:{source_url:url.toString(),source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),captured_at_utc:new Date().toISOString(),byte_length:bytes.length,http_status:status,verification_level:'HTTPS_RESPONSE_CAPTURED',publisher_authenticated:false,outcome_verified:false,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'}});
    });
   });
   req.on('timeout',()=>req.destroy(Error('Source capture timed out')));
   req.on('error',fail);
  }catch(e){fail(e)}
 }));
}
module.exports=Object.freeze({capture,validateTarget,MAX_BYTES});
