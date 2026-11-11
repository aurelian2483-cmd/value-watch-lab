/* Cardano conservative IPv4/IPv6 destination screening. Not a complete SSRF defence. */
'use strict';
const net=require('node:net');
function publicIPv4(s){
 if(net.isIP(s)!==4)return false;
 const o=s.split('.').map(Number),[a,b,c]=o;
 if(a===0||a===10||a===127||a>=224)return false;
 if(a===100&&b>=64&&b<=127)return false;
 if(a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168)return false;
 if(a===192&&b===0&&(c===0||c===2))return false; // 192.0.0.0/24 and TEST-NET-1
 if(a===198&&(b===18||b===19)||a===198&&b===51&&c===100||a===203&&b===0&&c===113)return false;
 if(a===192&&b===88&&c===99)return false;
 if(a===192&&b===31&&c===196||a===192&&b===52&&c===193||a===192&&b===175&&c===48)return false; // AS112 anycast special-purpose ranges
 if(a===192&&b===0&&c===0)return false;
 return true;
}
function publicAddress(s){
 const type=net.isIP(s);
 if(type===4)return publicIPv4(s);
 if(type!==6)return false;
 const lower=s.toLowerCase();
 if(lower.includes('.'))return false; // reject mapped/embedded IPv4 forms conservatively
 if(lower==='::'||lower==='::1')return false;
 const first=parseInt(lower.split(':')[0]||'0',16);
 // Only global-unicast 2000::/3; reject documentation 2001:db8::/32 and special-use 2001::/23.
 if(first<0x2000||first>0x3fff)return false;
 if(first===0x2001){const second=parseInt(lower.split(':')[1]||'0',16);if(second<0x0200||second===0x0db8)return false}
 return true;
}
function validateAddresses(addresses){
 if(!Array.isArray(addresses)||!addresses.length||addresses.length>32)throw Error('DNS must return 1..32 addresses');
 const seen=new Set();
 for(const item of addresses){
  if(!item||!publicAddress(item.address)||item.family!==net.isIP(item.address))throw Error('DNS returned unsafe or malformed destination');
  seen.add(item.address);
 }
 return [...seen];
}
module.exports=Object.freeze({publicAddress,validateAddresses});
