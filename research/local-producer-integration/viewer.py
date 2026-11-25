"""Read-only loopback integration of the accepted website and new local QA receipts."""
import argparse,html,json,sys
from http.server import HTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from producers import FLAGS,history,safe_read,sha,need,store_root

HTML_SHA="f8919ac7209fa9d8b4100d6cb6853e90253746b12718ffe983057c48c66d5826"
STATUS_SHA="e729dd2a7ed24986c1476d511e42ba6ff892f2b389e6def6ef249a4d6c4fcac0"
NAMES={"catalogue":"Mathematical knowledge library","numerical":"Numerical laboratory","forecast":"Forecast diagnostics","cpu":"CPU fixed-workload engine","references":"Scientific reference library"}
LABELS={"registered":"Specifications in this checkout","target":"Registration target","qualified":"Empirically qualified","total":"Fixed cases","passed":"Reference checks passed","methods":"Distinct methods","workloadsPassed":"Fixed workloads passed","benchmarkRows":"Benchmark rows","sources":"Registered sources","claims":"Recorded claims","independentlyReviewed":"Independently reviewed","rightsVerified":"Rights verified"}
def esc(x):return html.escape(str(x),quote=True)

def baseline(directory):
    d=Path(directory).absolute()
    need(d.is_dir() and d.resolve()==d,"Unsafe website directory")
    raw=safe_read(d/"index.html");status=safe_read(d/"status.json")
    need(sha(raw)==HTML_SHA and sha(status)==STATUS_SHA,"Accepted PR186 website bytes changed")
    return raw.decode("utf-8")

def view(store):
    record,anchor=history(store)
    return {"kind":"LOCAL_QA_WEBSITE_VIEW","schemaVersion":1,"state":"WAITING_FOR_LOCAL_QA" if record is None else record["status"],
            "latestReceipt":record,"latestReceiptSha256":anchor,"liveDataProducerConnected":False,
            "liveGpuProducerConnected":False,"productionProducerConnected":False,"measurementFreshness":"UNKNOWN",**FLAGS}

def render(page,state,refresh=False):
    r=state["latestReceipt"]
    cards=[]
    if r is None:
        body='<p data-live-state="waiting">No local fixed-QA receipts recorded. Run the explicit local QA command to produce a report.</p>'
    else:
        for row in r["producers"]:
            metrics="".join('<div><dt>'+esc(LABELS[k])+'</dt><dd>'+esc(v)+'</dd></div>' for k,v in row["metrics"].items())
            cards.append('<article class="subcard" data-producer="'+esc(row["id"])+'"><h3>'+esc(NAMES[row["id"]])+'</h3><p class="pill">'+esc(row["status"])+'</p><dl class="rows">'+metrics+'</dl></article>')
        body=('<p data-live-state="recorded"><strong>Local receipt '+str(r["sequence"])+'</strong> · '+esc(r["observedAt"])+'</p>'
              +'<p>Checkout: <code>'+esc(r["revision"])+'</code></p><p>Receipt SHA-256: <code>'+esc(state["latestReceiptSha256"])+'</code></p>'
              +'<p>Supervisor assessment: '+esc(r["status"])+'</p><div class="grid">'+''.join(cards)+'</div>')
    section=('<section id="live-producers" class="panel"><p class="eyebrow">LOCAL REPORTS / FIXED QA</p><h2>Local producer integration</h2>'
             '<p class="muted">The original accepted website below is a historical snapshot. This panel reads newly recorded local QA observations on each request.</p>'
             '<p><a href="/#live-producers">Refresh once</a> · <a href="/live#live-producers">Auto-refresh every 15 seconds</a></p>'
             +body+'<p class="notice">GPU and historical data remain archived only. No live external data, production dispatch, protected evaluation or automatic repairs. '
             'Local receipt hashes detect ordinary changes; they are not signatures or independent attestation. Measurement freshness: UNKNOWN.</p></section>')
    needle='<section id="overview"'
    need(page.count(needle)==1 and page.count('<nav aria-label="Research navigation" class="nav">')==1,"Unexpected accepted page structure")
    page=page.replace(needle,section+needle,1).replace('<nav aria-label="Research navigation" class="nav">','<nav aria-label="Research navigation" class="nav"><a href="#live-producers"><span class="navnum">QA</span><span>Local producer reports</span></a>',1)
    if refresh:page=page.replace('</head>','<meta http-equiv="refresh" content="15"></head>',1)
    return page

def start(site,store,port=8768):
    site=Path(site).absolute();store=store_root(store)
    need(type(port) is int and 0<=port<=65535,"Invalid port")
    baseline(site);view(store)
    class Handler(BaseHTTPRequestHandler):
        server_version="SkyResearchLocal"
        sys_version=""
        def setup(self):
            super().setup();self.connection.settimeout(5)
        def log_message(self,*args):pass
        def send(self,code,body,ctype="text/plain; charset=utf-8",extra=None):
            if isinstance(body,str):body=body.encode()
            self.send_response(code)
            self.send_header("Content-Type",ctype)
            self.send_header("Content-Length",str(len(body)))
            self.send_header("Cache-Control","no-store")
            self.send_header("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
            self.send_header("X-Frame-Options","DENY")
            self.send_header("X-Content-Type-Options","nosniff")
            self.send_header("Referrer-Policy","no-referrer")
            for k,v in (extra or {}).items():self.send_header(k,v)
            self.end_headers()
            if self.command!="HEAD":self.wfile.write(body)
        def check_host(self):
            host=f"127.0.0.1:{self.server.server_port}"
            return self.client_address[0]=="127.0.0.1" and self.headers.get("Host")==host and self.headers.get("Origin") in (None,"http://"+host) and self.headers.get("Sec-Fetch-Site") in (None,"none","same-origin")
        def do_GET(self):
            if not self.check_host():return self.send(403,"Forbidden")
            if self.path not in ("/","/live","/status"):return self.send(404,"Not found")
            try:
                p=baseline(site);s=view(store)
                if self.path=="/status":return self.send(200,json.dumps(s,indent=2,allow_nan=False),"application/json; charset=utf-8")
                return self.send(200,render(p,s,self.path=="/live"),"text/html; charset=utf-8")
            except (ValueError,OSError,TypeError,KeyError,AttributeError):
                return self.send(503,"Evidence unavailable or changed. UNVALIDATED. PUBLICATION BLOCKED. EXECUTION BLOCKED.")
        do_HEAD=do_GET
        def reject(self):return self.send(405,"Read-only viewer",extra={"Allow":"GET, HEAD"})
        do_POST=do_PUT=do_PATCH=do_DELETE=do_OPTIONS=reject
    server=HTTPServer(("127.0.0.1",port),Handler)
    return server

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site")
    parser.add_argument("store")
    parser.add_argument("--port",type=int,default=8768)
    args=parser.parse_args()
    try:
        with start(args.site,args.store,args.port) as server:
            print("http://127.0.0.1:"+str(server.server_port),flush=True)
            try:server.serve_forever(poll_interval=.25)
            except KeyboardInterrupt:pass
    except (ValueError,OSError,TypeError,KeyError) as e:
        print("Local viewer refused: "+type(e).__name__,file=sys.stderr);sys.exit(1)
