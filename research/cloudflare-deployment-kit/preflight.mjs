import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, lstat, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKER='sky-research-controller';
const HOST='sky-research-controller.aurelian2483.workers.dev';
const REVISION='c91abd1cd13f03fbf1d71b75c7173a0811b0ccc4';
const WRANGLER='4.165.0';
const MEMBERS=['START-HERE.txt','preflight.mjs','queue.mjs','worker.mjs','wrangler.json'];
const fail=(message)=>{throw new Error(message)};
const sha=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const isHex=(v,n)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}'+'$').test(v);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

export function defaultRunner(args,cwd) {
  const commandArgs=['--yes','wrangler@'+WRANGLER,...args];
  const windows=process.platform==='win32';
  const executable=windows?(process.env.ComSpec||'cmd.exe'):'npx';
  if(windows&&commandArgs.some(a=>/[\s&|<>^()%!"']/u.test(String(a))))fail('Unsafe Windows command argument');
  const invocation=windows
    ? ['/d','/s','/c','npx.cmd '+commandArgs.join(' ')]
    : commandArgs;
  const r=spawnSync(executable,invocation,{
    cwd,encoding:'utf8',timeout:180000,windowsHide:true,shell:false,
    env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}
  });
  if(r.error)fail('Wrangler command could not start or timed out ('+(r.error.code??'unknown')+')');
  return {status:r.status,stdout:r.stdout??'',stderr:r.stderr??''};
}
function deploymentCount(value) {
  if(Array.isArray(value))return value.length;
  if(value&&typeof value==='object') {
    for(const key of ['deployments','result','items']) {
      const candidate=value[key];
      if(Array.isArray(candidate))return candidate.length;
      if(candidate&&typeof candidate==='object') {
        for(const nested of ['deployments','items'])if(Array.isArray(candidate[nested]))return candidate[nested].length;
      }
    }
  }
  return 0;
}
async function verifyPackage(dir,accountId) {
  const expected=new Set([...MEMBERS,'manifest.json']);
  const allowed=new Set([...expected,'wrangler.account.json']);
  const names=await readdir(dir);
  if(names.length<expected.size||names.length>expected.size+1||names.some(n=>!allowed.has(n)))fail('Package inventory mismatch');
  const files={};
  for(const name of expected) {
    const path=join(dir,name),info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1)fail('Package member is not a standalone regular file');
    if(info.size<1||info.size>65536)fail('Package member size is invalid');
    files[name]=await readFile(path);
  }
  const manifest=JSON.parse(files['manifest.json'].toString('utf8'));
  if(Object.keys(manifest).sort().join('|')!=='activationAuthorized|files|host|kind|productionDispatchAuthorized|publicationGate|revision')fail('Manifest schema mismatch');
  if(manifest.kind!=='DISABLED_CLOUDFLARE_DEPLOYMENT_KIT'||manifest.revision!==REVISION||manifest.host!==HOST||
     manifest.activationAuthorized!==false||manifest.productionDispatchAuthorized!==false||manifest.publicationGate!=='BLOCKED')fail('Manifest safety policy mismatch');
  if(!Array.isArray(manifest.files)||manifest.files.length!==MEMBERS.length)fail('Manifest file list mismatch');
  const listed=new Set();
  for(const item of manifest.files) {
    if(!item||Object.keys(item).sort().join('|')!=='bytes|path|sha256'||!MEMBERS.includes(item.path)||listed.has(item.path))fail('Manifest member invalid');
    listed.add(item.path);
    const bytes=files[item.path];
    if(item.bytes!==bytes.length||item.sha256!==sha(bytes))fail('Manifest digest mismatch');
  }
  if(listed.size!==MEMBERS.length)fail('Manifest incomplete');
  const config=JSON.parse(files['wrangler.json'].toString('utf8'));
  if(config.name!==WORKER||config.main!=='worker.mjs'||config.compatibility_date!=='2026-11-01'||
     config.workers_dev!==true||config.preview_urls!==false||config.account_id!==undefined||
     config.observability?.enabled!==false)fail('Worker target configuration mismatch');
  if(!same(config.durable_objects?.bindings,[{name:'PRESENCE',class_name:'SkyPresence'}])||
     !same(config.migrations,[{tag:'v1',new_sqlite_classes:['SkyPresence']}]))fail('Durable Object migration mismatch');
  const vars=config.vars??{};
  if(Object.keys(vars).sort().join('|')!=='SKY_APPROVED_HOST|SKY_APPROVED_REVISION|SKY_MODE|SKY_PROVISION_ENABLED|SKY_QUEUE_ENABLED'||
     vars.SKY_MODE!=='DISABLED'||vars.SKY_PROVISION_ENABLED!=='false'||vars.SKY_QUEUE_ENABLED!=='false'||
     vars.SKY_APPROVED_HOST!==HOST||vars.SKY_APPROVED_REVISION!==REVISION)fail('Disabled environment policy mismatch');
  const hasAccountConfig=names.includes('wrangler.account.json');
  if(hasAccountConfig) {
    const path=join(dir,'wrangler.account.json'),info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>65536)fail('Local account config is not a regular file');
    let saved;try{saved=JSON.parse(await readFile(path,'utf8'));}catch{fail('Local account config is invalid');}
    if(JSON.stringify(saved)!==JSON.stringify({...config,account_id:accountId}))fail('Local account config is bound to a different account or policy');
  }
  return {files,config,hasAccountConfig};
}

export async function runPreflight({accountId,packageDir=process.cwd(),run=defaultRunner,fetchImpl=fetch}={}) {
  if(!isHex(accountId,32))fail('Expected Cloudflare account ID must be 32 lowercase hexadecimal characters');
  const dir=resolve(packageDir);
  const {files,config,hasAccountConfig}=await verifyPackage(dir,accountId);
  const version=run(['--version'],dir);
  if(version.status!==0||!version.stdout.includes(WRANGLER))fail('Required Wrangler version is not available');
  const identity=run(['whoami','--account',accountId,'--json'],dir);
  if(identity.status!==0)fail('Cloudflare authentication or account membership could not be verified');
  const scratch=await mkdtemp(join(tmpdir(),'sky-cloudflare-preflight-'));
  try {
    for(const name of MEMBERS)if(name!=='wrangler.json')await writeFile(join(scratch,name),files[name],{flag:'wx'});
    const accountConfig={...config,account_id:accountId};
    await writeFile(join(scratch,'wrangler.json'),JSON.stringify(accountConfig,null,2)+'\n',{flag:'wx'});
    const deployments=run(['deployments','list','--name',WORKER,'--json','--config','wrangler.json'],scratch);
    if(deployments.status!==0)fail('The authenticated account cannot list the target Worker deployments');
    let deploymentData;
    try{deploymentData=JSON.parse(deployments.stdout.trim());}catch{fail('Cloudflare deployment inventory was not valid JSON');}
    const count=deploymentCount(deploymentData);
    if(count<1)fail('The target Worker has no inspectable deployment in the selected account');
    let response;
    try{response=await fetchImpl('https://'+HOST+'/',{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail('The existing public Worker could not be reached safely');}
    if(response.status!==200)fail('The existing public Worker returned an unexpected status');
    const body=(await response.text()).trim();
    if(body!=='Hello World!')fail('The existing Worker is not the expected disposable Hello World deployment');
    const dry=run(['deploy','--dry-run','--outdir','preview','--config','wrangler.json'],scratch);
    if(dry.status!==0)fail('Wrangler dry run failed');
    const preview=join(scratch,'preview');
    const entries=await readdir(preview,{withFileTypes:true});
    if(entries.length<1||entries.length>20)fail('Unexpected dry-run bundle inventory');
    let bundleBytes=0;
    for(const entry of entries) {
      if(!entry.isFile()||entry.isSymbolicLink())fail('Unexpected dry-run bundle member');
      const path=join(preview,entry.name),info=await lstat(path);
      if(!info.isFile()||info.isSymbolicLink())fail('Invalid dry-run bundle file');
      bundleBytes+=info.size;
      if(bundleBytes>10*1024*1024)fail('Dry-run bundle exceeds review size limit');
    }
    if(bundleBytes<1)fail('Dry-run bundle is empty');
    if(!hasAccountConfig) {
      await writeFile(join(dir,'wrangler.account.json'),JSON.stringify({...config,account_id:accountId},null,2)+'\n',{flag:'wx',mode:0o600});
    }
    return {kind:'CLOUDFLARE_DISABLED_DEPLOYMENT_PREFLIGHT',wrangler:WRANGLER,accountMembershipVerified:true,
      accountConfigFile:'wrangler.account.json',accountConfigCreated:!hasAccountConfig,
      accountIdSuffix:accountId.slice(-6),target:HOST,targetDeploymentCount:count,helloWorldConfirmed:true,
      dryRunPassed:true,bundleFileCount:entries.length,bundleBytes,mode:'DISABLED',
      provisioning:false,queue:false,liveDeploymentPerformed:false};
  } finally {
    await rm(scratch,{recursive:true,force:true});
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  const accountId=process.argv[2];
  const packageDir=process.argv[3]??process.cwd();
  if(!accountId) {
    console.error('Usage: node preflight.mjs <expected-cloudflare-account-id> [extracted-package-directory]');
    process.exitCode=2;
  } else {
    try {
      const result=await runPreflight({accountId,packageDir});
      console.log(JSON.stringify(result,null,2));
      console.log('STOP: this script never deploys. Separate explicit owner approval is required.');
    } catch(e) {
      console.error('PREFLIGHT BLOCKED: '+e.message);
      process.exitCode=1;
    }
  }
}
