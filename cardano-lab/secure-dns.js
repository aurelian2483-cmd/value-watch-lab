/* Cardano DNS validation and pinned lookup, research-only. */
'use strict';
const dns=require('node:dns').promises;
const net=require('node:net');
const policy=require('./network-policy.js');
async function resolvePinned(hostname, resolver=dns.lookup){
 if(typeof hostname!=='string'||!hostname||net.isIP(hostname))throw Error('DNS hostname required');
 const answers=await resolver(hostname,{all:true,verbatim:true});
 const safe=policy.validateAddresses(answers);
 const chosen=answers.find(x=>x.address===safe[0]);
 return Object.freeze({
  hostname,address:chosen.address,family:chosen.family,
  lookup(requested,opts,callback){
   if(requested!==hostname)return callback(Error('Unexpected DNS hostname'));
   if(opts&&opts.all)return callback(null,[{address:chosen.address,family:chosen.family}]);
   callback(null,chosen.address,chosen.family);
  }
 });
}
module.exports=Object.freeze({resolvePinned});
