'use strict';

const assert = require('node:assert/strict');
const { createHmac, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { request } = require('node:http');
const test = require('node:test');
const { createBridge, explainPass } = require('./pass-bridge.cjs');
const feed = require('../racing-research/recommendations.json');

const duringReview = Date.parse('2026-11-03T18:46:00Z');
const afterReview = Date.parse('2026-11-03T19:46:00Z');

test('real Wolverhampton PASS exposes recorded reasons with missing odds and model version', () => {
  const result = explainPass(feed, '946749', afterReview);
  const original = feed.decisions.find(row => row.race_id === '946749');
  assert.equal(result.decision.betting_verdict, original.betting_verdict);
  assert.equal(result.reasons[0].text, original.reason);
  assert.equal(result.decision.archived, true);
  assert.equal(result.odds.status, 'missing');
  assert.equal(result.odds.source, null);
  assert.equal(result.odds.observed_at_utc, null);
  assert.equal(result.model.version, null);
  assert.equal(result.model.validation, 'UNVALIDATED');
  assert.equal(result.safeguards.racing_mode, 'PAPER_ONLY');
  assert.equal(result.safeguards.football_publication_gate, 'BLOCKED');
  assert.equal(result.safeguards.actionable, false);
});

test('recorded historical odds retain provenance as a stale, unverified reference', () => {
  const current = explainPass(feed, '946748', duringReview);
  const archived = explainPass(feed, '946748', afterReview);
  assert.equal(current.odds.status, 'unverified_reference');
  assert.equal(current.decision.archived, false);
  assert.equal(archived.odds.status, 'stale_reference');
  assert.equal(archived.odds.source, 'https://www.attheraces.com/tips/atr-tipsters/hugh-taylor');
  assert.equal(archived.odds.observed_at_utc, '2026-11-03T18:42:10.000Z');
  assert.equal(archived.odds.verified, false);
});

test('incomplete evidence, ambiguous IDs and unrecorded verdicts remain distinct', () => {
  const copy = structuredClone(feed);
  assert.equal(explainPass(copy, '000000', afterReview).status, 'fixture_not_found');
  delete copy.decisions[0].reason;
  delete copy.decisions[0].price_observed_at_utc;
  const partial = explainPass(copy, '946748', afterReview);
  assert.deepEqual(partial.reasons[0], { field: 'editorial_reason', status: 'missing', text: null });
  assert.equal(partial.odds.status, 'incomplete');
  copy.decisions[0].price_observed_at_utc = '2026-11-03';
  assert.equal(explainPass(copy, '946748', afterReview).odds.status, 'incomplete');
  copy.decisions[0].price_observed_at_utc = '2026-11-03T18:50:00Z';
  assert.equal(explainPass(copy, '946748', afterReview).odds.status, 'outside_capture_window');
  copy.decisions[0].betting_verdict = 'NOT REVIEWED';
  assert.equal(explainPass(copy, '946748', afterReview).status, 'no_recorded_pass');
  copy.decisions.push(copy.decisions[0]);
  assert.equal(explainPass(copy, '946748', afterReview).status, 'ambiguous_fixture');
  copy.publication_gate = 'OPEN';
  assert.equal(explainPass(copy, '946749', afterReview).status, 'source_unavailable');
});

test('loopback request and response signatures match the Genesis protocol', async t => {
  const key = randomBytes(32);
  const server = createBridge(key);
  t.after(() => server.close());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const action = 'read_fixture_pass';
  const route = '/api/v1/genesis-bridge/fixtures/racing/946749/pass';
  const mac = content => createHmac('sha256', key).update(content).digest('hex');
  const credential = (target, sent = Math.floor(Date.now() / 1000)) => {
    const nonce = randomBytes(16).toString('hex');
    return { nonce, headers: { 'X-UI-Bridge-Action': action,
      'X-UI-Bridge-Proof': [sent, nonce, mac(['request-v1', 'GET', target, action, sent, nonce].join('\n'))].join('.') } };
  };
  const call = (target, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', path: target, port, method, headers }, async res => {
      const chunks = [];
      for await (const data of res) chunks.push(data);
      resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() });
    });
    req.on('error', reject).end();
  });
  const { nonce, headers } = credential(route);
  const result = await call(route, headers);
  assert.equal(result.status, 200);
  assert.equal(result.headers['x-ui-bridge-proof'], mac('response-v1\n' + nonce + '\n' + result.body));
  assert.equal(JSON.parse(result.body).decision.code, 'PASS');
  assert.equal((await call(route, headers)).status, 401);
  assert.equal((await call(route)).status, 401);
  const rebound = credential(route);
  assert.equal((await call(route.replace('946749', '946748'), rebound.headers)).status, 401);
  const old = credential(route, Math.floor(Date.now() / 1000) - 60);
  assert.equal((await call(route, old.headers)).status, 401);
  const browser = credential(route);
  assert.equal((await call(route, { ...browser.headers, Origin: 'https://example.test' })).status, 403);
  assert.equal((await call(route, {}, 'POST')).status, 405);
  assert.equal((await call(route + '?anything=1')).status, 404);
  const unknown = route.replace('946749', '000000');
  const missing = await call(unknown, credential(unknown).headers);
  assert.equal(missing.status, 200);
  assert.equal(JSON.parse(missing.body).status, 'fixture_not_found');
});
