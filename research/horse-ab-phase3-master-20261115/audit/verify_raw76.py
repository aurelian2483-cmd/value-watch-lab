import json, hashlib
from pathlib import Path
p=Path(__file__).parent
m=json.loads((p/'raw76_manifest.json').read_text())
checks=[]
for row in m['records']:
    f=p/'raw76'/f"{row['forecast_sha']}.json"
    b=f.read_bytes()
    blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    d=json.loads(b);unsigned=dict(d);digest=unsigned.pop('record_sha256')
    canonical=hashlib.sha256(json.dumps(unsigned,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    checks.append({'race_id':row['race_id'],'forecast_sha':row['forecast_sha'],'bytes':len(b),'file_sha256':hashlib.sha256(b).hexdigest(),'git_blob':blob,'git_blob_matches':blob==row['git_blob'],'record_canonical_sha_matches':canonical==digest})
assert len(checks)==76
assert all(x['git_blob_matches'] and x['record_canonical_sha_matches'] for x in checks)
(p/'raw76_integrity.json').write_text(json.dumps({'all76_pass':True,'checks':checks},indent=2)+'\n')
print('76/76 original Git blob bytes and canonical record hashes verified')
