'use strict';
// Independent venue-list comparison. Deliberately does not approve racecards or bets.
// Secondary provider may use shared upstream data: AGREEMENT is not certification.
const fs=require('node:fs'),crypto=require('node:crypto');
const SOURCE='https://racingontv.co.uk/?day=today';
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function clean(s){return String(s||'').toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]/g,'')}
function textFromHTML(html){return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&ndash;|&#8211;/gi,'–').replace(/&mdash;/gi,'—').replace(/&middot;|&#183;/gi,'·').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function extract(html,date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Bad date');
 const [year,m,d]=date.split('-').map(Number);
 const body=textFromHTML(html);
 const exactDate=new RegExp('\\b'+d+'\\s+'+MONTHS[m-1]+'\\s+'+year+'\\b','i');
 if(!exactDate.test(body))return {status:'DATE_UNVERIFIED',meetings:[],reason:'Secondary page does not confirm the exact requested UK date'};
 // Respect the source's selected date where it is available, rather than guessing "today".
 const selectedDate=html.match(/<input\b[^>]*\btype=["']date["'][^>]*\bvalue=["'](\d{4}-\d{2}-\d{2})["']/i);
 if(selectedDate&&selectedDate[1]!==date)return {status:'DATE_UNVERIFIED',meetings:[],reason:'Secondary date selector differs from requested date'};
 const headerTag=/<h2\b[^>]*>\s*All meetings today\s*<\/h2>/i.exec(html);
 if(!headerTag)return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Cannot locate the secondary all-meetings header'};
 const sectionEnd=html.indexOf('</section>',headerTag.index);
 if(sectionEnd<0)return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Unclosed meeting section'};
 const section=html.slice(headerTag.index,sectionEnd);
 const header=textFromHTML(section.slice(0,section.indexOf('</header>')<0?500:section.indexOf('</header>')));
 const totals=/(\d{1,3})\s+meetings?\s*[·•|]\s*(\d{1,4})\s+races?/i.exec(header);
 if(!totals)return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Secondary header meeting/race totals unavailable'};
 const expected=Number(totals[1]),totalRaces=Number(totals[2]);
 if(expected>40||expected<1||totalRaces>500)return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Implausible source totals'};
 // The real source renders each venue as a <li><button> row, with mobile and desktop fields.
 // Never concatenate the end of one row into the next racecourse name.
 const ul=/<ul\b[^>]*>([\s\S]*?)<\/ul>/i.exec(section);
 if(!ul)return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Secondary meeting list missing'};
 const rows=[...ul[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
 if(rows.length>40)return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Implausibly many meeting rows'};
 const meetings=[],seen=new Set(),failures=[];
 for(let i=0;i<rows.length;i++){
  const raw=rows[i][1];
  const nameMatch=/<span\b[^>]*class=["'][^"']*\bfont-bold\b[^"']*["'][^>]*>([^<]+)<\/span>/i.exec(raw);
  const countryMatch=/<span\b[^>]*class=["'][^"']*\bml-2\b[^"']*\btext-muted-foreground\b[^"']*["'][^>]*>\s*(UK|IRE)\s*<\/span>/i.exec(raw);
  const statusMatch=/<span\b[^>]*class=["'][^"']*\bml-2\b[^"']*\bhidden\b[^"']*["'][^>]*>\s*(Scheduled|Abandoned|Cancelled|Canceled)\s*<\/span>/i.exec(raw);
  // The mobile layout gives an explicit race count; desktop also duplicates this as a numeric span.
  const countMatch=/(\d{1,3})\s+races?\b/i.exec(textFromHTML(raw));
  const name=nameMatch?.[1]?.trim(),country=countryMatch?.[1],status=statusMatch?.[1],raceCount=Number(countMatch?.[1]);
  if(!name||!country||!status||!countMatch||!Number.isInteger(raceCount)||raceCount>40){
   failures.push({row:i+1,reason:'Missing structured venue, UK/IRE, status or race count'});continue;
  }
  const key=clean(name);
  if(!key||seen.has(key)){failures.push({row:i+1,reason:'Empty or duplicate venue'});continue}
  seen.add(key);
  meetings.push({name,country,races:raceCount,status:/abandoned|cancel/i.test(status)?'ABANDONED':'ACTIVE'});
 }
 const diagnostics={headerMeetings:expected,parsedMeetings:meetings.length,headerRaces:totalRaces,parsedRaces:meetings.reduce((n,x)=>n+x.races,0),parsedNames:meetings.map(x=>x.name).slice(0,25),rejectedRows:failures.slice(0,12)};
 if(failures.length||meetings.length!==expected||diagnostics.parsedRaces!==totalRaces)
  return {status:'SCHEMA_UNVERIFIED',meetings:[],reason:'Structured meeting rows or race counts do not reconcile with source header',diagnostics};
 return {status:'SOURCE_OBSERVED',meetings,expectedMeetings:expected,expectedRaces:totalRaces};
}

function reconcile(primary,secondary,observedAt){
 const date=primary?.race_date_uk;
 const receipt={url:SOURCE,observedAt,sha256:secondary.sha256||null,status:secondary.status,reason:secondary.reason||null,diagnostics:secondary.diagnostics||null};
 const listed=primary?.discovery_coverage?.included_meetings;
 if(typeof date!=='string'||!Array.isArray(listed)||!Array.isArray(primary.races)||primary.coverage_verified!==false)
  return {status:'PRIMARY_UNVERIFIED',receipt,missing:[],unexpected:[],raceCountMismatches:[],decision:'RETAIN_P2',reason:'Primary date, races or discovery provenance unavailable'};
 if(secondary.status!=='SOURCE_OBSERVED')return {status:'SECONDARY_UNAVAILABLE',receipt,missing:[],unexpected:[],raceCountMismatches:[],decision:'RETAIN_P2',reason:secondary.reason||'Secondary source not validated'};
 const normalized=new Map();
 for(const entry of listed){const key=clean(entry.racecourse);if(!key||normalized.has(key))return {status:'PRIMARY_UNVERIFIED',receipt,missing:[],unexpected:[],raceCountMismatches:[],decision:'RETAIN_P2',reason:'Invalid duplicate primary meeting'};normalized.set(key,entry)}
 const active=secondary.meetings.filter(x=>x.status==='ACTIVE'),cancelled=secondary.meetings.filter(x=>x.status==='ABANDONED');
 const missing=active.filter(x=>!normalized.has(clean(x.name))).map(x=>x.name);
 const unexpected=[...normalized.keys()].filter(k=>!active.some(x=>clean(x.name)===k)).map(k=>normalized.get(k).racecourse);
 const raceCountMismatches=active.filter(x=>normalized.has(clean(x.name))).filter(x=>{
   const p=normalized.get(clean(x.name));return p.source_race_count!==x.races;
 }).map(x=>({meeting:x.name,primary:normalized.get(clean(x.name)).source_race_count,secondary:x.races}));
 // Critical: never call secondary agreement proof of total global coverage.
 return {status:missing.length||unexpected.length||raceCountMismatches.length?'DISCREPANCY':'MEETING_LIST_MATCHED_NOT_CERTIFIED',receipt,missing,unexpected,raceCountMismatches,secondaryActive:active.length,secondaryAbandoned:cancelled.map(x=>x.name),decision:'RETAIN_P2',reason:'Secondary venue/race counts are a cross-check, not independent certification of declarations or worldwide source completeness'};
}
async function run(primaryPath,outputPath,fetchFn=globalThis.fetch,now=new Date()){
 const observedAt=now.toISOString();let secondary={status:'FETCH_FAILED',reason:'Unknown fetch error'};
 try{
  if(typeof fetchFn!=='function')throw Error('No HTTP transport available');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetchFn(SOURCE,{method:'GET',redirect:'error',headers:{'user-agent':'ValueWatchOps/1.0 (research coverage check)'},signal:controller.signal});
   if(!response.ok)throw Error('Secondary HTTP '+response.status);
   const contentType=response.headers?.get?.('content-type')||'';
   if(!/text\/html/i.test(contentType))throw Error('Unexpected secondary response type');
   const html=await response.text();if(html.length<100||html.length>2000000)throw Error('Invalid secondary HTML length');
   secondary=extract(html,new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now));
   secondary.sha256=crypto.createHash('sha256').update(html).digest('hex');
  }finally{clearTimeout(timer)}
 }catch(e){secondary={status:'FETCH_FAILED',reason:String(e.message||e).slice(0,180)}}
 let primary={};try{primary=JSON.parse(fs.readFileSync(primaryPath,'utf8'))}catch(e){primary={}}
 const ukDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const result=primary.race_date_uk!==ukDay?{status:'PRIMARY_DATE_MISMATCH',decision:'RETAIN_P2',reason:'Primary snapshot does not refer to current UK day',receipt:{url:SOURCE,observedAt,status:secondary.status,sha256:secondary.sha256||null},missing:[],unexpected:[],raceCountMismatches:[]}:reconcile(primary,secondary,observedAt);
 const final={schemaVersion:1,kind:'RACING_SECONDARY_MEETING_RECONCILIATION',raceDateUK:ukDay,primarySource:'Sporting Life',secondarySource:SOURCE,observedAtUTC:observedAt,primaryMeetings:primary?.discovery_coverage?.included_meetings?.length??null,sourceCheck:result,publicationGate:'BLOCKED',modelValidation:'UNVALIDATED',noModelChanges:true};
 fs.writeFileSync(outputPath,JSON.stringify(final,null,2)+'\n');return final;
}
if(require.main===module)run(process.argv[2]||'racing-research-data.json',process.argv[3]||'/tmp/ops-racing-secondary.json').then(x=>console.log(JSON.stringify({status:x.sourceCheck.status,decision:x.sourceCheck.decision,missing:x.sourceCheck.missing}))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={SOURCE,extract,reconcile,run,clean};
