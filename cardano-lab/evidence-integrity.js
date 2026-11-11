/* Offline byte-level evidence verification. Does not authenticate publishers. */
'use strict';
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/i;
const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
function verify(receipt,bytes){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||!validUrl(receipt.source_url)||!SHA.test(receipt.source_sha256||''))throw Error('Invalid evidence receipt');
 if(!Buffer.isBuffer(bytes)&&!(bytes instanceof Uint8Array))throw TypeError('Evidence must be supplied as raw bytes');
 if(bytes.length===0||bytes.length>10*1024*1024)throw Error('Evidence size outside 1 byte to 10 MiB');
 const actual=crypto.createHash('sha256').update(bytes).digest('hex');
 return {source_url:receipt.source_url,declared_sha256:receipt.source_sha256.toLowerCase(),computed_sha256:actual,hash_matches:actual===receipt.source_sha256.toLowerCase(),byte_length:bytes.length,verification_level:actual===receipt.source_sha256.toLowerCase()?'BYTES_MATCH_DECLARED_HASH':'HASH_MISMATCH',publisher_authenticated:false,source_fetched:false,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'};
}
module.exports=Object.freeze({verify});
