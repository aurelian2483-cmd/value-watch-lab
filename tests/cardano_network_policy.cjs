'use strict';
const assert=require('node:assert/strict'),P=require('../cardano-lab/network-policy.js');
for(const ip of ['8.8.8.8','1.1.1.1','9.9.9.9','2606:4700:4700::1111'])assert.equal(P.publicAddress(ip),true,ip);
for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.2','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','192.0.2.1','198.51.100.1','203.0.113.1','198.18.0.1','::1','::','fc00::1','fe80::1','2001:db8::1','::ffff:127.0.0.1'])assert.equal(P.publicAddress(ip),false,ip);
assert.deepEqual(P.validateAddresses([{address:'8.8.8.8',family:4},{address:'8.8.8.8',family:4}]),['8.8.8.8']);
assert.throws(()=>P.validateAddresses([{address:'8.8.8.8',family:6}]),/unsafe/);
assert.throws(()=>P.validateAddresses([{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]),/unsafe/);
assert.throws(()=>P.validateAddresses([]),/1..32/);
console.log('PASS Cardano network destination screening and negative cases');
