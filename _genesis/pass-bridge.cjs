'use strict';

const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto');
const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const action = 'read_fixture_pass';
const route = /^\/api\/v1\/genesis-bridge\/fixtures\/racing\/([0-9]{1,20})\/pass$/;
const verdictFeed = path.join(__dirname, '../racing-research/recommendations.json');
const sign = (key, message) => createHmac('sha256', key).update(message).digest('hex');
const text = value => typeof value === 'string' && value.trim() ? value : null;
const utcInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const stamp = value => typeof value === 'string' && utcInstant.test(value) ? Date.parse(value) : NaN;
const iso = value => Number.isFinite(value) ? new Date(value).toISOString() : null;

function explainPass(document, id, now = Date.now()) {
  const reviewed = stamp(document?.reviewed_at_utc);
  const expires = stamp(document?.review_expires_at_utc);
  if (document?.schema_version !== 1 || document.research_only !== true ||
      document.publication_gate !== 'BLOCKED' || document.model_validation !== 'UNVALIDATED' ||
      !Number.isFinite(reviewed) || reviewed > now || !(expires > reviewed && expires - reviewed <= 1800000) ||
      !Array.isArray(document.decisions)) return { status: 'source_unavailable' };

  const matches = document.decisions.filter(decision => decision?.race_id === id);
  if (matches.length !== 1) return { status: matches.length ? 'ambiguous_fixture' : 'fixture_not_found' };
  const record = matches[0];
  const start = stamp(record.startUTC);
  if (!(start > reviewed) || !text(record.race)) return { status: 'source_unavailable' };
  if (!/^PASS\b/.test(text(record.betting_verdict) ?? '')) return { status: 'no_recorded_pass' };

  const reasons = Object.entries({
    editorial_reason: record.reason, counterpoint: record.counter, price_reason: record.why_price_matters,
  }).map(([field, value]) => ({ field, status: text(value) ? 'recorded' : 'missing', text: text(value) }));

  let source = null;
  if (text(record.price_source) && URL.canParse(record.price_source)) {
    const url = new URL(record.price_source);
    if (url.protocol === 'https:' && !url.username && !url.password) source = url.origin + url.pathname;
  }
  const observed = stamp(record.price_observed_at_utc);
  const reference = Number.isFinite(record.price_decimal_reference) && record.price_decimal_reference > 1 ?
    record.price_decimal_reference : null;
  const observation = source || Number.isFinite(observed) || reference !== null;
  let oddsStatus = 'missing';
  if (observation) {
    if (!source || !Number.isFinite(observed) || reference === null) oddsStatus = 'incomplete';
    else if (observed > reviewed || observed >= start - 300000) oddsStatus = 'outside_capture_window';
    else oddsStatus = now >= expires || now >= start - 300000 || now - observed > 1800000 ?
      'stale_reference' : 'unverified_reference';
  }

  return {
    status: 'ok',
    fixture: { sport: 'racing', id, name: record.race, start_utc: iso(start) },
    decision: { code: 'PASS', status: 'recorded', betting_verdict: record.betting_verdict,
      paper_verdict: text(record.paper_verdict), selection: text(record.selection), reviewed_at_utc: iso(reviewed),
      review_expires_at_utc: iso(expires), archived: now >= expires || now >= start - 300000,
      source: 'racing-research/recommendations.json' },
    reasons,
    odds: { status: oddsStatus, source, observed_at_utc: iso(observed), decimal_reference: reference,
      recorded_note: text(record.price), verified: false },
    model: { version: null, version_status: 'missing_from_decision_record', validation: document.model_validation },
    safeguards: { research_only: true, racing_mode: 'PAPER_ONLY', publication_gate: 'BLOCKED',
      football_publication_gate: 'BLOCKED', actionable: false },
  };
}

function createBridge(key, load = () => JSON.parse(readFileSync(verdictFeed, 'utf8'))) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Bridge configuration unavailable');
  const nonces = new Map();
  const server = createServer({ maxHeaderSize: 4096, headersTimeout: 3000, requestTimeout: 3000 }, (req, res) => {
    function send(code, payload, nonce) {
      const body = JSON.stringify(payload);
      const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
      if (nonce) headers['X-UI-Bridge-Proof'] = sign(key, 'response-v1\n' + nonce + '\n' + body);
      res.writeHead(code, headers).end(body);
    }

    const match = route.exec(req.url);
    if (!match) return send(404, { status: 'unsupported_route' });
    if (req.method !== 'GET') return send(405, { status: 'unsupported_method' });
    if (req.socket.remoteAddress !== '127.0.0.1' || req.headers.origin ||
        req.headers.host !== '127.0.0.1:' + req.socket.localPort) return send(403, { status: 'scope_refused' });

    const proof = /^(\d{10})\.([0-9a-f]{32})\.([0-9a-f]{64})$/.exec(req.headers['x-ui-bridge-proof']);
    if (!proof || req.headers['x-ui-bridge-action'] !== action) return send(401, { status: 'credential_refused' });
    const [, sentAt, nonce, signature] = proof;
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    if (Math.abs(seconds - Number(sentAt)) > 15 || !timingSafeEqual(Buffer.from(signature, 'hex'),
      Buffer.from(sign(key, ['request-v1', req.method, req.url, action, sentAt, nonce].join('\n')), 'hex')))
      return send(401, { status: 'credential_refused' });

    for (const [used, expiry] of nonces) if (expiry <= seconds) nonces.delete(used);
    if (nonces.has(nonce)) return send(401, { status: 'credential_refused' });
    if (nonces.size >= 128) return send(429, { status: 'busy' });
    nonces.set(nonce, seconds + 32);

    let result;
    try { result = explainPass(load(), match[1], now); }
    catch { result = { status: 'source_unavailable' }; }
    if (result.status === 'source_unavailable') return send(503, result);
    // Application-level misses are signed too so Genesis can distinguish them from network failures.
    const payload = { version: 1, receipt_id: randomUUID(), ...result };
    if (Buffer.byteLength(JSON.stringify(payload)) > 24 * 1024) return send(503, { status: 'source_unavailable' });
    return send(200, payload, nonce);
  });
  server.setTimeout(3000, socket => socket.destroy());
  server.maxConnections = 8;
  return server;
}

if (require.main === module) {
  const hash = process.env.VW_GENESIS_BRIDGE_TOKEN_SHA256 ?? '';
  const port = Number(process.env.VW_GENESIS_BRIDGE_PORT ?? 8766);
  if (!/^[0-9a-f]{64}$/.test(hash) || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Local Value Watch bridge disabled. Check process configuration.');
    process.exitCode = 1;
  } else {
    delete process.env.VW_GENESIS_BRIDGE_TOKEN_SHA256;
    const server = createBridge(Buffer.from(hash, 'hex'));
    server.on('error', () => {
      console.error('Local Value Watch bridge could not start.');
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1');
  }
}

module.exports = { explainPass, createBridge };
