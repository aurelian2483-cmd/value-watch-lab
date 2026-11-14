'use strict';
// Stage 7: retrospective historic lineup/availability importer. NOT prematch information.
const STATUS=new Set(['starting','sub_in','bench','injured','suspended','national_team','not_in_squad','not_at_club','not_included']);
const ACTIVE=new Set(['starting','sub_in','bench']);
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&Number.isFinite(Date.parse(x));
function normalizeHistoricalAvailability(doc,{competition='GB1'}={}){
 if(!doc||typeof doc!=='object'||Array.isArray(doc))throw Error('Document object required');
 const {club,tmId,season,scrapedAt}=doc;
 if(typeof club!=='string'||!club.trim()||!Number.isInteger(tmId)||tmId<=0||!/^\d{4}$/.test(String(season))||!date(scrapedAt))throw Error('Missing club identity or archive timestamp');
 if(!Array.isArray(doc.competitions))throw Error('Competitions array required');
 const matches=doc.competitions.filter(x=>x.code===competition);
 if(matches.length!==1)throw Error('Exactly one matching competition required');
 const players=matches[0].players;
 if(!Array.isArray(players))throw Error('Players required');
 const rounds=new Map(),ids=new Set(),errors=[];
 for(const p of players){
  if(!p||!Number.isInteger(p.tmId)||p.tmId<=0||typeof p.name!=='string'||!p.name.trim()||!Array.isArray(p.matches))throw Error('Invalid player record');
  if(ids.has(p.tmId))throw Error('Duplicate player ID within club competition');
  ids.add(p.tmId);
  const visited=new Set();
  for(const m of p.matches){
   if(!m||typeof m.round!=='string'||!/^\d{1,2}$/.test(m.round)||!STATUS.has(m.status)) {errors.push({player_id:p.tmId,round:m?.round||null,reason:'INVALID_MATCHDAY_OR_STATUS'});continue;}
   const round=Number(m.round);
   if(round<1||round>38){errors.push({player_id:p.tmId,round,reason:'OUT_OF_RANGE_ROUND'});continue;}
   if(visited.has(round)){errors.push({player_id:p.tmId,round,reason:'DUPLICATE_ROUND_STATUS'});continue;}
   visited.add(round);
   if(!rounds.has(round))rounds.set(round,[]);
   rounds.get(round).push({player_id:p.tmId,player_name:p.name,position:p.position||null,status:m.status,
    detail:typeof m.detail==='string'?m.detail:null});
  }
 }
 const roundSummaries=[...rounds.entries()].sort((a,b)=>a[0]-b[0]).map(([round,entries])=>{
  const starters=entries.filter(x=>x.status==='starting'),bench=entries.filter(x=>x.status==='bench'),subbed=entries.filter(x=>x.status==='sub_in');
  const contradictions=[];
  if(starters.length!==11)contradictions.push('STARTING_XI_COUNT_NOT_11');
  if(starters.length+bench.length+subbed.length>30)contradictions.push('MATCHDAY_SQUAD_COUNT_OUTLIER');
  return {round,record_count:entries.length,starters:starters.length,sub_in:subbed.length,bench:bench.length,
   injured:entries.filter(x=>x.status==='injured').length,suspended:entries.filter(x=>x.status==='suspended').length,
   squad_member_ids:entries.filter(x=>ACTIVE.has(x.status)).map(x=>x.player_id),
   starting_player_ids:starters.map(x=>x.player_id),issues:contradictions};
 });
 return {club,club_id:tmId,season:String(season),competition,source_scraped_at:scrapedAt,rounds:roundSummaries,
  errors,player_count:players.length,retrospective_data_only:true,prematch_known_at:null,
  eligible_for_historical_training:false,eligible_for_prematch_prediction:false,
  provenance:'THIRD_PARTY_RETROSPECTIVE_ARCHIVE',
  validation:'NOT_CROSS_VERIFIED',publication_gate:'BLOCKED',
  note:'Round is not a fixture identifier or publication time. Historical lineups are outcomes; no prior-match prediction feature is generated.'};
}
module.exports={normalizeHistoricalAvailability,STATUS};
