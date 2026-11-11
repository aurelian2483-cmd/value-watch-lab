'use strict';
(() => {
  const KEY='cardano-race-video-research-v1';
  const button=document.createElement('button');
  button.type='button';button.id='cardano-lab-toggle';button.textContent='🔬 Cardano Lab';
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','cardano-lab-panel');
  const panel=document.createElement('aside');
  panel.id='cardano-lab-panel';panel.hidden=true;panel.setAttribute('aria-label','Cardano scientific laboratory');
  const head=document.createElement('div');head.className='cardano-lab-head';
  const title=document.createElement('strong');title.textContent='🔬 Cardano Scientific Lab';
  const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Close Cardano laboratory');
  head.append(title,close);panel.append(head);
  function line(label,value){const row=document.createElement('div');row.className='cardano-lab-row';const a=document.createElement('strong');a.textContent=label;const b=document.createElement('small');b.textContent=value;row.append(a,b);panel.append(row);return b}
  line('Research execution','Not connected — no autonomous agents running');
  const observations=line('Race Video Scientist','Loading local records…');
  const runners=line('Performance Archivist','Loading local records…');
  line('Mathematical Scientist','Planned — no active experiment feed');
  line('Independent Sceptic','Planned — no active review process');
  const allocation=document.createElement('p');allocation.textContent='Research allocation: Applied 40% · Experimental 35% · Frontier 25%';panel.append(allocation);
  const links=document.createElement('div');links.className='cardano-lab-links';
  const race=document.createElement('a');race.href=new URL('race-video-lab/',document.querySelector('script[src*="cardano-lab-widget.js"]').src).href;race.textContent='Race Video prototype ↗';
  const actions=document.createElement('a');actions.href='https://github.com/aurelian2483-cmd/value-watch-lab/actions';actions.target='_blank';actions.rel='noopener noreferrer';actions.textContent='GitHub tests ↗';
  links.append(race,actions);panel.append(links);
  const disclaimer=document.createElement('p');disclaimer.className='cardano-lab-note';disclaimer.textContent='Development preview. Local counts are not live AI activity or validated predictions.';panel.append(disclaimer);
  function refresh(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'null');
      const records=value&&value.schema==='cardano-race-video-v1'&&Array.isArray(value.observations)?value.observations:[];
      observations.textContent=records.length+' local observations';
      runners.textContent=new Set(records.filter(x=>x&&typeof x.runner==='string').map(x=>x.runner.trim().toLowerCase()).filter(Boolean)).size+' runners recorded';
    }catch(e){observations.textContent='Local records unavailable';runners.textContent='Local records unavailable'}
  }
  function setOpen(open){panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open){refresh();close.focus()}else button.focus()}
  button.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>setOpen(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)setOpen(false)});
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)refresh()});
  document.body.append(button,panel);refresh();
})();
