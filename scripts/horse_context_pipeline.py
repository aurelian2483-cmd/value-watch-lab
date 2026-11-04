#!/usr/bin/env python3
"""Separate context-weighted racing research lane; untrained and uncalibrated.
Preserves the existing AW baseline and never promotes the failed AW challenger.
"""
import datetime as dt
import json
import math
import re
import urllib.parse
from pathlib import Path
from zoneinfo import ZoneInfo
from horse_model_pipeline import ROOT, WORK, UTC, canon, sha, check_feed, score_provisional, settled_history
from enrich_horse_runners import stamp

MODEL = 'CONTEXT_FORM_RESEARCH_V1'
PARAMETERS = {
    'minimum_form_runs': 3, 'maximum_form_runs': 6, 'maximum_age_days': 730,
    'recency_half_life_days': 90, 'neutral_prior_runs': 5,
    'softmax_temperature_inverse': 2, 'capture_buffer_minutes': 5,
    'maximum_runner_age_minutes': 30, 'distance_log_scale': .25,
    'similarity_bonus': {'distance': 1.0, 'going': 1.0, 'class': .5, 'course': .5},
    'known_non_finisher_percentile': 0.0,
}
FAMILIES = {'FLAT','HURDLE','CHASE','NH_FLAT'}
AW = {'ALLWEATHER','ALL_WEATHER','ALL WEATHER','AW','POLYTRACK','TAPETA','FIBRESAND'}
NON_FINISH = {'fell','pulled up','unseated rider','unseated','brought down','ran out','refused','slipped up','disqualified','f','pu','ur','bd','ro','ref','su','dq'}
LIMITATION = ('Untrained context-weighted form research, not calibrated win probabilities. '
              'Distance, broad going, class similarity and course history reweight dated same-discipline outcomes using declared exploratory choices. '
              'No learned draw/pace bias, weight or official-rating effect, trainer/jockey statistics, fitness, market odds or verified EV. '
              'Inferred race discipline and sparse contextual evidence remain uncertain.')

def family(value):
    key = str(value or '').strip().upper().replace('-', '_').replace(' ', '_')
    return {'NHF':'NH_FLAT','NHFLAT':'NH_FLAT','N_H_FLAT':'NH_FLAT','NATIONAL_HUNT_FLAT':'NH_FLAT','BUMPER':'NH_FLAT'}.get(key,key) if key else None

def number(value):
    try:
        v = float(value)
        return v if math.isfinite(v) else None
    except (ValueError, TypeError):
        return None

def yards(value):
    text = str(value or '').lower().strip()
    parts = re.findall(r'(\d+(?:\.\d+)?)\s*([mfy])', text)
    if not parts or re.sub(r'(\d+(?:\.\d+)?)\s*([mfy])|\s+', '', text):
        return None
    total = sum(float(v)*{'m':1760,'f':220,'y':1}[u] for v,u in parts)
    return total if 0 < total <= 12000 else None

def going(value):
    s = str(value or '').casefold()
    # Broad bins deliberately do not claim exact surface/rail/track equivalence.
    if s.startswith('standard') or s in ('fast','slow'):
        return ('AW', 0)
    if not s:
        return None
    for word,index in [('heavy',5),('soft',4),('yielding',3),('good',2),('firm',1),('hard',0)]:
        if re.search(r'\b'+word+r'\b', s):
            return ('TURF',index)
    return None

def discipline(race):
    if race.get('discipline_conflict') is True:
        return None,'CONFLICTING_DISCIPLINE_SOURCES'
    secondary=family(race.get('secondary_run_type'))
    receipt=race.get('secondary_run_type_receipt') or {}
    url=urllib.parse.urlsplit(str(receipt.get('url','')))
    if secondary in FAMILIES and race.get('schedule_cross_checked') is True and url.scheme=='https' and url.hostname=='api.theracingapi.com' and re.fullmatch(r'[a-f0-9]{64}',str(receipt.get('sha256',''))):
        return secondary,'SECOND_PUBLISHER_STRUCTURED_TYPE'
    return family(race.get('run_type')),race.get('run_type_basis')

def context_signature(race):
    active = sorted((r for r in race.get('runners',[]) if r.get('active_runner') is True),key=lambda r:str(r['horse_id']))
    target,basis=discipline(race)
    return sha({'run_type':target,'run_type_basis':basis,
                'surface':race.get('surface'),'distance':race.get('distance'),'going':race.get('going'),
                'race_class':race.get('race_class'),'racecourse':race.get('racecourse'),
                'runners':[{k:r.get(k) for k in ('horse_id','name','runner_status','active_runner','draw','weight','official_rating')} for r in active]})

def outcome(past):
    position,count = past.get('position'),past.get('runner_count')
    if type(count) is not int or count < 2:
        return None
    casualty = past.get('casualty') or {}
    status=past.get('finish_status')
    if status in ('CONFLICTING_SOURCE_OUTCOME','OUTCOME_UNCONFIRMED'):
        return None
    reason = past.get('nonfinish_reason') or past.get('casualty_reason') or (casualty.get('reason') if isinstance(casualty,dict) else casualty)
    if not reason and status not in (None,'FINISHED','NON_FINISHER'):
        reason=status
    if status=='NON_FINISHER' and not reason:
        return None
    reason = str(reason or '').casefold().strip()
    normalized=re.sub(r'[^a-z]','',reason)
    known={re.sub(r'[^a-z]','',x) for x in NON_FINISH}
    if reason:
        if normalized in known:
            return 0.0,'KNOWN_NON_FINISH'
        return None
    if isinstance(position,str) and position.casefold().strip() in NON_FINISH:
        return 0.0,'KNOWN_NON_FINISH'
    if type(position) is int and 1 <= position <= count:
        return (count-position)/(count-1),'NUMERIC_FINISH'
    return None

def context_features(runner,race,cutoff):
    target_family = family(race['run_type'])
    target_distance,target_class,target_going = yards(race.get('distance')),number(race.get('race_class')),going(race.get('going'))
    rows,seen,unknown = [],set(),0
    for past in sorted(runner.get('previous_results',[]),key=lambda r:r.get('date',''),reverse=True):
        try:
            day=dt.date.fromisoformat(past['date']);age=(cutoff-day).days;pid=str(past['race_id'])
            if pid in seen or not 0 < age <= PARAMETERS['maximum_age_days'] or family(past.get('run_type')) != target_family:
                continue
            seen.add(pid)
            result=outcome(past)
            if result is None:
                unknown+=1
                # Do not silently omit recent falls/unknown outcomes and inflate form.
                if len(rows)<PARAMETERS['maximum_form_runs']:
                    return None,'UNRESOLVED_HISTORY_OUTCOME'
                continue
            percentile,kind=result;distance=yards(past.get('distance'));cls=number(past.get('race_class'));condition=going(past.get('going'))
            similarity={
                'distance':math.exp(-abs(math.log(distance/target_distance))/PARAMETERS['distance_log_scale']) if distance and target_distance else None,
                'going':1/(1+abs(condition[1]-target_going[1])) if condition and target_going and condition[0]==target_going[0] else None,
                'class':1/(1+abs(cls-target_class)) if cls is not None and target_class is not None else None,
                'course':float(str(past.get('course_name','')).strip().casefold()==str(race['racecourse']).strip().casefold()),
            }
            recency=2**(-age/PARAMETERS['recency_half_life_days'])
            # Context changes relative history weights, never a claim that an unproven factor causes wins.
            bonus=sum(PARAMETERS['similarity_bonus'][k]*v for k,v in similarity.items() if v is not None)
            weight=recency*(1+bonus)
            rows.append({'race_id':pid,'date':past['date'],'run_type':target_family,'position':past.get('position'),
                         'field_size':past['runner_count'],'outcome':kind,'finish_percentile':percentile,
                         'distance':past.get('distance'),'going':past.get('going'),'race_class':past.get('race_class'),
                         'course':past.get('course_name'),'recency_weight':recency,'similarities':similarity,'context_weight':weight})
            if len(rows)==PARAMETERS['maximum_form_runs']:
                break
        except (ValueError,KeyError,TypeError,OverflowError):
            continue
    if len(rows)<PARAMETERS['minimum_form_runs']:
        return None,'INSUFFICIENT_SAME_DISCIPLINE_HISTORY'
    total=sum(r['context_weight'] for r in rows)
    mean=sum(r['context_weight']*r['finish_percentile'] for r in rows)/total
    # Similarity bonus may change the mean but must not manufacture sample size/reliability.
    effective=sum(r['recency_weight'] for r in rows)
    reliability=effective/(effective+PARAMETERS['neutral_prior_runs'])
    return {'usable_runs':len(rows),'numeric_finishes':sum(r['outcome']=='NUMERIC_FINISH' for r in rows),
            'non_finishes':sum(r['outcome']=='KNOWN_NON_FINISH' for r in rows),'weighted_finish_percentile':mean,
            'shrunk_context_strength':.5+reliability*(mean-.5),
            'comparable_distance_runs':sum((r['similarities']['distance'] or 0)>=.5 for r in rows),
            'comparable_going_runs':sum((r['similarities']['going'] or 0)>=.5 for r in rows),
            'same_course_runs':sum(r['similarities']['course']==1 for r in rows),
            'comparable_class_runs':sum((r['similarities']['class'] or 0)>=.5 for r in rows),
            'effective_recency_runs':effective,'history':rows},None

def forecast(race,now):
    target,basis=discipline(race)
    if basis=='CONFLICTING_DISCIPLINE_SOURCES':
        return None,basis
    if target not in FAMILIES:
        return None,'UNKNOWN_RACE_DISCIPLINE'
    if not isinstance(basis,str) or not basis:
        return None,'DISCIPLINE_PROVENANCE_UNAVAILABLE'
    if race.get('surface') not in AW|{'TURF'}:
        return None,'UNKNOWN_RACE_SURFACE'
    if race.get('runner_data_status')!='SINGLE_SOURCE_RUNNERS_OBSERVED':
        return None,'RUNNER_FIELD_UNCONFIRMED'
    kickoff=stamp(race['startUTC'])
    if race.get('capture_phase')!='PRE_EVENT' or race.get('race_stage') not in ('DORMANT','GOINGDOWN','ATTHEPOST') or kickoff<=now+dt.timedelta(minutes=PARAMETERS['capture_buffer_minutes']):
        return None,'NOT_PRE_EVENT_WITH_BUFFER'
    if not dt.timedelta(minutes=-5)<=now-stamp(race['runner_observed_at_utc'])<=dt.timedelta(minutes=PARAMETERS['maximum_runner_age_minutes']):
        return None,'STALE_RUNNER_DATA'
    if yards(race.get('distance')) is None:
        return None,'RACE_DISTANCE_UNAVAILABLE'
    if going(race.get('going')) is None:
        return None,'CURRENT_GOING_UNAVAILABLE'
    runners=race.get('runners',[])
    if any(r.get('runner_status') not in ('RUNNER','NONRUNNER','WITHDRAWN') or r.get('active_runner')!=(r.get('runner_status')=='RUNNER') for r in runners):
        raise ValueError('Inconsistent runner status')
    if len({r['horse_id'] for r in runners})!=len(runners):
        raise ValueError('Duplicate horse identity')
    active=sorted((r for r in runners if r['active_runner']),key=lambda r:r['horse_id'])
    if len(active)<2 or len(active)!=race['active_runner_count']:
        return None,'INVALID_ACTIVE_FIELD'
    cutoff=min(now.astimezone(ZoneInfo('Europe/London')).date(),kickoff.astimezone(ZoneInfo('Europe/London')).date())
    rows=[]
    for runner in active:
        features,reason=context_features(runner,{**race,'run_type':target},cutoff)
        if reason:
            return None,reason
        rows.append({'horse_id':runner['horse_id'],'name':runner['name'],'context_features':features})
    logits=[PARAMETERS['softmax_temperature_inverse']*r['context_features']['shrunk_context_strength'] for r in rows]
    top=max(logits);weights=[math.exp(v-top) for v in logits];total=sum(weights)
    for row,weight in zip(rows,weights):
        row['model_probability']=weight/total
        row['equal_chance_reference']=1/len(rows)
    return {'schema_version':1,'model':MODEL,'race_id':race['race_id'],'racecourse':race['racecourse'],
            'race_name':race['name'],'startUTC':race['startUTC'],'source':race['source'],'generated_at_utc':now.isoformat(),
            'parameters':PARAMETERS,'runners':rows,'active_runner_count':len(rows),'run_type':target,'run_type_basis':basis,
            'surface':race['surface'],'going':race.get('going'),'distance':race['distance'],'race_class':race.get('race_class'),
            'discipline_source_receipt':race.get('secondary_run_type_receipt') if basis=='SECOND_PUBLISHER_STRUCTURED_TYPE' else None,
            'context_signature':context_signature(race),'runner_source_sha256':race['runner_source_sha256'],
            'runner_observed_at_utc':race['runner_observed_at_utc'],'research_only':True,'reference_only':False,
            'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','challenge_eligible':0,
            'independent_timestamp_attested':False,'historical_first_availability_verified':False,
            'odds':None,'expected_value':None,'limitation':LIMITATION},None

def validate_record(record,path=None):
    unsigned=dict(record);digest=unsigned.pop('record_sha256',None)
    if digest!=sha(unsigned) or (path and path.stem!=digest):
        raise ValueError('Context archive integrity failure')
    if record.get('model')!=MODEL or record.get('research_only') is not True or record.get('publication_gate')!='BLOCKED' or record.get('model_validation')!='UNVALIDATED' or record.get('challenge_eligible')!=0:
        raise ValueError('Unsafe context record')
    if stamp(record['generated_at_utc'])>=stamp(record['startUTC'])-dt.timedelta(minutes=PARAMETERS['capture_buffer_minutes']):
        raise ValueError('Context forecast captured too late')
    rows=record['runners'];ps=[r['model_probability'] for r in rows]
    if len(rows)<2 or len({r['horse_id'] for r in rows})!=len(rows) or any(type(p) not in (int,float) or not math.isfinite(p) or not 0<p<1 for p in ps) or abs(sum(ps)-1)>1e-8:
        raise ValueError('Invalid context vector')
    return record

def signature(record):
    return sha({k:record[k] for k in ('model','race_id','startUTC','parameters','runners','context_signature')})

def archive_forecasts(data,now,directory):
    check_feed(data,now)
    existing=[validate_record(json.loads(p.read_text()),p) for p in sorted(directory.glob('*.json'))]
    latest={}
    for r in existing:
        key=(r['race_id'],r['startUTC'])
        if key not in latest or stamp(r['generated_at_utc'])>stamp(latest[key]['generated_at_utc']):latest[key]=r
    seen,current,skipped,new=set(),[],[],[]
    for race in data['races']:
        if race['race_id'] in seen:raise ValueError('Duplicate context source race')
        seen.add(race['race_id']);record,reason=forecast(race,now)
        if reason:
            skipped.append({'race_id':race['race_id'],'reason':reason,'run_type':race.get('run_type'),'surface':race.get('surface')});continue
        previous=latest.get((record['race_id'],record['startUTC']))
        if previous and signature(previous)==signature(record):
            current.append(previous);continue
        record['revision_of']=previous['record_sha256'] if previous else None
        record['record_sha256']=sha(record);validate_record(record);new.append(record);current.append(record)
    if new:directory.mkdir(parents=True,exist_ok=True)
    for record in new:
        with (directory/(record['record_sha256']+'.json')).open('x') as f:f.write(json.dumps(record,indent=2)+'\n')
    return current,existing+new,skipped

def field_checks(data,records,now):
    races={r['race_id']:r for r in data['races']};checks={}
    for f in records:
        r=races.get(f['race_id']);status='RUNNER_OBSERVATION_UNAVAILABLE';observed=None;ids=[];digest=None;source_hash=None
        if r and r.get('runner_data_status')=='SINGLE_SOURCE_RUNNERS_OBSERVED':
            observed=r.get('runner_observed_at_utc');ids=sorted(x['horse_id'] for x in r['runners'] if x.get('active_runner') is True)
            digest=context_signature(r);source_hash=r.get('runner_source_sha256');age=now-stamp(observed)
            if not dt.timedelta(minutes=-5)<=age<=dt.timedelta(minutes=PARAMETERS['maximum_runner_age_minutes']):status='STALE_RUNNER_OBSERVATION'
            elif ids!=sorted(x['horse_id'] for x in f['runners']):status='FIELD_DIFFERS_FROM_FROZEN_FORECAST'
            elif abs((stamp(r['startUTC'])-stamp(f['startUTC'])).total_seconds())>60:status='SCHEDULE_CHANGED'
            elif digest!=f['context_signature']:status='RACE_CONDITIONS_CHANGED'
            else:status='FRESH_MATCHING_FIELD_AND_CONTEXT'
        checks[f['record_sha256']]={'status':status,'runner_observed_at_utc':observed,'active_runner_ids':ids,
                                   'active_runner_count':len(ids),'context_signature':digest,'runner_source_sha256':source_hash,
                                   'checked_at_utc':now.isoformat()}
    return checks

def main():
    data=json.loads((WORK/'racing-research-data.json').read_text());now=dt.datetime.now(UTC)
    current,archived,skipped=archive_forecasts(data,now,ROOT/'research/horse-context-archive/v1')
    performance=score_provisional(archived,now,ROOT/'research/horse-context-results/v1/provisional.json')
    from horse_evaluation import evaluate
    from horse_secondary_source import corroborate
    secondary_path=WORK/'secondary-result-cache.json'
    secondary=json.loads(secondary_path.read_text()) if secondary_path.exists() else []
    frozen={r['record_sha256']:r for r in archived};checked=[];pending=[]
    for entry in performance['entries']:
        evidence,reason=corroborate(frozen[entry['record_sha256']],entry,secondary)
        if evidence:checked.append({**entry,'cross_source_evidence':evidence})
        else:pending.append({'race_id':entry['race_id'],'reason':reason})
    performance['cross_source_verified_results']=len(checked)
    performance['cross_source_entries']=checked;performance['cross_source_pending']=pending
    performance['evaluation']=evaluate(archived,performance['entries'])
    disciplines={kind:sum(r['run_type']==kind for r in current) for kind in sorted(FAMILIES)}
    public={'schema_version':1,'generated_at_utc':now.isoformat(),'research_only':True,'publication_gate':'BLOCKED',
            'model_validation':'UNVALIDATED','official_challenge':'0/100','model':MODEL,'parameters':PARAMETERS,
            'forecasts':current,'skipped':skipped,'current_field_checks':field_checks(data,current,now),
            'coverage':{'observed_races':len(data['races']),'forecast_count':len(current),'discipline_counts':disciplines,'skipped_count':len(skipped)},
            'performance':performance,'settled_forecasts':settled_history(archived,performance),
            'limitations':[LIMITATION,'Every active runner requires three dated same-discipline resolved outcomes. Known non-finishes receive zero finish percentile; unresolved outcomes block forecasts.',
                           'Discipline provenance is retained; historical outcomes never include capture/race day. No prospective improvement is established before forward scoring.',
                           'This lane is separate from the existing all-weather baseline and failed held-out AW challenger.']}
    (WORK/'horse-context-data.json').write_text(json.dumps(public,indent=2)+'\n')
    print(json.dumps({'context_forecasts':len(current),'disciplines':disciplines,'skipped':len(skipped),'scored':performance['scored_forecasts']}))

if __name__=='__main__':main()
