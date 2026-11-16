'use strict';
const assert=require('node:assert/strict');
const C=require('../validation-centre/core.js');
const sha='a'.repeat(64),sha2='b'.repeat(64);
const start='2026-11-17T15:00:00Z',forecastAt='2026-11-17T10:00:00Z',observed='2026-11-17T18:00:00Z';
const prediction={prediction_id:'p-001',sport:'football',event_id:'f-001',model_version:'MODEL_V1',
 market:'FULL_TIME_1X2',recorded_at_utc:forecastAt,event_start_utc:start,snapshot_sha256:sha,
 probabilities:{H:0.5,D:0.3,A:0.2}};
const outcome={sport:'football',event_id:'f-001',market:'FULL_TIME_1X2',actual_outcome:'H',observed_at_utc:observed,
 independently_verified:true,source_receipts:[
  {url:'https://example.org/results/1',sha256:sha,observed_at_utc:observed},
  {url:'https://example.net/results/1',sha256:sha2,observed_at_utc:observed}]};
const ledger=a=>({schemaVersion:1,kind:'PROSPECTIVE_PREDICTION_LEDGER',records:a});
const results=a=>({schemaVersion:1,kind:'VERIFIED_OUTCOME_FEED',records:a});
const empty=C.evaluate(ledger([]),results([]));
assert.equal(empty.state,'NO_INDEPENDENTLY_MATCHED_FORECASTS');
assert.equal(empty.audit.eligiblePairs,0);
assert.equal(Object.keys(empty.bySport).length,7);
assert(C.SPORTS.some(s=>s.id==='rugby_union')&&C.SPORTS.some(s=>s.id==='rugby_league'));
const paired=C.evaluate(ledger([prediction]),results([outcome]));
assert.equal(paired.audit.eligiblePairs,1);
assert.equal(paired.bySport.football.status,'DESCRIPTIVE_PAIRED_EVIDENCE_ONLY');
assert(Math.abs(paired.bySport.football.brier-(.25+.09+.04))<1e-9);
assert(Math.abs(paired.bySport.football.logLoss-Math.log(2))<1e-9);
assert.equal(paired.modelValidated,false);
assert.equal(paired.bettingEligible,false);
assert.equal(C.evaluate(ledger([{...prediction,recorded_at_utc:start}]),results([outcome])).audit.invalidPredictions,1);
assert.equal(C.evaluate(ledger([{...prediction,probabilities:{H:.7,D:.3,A:.2}}]),results([outcome])).audit.invalidPredictions,1);
assert.equal(C.evaluate(ledger([{...prediction,odds:2}]),results([outcome])).audit.invalidPredictions,1);
assert.equal(C.evaluate(ledger([prediction]),results([{...outcome,sport:'tennis'}])).audit.unmatchedPredictions,1);
assert.equal(C.evaluate(ledger([prediction]),results([{...outcome,event_id:'f-002'}])).audit.unmatchedPredictions,1);
assert.equal(C.evaluate(ledger([prediction]),results([{...outcome,observed_at_utc:forecastAt}])).audit.chronologyFailures,1);
assert.equal(C.evaluate(ledger([prediction]),results([{...outcome,source_receipts:[outcome.source_receipts[0]]}])).audit.invalidOutcomes,1);
assert.equal(C.evaluate(ledger([prediction]),results([{...outcome,source_receipts:[outcome.source_receipts[0],{...outcome.source_receipts[1],url:'https://example.org/other'}]}])).audit.invalidOutcomes,1);
assert.equal(C.evaluate(ledger([prediction,prediction]),results([outcome])).audit.duplicatePredictions,1);
assert.equal(C.evaluate(ledger([prediction]),results([outcome,outcome])).audit.duplicateOutcomes,1);
assert.equal(C.evaluate(ledger([prediction]),results([])).audit.unmatchedPredictions,1);
assert.equal(C.evaluate(ledger([]),{}).state,'INVALID_ARCHIVE');
const source={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
 generated_at_utc:'2026-11-16T01:00:00Z'};
const actualTime=Date.parse('2026-11-16T02:00:00Z');
const feedStatus=C.sourceHealth({'research-dashboard-data.json':source},actualTime);
assert.equal(feedStatus.length,7);
assert.equal(feedStatus[0].sourceStatus,'CURRENT');
assert.equal(feedStatus.find(s=>s.id==='racing').sourceStatus,'UNAVAILABLE_OR_INVALID');
assert.equal(C.ageStatus(source.generated_at_utc,actualTime,36),'CURRENT');
assert.equal(C.ageStatus(source.generated_at_utc,actualTime+50*3600000,36),'STALE');
const legacy=C.descriptiveHistory({...source,entries:[{model:'LEGACY_ARCHIVE'}]});
assert.equal(legacy.status,'LEGACY_DESCRIPTIVE_NOT_PROSPECTIVE');
assert.equal(legacy.count,1);
console.log('Independent validation: seven divisions, strict matching, chronology, duplicate/result evidence and descriptive-only scoring passed');
