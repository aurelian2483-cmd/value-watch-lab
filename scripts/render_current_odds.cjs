'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const sources = require('../pro-sources');
const core = require('../football-match/core');

const slot = /<template id="vw-published-prices">[\s\S]*?<\/template>/g;
const escaped = value => String(value).replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const time = (label,ms) => {
 const iso = new Date(ms).toISOString();
 return '<p>'+label+' <time datetime="'+iso+'">'+iso+'</time></p>';
};

function renderCurrentOdds(html,snapshot,{dashboard,expanded,other},now){
 if([...html.matchAll(slot)].length!==1)throw Error('Missing or repeated price template.');
 const football=sources.footballEvidence([dashboard,expanded],null,core,now);
 const fixtures=sources.summarize([sources.inspect('football',dashboard,now,core),
  sources.inspect('other',other,now)],now).upcoming;
 const matches=sources.providerPrices(sources.currentOdds(snapshot,now),fixtures,football,now);
 const sections=[];
 for(const [fixture,[quote]] of matches){
  const key=sources.presentationKey(fixture,football,now);
  if(!key)continue;
  const expires=Math.min(fixture.startMs,quote.observed+30*60000);
  const prices=Object.entries(quote.prices).map(([side,price])=>
   '<li>'+side[0].toUpperCase()+side.slice(1)+' '+escaped(price.toFixed(2))+'</li>').join('');
  sections.push('<section data-fixture="'+escaped(key)+'" data-expires="'+expires+'">'+
   '<p><a href="https://the-odds-api.com/">Sky Bet via The Odds API</a> · '+escaped(quote.marketLabel)+'</p>'+
   time('Observed',quote.observed)+time('Checked',quote.captured)+time('Expires',expires)+
   '<ul>'+prices+'</ul><p>'+escaped(quote.comparisonReason)+'</p></section>');
 }
 return {html:html.replace(slot,()=>'<template id="vw-published-prices">'+sections.join('\n')+'</template>'),count:sections.length};
}

async function main(){
 const read=name=>fs.readFile(name,'utf8').then(JSON.parse);
 const [html,snapshot,dashboard,expanded,other]=await Promise.all([
  fs.readFile('index.html','utf8'),read('work/current-odds.json'),read('research-dashboard-data.json'),
  read('football-expanded-data.json'),read('other-sports-data.json')
 ]);
 const result=renderCurrentOdds(html,snapshot,{dashboard,expanded,other},Date.now());
 const output='work/public-price-preview/index.html';
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output+'.tmp',result.html);
 await fs.rename(output+'.tmp',output);
 console.log('Rendered matched fixture price sections: '+result.count);
}
if(require.main===module)main().catch(()=>{
 console.error('Price HTML build failed. No provider payload was logged.');
 process.exitCode=1;
});
module.exports={renderCurrentOdds};
