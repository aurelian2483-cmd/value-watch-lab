import { DurableObject } from 'cloudflare:workers';

const roles = ['operator','hosted-qa','observer','pc-qa'];
const roleKeys = ['SKY_OPERATOR_DIGEST','SKY_CPU_DIGEST','SKY_OBSERVER_DIGEST','SKY_PC_DIGEST'];
const routes = new Map([
  ['/qa/pc-cursor','pc-qa'], ['/qa/pc-heartbeat','pc-qa'],
  ['/qa/pc-status','observer'], ['/qa/operator/provision','operator'],
  ['/qa/operator/revoke','operator']
]);
const maxSequence = 2147483647;
const ttl = 120;
const hex = (x,n) => typeof x === 'string' && x.length === n && /^[0-9a-f]+$/.test(x);
const fail = (status=403) => { throw new Rejected(status); };
class Rejected extends Error { constructor(status) { super('request rejected'); this.status=status; } }
const json = (status,payload) => new Response(JSON.stringify(payload),{status,headers:{
  'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}});
const reject = e => json(e instanceof Rejected ? e.status : 503,{error:'request rejected'});
const hash = async s => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const toHex = bytes => Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const fromHex = s => Uint8Array.from(s.match(/../g),v=>parseInt(v,16));
function config(env) {
  if (!['PRESENCE_ONLY_QA','LOCAL_PRESENCE_QA'].includes(env.SKY_MODE)) fail(503);
  if (!hex(env.SKY_APPROVED_REVISION,40)) fail(503);
  const digests=roleKeys.map(k=>env[k]);
  if (digests.some(d=>!hex(d,64)) || new Set(digests).size!==4) fail(503);
  return {revision:env.SKY_APPROVED_REVISION,digests};
}
function checkOuter(req,env) {
  const u=new URL(req.url);
  if (env.SKY_MODE==='LOCAL_PRESENCE_QA') {
    if (u.protocol!=='http:' || u.hostname!=='127.0.0.1' || u.host!==env.SKY_APPROVED_HOST) fail();
  } else {
    if (u.protocol!=='https:' || u.host!==env.SKY_APPROVED_HOST ||
        !/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/.test(u.host)) fail();
  }
  if (u.search || !routes.has(u.pathname)) fail(404);
  if (req.method!=='POST') fail(405);
  if (req.headers.get('content-type')!=='application/json') fail(415);
  if (req.headers.has('transfer-encoding') || req.headers.has('expect')) fail(400);
  return u.pathname;
}
async function auth(req,c,role) {
  const match=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('authorization')||'');
  if (!match) fail();
  const actual=await hash(match[1]);
  if (!crypto.subtle.timingSafeEqual(actual,fromHex(c.digests[roles.indexOf(role)]))) fail();
}
async function readBody(req,route) {
  const length=req.headers.get('content-length');
  if (length!==null && (!/^[1-9][0-9]{0,3}$/.test(length) || Number(length)>1024)) fail(413);
  if (!req.body) fail(400);
  const reader=req.body.getReader();
  const chunks=[]; let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read();
      if(done) break;
      size+=value.length;
      if(size>1024) { await reader.cancel(); fail(413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if(length!==null && Number(length)!==size) fail(400);
  const bytes=new Uint8Array(size); let offset=0;
  for(const c of chunks) {bytes.set(c,offset);offset+=c.length;}
  let raw; try {raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail(400);}
  if(route!=='/qa/pc-heartbeat') {
    if(!/^\s*\{\s*\}\s*$/.test(raw)) fail();
    return {};
  }
  // Restricted wire grammar matches the accepted Python client. Duplicate keys,
  // unknown fields and noninteger representations are rejected before storage.
  const m=/^\s*\{\s*"sequence"\s*:\s*([1-9][0-9]{0,9})\s*,\s*"gpu"\s*:\s*"(UNKNOWN|AVAILABLE_REPORTED|UNAVAILABLE_REPORTED)"\s*\}\s*$/.exec(raw);
  if(!m || Number(m[1])>maxSequence) fail();
  return {sequence:Number(m[1]),gpu:m[2]};
}
export default {
  async fetch(req,env) {
    try {
      config(env);
      const route=checkOuter(req,env);
      // Authenticate and bound the input before any Durable Object request.
      await auth(req,config(env),routes.get(route));
      const body=await readBody(req,route);
      const stub=env.PRESENCE.get(env.PRESENCE.idFromName('sky-presence-v1'));
      return await stub.fetch('https://internal.invalid'+route,{
        method:'POST',headers:{'content-type':'application/json','authorization':req.headers.get('authorization')},
        body:JSON.stringify(body)
      });
    }catch(e){return reject(e);}
  }
};

export class SkyPresence extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);
    this.storage=ctx.storage;
    this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS presence(
      id INTEGER PRIMARY KEY CHECK(id=1), policy TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK(sequence BETWEEN 0 AND 2147483647),
      last_seen INTEGER, gpu TEXT NOT NULL CHECK(gpu IN ('UNKNOWN','AVAILABLE_REPORTED','UNAVAILABLE_REPORTED')),
      revoked INTEGER NOT NULL CHECK(revoked IN (0,1)), last_clock INTEGER NOT NULL
    )`);
  }
  async fetch(req) {
    try {
      const c=config(this.env),route=new URL(req.url).pathname,role=routes.get(route);
      if(!role || req.method!=='POST') fail(404);
      await auth(req,c,role);
      const payload=await readBody(req,route);
      const policy=toHex(await hash([c.revision,...c.digests].join('|')));
      const result=this.storage.transactionSync(()=>{
        const rows=this.sql.exec('SELECT * FROM presence WHERE id=1').toArray();
        const r=rows[0];
        const now=Math.floor(Date.now()/1000);
        if(!Number.isSafeInteger(now)||now<0) fail(503);
        if(route==='/qa/operator/provision') {
          if(this.env.SKY_PROVISION_ENABLED!=='true' || r) fail();
          this.sql.exec("INSERT INTO presence VALUES(1,?,0,NULL,'UNKNOWN',0,?)",policy,now);
          return {kind:'PC_PRESENCE_PROVISIONED',gpuDispatchAuthorized:false};
        }
        if(!r || r.policy!==policy) fail(503);
        if(!Number.isSafeInteger(r.sequence)||r.sequence<0||r.sequence>maxSequence||
           !Number.isSafeInteger(r.last_clock)||r.last_clock<0||
           (r.sequence===0 ? r.last_seen!==null||r.gpu!=='UNKNOWN' :
             !Number.isSafeInteger(r.last_seen)||r.last_seen<0||r.last_seen>r.last_clock)) fail(503);
        if(route==='/qa/pc-status') {
          const state=r.revoked?'REVOKED':now<r.last_clock?'CLOCK_ROLLBACK':r.last_seen===null?'NEVER_SEEN':
            now-r.last_seen>=ttl?'STALE':'REPORTED_RECENT';
          return {kind:'OPTIONAL_PC_PRESENCE_QA',worker:'pc-qa',revision:c.revision,state,lastSeen:r.last_seen,
            sequence:r.sequence,gpuReported:state==='REPORTED_RECENT'?r.gpu:'UNKNOWN',hardwareAttested:false,
            gpuDispatchAuthorized:false,productionDispatchAuthorized:false,publicationGate:'BLOCKED',researchStatus:'UNVALIDATED'};
        }
        if(now<r.last_clock) fail(503);
        if(route==='/qa/operator/revoke') {
          this.sql.exec('UPDATE presence SET revoked=1,last_clock=? WHERE id=1',now);
          return {kind:'PC_PRESENCE_REVOKED',gpuDispatchAuthorized:false};
        }
        if(r.revoked) fail();
        if(route==='/qa/pc-cursor') return {kind:'PC_HEARTBEAT_CURSOR',revision:c.revision,sequence:r.sequence,gpuDispatchAuthorized:false};
        if(route==='/qa/pc-heartbeat') {
          if(payload.sequence!==r.sequence+1 || (r.last_seen!==null&&now<=r.last_seen)) fail(409);
          this.sql.exec('UPDATE presence SET sequence=?,last_seen=?,gpu=?,last_clock=? WHERE id=1',
            payload.sequence,now,payload.gpu,now);
          return {sequence:payload.sequence,accepted:true,gpuDispatchAuthorized:false};
        }
        fail(404);
      });
      return json(200,{result});
    }catch(e){return reject(e);}
  }
}
