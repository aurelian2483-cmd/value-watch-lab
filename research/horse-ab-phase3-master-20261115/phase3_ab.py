"""Isolated Value Watch A/B research ledger. No production writes or scheduler.

CLI time always comes from the real aware UTC clock. Injectable clocks exist only
at the Python API boundary for tests; a local hash does not attest clock accuracy.
"""
import argparse
import csv
import hashlib
import html
import json
import math
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT=Path(__file__).resolve().parent
UTC=timezone.utc
GUARDS={'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','betting_eligible':False}
BASE={'model_id':'VW_CONTEXT_AB_A_V1','distance':1.0,'going':1.0,'class':.5,'course':.5,'half_life_days':90,'prior':5,'inverse_temperature':2}
CHALLENGER=BASE|{'model_id':'VW_CONTEXT_AB_B_V1','distance':0.0,'half_life_days':45,'inverse_temperature':4}
ORIGINAL_PARAMETERS={'minimum_form_runs':3,'maximum_form_runs':6,'maximum_age_days':730,'recency_half_life_days':90,'neutral_prior_runs':5,'softmax_temperature_inverse':2,'capture_buffer_minutes':5,'maximum_runner_age_minutes':30,'distance_log_scale':.25,'similarity_bonus':{'distance':1.0,'going':1.0,'class':.5,'course':.5},'known_non_finisher_percentile':0.0}
HOSTS={'sportinglife':{'www.sportinglife.com','sportinglife.com'},'racingpost':{'www.racingpost.com','racingpost.com'},'attheraces':{'www.attheraces.com','attheraces.com'},'racingtv':{'www.racingtv.com','racingtv.com'},'theracingapi':{'api.theracingapi.com'}}
SCALAR=re.compile(r'^[A-Za-z0-9_-]{1,80}$')
HEX=re.compile(r'^[a-f0-9]{64}$')

class ResearchError(ValueError):pass

def require(ok, reason):
    if not ok: raise ResearchError(reason)

def canon(x):return json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf-8')
def sha(x):return hashlib.sha256(canon(x)).hexdigest()
def stamp(x):
    require(isinstance(x,str),'TIMESTAMP_NOT_STRING')
    try:v=datetime.fromisoformat(x.replace('Z','+00:00'))
    except ValueError:raise ResearchError('TIMESTAMP_INVALID')
    require(v.tzinfo is not None and v.utcoffset() is not None,'TIMESTAMP_NAIVE')
    return v.astimezone(UTC)

def strict_json(data):
    def pairs(kvs):
        d={}
        for k,v in kvs:
            require(k not in d,'DUPLICATE_JSON_KEY');d[k]=v
        return d
    def bad(c):raise ResearchError('NONFINITE_JSON_NUMBER')
    def floating(s):
        v=float(s);require(math.isfinite(v),'NONFINITE_JSON_NUMBER');return v
    try:return json.loads(data,object_pairs_hook=pairs,parse_constant=bad,parse_float=floating)
    except ResearchError:raise
    except (ValueError,UnicodeDecodeError) as e:raise ResearchError('MALFORMED_JSON') from e

def load(path):
    require(path.stat().st_size<=16*1024*1024,'INPUT_TOO_LARGE')
    return strict_json(path.read_bytes())

def ident(v):
    require(isinstance(v,str) and bool(SCALAR.fullmatch(v)),'INVALID_ID');return v

def finite(v):return type(v) in (int,float) and math.isfinite(v)
def utcnow():return datetime.now(UTC)

def parameters_match(value,expected):
    if isinstance(expected,dict):
        return isinstance(value,dict) and set(value)==set(expected) and all(parameters_match(value[k],expected[k]) for k in expected)
    return finite(value) and value==expected

def london_date(instant):
    try:return instant.astimezone(ZoneInfo('Europe/London')).date()
    except ZoneInfoNotFoundError:
        node=shutil.which('node')
        require(node is not None,'LONDON_TIMEZONE_DATABASE_UNAVAILABLE')
        js="const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(process.argv[1])); const d=Object.fromEntries(p.map(x=>[x.type,x.value])); process.stdout.write(`${d.year}-${d.month}-${d.day}`);"
        try:
            cp=subprocess.run([node,'-e',js,instant.isoformat()],capture_output=True,text=True,check=True,timeout=8,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            return date.fromisoformat(cp.stdout.strip())
        except (subprocess.SubprocessError,ValueError,OSError) as e:raise ResearchError('LONDON_TIMEZONE_CONVERSION_FAILED') from e

def unsigned_digest(record):return sha({k:v for k,v in record.items() if k!='record_sha256'})

def raw_probabilities(record,cfg):
    logits=[]
    for runner in record['runners']:
        weights=[];rs=[];ys=[]
        for h in runner['context_features']['history']:
            # Archived r90 determines the original source cutoff exactly; validate
            # against dates separately. H45 is r90**2, not a new future-date age.
            r=h['recency_weight']**(90/cfg['half_life_days'])
            c=1+sum(cfg[k]*(h['similarities'][k] or 0) for k in ['distance','going','class','course'])
            rs.append(r);weights.append(r*c);ys.append(h['finish_percentile'])
        m=sum(w*y for w,y in zip(weights,ys))/sum(weights)
        mass=sum(rs);q=.5+mass/(mass+cfg['prior'])*(m-.5)
        logits.append(cfg['inverse_temperature']*q)
    es=[math.exp(z-max(logits)) for z in logits];total=sum(es)
    return [e/total for e in es]

def validate_context(record,now,prospective=True,excluded=(),registration=None):
    require(isinstance(record,dict),'CONTEXT_NOT_OBJECT')
    require(record.get('model')=='CONTEXT_FORM_RESEARCH_V1','WRONG_SOURCE_MODEL')
    require(record.get('record_sha256')==unsigned_digest(record),'SOURCE_HASH_MISMATCH')
    require(parameters_match(record.get('parameters'),ORIGINAL_PARAMETERS),'WRONG_SOURCE_PARAMETERS')
    require(not any(k in record for k in ['winner_horse_id','finish_position','result','actual_winner','entries','performance','settled_forecasts']),'TARGET_OUTCOME_IN_CAPTURE')
    require(record.get('research_only') is True and record.get('publication_gate')=='BLOCKED' and record.get('model_validation')=='UNVALIDATED' and type(record.get('challenge_eligible')) is int and record.get('challenge_eligible')==0,'SOURCE_GATES_UNSAFE')
    rid=ident(record.get('race_id'))
    start=stamp(record.get('startUTC'));generated=stamp(record.get('generated_at_utc'));observed=stamp(record.get('runner_observed_at_utc'))
    require(record.get('run_type') in ['FLAT','HURDLE','CHASE','NH_FLAT'],'UNKNOWN_DISCIPLINE')
    require(isinstance(record.get('racecourse'),str) and record['racecourse'].strip(),'COURSE_MISSING')
    require(HEX.fullmatch(str(record.get('runner_source_sha256',''))) is not None,'RUNNER_RECEIPT_MISSING')
    require(generated < start-timedelta(minutes=5),'SOURCE_NOT_PRE_EVENT')
    require(observed<=generated and generated-observed<=timedelta(minutes=30),'SOURCE_RUNNERS_STALE_OR_FUTURE')
    if prospective:
        require(rid not in excluded,'PREVIOUSLY_EXAMINED_RACE')
        require(now<start-timedelta(minutes=5),'CAPTURE_NOT_PRE_EVENT')
        require(generated<=now and observed<=now,'SOURCE_CLOCK_IN_FUTURE')
        require(now-generated<=timedelta(hours=2) and now-observed<=timedelta(minutes=30),'SOURCE_STALE_AT_AB_CAPTURE')
        require(registration is not None and now>=registration and start>registration,'NOT_AFTER_MODEL_REGISTRATION')
    cutoff=min(london_date(generated),london_date(start))
    runners=record.get('runners');require(isinstance(runners,list) and 2<=len(runners)<=100,'INVALID_FIELD')
    require(all(isinstance(r,dict) for r in runners),'RUNNER_NOT_OBJECT')
    require(record.get('active_runner_count')==len(runners),'INCOMPLETE_FIELD')
    horse_ids=[ident(r.get('horse_id')) for r in runners]
    require(len(set(horse_ids))==len(horse_ids),'DUPLICATE_RUNNER')
    require(horse_ids==sorted(horse_ids),'RUNNER_ORDER_NOT_CANONICAL')
    for runner in runners:
        require(isinstance(runner.get('context_features'),dict),'CONTEXT_FEATURES_NOT_OBJECT')
        histories=runner.get('context_features',{}).get('history')
        require(isinstance(histories,list) and 3<=len(histories)<=6,'INVALID_HISTORY_COVERAGE')
        seen=set();days=[]
        for h in histories:
            require(isinstance(h,dict),'HISTORY_ROW_NOT_OBJECT')
            hid=ident(h.get('race_id'));require(hid not in seen,'DUPLICATE_HISTORY');seen.add(hid)
            try:day=date.fromisoformat(h['date'])
            except (KeyError,ValueError,TypeError):raise ResearchError('HISTORY_DATE_INVALID')
            age=(cutoff-day).days;require(0<age<=730,'HISTORY_FUTURE_OR_STALE');days.append(day)
            require(h.get('run_type')==record['run_type'],'HISTORY_DISCIPLINE_MISMATCH')
            n=h.get('field_size');require(type(n) is int and n>=2,'HISTORY_FIELD_INVALID')
            if h.get('outcome')=='NUMERIC_FINISH':
                pos=h.get('position');require(type(pos) is int and 1<=pos<=n,'HISTORY_POSITION_INVALID');expected=(n-pos)/(n-1)
            else:
                require(h.get('outcome')=='KNOWN_NON_FINISH','UNRESOLVED_HISTORY');expected=0.0
            require(finite(h.get('finish_percentile')) and abs(h['finish_percentile']-expected)<1e-12,'PERCENTILE_MISMATCH')
            require(finite(h.get('recency_weight')) and abs(h['recency_weight']-2**(-age/90))<1e-12,'RECENCY_DATE_MISMATCH')
            sims=h.get('similarities');require(isinstance(sims,dict) and set(sims)=={'distance','going','class','course'},'SIMILARITY_SCHEMA')
            require(all(v is None or finite(v) and 0<=v<=1 for v in sims.values()),'SIMILARITY_RANGE')
        require(days==sorted(days,reverse=True),'HISTORY_NOT_DATE_ORDERED')
    probs=raw_probabilities(record,BASE)
    require(all(finite(r.get('model_probability')) and 0<r['model_probability']<1 for r in runners),'INVALID_SOURCE_VECTOR')
    require(max(abs(p-r['model_probability']) for p,r in zip(probs,runners))<1e-10,'BASELINE_PARITY_FAILURE')
    require(abs(sum(r['model_probability'] for r in runners)-1)<1e-10,'SOURCE_NOT_NORMALIZED')
    return record

def safe_root(root):
    root=Path(root).resolve();allowed=(ROOT/'state').resolve()
    require(root==allowed or allowed in root.parents,'STORE_OUTSIDE_ISOLATED_STATE')
    require(not any(p.is_symlink() for p in [root,*root.parents]),'SYMLINK_STORE')
    root.mkdir(parents=True,exist_ok=True)
    return root

def write_once(path,payload):
    """Complete fsynced file then exclusive publish; never replace an object.

    Windows os.rename rejects an existing destination; POSIX rename overwrites,
    so POSIX instead uses link creation. Both keep readers from partial content.
    """
    path.parent.mkdir(parents=True,exist_ok=True)
    require(not path.is_symlink() and not any(p.is_symlink() for p in path.parents),'SYMLINK_OUTPUT')
    data=canon(payload)+b'\n'
    if path.exists():
        require(path.read_bytes()==data,'IMMUTABLE_OBJECT_CONFLICT');return False
    fd,tmp=tempfile.mkstemp(prefix='.partial-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
        try:
            if os.name=='nt':os.rename(tmp,path)
            else:os.link(tmp,path)
        except FileExistsError:require(path.read_bytes()==data,'IMMUTABLE_OBJECT_CONFLICT')
    finally:
        Path(tmp).unlink(missing_ok=True)
    return True

def store_object(root,kind,payload):
    require(kind in ['events','inputs','forecasts','results','snapshots','analyses'],'INVALID_OBJECT_KIND')
    digest=sha(payload);write_once(root/kind/(digest+'.json'),payload);return digest

def objects(root,kind):
    rows=[]
    for p in sorted((root/kind).glob('*.json')):
        x=load(p);require(p.stem==sha(x),'STORED_OBJECT_CORRUPT');rows.append((p.stem,x))
    return rows

def register(root,now=None):
    now=now or utcnow();root=safe_root(root)
    existing=root/'registration.json'
    source_hash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    spec={'schema':1,'A':BASE,'B':CHALLENGER,'source_sha256':source_hash,
          'feature_policy':'CONTEXT_FORM_RESEARCH_V1 source parameters; resolved latest3-6 same-discipline histories within730days; known nonfinish0',**GUARDS}
    spec_hash=store_object(root,'snapshots',spec)
    if existing.exists():
        old=load(existing);require(old['model_bundle_sha256']==spec_hash,'REGISTERED_MODEL_CODE_CHANGED');return old
    excluded=[]
    old_manifest=ROOT/'reproduction'/'phase2_snapshot'/'results'/'race_manifest.json'
    if old_manifest.exists():excluded=sorted(r['race_id'] for r in load(old_manifest))
    else:raise ResearchError('PHASE1_EXCLUSION_MANIFEST_MISSING')
    protocol=ROOT/'PHASE3_PROTOCOL.md';require(protocol.exists(),'PROTOCOL_NOT_FROZEN')
    data={'schema':1,'registered_at_utc':now.isoformat(),'model_bundle_sha256':spec_hash,
          'protocol_sha256':hashlib.sha256(protocol.read_bytes()).hexdigest(),
          'excluded_prior_race_ids':excluded,'independent_timestamp_attested':False,
          'clock_evidence':'Local OS UTC clock only; publish immutable Git receipt before future event for independent attestation',**GUARDS}
    write_once(existing,data);return data

def registration(root):
    x=load(root/'registration.json')
    require(hashlib.sha256((ROOT/'PHASE3_PROTOCOL.md').read_bytes()).hexdigest()==x['protocol_sha256'],'REGISTERED_PROTOCOL_CHANGED')
    spec=load(root/'snapshots'/(x['model_bundle_sha256']+'.json'))
    require(sha(spec)==x['model_bundle_sha256'] and spec['source_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'REGISTERED_MODEL_CODE_CHANGED')
    require(spec['A']==BASE and spec['B']==CHALLENGER,'REGISTERED_MODEL_PARAMETERS_CHANGED')
    return x

def event(root,kind,now,**details):
    return store_object(root,'events',{'event':kind,'observed_at_utc':now.isoformat(),**details,**GUARDS})

def capture(record,root,now=None):
    root=safe_root(root);now=now or utcnow();reg=registration(root)
    source_digest=sha(record)
    store_object(root,'snapshots',record)
    try:
        validate_context(record,now,True,reg['excluded_prior_race_ids'],stamp(reg['registered_at_utc']))
        # Idempotent unchanged input: do not invent a new forecast timestamp.
        for digest,old in objects(root,'forecasts'):
            if old['race_id']==record['race_id']:
                require(stamp(old['startUTC'])==stamp(record['startUTC']),'SCHEDULE_CHANGED_REQUIRES_REVIEW')
            if old['source_object_sha256']==source_digest and old['model_bundle_sha256']==reg['model_bundle_sha256']:
                event(root,'UNCHANGED_INPUT',now,race_id=record['race_id'],forecast_sha256=digest);return digest,False
        source=store_object(root,'inputs',record)
        data={'schema':1,'race_id':record['race_id'],'racecourse':record['racecourse'],'race_type':record['run_type'],
              'startUTC':stamp(record['startUTC']).isoformat(),'captured_at_utc':now.isoformat(),
              'source_generated_at_utc':record['generated_at_utc'],'source_object_sha256':source,
              'source_forecast_sha256':record['record_sha256'],'model_bundle_sha256':reg['model_bundle_sha256'],
              'protocol_sha256':reg['protocol_sha256'],'horse_ids':[r['horse_id'] for r in record['runners']],
              'A':raw_probabilities(record,BASE),'B':raw_probabilities(record,CHALLENGER),
              'independent_timestamp_attested':False,'counterfactual':False,**GUARDS}
        digest=store_object(root,'forecasts',data)
        event(root,'PAIRED_FORECAST_FROZEN',now,race_id=record['race_id'],forecast_sha256=digest)
        return digest,True
    except (ResearchError,KeyError,TypeError) as e:
        reason=str(e) if isinstance(e,ResearchError) else 'MALFORMED_CONTEXT_'+type(e).__name__
        event(root,'CAPTURE_EXCLUDED',now,race_id=str(record.get('race_id','UNKNOWN')) if isinstance(record,dict) else 'UNKNOWN',source_object_sha256=source_digest,reason=reason)
        raise ResearchError(reason) from e

def inspect_feed(feed,root,now=None):
    root=safe_root(root);now=now or utcnow();registration(root)
    require(isinstance(feed,dict) and feed.get('model')=='CONTEXT_FORM_RESEARCH_V1','WRONG_FEED_MODEL')
    require(feed.get('research_only') is True and feed.get('publication_gate')=='BLOCKED' and feed.get('model_validation')=='UNVALIDATED','FEED_GATES_UNSAFE')
    generated=stamp(feed.get('generated_at_utc'));require(timedelta(0)<=now-generated<=timedelta(hours=2),'FEED_STALE_OR_FUTURE')
    records=feed.get('forecasts');require(isinstance(records,list),'FORECAST_LIST_MISSING')
    require(all(isinstance(r,dict) for r in records),'FEED_FORECAST_NOT_OBJECT')
    ids=[ident(r.get('race_id')) for r in records];require(len(ids)==len(set(ids)),'DUPLICATE_FEED_RACE')
    snapshot=store_object(root,'snapshots',feed)
    successes=0;failures=[]
    for record in records:
        try:
            checks=feed.get('current_field_checks',{})
            require(isinstance(checks,dict),'FIELD_CHECKS_MISSING')
            check=checks.get(record.get('record_sha256'))
            require(isinstance(check,dict) and check.get('status')=='FRESH_MATCHING_FIELD_AND_CONTEXT','CURRENT_FIELD_NOT_CONFIRMED')
            checked=stamp(check.get('checked_at_utc'));observed=stamp(check.get('runner_observed_at_utc'))
            require(observed<=checked<=now and now-observed<=timedelta(minutes=30),'CURRENT_FIELD_CHECK_STALE_OR_FUTURE')
            ids=sorted(r.get('horse_id','') for r in record.get('runners',[]) if isinstance(r,dict))
            require(sorted(check.get('active_runner_ids',[]))==ids and check.get('context_signature')==record.get('context_signature'),'CURRENT_FIELD_OR_CONDITIONS_CHANGED')
            _,created=capture(record,root,now);successes+=int(created)
        except (ResearchError,TypeError) as e:
            reason=str(e) if isinstance(e,ResearchError) else 'MALFORMED_CURRENT_FIELD_CHECK'
            failures.append({'race_id':record.get('race_id'),'reason':reason})
            event(root,'CAPTURE_EXCLUDED',now,race_id=record.get('race_id'),reason=reason,source_snapshot_sha256=snapshot)
    skipped=feed.get('skipped',[])
    require(isinstance(skipped,list),'SKIP_LIST_INVALID')
    for skip in skipped:
        require(isinstance(skip,dict) and isinstance(skip.get('reason'),str),'SKIP_RECORD_INVALID')
        event(root,'UPSTREAM_EXCLUDED',now,race_id=str(skip.get('race_id','UNKNOWN')),reason=skip['reason'],source_snapshot_sha256=snapshot)
    summary={'source_snapshot_sha256':snapshot,'source_generated_at_utc':feed['generated_at_utc'],
             'listed_forecasts':len(records),'new_paired_forecasts':successes,'capture_failures':failures,
             'upstream_excluded_records':len(skipped),'source_coverage':feed.get('coverage'),**GUARDS}
    event(root,'FEED_INSPECTED',now,summary=summary)
    return summary

def result_evidence(bundle,root,now=None):
    """Validate two retained publisher snapshots plus explicit human extraction.

    This gate verifies evidence/identity consistency, not the truth of a manually
    supplied extraction. No independent verification is asserted without review.
    """
    root=safe_root(root);now=now or utcnow();registration(root)
    require(isinstance(bundle,dict),'RESULT_NOT_OBJECT')
    rid=ident(bundle.get('race_id'));start=stamp(bundle.get('startUTC'))
    require(now>start,'RESULT_BEFORE_RACE')
    require(bundle.get('review_status')=='REVIEWED_FINAL' and isinstance(bundle.get('reviewer'),str) and bundle['reviewer'].strip(),'RESULT_NOT_INDEPENDENTLY_REVIEWED')
    sources=bundle.get('sources');require(isinstance(sources,list) and len(sources)==2,'TWO_RESULT_SOURCES_REQUIRED')
    pubs=set();fingerprints=set();finals=[]
    for s in sources:
        require(isinstance(s,dict),'RESULT_SOURCE_NOT_OBJECT')
        pub=s.get('publisher_id');require(pub in HOSTS and pub not in pubs,'RESULT_SOURCES_NOT_DISTINCT');pubs.add(pub)
        u=urlsplit(str(s.get('url','')));require(u.scheme=='https' and u.hostname in HOSTS[pub] and not u.username and not u.password,'RESULT_URL_NOT_ALLOWLISTED')
        observed=stamp(s.get('observed_at_utc'));require(start<observed<=now,'RESULT_RECEIPT_CHRONOLOGY')
        payload=s.get('retained_snapshot_utf8');require(isinstance(payload,str) and 0<len(payload.encode())<=4*1024*1024,'RESULT_SNAPSHOT_UNAVAILABLE')
        require(hashlib.sha256(payload.encode()).hexdigest()==s.get('source_sha256'),'RESULT_SNAPSHOT_HASH_MISMATCH')
        require(s['source_sha256'] not in fingerprints,'RESULT_SNAPSHOTS_IDENTICAL');fingerprints.add(s['source_sha256'])
        extracted=s.get('reviewed_extraction');require(isinstance(extracted,dict) and extracted.get('status')=='FINAL','UNRESOLVED_RESULT')
        require(extracted.get('race_id')==rid and stamp(extracted.get('startUTC'))==start,'RESULT_EVENT_MISMATCH')
        field=extracted.get('canonical_final_runner_ids');require(isinstance(field,list) and len(field)>=2,'RESULT_FIELD_MISSING')
        for h in field:ident(h)
        require(len(field)==len(set(field)),'DUPLICATE_RESULT_RUNNER')
        winner=ident(extracted.get('canonical_winner_horse_id'));require(winner in field,'WINNER_NOT_IN_FIELD')
        require(extracted.get('identity_mapping_reviewed') is True,'RESULT_MAPPING_UNREVIEWED')
        finals.append((sorted(field),winner))
    require(finals[0]==finals[1],'RESULT_SOURCES_DISAGREE')
    # Only score the latest pre-cutoff capture; never select an older matching field after results.
    forecasts=[(h,f) for h,f in objects(root,'forecasts') if f['race_id']==rid and stamp(f['startUTC'])==start]
    require(forecasts,'NO_PRE_EVENT_PAIRED_FORECAST')
    fhash,f=max(forecasts,key=lambda hf:(stamp(hf[1]['captured_at_utc']),hf[0]))
    require(sorted(f['horse_ids'])==finals[0][0],'FINAL_FIELD_CHANGED_NO_RENORMALISATION')
    require(stamp(f['captured_at_utc'])<start-timedelta(minutes=5),'STORED_FORECAST_LATE')
    old=[(h,r) for h,r in objects(root,'results') if r['race_id']==rid and stamp(r['startUTC'])==start]
    same=[h for h,r in old if r['evidence_bundle']==bundle]
    if same:return same[0],False
    heads={h:r for h,r in old}
    for h,r in old:
        if r.get('supersedes'):heads.pop(r['supersedes'],None)
    if old:
        require(len(heads)==1 and bundle.get('supersedes') in heads,'RESULT_REQUIRES_UNIQUE_AMENDMENT_LINK')
    else:require(not bundle.get('supersedes'),'AMENDMENT_PARENT_MISSING')
    result={'schema':1,'race_id':rid,'startUTC':start.isoformat(),'forecast_sha256':fhash,
            'winner_horse_id':finals[0][1],'final_runner_ids':finals[0][0],
            'reviewed_at_utc':now.isoformat(),'verification':'TWO_PUBLISHER_MANUALLY_REVIEWED_SNAPSHOTS',
            'verification_limit':'Manual extraction/reviewer assertions must be independently audited; hashes alone do not prove source truth.',
            'supersedes':bundle.get('supersedes'),'evidence_bundle':bundle,**GUARDS}
    digest=store_object(root,'results',result);event(root,'RESULT_EVIDENCE_ACCEPTED',now,race_id=rid,result_sha256=digest)
    return digest,True

def metrics(ps,win):
    return {'log_loss':-math.log(ps[win]),'brier':sum((p-int(i==win))**2 for i,p in enumerate(ps)),
            'first_winner':int(ps.index(max(ps))==win),'top_probability':max(ps),
            'probabilities':ps,'outcomes':[int(i==win) for i in range(len(ps))]}

def summarize(rows):
    if not rows:return {'races':0,'runners':0,'mean_log_loss':None,'mean_brier':None,'first_winners':0,'first_accuracy':None,'top_label_bins':[]}
    bins=[]
    for lo,hi in zip([0,.1,.2,.3,.5],[.1,.2,.3,.5,1]):
        items=[r for r in rows if lo<=r['top_probability']<hi]
        bins.append({'lower':lo,'upper':hi,'n':len(items),'confidence':sum(r['top_probability'] for r in items)/len(items) if items else None,'accuracy':sum(r['first_winner'] for r in items)/len(items) if items else None})
    pooled=[]
    for lo,hi in zip([0,.05,.1,.2,.3,.5],[.05,.1,.2,.3,.5,1]):
        pairs=[(p,y) for r in rows for p,y in zip(r['probabilities'],r['outcomes']) if lo<=p<hi]
        pooled.append({'lower':lo,'upper':hi,'n':len(pairs),'confidence':sum(p for p,y in pairs)/len(pairs) if pairs else None,'frequency':sum(y for p,y in pairs)/len(pairs) if pairs else None})
    return {'races':len(rows),'runners':sum(r['runners'] for r in rows),'mean_log_loss':sum(r['log_loss'] for r in rows)/len(rows),
            'mean_brier':sum(r['brier'] for r in rows)/len(rows),'first_winners':sum(r['first_winner'] for r in rows),'first_accuracy':sum(r['first_winner'] for r in rows)/len(rows),'top_label_bins':bins,'pooled_runner_bins':pooled,
            'top_label_ece':sum(b['n']*abs(b['confidence']-b['accuracy']) for b in bins if b['n'])/len(rows),
            'calibration_limit':'Fixed-bin diagnostic; runner rows are dependent and bins may be sparse.'}

def day_interval(rows,key,resamples=20000):
    dates=sorted({r['date'] for r in rows})
    if len(dates)<2:return {'interval':None,'reason':'FEWER_THAN_TWO_DATES','date_clusters':len(dates)}
    groups=[[r[key] for r in rows if r['date']==d] for d in dates]
    rng=random.Random(20261115);values=[]
    for _ in range(resamples):
        choices=[rng.randrange(len(groups)) for d in dates]
        values.append(sum(sum(groups[j]) for j in choices)/sum(len(groups[j]) for j in choices))
    values.sort()
    return {'interval':[values[int(.025*(resamples-1))],values[int(.975*(resamples-1))]],'date_clusters':len(dates),'resamples':resamples,'seed':20261115,'limitation':'Date clusters only; meetings/repeated horses may remain dependent. Descriptive until fixed endpoint.'}

def analyze(root,now=None):
    root=safe_root(root);now=now or utcnow();reg=registration(root)
    forecasts=dict(objects(root,'forecasts'));rs=objects(root,'results');heads={h:r for h,r in rs}
    for h,r in rs:
        if r.get('supersedes'):heads.pop(r['supersedes'],None)
    byevent=defaultdict(list)
    for h,r in heads.items():byevent[(r['race_id'],r['startUTC'])].append((h,r))
    rows=[];quality=[]
    for key,items in byevent.items():
        if len(items)!=1:quality.append({'race_id':key[0],'reason':'AMBIGUOUS_AMENDMENT_HEADS'});continue
        h,r=items[0];f=forecasts.get(r['forecast_sha256']);require(f is not None,'RESULT_FORECAST_MISSING')
        require(f['model_bundle_sha256']==reg['model_bundle_sha256'],'ANALYSIS_MODEL_MISMATCH')
        win=f['horse_ids'].index(r['winner_horse_id']);a=metrics(f['A'],win);b=metrics(f['B'],win)
        rows.append({'race_id':f['race_id'],'date':london_date(stamp(f['startUTC'])).isoformat(),'race_type':f['race_type'],'runners':len(f['horse_ids']),
           'A':a,'B':b,'delta_log_loss':b['log_loss']-a['log_loss'],'delta_brier':b['brier']-a['brier'],
           'A_first_horse_id':f['horse_ids'][f['A'].index(max(f['A']))],'B_first_horse_id':f['horse_ids'][f['B'].index(max(f['B']))],
           'actual_winner':r['winner_horse_id'],'forecast_sha256':r['forecast_sha256'],'result_sha256':h,'verification':r['verification']})
    events=[v for h,v in objects(root,'events')]
    attempts=[e for e in events if e['event'] in ['CAPTURE_EXCLUDED','UPSTREAM_EXCLUDED']]
    unique_forecasts={f['race_id'] for f in forecasts.values()}
    dates={r['date'] for r in rows};endpoint=len(rows)>=500 and len(dates)>=60
    means=lambda k:sum(r[k] for r in rows)/len(rows) if rows else None
    result={'as_of_utc':now.isoformat(),'registration':reg,'genuinely_pre_event_paired_races':len(unique_forecasts),
        'paired_forecast_revisions':len(forecasts),'independently_reviewed_outcomes':len(rows),'completed_prospective_comparisons':len(rows),
        'independent_timestamp_attested_forecasts':sum(f['independent_timestamp_attested'] is True for f in forecasts.values()),
        'A':summarize([r['A']|{'runners':r['runners']} for r in rows]),'B':summarize([r['B']|{'runners':r['runners']} for r in rows]),
        'mean_delta_log_loss':means('delta_log_loss'),'mean_delta_brier':means('delta_brier'),
        'improved_races':sum(r['delta_log_loss']<0 for r in rows),'worsened_races':sum(r['delta_log_loss']>0 for r in rows),
        'paired_log_loss_uncertainty':day_interval(rows,'delta_log_loss'),'paired_brier_uncertainty':day_interval(rows,'delta_brier'),
        'race_rows':rows,'exclusion_attempts':attempts,'quality_failures':quality,
        'pending_paired_races':len(unique_forecasts)-len(rows),'eligible_dates':len(dates),'fixed_endpoint_reached':endpoint,
        'decision':'CONTINUE_RESEARCH_KEEP_BASELINE','promotion_review_ready':False,
        'promotion_note':'Never automatic: fixed endpoint, preregistration/time evidence, source review, precision, calibration and independent review are all required.',
        'coverage_limit':'Counts concern observed feed records. Unobserved races/outages need complete external census; not100percentcoverage.',**GUARDS}
    result['by_discipline']={g:{'A':summarize([r['A']|{'runners':r['runners']} for r in rows if r['race_type']==g]),'B':summarize([r['B']|{'runners':r['runners']} for r in rows if r['race_type']==g])} for g in sorted({r['race_type'] for r in rows})}
    digest=store_object(root,'analyses',result);return digest,result

def dashboard(summary,path):
    e=html.escape
    def num(x):return 'Not available' if x is None else f'{x:.6f}' if isinstance(x,float) else str(x)
    cards=[('Paired pre-event races',summary['genuinely_pre_event_paired_races']),('Reviewed outcomes',summary['independently_reviewed_outcomes']),('Completed comparisons',summary['completed_prospective_comparisons']),('Excluded attempts',len(summary['exclusion_attempts']))]
    hist='Historical exploratory:76races, original LL2.139435 / challenger2.117177; first winners13/76 /16/76. These are not prospective validation.'
    doc='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Value Watch — Research comparison</title><style>body{margin:0;background:#101923;color:#e9eff7;font:16px system-ui;line-height:1.55}main{max-width:1100px;margin:auto;padding:35px}h1{font-size:32px;margin-bottom:8px}.badge{display:inline-block;background:#654b13;color:#ffe2a4;padding:8px 14px;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;margin:28px 0}.card,section{background:#1b2838;padding:22px;border:1px solid #33475e;border-radius:12px;margin-bottom:20px}.n{font-size:38px;font-weight:700;color:#69d6cc}table{border-collapse:collapse;width:100%}td,th{padding:13px;text-align:left;border-bottom:1px solid #3b4c60}small{color:#b5c5d8}code{overflow-wrap:anywhere}</style><main><span class="badge">RESEARCH ONLY · UNVALIDATED · BLOCKED</span><h1>Frozen A / B comparison</h1><p>Keep baseline · Continue prospective research · No automatic promotion</p><div class="grid">'
    for label,value in cards:doc+='<div class="card"><small>'+e(label)+'</small><div class="n">'+e(str(value))+'</div></div>'
    doc+='</div><section><h2>Genuine prospective results</h2><p>Zero observations means unavailable scores, not a log loss of zero.</p><table><tr><th>Metric</th><th>Model A</th><th>Model B</th></tr>'
    for label,key in [('Mean log loss','mean_log_loss'),('Mean Brier','mean_brier'),('First-choice winners','first_winners'),('First-choice accuracy','first_accuracy')]:doc+='<tr><td>'+e(label)+'</td><td>'+e(num(summary['A'][key]))+'</td><td>'+e(num(summary['B'][key]))+'</td></tr>'
    doc+='</table><p>Paired LL difference: '+e(num(summary['mean_delta_log_loss']))+'</p><p>Uncertainty: '+e(json.dumps(summary['paired_log_loss_uncertainty']))+'</p></section><section><h2>Historical exploration — separate sample</h2><p>'+e(hist)+'</p></section><section><h2>Coverage, calibration and quality</h2><p>'+e(summary['coverage_limit'])+'</p><p>Calibration bins are available in the analysis JSON once observations exist.</p><p>Pending paired races: '+e(str(summary['pending_paired_races']))+'</p><p>Quality failures: '+e(str(len(summary['quality_failures'])))+'</p><p>Capture timestamp evidence: local clock; independent attestations '+e(str(summary['independent_timestamp_attested_forecasts']))+'.</p><pre style="white-space:pre-wrap">'+e(json.dumps(summary['exclusion_attempts'],indent=2))+'</pre></section><small>As of '+e(summary['as_of_utc'])+' · Read-only offline report. No production integration or network requests.</small></main></html>'
    # Dashboard is a derived local view; exclusive content-hash output, no production path.
    require(path.parent.resolve()==(ROOT/'dashboard').resolve(),'DASHBOARD_OUTPUT_OUTSIDE_RESEARCH')
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():require(path.read_text(encoding='utf-8')==doc,'DASHBOARD_ALREADY_EXISTS_DIFFERENT_CONTENT')
    else:path.write_text(doc,encoding='utf-8')

def cli():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--store',type=Path,default=ROOT/'state')
    sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('register');q=sub.add_parser('capture');q.add_argument('file',type=Path)
    q=sub.add_parser('inspect-feed');q.add_argument('file',type=Path)
    q=sub.add_parser('verify-result');q.add_argument('file',type=Path)
    sub.add_parser('analyze');sub.add_parser('dashboard')
    args=p.parse_args()
    try:
        root=safe_root(args.store)
        if args.command=='register':out=register(root)
        elif args.command=='capture':out={'forecast_sha256':capture(load(args.file),root)[0]}
        elif args.command=='inspect-feed':out=inspect_feed(load(args.file),root)
        elif args.command=='verify-result':out={'result_sha256':result_evidence(load(args.file),root)[0]}
        else:
            digest,out=analyze(root)
            if args.command=='dashboard':dashboard(out,ROOT/'dashboard'/(digest+'.html'))
        print(json.dumps(out,indent=2,allow_nan=False))
    except (ResearchError,KeyError,TypeError,OSError) as e:
        print(json.dumps({'status':'BLOCKED','reason':str(e),**GUARDS}),file=sys.stderr);sys.exit(2)

if __name__=='__main__':cli()
