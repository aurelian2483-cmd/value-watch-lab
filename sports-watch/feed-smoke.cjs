/* Network smoke probe: prints only provider availability/schema, no invented fixtures. */
(async()=>{
 const day=new Date().toISOString().slice(0,10);
 const targets=[
  'https://sportscore.com/api/v1/fixtures/?sport=football&status=live&limit=100&date='+day,
  'https://sportscore.com/api/widget/matches/?sport=football&limit=50',
  'https://sportscore.com/api/v1/fixtures/?sport=football&status=upcoming&limit=100&date='+day
 ];
 for(const url of targets){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
   const json=await response.json();
   const payload=json?.data||json;
   const rows=payload?.fixtures||payload?.matches;
   const statuses=Array.isArray(rows)?Object.fromEntries([...new Set(rows.map(x=>String(x.status)))].map(status=>[status,rows.filter(x=>String(x.status)===status).length])):null;
   console.log(JSON.stringify({url,status:response.status,cors:response.headers.get('access-control-allow-origin'),array:Array.isArray(rows),count:Array.isArray(rows)?rows.length:null,statuses,topLevelKeys:Object.keys(json||{}).slice(0,12)}));
  }catch(error){console.log(JSON.stringify({url,error:String(error)}));}
 }
})().catch(error=>{console.error(String(error));process.exitCode=1;});
