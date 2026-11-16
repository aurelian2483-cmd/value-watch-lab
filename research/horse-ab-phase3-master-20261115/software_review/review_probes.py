"""Review-only probes; synthetic store removed, no live observations."""
import sys,json,hashlib,tempfile,copy
from pathlib import Path
from datetime import timedelta
P=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(P))
import phase3_ab as ab
from test_phase3 import ResearchPipelineTests

results={}
try:
    x=ab.strict_json('{"overflow":1e9999}')
    results['json_overflow_accepted']=not ab.finite(x['overflow'])
except ab.ResearchError:
    results['json_overflow_accepted']=False
b=(P/'acquisition'/'horse-predictions-data.json').read_bytes()
results['git_blob_correct']=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
results['git_blob_two_byte_separator']=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\\0'+b).hexdigest()
ResearchPipelineTests.setUpClass()
with tempfile.TemporaryDirectory(prefix='software-review-synthetic-',dir=P/'state') as d:
    root=Path(d);now=ResearchPipelineTests.now
    ab.register(root,now-timedelta(minutes=5))
    r=copy.deepcopy(ResearchPipelineTests.fixture)
    ab.capture(r,root,now)
    r['startUTC']=(ab.stamp(r['startUTC'])+timedelta(minutes=10)).isoformat()
    ResearchPipelineTests.seal(r)
    try:ab.capture(r,root,now+timedelta(seconds=1))
    except ab.ResearchError as e:results['schedule_revision_rejected_reason']=str(e)
    _,summary=ab.analyze(root,now+timedelta(seconds=2))
    results['same_race_id_rescheduled_unique_ids']=len({f['race_id'] for _,f in ab.objects(root,'forecasts')})
    results['same_race_id_rescheduled_reported_races']=summary['genuinely_pre_event_paired_races']
(P/'software_review'/'current_probe_results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
