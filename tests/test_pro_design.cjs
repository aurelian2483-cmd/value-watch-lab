'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const home=fs.readFileSync('index.html','utf8'),analyst=fs.readFileSync('analyst/index.html','utf8');
const homeJs=fs.readFileSync('pro-home.js','utf8'),analystJs=fs.readFileSync('analyst/app.js','utf8');
const css=fs.readFileSync('pro-design.css','utf8'),analystCss=fs.readFileSync('analyst/style.css','utf8');
new vm.Script(homeJs);new vm.Script(analystJs);
for(const id of ['events','slip-panel','slip-tabs','weekly-wildcard','search','generate','fresh-daily-slips-panel','stake','freeze','export','sport-nav']){
 assert(home.includes('id="'+id+'"'),'Existing functional control changed: '+id);
}
assert(home.includes('analyst/')&&home.includes('pro-landing')&&home.includes('data-pro-slot="4"'));
assert(home.includes('paper-lab/desk.js'),'Existing desk engine must be retained');
assert(home.includes('paper-lab/engine.js'),'Existing calculations must be retained');
assert(home.includes('paper-lab/store.js'),'Existing persisted slip format must be retained');
assert(home.includes('pro-home.js?v=1')&&home.includes('pro-design.css?v=1'));
assert(!home.includes('ROI +11.6%')&&!home.includes('+12.4%')&&!home.includes('Napoli vs Lazio'),'Reference image samples must not become production content');
for(const id of ['metric-events','analyst-events','filter-sport','filter-range','filter-evidence','source-status','sport-bars','sport-overview','takeaways','history-output','results-count']){
 assert(analyst.includes('id="'+id+'"'),'Missing interactive analyst component: '+id);
}
assert(analyst.includes('UNVALIDATED')&&analyst.includes('BLOCKED'));
assert(analyst.includes('Verified ROI</small><strong>Unavailable'));
assert(analyst.includes('Calibrated EV</small><strong>Unavailable'));
assert(analyst.includes('Sky Bet odds'));
assert(!analyst.includes('82%')&&!analyst.includes('Napoli vs Lazio')&&!analyst.includes('+6.9%'));
assert(!analystJs.includes('localStorage')&&!analystJs.includes('post('),'Analyst must never mutate user slips or external accounts');
for(const source of ['research-dashboard-data.json','racing-research-data.json','other-sports-data.json','research-history.json'])assert(analystJs.includes(source));
assert(analystJs.includes('research_only===true')&&analystJs.includes("publication_gate==='BLOCKED'"));
assert(css.includes('@media(max-width:760px)')&&analystCss.includes('@media(max-width:490px)'));
console.log('PASS: reference-based Pro homepage/Analyst layout, real-data safeguards, retained paper controls and responsive views');
