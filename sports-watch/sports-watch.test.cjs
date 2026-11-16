/* Run: node --test sports-watch/sports-watch.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const {youtubeId,embedUrl,bySport,SPORTS,SOURCES} = require('./sports-watch.js');

test('accepts only supported HTTPS YouTube video URLs',()=>{
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'),'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtube.com/live/dQw4w9WgXcQ'),'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://m.youtube.com/shorts/dQw4w9WgXcQ'),'dQw4w9WgXcQ');
});
test('rejects spoofed, unencrypted, script and external streaming URLs',()=>{
  const invalid=['http://youtube.com/watch?v=dQw4w9WgXcQ','https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://livetv.sx/','https://example.com/stream.m3u8','https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ','https://www.youtube.com:444/watch?v=dQw4w9WgXcQ','https://www.youtube.com/watch?v=../../invalid','https://www.youtube.com/playlist?list=PL123'];
  invalid.forEach(value=>assert.equal(youtubeId(value),null,value));
  assert.equal(youtubeId(null),null);
});
test('constructs only privacy-enhanced embed origin',()=>{
  assert.equal(embedUrl('dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(embedUrl('../../etc/passwd'),null);
});
test('all sports categories map to trusted provider directory',()=>{
  assert.ok(SOURCES.length>=7);
  for(const sport of SPORTS) {
    const providers=bySport(sport);
    assert.ok(providers.length>0,sport);
    for(const source of providers) {
      const parsed=new URL(source.url);
      assert.equal(parsed.protocol,'https:');
      assert.ok(!parsed.username && !parsed.password);
    }
  }
  assert.deepEqual(bySport('unknown'),[]);
});