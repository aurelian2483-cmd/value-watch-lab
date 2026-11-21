/* Match-aware official coverage directory; these are category links, not event rights claims. */
(function(root){
 'use strict';
 const PROVIDERS=Object.freeze([
  {name:'BBC Sport',url:'https://www.bbc.com/sport',sports:['football','tennis','rugby','golf','racing','nfl','darts','cricket'],description:'Official BBC schedules and sports reporting'},
  {name:'BBC iPlayer',url:'https://www.bbc.co.uk/iplayer',sports:['football','tennis','rugby','golf','cricket'],description:'BBC programmes; event availability varies'},
  {name:'ITVX',url:'https://www.itv.com/',sports:['football','rugby','racing'],description:'ITV live and on-demand programming'},
  {name:'Sky Sports',url:'https://www.skysports.com/',sports:['football','tennis','nfl','darts','golf','racing','rugby','cricket','basketball'],description:'UK sports broadcasts and schedules; subscription may apply'},
  {name:'TNT Sports',url:'https://www.tntsports.co.uk/',sports:['football','rugby','tennis','golf','basketball','cricket'],description:'Official subscription sports listings'},
  {name:'Channel 4',url:'https://www.channel4.com/',sports:['football','racing'],description:'Channel 4 programmes and schedules'},
  {name:'Racing TV',url:'https://www.racingtv.com/',sports:['racing'],description:'Licensed racing coverage; subscription may apply'},
  {name:'NFL',url:'https://www.nfl.com/',sports:['nfl'],description:'League viewing information and highlights'},
  {name:'PDC',url:'https://www.pdc.tv/',sports:['darts'],description:'Official darts events and broadcast information'},
  {name:'ATP Tour',url:'https://www.atptour.com/',sports:['tennis'],description:'Tour videos, schedules and information'},
  {name:'World Rugby',url:'https://www.world.rugby/',sports:['rugby'],description:'Rugby competitions and coverage links'},
  {name:'DP World Tour',url:'https://www.europeantour.com/dpworld-tour/',sports:['golf'],description:'Official golf tournament videos and schedules'},
  {name:'NBA',url:'https://www.nba.com/',sports:['basketball'],description:'League coverage and video information'},
  {name:'FIBA',url:'https://www.fiba.basketball/',sports:['basketball'],description:'International basketball tournament coverage'},
  {name:'ICC',url:'https://www.icc-cricket.com/',sports:['cricket'],description:'International cricket schedules and broadcasts'},
  {name:'ECB',url:'https://www.ecb.co.uk/',sports:['cricket'],description:'England and Wales cricket coverage information'}
 ]);
 const SPORTS=Object.freeze(['all','football','racing','tennis','nfl','darts','rugby','golf','basketball','cricket']);
 function providersFor(sport){
   if(!SPORTS.includes(sport)||sport==='all')return [];
   return PROVIDERS.filter(provider=>provider.sports.includes(sport));
 }
 function permittedProvider(url){
   try{
     const u=new URL(url);
     return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&PROVIDERS.some(p=>p.url===u.href);
   }catch(_){return false;}
 }
 const api=Object.freeze({PROVIDERS,SPORTS,providersFor,permittedProvider});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(!root.document)return;
 const doc=root.document;
 const selected=doc.getElementById('coverage-selected');
 const sport=doc.getElementById('coverage-sport');
 const results=doc.getElementById('coverage-results');
 const matchForm=doc.getElementById('match-form');
 const matchInput=doc.getElementById('match-name');
 if(![selected,sport,results,matchForm,matchInput].every(Boolean))return;
 let match='';
 function render(){
   results.replaceChildren();
   if(!match){
     selected.textContent='Choose a match above to see relevant official broadcaster and league destinations.';
     return;
   }
   if(sport.value==='all'){
     selected.textContent='Selected: '+match+'. Choose its sport to see official coverage destinations. Match-specific broadcast rights have not been verified.';
     return;
   }
   const choices=providersFor(sport.value);
   selected.textContent='Selected: '+match+' · '+sport.value.toUpperCase()+' · '+choices.length+' official destinations. Coverage for this event is not verified.';
   for(const provider of choices){
     if(!permittedProvider(provider.url))continue;
     const link=doc.createElement('a');
     link.href=provider.url;
     link.target='_blank';
     link.rel='noopener noreferrer';
     link.className='coverage-card';
     const name=doc.createElement('strong');
     name.textContent=provider.name;
     const detail=doc.createElement('span');
     detail.textContent=provider.description;
     const caption=doc.createElement('small');
     caption.textContent='Official destination · check event schedule ↗';
     link.append(name,detail,caption);
     results.append(link);
   }
 }
 function selectDirectorySport(){
   const selectedSport=doc.querySelector('#sports button[data-sport][aria-pressed="true"]');
   sport.value=selectedSport&&SPORTS.includes(selectedSport.dataset.sport)?selectedSport.dataset.sport:'all';
 }
 selectDirectorySport();
 matchForm.addEventListener('submit',()=>{
   match=matchInput.value.trim().slice(0,100);
   selectDirectorySport();
   render();
 });
 sport.addEventListener('change',render);
 render();
})(typeof globalThis!=='undefined'?globalThis:this);
