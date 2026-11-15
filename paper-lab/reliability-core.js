'use strict';
(function(root){
  const competitions=['Premier League','Championship','La Liga','Bundesliga','Serie A','Champions League','Europa League'];
  const raw=s=>String(s||'').toLocaleLowerCase('en-GB').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\b(fc|cf|afc)\b/g,'').replace(/[^a-z0-9]/g,'');
  const alias={mancity:'manchestercity',manutd:'manchesterunited',manunited:'manchesterunited',spurs:'tottenhamhotspur',tottenham:'tottenhamhotspur',nottmforest:'nottinghamforest',newcastleunited:'newcastle',leedsunited:'leeds',wolverhampton:'wolverhamptonwanderers',wolves:'wolverhamptonwanderers',brightonhovealbion:'brighton',intermilan:'internazionale',inter:'internazionale',acmilan:'milan',bayernmunich:'bayernmunchen',atleticomadrid:'atlmadrid',atletimadrid:'atlmadrid'};
  const norm=s=>alias[raw(s)]||raw(s);
  function qualifyingEvidence(event, results) {
    if (!event || event.sport!=='football' || !competitions.includes(event.competition)) return {status:'OUTSIDE_SCOPE'};
    if (!Array.isArray(event.participants) || event.participants.length!==2 || !Number.isFinite(Date.parse(event.startUTC))) return {status:'MISSING_FIXTURE'};
    const [home,away]=event.participants.map(p=>norm(p.name));
    if(!home || !away || home===away) return {status:'MISSING_TEAMS'};
    const kickoff=Date.parse(event.startUTC);
    const relevant=(Array.isArray(results)?results:[]).filter(r=>r&&r.competition===event.competition &&
      Number.isFinite(Date.parse(r.kickoff_utc))&&Date.parse(r.kickoff_utc)<kickoff &&
      ['H','D','A'].includes(r.actual_outcome)&&r.home&&r.away)
      .sort((a,b)=>Date.parse(a.kickoff_utc)-Date.parse(b.kickoff_utc));
    const form=team=>relevant.filter(r=>norm(r.home)===team||norm(r.away)===team).slice(-5)
      .map(r=>r.actual_outcome==='D'?'D':(r.actual_outcome==='H'&&norm(r.home)===team)||(r.actual_outcome==='A'&&norm(r.away)===team)?'W':'L');
    const hf=form(home),af=form(away);
    if(hf.length<5||af.length<5)return {status:'INSUFFICIENT_HISTORY',homeMatches:hf.length,awayMatches:af.length};
    const hw=hf.filter(x=>x==='W').length,aw=af.filter(x=>x==='W').length;
    const side=hw>=4&&aw<=1?'HOME':aw>=4&&hw<=1?'AWAY':null;
    return side ? {status:'FORM_CANDIDATE',side,homeWins:hw,awayWins:aw,oddsStatus:'UNVERIFIED',valueStatus:'NOT_CALCULATED'} :
      {status:'PATTERN_FAILED',homeWins:hw,awayWins:aw};
  }
  const api=Object.freeze({qualifyingEvidence,competitions});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValueWatchReliability=api;
})(typeof globalThis!=='undefined'?globalThis:this);
