'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const outcome = ['HOME', 'DRAW', 'AWAY'];
  function parseForm(s) {
    const v = String(s || '').toUpperCase().replace(/[ ,;\-]/g, '');
    return /^[WDL]{5}$/.test(v) ? v.split('') : null;
  }
  function evaluate(home, away, odds) {
    if (!home || !away || odds.length !== 3 || odds.some(o => !Number.isFinite(o) || o <= 1)) return null;
    const winsH = home.filter(x => x === 'W').length, winsA = away.filter(x => x === 'W').length;
    const pattern = winsH >= 4 && winsA <= 1 ? 0 : winsA >= 4 && winsH <= 1 ? 2 : null;
    // Research-only smoothed five-result proxy, NOT the site's canonical frozen recent-form vector.
    const homeDraws = home.filter(x => x === 'D').length, awayDraws = away.filter(x => x === 'D').length;
    const raw = [winsH + (5 - winsA - awayDraws) + 2, homeDraws + awayDraws + 2, (5 - winsH - homeDraws) + winsA + 2];
    const total = raw.reduce((a,b) => a+b, 0);
    const form = raw.map(x => x/total);
    const imp = odds.map(x => 1/x), over = imp.reduce((a,b)=>a+b,0);
    const market = imp.map(x => x/over);
    const blend = market.map((x,i)=>(x+form[i])/2);
    const rank = probabilities => probabilities.map((p,i)=>({i,p,odds:odds[i],ev:p*odds[i]-1}))
      .filter(x=>x.odds<=5 && x.ev>=0.05).sort((a,b)=>b.ev-a.ev||a.i-b.i)[0]||null;
    // Challenger deliberately does not blend bookmaker probability into its own estimate.
    // Its probability is still an unvalidated proxy. Odds are used for the value gate only.
    const legacy = rank(blend), challenger = pattern===null ? null : rank(form);
    return {winsH,winsA,pattern,form,market,blend,legacy,challenger,
      challengerPass:!!challenger && challenger.i===pattern};
  }
  const pct = n => (100*n).toFixed(1)+'%';
  function show() {
    const home=parseForm($('homeForm').value),away=parseForm($('awayForm').value);
    const odds=['homeOdds','drawOdds','awayOdds'].map(x=>Number($(x).value));
    const data=evaluate(home,away,odds), output=$('output');
    if(!data){output.textContent='Enter five W/D/L results for each team and three valid decimal odds greater than 1.';return;}
    const pick = x => x ? outcome[x.i]+' · '+pct(x.p)+' model probability · '+pct(x.ev)+' estimated EV' : 'PASS';
    const pattern = data.pattern===null?'No strong favourite pattern':outcome[data.pattern]+' qualifies from the five-match pattern';
    const elements=[
      ['History check',pattern+' · Home wins '+data.winsH+'/5; away wins '+data.winsA+'/5'],
      ['50/50 benchmark',pick(data.legacy)],
      ['Independent historical-form challenger',data.pattern===null?'PASS: reliability rule failed':data.challengerPass?pick(data.challenger):'PASS: no matching value-qualified favourite'],
      ['Form-only probabilities',data.form.map((p,i)=>outcome[i]+' '+pct(p)).join(' | ')],
      ['Bookmaker probabilities (de-vigged)',data.market.map((p,i)=>outcome[i]+' '+pct(p)).join(' | ')]
    ];
    output.replaceChildren();
    for(const [heading,value] of elements){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=heading+': ';p.append(strong,document.createTextNode(value));output.append(p);}
  }
  $('run').addEventListener('click',show);
  $('reset').addEventListener('click',()=>{for(const id of ['homeForm','awayForm','homeOdds','drawOdds','awayOdds'])$(id).value='';$('competition').selectedIndex=0;$('output').textContent='No calculation yet.';});
})();
