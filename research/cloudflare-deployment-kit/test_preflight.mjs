import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {runPreflight} from './preflight.mjs';

const ACCOUNT='a'.repeat(32);
const REV='c91abd1cd13f03fbf1d71b75c7173a0811b0ccc4';
const HOST='sky-research-controller.aurelian2483.workers.dev';
const digest=b=>createHash('sha256').update(b).digest('hex');
const encode=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
function packageFiles(overrides={}) {
  const config={name:'sky-research-controller',main:'worker.mjs',compatibility_date:'2026-11-01',
    workers_dev:true,preview_urls:false,observability:{enabled:false},
    durable_objects:{bindings:[{name:'PRESENCE',class_name:'SkyPresence'}]},
    migrations:[{tag:'v1',new_sqlite_classes:['SkyPresence']}],
    vars:{SKY_MODE:'DISABLED',SKY_PROVISION_ENABLED:'false',SKY_QUEUE_ENABLED:'false',
      SKY_APPROVED_HOST:HOST,SKY_APPROVED_REVISION:REV}};
  Object.assign(config,overrides.config??{});
  const data={
    'START-HERE.txt':Buffer.from('Disabled test package'),
    'preflight.mjs':Buffer.from('// preflight tool'),
    'queue.mjs':Buffer.from('export const queueRoutes = new Map();'),
    'worker.mjs':Buffer.from('export default { fetch(){ return new Response("Hello World!") } };'),
    'wrangler.json':encode(config)
  };
  const manifest={kind:'DISABLED_CLOUDFLARE_DEPLOYMENT_KIT',revision:REV,host:HOST,
    activationAuthorized:false,productionDispatchAuthorized:false,publicationGate:'BLOCKED',
    files:Object.entries(data).map(([path,b])=>({path,bytes:b.length,sha256:digest(b)}))};
  data['manifest.json']=encode(manifest);
  return data;
}
async function fixture(overrides={}) {
  const dir=await mkdtemp(join(tmpdir(),'sky-preflight-test-'));
  const files=packageFiles(overrides);
  for(const [name,bytes] of Object.entries(files))await writeFile(join(dir,name),bytes);
  return {dir,files};
}
function mockRunner({auth=true,deployments=1}={}) {
  const calls=[];
  const runner=(args,cwd)=>{
    calls.push({args:[...args],cwd});
    if(args[0]==='--version')return {status:0,stdout:'wrangler 4.165.0',stderr:''};
    if(args[0]==='whoami')return {status:auth&&args.includes(ACCOUNT)?0:1,stdout:'{}',stderr:''};
    if(args[0]==='deployments')return {status:0,stdout:JSON.stringify({deployments:Array.from({length:deployments},(_,i)=>({id:'deployment-'+i}))}),stderr:''};
    if(args[0]==='deploy') {
      assert.ok(args.includes('--dry-run'),'Deployment command must be dry-run only');
      assert.ok(!args.includes('--yes'),'Do not auto-confirm');
      mkdirSync(join(cwd,'preview'),{recursive:true});
      writeFileSync(join(cwd,'preview','worker.js'),'compiled disabled worker');
      return {status:0,stdout:'Total Upload: 1.00 KiB',stderr:''};
    }
    throw new Error('Unexpected Wrangler command');
  };
  return {runner,calls};
}
test('validates account, existing worker, Hello World and disabled Wrangler dry-run without deploying',async()=>{
  const f=await fixture(),{runner,calls}=mockRunner();
  let fetchCount=0;
  const fetchImpl=async url=>{fetchCount++;assert.equal(url,'https://'+HOST+'/');return {status:200,text:async()=>'Hello World!'};};
  try {
    const result=await runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner,fetchImpl});
    assert.equal(result.accountMembershipVerified,true);
    assert.equal(result.targetDeploymentCount,1);
    assert.equal(result.helloWorldConfirmed,true);
    assert.equal(result.dryRunPassed,true);
    assert.equal(result.liveDeploymentPerformed,false);
    assert.equal(result.provisioning,false);
    assert.equal(result.queue,false);
    assert.equal(fetchCount,1);
    assert.deepEqual(calls.map(x=>x.args[0]),['--version','whoami','deployments','deploy']);
    assert.ok(calls[1].args.includes(ACCOUNT));
    assert.ok(calls[2].args.includes('--name')&&calls[2].args.includes('sky-research-controller'));
    assert.ok(calls[3].args.includes('--dry-run'));
    assert.ok(calls.every(x=>!(x.args[0]==='deploy'&&!x.args.includes('--dry-run'))));
    const config=JSON.parse(await readFile(join(calls[2].cwd,'wrangler.json'),'utf8'));
    assert.equal(config.account_id,ACCOUNT);
    assert.equal(config.vars.SKY_MODE,'DISABLED');
    await assert.rejects(stat(calls[2].cwd));
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
test('stops before inspecting deployments if account authentication fails',async()=>{
  const f=await fixture(),{runner,calls}=mockRunner({auth:false});
  try {
    await assert.rejects(runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner,fetchImpl:async()=>{throw Error('must not fetch')}}),/authentication or account membership/);
    assert.deepEqual(calls.map(x=>x.args[0]),['--version','whoami']);
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
test('stops if the selected account cannot see the named Worker',async()=>{
  const f=await fixture(),{runner,calls}=mockRunner({deployments:0});
  try {
    await assert.rejects(runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner,fetchImpl:async()=>({status:200,text:async()=>'Hello World!'})}),/no inspectable deployment/);
    assert.deepEqual(calls.map(x=>x.args[0]),['--version','whoami','deployments']);
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
test('stops if public endpoint is not the disposable Hello World response',async()=>{
  const f=await fixture(),{runner,calls}=mockRunner();
  try {
    await assert.rejects(runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner,fetchImpl:async()=>({status:200,text:async()=>'different app'})}),/not the expected disposable/);
    assert.deepEqual(calls.map(x=>x.args[0]),['--version','whoami','deployments']);
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
test('rejects activation settings before invoking Wrangler',async()=>{
  const f=await fixture({config:{vars:{SKY_MODE:'PRESENCE_ONLY_QA',SKY_PROVISION_ENABLED:'true',SKY_QUEUE_ENABLED:'true',
    SKY_APPROVED_HOST:HOST,SKY_APPROVED_REVISION:REV}}});
  const {runner,calls}=mockRunner();
  try {
    await assert.rejects(runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner}),/Disabled environment policy/);
    assert.equal(calls.length,0);
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
test('rejects a tampered manifest',async()=>{
  const f=await fixture();
  await writeFile(join(f.dir,'worker.mjs'),'tampered');
  const {runner,calls}=mockRunner();
  try {
    await assert.rejects(runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner}),/Manifest digest mismatch/);
    assert.equal(calls.length,0);
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
test('rejects unexpected package members and invalid account identifiers',async()=>{
  const f=await fixture(),{runner,calls}=mockRunner();
  try {
    await writeFile(join(f.dir,'secret.txt'),'must not be packaged');
    await assert.rejects(runPreflight({accountId:ACCOUNT,packageDir:f.dir,run:runner}),/Package inventory mismatch/);
    assert.equal(calls.length,0);
    await assert.rejects(runPreflight({accountId:'not-an-id',packageDir:f.dir,run:runner}),/32 lowercase hexadecimal/);
  } finally {await rm(f.dir,{recursive:true,force:true});}
});
