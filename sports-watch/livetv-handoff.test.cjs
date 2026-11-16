const test=require('node:test');
const assert=require('node:assert/strict');
const {DIRECTORY,matchName,trustedDirectory}=require('./livetv-handoff.js');
test('external directory is a pinned HTTPS destination',()=>{
 assert.equal(DIRECTORY,'https://livetv.sx/enx/');
 assert.equal(trustedDirectory(DIRECTORY),true);
 for(const url of ['http://livetv.sx/enx/','https://livetv.sx.evil.test/enx/','https://livetv.sx/enx/?redirect=evil','javascript:alert(1)','https://user:pass@livetv.sx/enx/'])assert.equal(trustedDirectory(url),false,url);
});
test('match labels are text only with length and control-character limits',()=>{
 assert.equal(matchName('<script>alert(1)</script>'),'<script>alert(1)</script>');
 assert.equal(matchName(' Team A vs Team B '),'Team A vs Team B');
 assert.equal(matchName('x'.repeat(120)).length,100);
 assert.equal(matchName(undefined),'');
 assert.equal(matchName('Team\u0000 A'),'Team  A');
});
