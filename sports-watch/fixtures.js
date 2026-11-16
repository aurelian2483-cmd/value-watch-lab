/* SportScore fixtures picker. Only publicly documented, attributed HTTPS JSON API.
   Match data never supplies video URLs and never affects betting grades. */
(function(root){
  'use strict';
  const API='https://sportscore.com';
  const SPORTS=Object.freeze(['football','tennis','basketball','cricket']);
  const MODES=Object.freeze(['live','upcoming','manual']);
  const MAX_AGE_MS=60000;

  function safeStatus(value){
    const s=String(value==null?'':value).trim().toLowerCase().replace(/[_-]/g,' ');
    if (['live','in progress','inprogress','playing','1st half','2nd half','half time','halftime','ht'].includes(s)) return 'live';
    if (['upcoming','scheduled','not started','notstarted','pre match','prematch'].includes(s)) return 'upcoming';
    return 'other';
  }
  function normalizeMatch(value,sport,mode){
    if (!value || typeof value!=='object' || Array.isArray(value)) return null;
    const home=String(value.home ?? value.home_team ?? '').trim().slice(0,100);
    const away=String(value.away ?? value.away_team ?? '').trim().slice(0,100);
    if (!home || !away) return null;
    const status=safeStatus(value.status);
    if (status!==mode) return null;
    const time=String(value.time ?? value.start_time ?? value.kickoff_utc ?? '').trim();
    const iso=Date.parse(time);
    const competition=typeof value.competition==='string'?value.competition.trim().slice(0,80):'';
    const score=(value.home_score!=null && value.away_score!=null)?String(value.home_score).slice(0,6)+' – '+String(value.away_score).slice(0,6):'';
    return {home,away,sport,status,time:Number.isFinite(iso)?new Date(iso).toISOString():null,competition,score};
  }
  function makeUrl(sport,mode,day){
    if (!SPORTS.includes(sport) || !['live','upcoming'].includes(mode)) return null;
    if (mode==='live') return API+'/api/widget/matches/?sport='+sport+'&limit=50';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day||'')) return null;
    return API+'/api/v1/fixtures/?sport='+sport+'&status=upcoming&limit=100&date='+day;
  }
  function listFromPayload(data){
    if (!data || typeof data!=='object') return null;
    if (Array.isArray(data.matches)) return data.matches;
    if (Array.isArray(data.fixtures)) return data.fixtures;
    if (Array.isArray(data.data)) return data.data;
    if (data.data && Array.isArray(data.data.matches)) return data.data.matches;
    if (data.data && Array.isArray(data.data.fixtures)) return data.data.fixtures;
    return null;
  }
  const api=Object.freeze({safeStatus,normalizeMatch,makeUrl,listFromPayload,SPORTS});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (!root.document) return;
  const doc=root.document;
  const el=id=>doc.getElementById(id);
  const statusEl=el('fixture-status'),results=el('fixture-results'),sportEl=el('fixture-sport'),refresh=el('fixture-refresh');
  const tabs=['live','upcoming','manual'].map(mode=>el('fixture-'+mode));
  const matchForm=el('match-form'),matchInput=el('match-name'),competitionInput=el('match-competition');
  if (![statusEl,results,sportEl,refresh,matchForm,matchInput,competitionInput,...tabs].every(Boolean)) return;

  let mode='live',generation=0;
  const cache=new Map();
  let controller=null;
  function setStatus(message){statusEl.textContent=message;}
  function showMode(){
    tabs.forEach((button,index)=>button.setAttribute('aria-pressed',String(MODES[index]===mode)));
    const manual=mode==='manual';
    sportEl.disabled=manual;
    refresh.disabled=manual;
    results.replaceChildren();
    if (manual){
      if (controller) controller.abort();
      ++generation;
      setStatus('Manual entry selected. Enter a match in Step 1 below; automatic fixtures are not required.');
      matchInput.focus();
      return;
    }
    loadFixtures();
  }
  function fmtTime(time){
    if (!time) return 'Time not supplied';
    return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London',timeZoneName:'short'}).format(new Date(time));
  }
  function dateUtc(days){
    const d=new Date(Date.now()+days*86400000);
    return d.toISOString().slice(0,10);
  }
  async function querySport(sport,kind,signal){
    const url=makeUrl(sport,kind,dateUtc(0));
    const allUrls=kind==='upcoming'?[url,makeUrl(sport,kind,dateUtc(1))]:[url];
    const responses=await Promise.all(allUrls.map(async target=>{
      const cached=cache.get(target);
      if (cached && Date.now()-cached.at<MAX_AGE_MS) return cached.value;
      const response=await root.fetch(target,{mode:'cors',credentials:'omit',cache:'no-store',signal});
      if (!response.ok) throw new Error('Sports data request failed ('+response.status+')');
      const json=await response.json();
      const rows=listFromPayload(json);
      if (!rows) throw new Error('Sports data format changed');
      cache.set(target,{at:Date.now(),value:rows});
      return rows;
    }));
    return responses.flat().map(row=>normalizeMatch(row,sport,kind)).filter(Boolean);
  }
  function render(items){
    results.replaceChildren();
    if (!items.length){
      setStatus('No '+(mode==='live'?'confirmed live':'upcoming')+' fixtures returned for the selected sport(s). This does not prove no matches exist elsewhere.');
      return;
    }
    const unique=new Set();
    let shown=0;
    for(const match of items){
      const key=[match.sport,match.home,match.away,match.time].join('|');
      if(unique.has(key))continue;
      unique.add(key);
      const item=doc.createElement('button');
      item.type='button';
      item.className='fixture-card';
      item.dataset.fixtureIndex=String(shown);
      const title=doc.createElement('strong');
      title.textContent=match.home+' vs '+match.away;
      const meta=doc.createElement('span');
      meta.textContent=match.sport.toUpperCase()+' · '+(match.competition||'Competition unspecified')+' · '+(mode==='live'?'LIVE':'UPCOMING');
      const foot=doc.createElement('small');
      foot.textContent=(match.score?match.score+' · ':'')+fmtTime(match.time)+' · Select this match';
      item.append(title,meta,foot);
      item.addEventListener('click',()=>{
        matchInput.value=match.home+' vs '+match.away;
        competitionInput.value=match.competition||match.sport.toUpperCase();
        matchForm.requestSubmit();
        doc.dispatchEvent(new CustomEvent('sports-watch:fixture-selected',{detail:{sport:match.sport}}));
        statusEl.textContent='Selected '+match.home+' vs '+match.away+'. Add permitted video links in Step 2; broadcast availability is not verified.';
        doc.getElementById('match-workflow-title').scrollIntoView({behavior:'smooth',block:'start'});
      });
      results.append(item);
      shown++;
      if(shown>=80)break;
    }
    setStatus(shown+' '+(mode==='live'?'live':'upcoming')+' fixture(s) shown · source SportScore · timestamps displayed in UK time · refreshed '+new Date().toLocaleTimeString('en-GB')+'.');
  }
  async function loadFixtures(){
    if(mode==='manual')return;
    if(controller)controller.abort();
    controller=new AbortController();
    const current=++generation;
    const requestedMode=mode;
    const sports=sportEl.value==='all'?SPORTS.slice():[sportEl.value].filter(s=>SPORTS.includes(s));
    results.replaceChildren();
    setStatus('Checking '+(requestedMode==='live'?'live':'upcoming')+' match data…');
    refresh.disabled=true;
    const outcomes=await Promise.allSettled(sports.map(s=>querySport(s,requestedMode,controller.signal)));
    if(current!==generation)return;
    refresh.disabled=false;
    const good=outcomes.filter(o=>o.status==='fulfilled').flatMap(o=>o.value);
    const failures=outcomes.filter(o=>o.status==='rejected');
    const ordered=good.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    render(ordered);
    if(failures.length){
      const note=failures.length===outcomes.length?'Fixture data unavailable: network blocked, source offline or response changed. Try Refresh fixtures or enter a match manually.':'Partial coverage: '+failures.length+' sport feed(s) failed. ';
      if(failures.length===outcomes.length){results.replaceChildren();setStatus(note);}
      else setStatus(statusEl.textContent+' '+note);
    }
  }
  tabs.forEach((button,index)=>button.addEventListener('click',()=>{mode=MODES[index];showMode();}));
  sportEl.addEventListener('change',loadFixtures);
  refresh.addEventListener('click',()=>{cache.clear();loadFixtures();});
  showMode();
})(typeof globalThis!=='undefined'?globalThis:this);
