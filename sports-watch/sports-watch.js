/* Sports Watch: no arbitrary iframe domains, no automatic network requests, no external SDKs. */
(function (root) {
  'use strict';

  const SPORTS = Object.freeze(['all','football','racing','tennis','nfl','darts','rugby','golf']);
  const SOURCES = Object.freeze([
    { name:'BBC Sport', description:'Sports news, fixtures and broadcaster coverage', url:'https://www.bbc.com/sport', sports:['football','tennis','rugby','golf','racing','nfl','darts'] },
    { name:'BBC iPlayer', description:'BBC programming; live rights vary by event', url:'https://www.bbc.co.uk/iplayer', sports:['football','tennis','rugby','golf'] },
    { name:'ITVX', description:'ITV programmes and scheduled sport', url:'https://www.itv.com/', sports:['football','rugby','racing'] },
    { name:'Channel 4', description:'Official broadcaster and programmes', url:'https://www.channel4.com/', sports:['football','racing'] },
    { name:'Sky Sports', description:'Sports schedules and subscription coverage', url:'https://www.skysports.com/', sports:['football','racing','tennis','nfl','darts','rugby','golf'] },
    { name:'TNT Sports', description:'Official sports coverage and schedules', url:'https://www.tntsports.co.uk/', sports:['football','rugby','tennis','golf'] },
    { name:'NFL', description:'Official league video and coverage information', url:'https://www.nfl.com/', sports:['nfl'] },
    { name:'PDC', description:'Official darts news and broadcast information', url:'https://www.pdc.tv/', sports:['darts'] },
    { name:'ATP Tour', description:'Official tennis video and tour information', url:'https://www.atptour.com/', sports:['tennis'] },
    { name:'Racing TV', description:'Official racing broadcaster (subscription may apply)', url:'https://www.racingtv.com/', sports:['racing'] },
    { name:'DP World Tour', description:'Official golf video and tournament information', url:'https://www.europeantour.com/dpworld-tour/', sports:['golf'] },
    { name:'World Rugby', description:'Official rugby tournament and video information', url:'https://www.world.rugby/', sports:['rugby'] }
  ]);

  function youtubeId(input) {
    if (typeof input !== 'string' || input.length > 1024) return null;
    let u;
    try { u = new URL(input.trim()); } catch (_) { return null; }
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const h = u.hostname.toLowerCase();
    if (!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(h)) return null;
    let id = null;
    if (h === 'youtu.be') {
      if (!/^\/[a-zA-Z0-9_-]{11}\/?$/.test(u.pathname)) return null;
      id = u.pathname.split('/')[1];
    } else if (u.pathname === '/watch') {
      id = u.searchParams.get('v');
    } else {
      const match = u.pathname.match(/^\/(?:live|embed|shorts)\/([a-zA-Z0-9_-]{11})\/?$/);
      if (match) id = match[1];
    }
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }
  function embedUrl(id) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
    return 'https://www.youtube-nocookie.com/embed/' + id;
  }
  function bySport(sport) {
    if (!SPORTS.includes(sport)) return [];
    return SOURCES.filter(source => sport === 'all' || source.sports.includes(sport));
  }
  const api = Object.freeze({youtubeId,embedUrl,bySport,SPORTS,SOURCES});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;

  const doc = root.document;
  const sportsEl = doc.getElementById('sports');
  const providersEl = doc.getElementById('providers');
  const sportCount = doc.getElementById('sport-count');
  const currentSport = doc.getElementById('current-sport');
  const emptyProviders = doc.getElementById('empty-providers');
  const form = doc.getElementById('video-form');
  const input = doc.getElementById('video-url');
  const frame = doc.getElementById('player');
  const empty = doc.getElementById('player-empty');
  const status = doc.getElementById('player-status');
  const stop = doc.getElementById('stop');
  const fullscreen = doc.getElementById('fullscreen');
  const ytLink = doc.getElementById('youtube-link');
  if (![sportsEl,providersEl,sportCount,currentSport,emptyProviders,form,input,frame,empty,status,stop,fullscreen,ytLink].every(Boolean)) return;

  function safeLink(url) {
    const a = doc.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'provider';
    return a;
  }
  function child(tag,text) {
    const e=doc.createElement(tag);
    e.textContent=text;
    return e;
  }
  function setSport(sport) {
    if (!SPORTS.includes(sport)) return;
    for (const button of sportsEl.querySelectorAll('button[data-sport]')) {
      button.setAttribute('aria-pressed',String(button.dataset.sport === sport));
    }
    const filtered=bySport(sport);
    providersEl.replaceChildren();
    for (const provider of filtered) {
      const link=safeLink(provider.url);
      link.append(child('strong',provider.name),child('span',provider.description),child('small','Open official provider ↗'));
      providersEl.append(link);
    }
    sportCount.textContent=filtered.length+' provider destinations';
    currentSport.textContent=sport==='all'?'all sports':sport === 'racing'?'horse racing':sport.toUpperCase();
    emptyProviders.hidden=filtered.length!==0;
  }
  sportsEl.addEventListener('click',ev=>{
    const target=ev.target.closest('button[data-sport]');
    if (target && sportsEl.contains(target)) setSport(target.dataset.sport);
  });
  function setStatus(message,isError) {
    status.textContent=message;
    status.classList.toggle('error',Boolean(isError));
  }
  let playerRequest = 0;
  let loadTimeout = null;
  function cancelLoadTimeout() {
    if (loadTimeout !== null) {
      clearTimeout(loadTimeout);
      loadTimeout = null;
    }
  }
  frame.addEventListener('load', () => {
    if (frame.hidden || !frame.getAttribute('src')) return;
    cancelLoadTimeout();
    setStatus('YouTube iframe responded. This does not guarantee video playback. If it is black or shows an error, use the Watch on YouTube link.', false);
  });
  frame.addEventListener('error', () => {
    if (frame.hidden) return;
    cancelLoadTimeout();
    setStatus('The video frame failed to load. Use Watch on YouTube for this video.', true);
  });
  function stopVideo() {
    ++playerRequest;
    cancelLoadTimeout();
    frame.removeAttribute('src');
    frame.hidden=true;
    empty.hidden=false;
    stop.disabled=true;
    fullscreen.disabled=true;
    ytLink.hidden=true;
    setStatus('Player stopped. No video is loaded.',false);
  }
  form.addEventListener('submit',ev=>{
    ev.preventDefault();
    const id=youtubeId(input.value);
    if (!id) {
      stopVideo();
      setStatus('Not permitted. Enter a standard HTTPS YouTube video URL, not an arbitrary streaming or advertising link.',true);
      return;
    }
    const safe=embedUrl(id);
    if (!safe) return;
    cancelLoadTimeout();
    const currentRequest = ++playerRequest;
    frame.src=safe;
    frame.hidden=false;
    empty.hidden=true;
    stop.disabled=false;
    fullscreen.disabled=false;
    ytLink.href='https://www.youtube.com/watch?v='+id;
    ytLink.hidden=false;
    setStatus('Requesting YouTube player… If the frame stays black, use the Watch on YouTube link.',false);
    loadTimeout = setTimeout(() => {
      if (currentRequest === playerRequest && !frame.hidden) {
        setStatus('No iframe load confirmation yet. YouTube may be blocked by extensions, network filtering or embedding permissions. Try Watch on YouTube.',true);
      }
    }, 12000);
  });
  stop.addEventListener('click',stopVideo);
  fullscreen.addEventListener('click',()=>{
    if (!frame.hidden && typeof frame.requestFullscreen==='function') {
      frame.requestFullscreen().catch(()=>setStatus('Fullscreen was blocked by the browser.',true));
    }
  });
  setSport('all');
})(typeof globalThis !== 'undefined' ? globalThis : this);
