import json,hashlib
from pathlib import Path
p=Path(__file__).parent;m=json.loads((p/'source_manifest.json').read_text());out=[]
for r in m['files']:
    f=p/'source'/r['path'];b=f.read_bytes()
    def git(x):return hashlib.sha1(b'blob '+str(len(x)).encode()+b'\0'+x).hexdigest()
    out.append({'path':r['path'],'git_matches':git(b)==r['git_blob'],'sha256':hashlib.sha256(b).hexdigest()})
assert len(out)==19 and all(x['git_matches'] for x in out), 'Immutable source byte mismatch; no repairs performed'
(p/'source_integrity.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'count':len(out),'pass':sum(x['git_matches'] for x in out)}))
