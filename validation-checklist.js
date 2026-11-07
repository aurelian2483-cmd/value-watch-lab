/* Transparent evidence checklist: no fabricated verified win rates. */
(function(){
'use strict';
const anchor=document.getElementById('sports-results-summary');if(!anchor)return;
const panel=document.createElement('section');panel.className='results-explainer';panel.setAttribute('aria-label','Prediction validation checklist');
const h=document.createElement('h2');h.textContent='Can we trust the prediction accuracy yet?';panel.append(h);
const intro=document.createElement('p');intro.textContent='Before we publish a win rate, every match must pass evidence checks. Here is the actual research status.';panel.append(intro);
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Checking research evidence…';panel.append(status);
const list=document.createElement('div');list.className='results-explainer-grid';panel.append(list);
const footer=document.createElement('p');footer.className='results-explainer-note';panel.append(footer);
anchor.parentNode.insertBefore(panel,anchor);
function item(label,value,detail){const a=document.createElement('article');const t=document.createElement('strong');t.textContent=label+' — '+value;const p=document.createElement('span');p.textContent=detail;a.append(t,p);list.append(a);}
async function update(){
try{
const [a,b]=await Promise.all([fetch('./football-expanded-data.json?audit='+Date.now(),{cache:'no-store'}),fetch('./research-history.json?audit='+Date.now(),{cache:'no-store'})]);if(!a.ok||!b.ok)throw Error('Data unavailable');
const [expanded,history]=await Promise.all([a.json(),b.json()]);list.replaceChildren();
const raw=Array.isArray(expanded.performance?.entries)?expanded.performance.entries:[];
const unique=new Map();for(const e of raw){if(!e||!e.league||!e.home||!e.away||!e.kickoff_utc)continue;const k=[e.league,e.home,e.away,e.kickoff_utc].join('|');if(!unique.has(k))unique.set(k,e);}
const matched=[...unique.values()].filter(e=>e.verification==='TWO_SOURCE_REGULATION_TIME_FINAL'&&e.record_sha256&&Number.isInteger(e.score_home)&&Number.isInteger(e.score_away));
const archived=Array.isArray(history.entries)?history.entries:[];
const attested=archived.filter(e=>e.timestamp_independently_attested===true&&e.challenge_eligible===1);
const verifiedOfficial=matched.filter(e=>e.challenge_eligible===1);
const pending=Array.isArray(expanded.performance?.pending)?expanded.performance.pending.length:0;
item('Recorded final scores',matched.length+' matched','Two-source result corroboration. This verifies score observations, not independent forecast timing.');
item('Still awaiting results',String(pending),'Future or unsettled archived fixtures; not counted as wins or losses.');
item('Independently attested archive records',String(attested.length),'Only records explicitly flagged with independent timestamp attestation and challenge eligibility are counted here.');
item('Officially eligible scored matches',String(verifiedOfficial.length),'A scored research observation does not automatically qualify as an official prediction.');
const generated=Date.parse(expanded.generated_at_utc);const fresh=Number.isFinite(generated)&&Date.now()-generated<=36*3600000&&generated<=Date.now()+300000;
status.textContent='Last football research update: '+(Number.isFinite(generated)?new Date(generated).toLocaleString('en-GB',{timeZone:'Europe/London'}):'unknown')+' UK · '+(fresh?'Snapshot within 36 hours':'Snapshot may be outdated');
footer.textContent='Verdict: '+(verifiedOfficial.length===0?'No independently qualified prediction accuracy can be claimed yet. ':'Some records carry eligibility flags, but a separate audit is still required before reporting accuracy. ')+'Models remain UNVALIDATED and betting publication BLOCKED. No ROI or betting value is established.';
}catch(e){list.replaceChildren();status.textContent='Validation evidence unavailable.';footer.textContent='Accuracy remains unverified. No substitute figures are shown.';}
}
update();document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
})();
