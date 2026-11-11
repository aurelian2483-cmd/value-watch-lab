/* Cardano DNS validation and pinned lookup, research-only. */
'use strict';
const dns=require('node:dns').promises;
const net=require('node:net');
const policy=require('./network-policy.js');
async function resolvePinned(hostname, resolver=dns.lookup, timeoutMs=10000){
 if(typeof hostname!=='string'||!hostname||net.isIP(hostname))throw Error('DNS hostname required');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Invalid DNS timeout');
 let timer;
 const answers=await Promise.race([
  Promise.resolve().then(()=>resolver(hostname,{all:true,verbatim:true})),
  new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS resolution timed out')),timeoutMs)})
 ]).finally(()=>clearTimeout(timer));
 const safe=policy.validateAddresses(answers);
 const chosen=answers.find(x=>x.address===safe[0]);
 return Object.freeze({
  hostname,address:chosen.address,family:chosen.family,
  lookup(requested,opts,callback){
   if(requested!==hostname)return callback(Error('Unexpected DNS hostname'));
   if(opts&&opts.family&&opts.family!==chosen.family)return callback(Error('Pinned DNS address family mismatch'));
   if(opts&&opts.all)return callback(null,[{address:chosen.address,family:chosen.family}]);
   callback(null,chosen.address,chosen.family);
  }
 });
}
module.exports=Object.freeze({resolvePinned});
