"""One-shot, read-only public GitHub context-feed adapter; no scheduling.

Use --local for an already acquired pinned feed. Does not run/modify production
collectors, use credentials, or fetch arbitrary URLs. Real CLI clock is used.
"""
import argparse,hashlib,json,sys,urllib.error,urllib.request
from pathlib import Path
import phase3_ab as ab

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def git_blob_sha1(raw):
    return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\x00'+raw).hexdigest()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ref',required=True,help='Exact40hexGitcommit, not moving branch')
    p.add_argument('--local',type=Path)
    p.add_argument('--store',type=Path,default=ab.ROOT/'state')
    a=p.parse_args()
    url='https://raw.githubusercontent.com/aurelian2483-cmd/value-watch-lab/'+a.ref+'/horse-predictions-data.json'
    now=ab.utcnow()
    try:
        root=ab.safe_root(a.store);ab.registration(root)
        ab.require(len(a.ref)==40 and all(c in '0123456789abcdef' for c in a.ref),'COMMIT_REF_REQUIRED')
        if a.local:
            ab.require(a.local.stat().st_size<=16*1024*1024,'INPUT_TOO_LARGE');raw=a.local.read_bytes();transport='PINNED_CONNECTOR_SNAPSHOT_LOCAL'
        else:
            request=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearchAB/1.0'})
            with urllib.request.build_opener(NoRedirect()).open(request,timeout=20) as response:
                raw=response.read(16*1024*1024+1)
            ab.require(len(raw)<=16*1024*1024,'INPUT_TOO_LARGE');transport='PUBLIC_HTTPS_READ_ONLY'
        feed=ab.strict_json(raw)
        receipt={'source_url':url,'source_ref':a.ref,'observed_at_utc':now.isoformat(),'transport':transport,
                 'raw_sha256':hashlib.sha256(raw).hexdigest(),'git_blob_sha1':git_blob_sha1(raw),
                 'note':'Local mode needs the accompanying connector receipt to authenticate origin; hashes alone are not proof.',**ab.GUARDS}
        h=ab.store_object(root,'snapshots',receipt)
        result=ab.inspect_feed(feed,root,now);print(json.dumps({'acquisition_receipt_sha256':h,**result},indent=2))
    except (ab.ResearchError,OSError,urllib.error.URLError) as e:
        if 'root' in locals():ab.event(root,'ACQUISITION_BLOCKED',ab.utcnow(),source_url=url,reason=str(e))
        print(json.dumps({'status':'BLOCKED','reason':str(e),**ab.GUARDS}),file=sys.stderr);return 2
    return 0

if __name__=='__main__':sys.exit(main())
