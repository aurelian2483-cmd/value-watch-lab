// One-shot fixed QA queue. Local workerd only. No production dispatch.
export const queueRoutes=new Map([
  ['/qa/queue/admit','operator'], ['/qa/queue/claim','hosted-qa'],
  ['/qa/queue/submit','hosted-qa'], ['/qa/queue/revoke','operator'],
  ['/qa/queue/status','observer']
]);
const jobs=[['probe','cpu-probe','CPU','QUEUED'],['local','local-qa','CPU','QUEUED'],['gpu','gpu-qa','GPU','BLOCKED_GPU']];
const flags={homePcRequired:false,gpuDispatchAuthorized:false,productionDispatchAuthorized:false,publicationGate:'BLOCKED',researchStatus:'UNVALIDATED'};
export function enabled(env) {
  return env.SKY_MODE==='LOCAL_PRESENCE_QA' && env.SKY_QUEUE_ENABLED==='true';
}
export function createQueue(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS queue_policy(
    id INTEGER PRIMARY KEY CHECK(id=1), policy TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('ADMITTED','MISSED')),
    last_clock INTEGER NOT NULL, revoked INTEGER NOT NULL CHECK(revoked IN (0,1))
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS qa_jobs(
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, backend TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('QUEUED','LEASED','QUARANTINED','RECEIPT_PENDING_REVIEW','BLOCKED_GPU')),
    worker TEXT, lease_hash TEXT, expires INTEGER, receipt_hash TEXT UNIQUE
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS qa_events(
    seq INTEGER PRIMARY KEY, job TEXT NOT NULL, action TEXT NOT NULL, at INTEGER NOT NULL
  )`);
}
export async function queueConfig(env,c,hash,toHex,fail) {
  if(!enabled(env))fail(404);
  const a=env.SKY_QUEUE_OPENS_AT,b=env.SKY_QUEUE_CLOSES_AT;
  if(typeof a!=='string'||typeof b!=='string'||!/^[0-9]{1,15}$/.test(a)||!/^[0-9]{1,15}$/.test(b))fail(503);
  const start=Number(a),end=Number(b);
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end-start>3600)fail(503);
  const plan={closesAt:end,opensAt:start,revision:c.revision,schema:1,scope:'FIXED_QA_ONLY'};
  const anchor=toHex(await hash(JSON.stringify(plan)));
  if(env.SKY_QUEUE_PLAN_SHA256!==anchor)fail(503);
  const lease=env.SKY_LOCAL_LEASE_SECONDS==='2'?2:240;
  return {start,end,anchor,lease,policy:toHex(await hash([c.revision,...c.digests,anchor,String(lease)].join('|')))};
}
export async function prepareQueue(route,payload,hash,toHex) {
  if(route==='/qa/queue/claim') {
    const token=toHex(crypto.getRandomValues(new Uint8Array(32)));
    return {token,tokenHash:toHex(await hash(token))};
  }
  if(route==='/qa/queue/submit')return {tokenHash:toHex(await hash(payload.lease))};
  return {};
}
export function queueOperation(sql,route,payload,prepared,c,q,now,fail) {
  const row=sql.exec('SELECT * FROM queue_policy WHERE id=1').toArray()[0];
  const event=(job,action)=>sql.exec('INSERT INTO qa_events(job,action,at) VALUES(?,?,?)',job,action,now);
  const summary=()=>({
    kind:'CLOUDFLARE_FIXED_QA_QUEUE',revision:c.revision,approvalSha256:q.anchor,
    state:sql.exec('SELECT state FROM queue_policy WHERE id=1').toArray()[0]?.state??'WAITING',
    workerRevoked:!!sql.exec('SELECT revoked FROM queue_policy WHERE id=1').toArray()[0]?.revoked,
    freshness:'STORED_STATE_ONLY',
    jobs:sql.exec('SELECT id,kind,backend,state,worker,expires,receipt_hash FROM qa_jobs ORDER BY rowid').toArray(),
    events:sql.exec('SELECT seq,job,action,at FROM qa_events ORDER BY seq').toArray(),...flags
  });
  if(row&&row.policy!==q.policy)fail(503);
  if(!Number.isSafeInteger(now)||now<0)fail(503);
  if(route==='/qa/queue/status')return summary();
  if(row&&now<row.last_clock)fail(503);
  if(route==='/qa/queue/admit') {
    if(row)return summary();
    if(now<q.start)return summary();
    const count=sql.exec('SELECT COUNT(*) AS n FROM qa_jobs').one().n;
    if(count!==0||sql.exec('SELECT COUNT(*) AS n FROM qa_events').one().n!==0)fail(503);
    const state=now>=q.end?'MISSED':'ADMITTED';
    sql.exec('INSERT INTO queue_policy VALUES(1,?,?,?,0)',q.policy,state,now);
    if(state==='ADMITTED')for(const [id,kind,backend,s] of jobs) {
      sql.exec('INSERT INTO qa_jobs(id,kind,backend,state) VALUES(?,?,?,?)',id,kind,backend,s);
      event(id,'ENQUEUED');
    }
    return summary();
  }
  if(!row||row.state!=='ADMITTED')fail(409);
  if(row.revoked&&route!=='/qa/queue/revoke')fail(403);
  sql.exec('UPDATE queue_policy SET last_clock=? WHERE id=1',now);
  for(const r of sql.exec("SELECT id FROM qa_jobs WHERE state='LEASED' AND expires<=?",now).toArray()) {
    sql.exec("UPDATE qa_jobs SET state='QUARANTINED',lease_hash=NULL WHERE id=?",r.id);
    event(r.id,'LEASE_EXPIRED');
  }
  if(route==='/qa/queue/revoke') {
    sql.exec('UPDATE queue_policy SET revoked=1 WHERE id=1');
    for(const r of sql.exec("SELECT id FROM qa_jobs WHERE state='LEASED'").toArray()) {
      sql.exec("UPDATE qa_jobs SET state='QUARANTINED',lease_hash=NULL WHERE id=?",r.id);
      event(r.id,'WORKER_REVOKED');
    }
    return summary();
  }
  if(route==='/qa/queue/claim') {
    if(sql.exec("SELECT id FROM qa_jobs WHERE state='LEASED' LIMIT 1").toArray().length)return null;
    const r=sql.exec("SELECT id,kind FROM qa_jobs WHERE state='QUEUED' AND backend='CPU' ORDER BY rowid LIMIT 1").toArray()[0];
    if(!r)return null;
    sql.exec("UPDATE qa_jobs SET state='LEASED',worker='hosted-qa',lease_hash=?,expires=? WHERE id=?",prepared.tokenHash,now+q.lease,r.id);
    event(r.id,'LEASED');
    return {id:r.id,kind:r.kind,revision:c.revision,token:prepared.token,expires:now+q.lease};
  }
  if(route==='/qa/queue/submit') {
    const r=sql.exec('SELECT * FROM qa_jobs WHERE id=?',payload.job).toArray()[0];
    if(!r||r.state!=='LEASED'||r.worker!=='hosted-qa'||r.lease_hash!==prepared.tokenHash)return false;
    if(sql.exec('SELECT id FROM qa_jobs WHERE receipt_hash=?',payload.receipt_hash).toArray().length)return false;
    sql.exec("UPDATE qa_jobs SET state='RECEIPT_PENDING_REVIEW',receipt_hash=?,lease_hash=NULL WHERE id=?",payload.receipt_hash,r.id);
    event(r.id,'UNVERIFIED_RECEIPT_RECORDED');
    return true;
  }
  fail(404);
}
