#!/usr/bin/env node
// Isolated retrospective market comparison; no network access or trading operations.
// Private provider CSVs must be lawfully obtained and remain outside repository.
// Node >= 18. Uses only local files and writes an aggregate-only JSON report.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const MODEL_PATH = 'research/football-baseline-v1/608-reconstructed-forecasts.json';
const MARKET_FAMILIES = {
  B365C: ['B365CH', 'B365CD', 'B365CA'],
  PSC: ['PSCH', 'PSCD', 'PSCA'],
  AvgC: ['AvgCH', 'AvgCD', 'AvgCA'],
};
const ALIASES = {
  'Manchester United FC': 'Man United',
  'Manchester City FC': 'Man City',
  'Tottenham Hotspur FC': 'Tottenham',
  'Newcastle United FC': 'Newcastle',
  'Nottingham Forest FC': "Nott'm Forest",
  'Wolverhampton Wanderers FC': 'Wolves',
  'Brighton & Hove Albion FC': 'Brighton',
  'West Ham United FC': 'West Ham',
  'Leicester City FC': 'Leicester',
  'Ipswich Town FC': 'Ipswich',
  'Southampton FC': 'Southampton',
  'AFC Bournemouth': 'Bournemouth',
  'Aston Villa FC': 'Aston Villa',
  'Crystal Palace FC': 'Crystal Palace',
  'Brentford FC': 'Brentford',
  'Liverpool FC': 'Liverpool',
  'Chelsea FC': 'Chelsea',
  'Arsenal FC': 'Arsenal',
  'Fulham FC': 'Fulham',
  'Everton FC': 'Everton',
  'Leeds United FC': 'Leeds',
  'Burnley FC': 'Burnley',
  'Sunderland AFC': 'Sunderland',
};

export function csvRows(csvText) {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; ++i) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; ++i; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') ++i;
      row.push(value);
      if (row.some(x => x !== '')) rows.push(row);
      row = []; value = '';
    } else value += ch;
  }
  if (quoted) throw new Error('Unterminated CSV quoted field');
  if (value || row.length) { row.push(value); rows.push(row); }
  if (!rows.length) throw new Error('Empty CSV');
  const header = rows.shift();
  if (new Set(header).size !== header.length) throw new Error('Duplicate CSV header');
  return rows.map((values, i) => {
    if (values.length !== header.length) throw new Error('Malformed CSV row ' + (i + 2));
    return Object.fromEntries(header.map((h, j) => [h, values[j]]));
  });
}
export function normalizeDate(s) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) throw new Error('Unsupported date: ' + s);
  const year = m[3].length === 2 ? '20' + m[3] : m[3];
  return year + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
}
const normalizeTeam = x => String(ALIASES[x] || x).toLowerCase().replace(/[^a-z0-9]/g, '');
const identity = (season, date, home, away) =>
  [season, normalizeDate(date), normalizeTeam(home), normalizeTeam(away)].join('|');
const score = (p, y) => ({
  log_loss: -Math.log(p[y]),
  brier: p.reduce((s, v, i) => s + (v - (i === y ? 1 : 0)) ** 2, 0),
  correct: p.indexOf(Math.max(...p)) === y ? 1 : 0,
});
const mean = (items, key) => items.reduce((s, x) => s + x[key], 0) / items.length;

export function compare(modelData, seasonCsvs, prefix = 'B365C', expected = 608) {
  if (!MARKET_FAMILIES[prefix]) throw new Error('Unsupported price family: ' + prefix);
  if (!Array.isArray(modelData.rows)) throw new Error('Missing model forecast rows');
  const sourceMap = new Map(), seenModels = new Set();
  const inputCounts = {};
  for (const season of ['2024-25', '2025-26']) {
    if (typeof seasonCsvs[season] !== 'string') throw new Error('Missing CSV for ' + season);
    const csv = csvRows(seasonCsvs[season]);
    inputCounts[season] = csv.length;
    for (const r of csv) {
      const key = identity(season, r.Date, r.HomeTeam, r.AwayTeam);
      if (sourceMap.has(key)) throw new Error('Ambiguous duplicate odds fixture: ' + key);
      sourceMap.set(key, r);
    }
  }
  const paired = [], excluded = { missing_fixture: 0, missing_prices: 0 };
  for (const row of modelData.rows) {
    const key = identity(row.season, row.date, row.home, row.away);
    if (seenModels.has(key)) throw new Error('Duplicate model fixture: ' + key);
    seenModels.add(key);
    const odds = sourceMap.get(key);
    if (!odds) { excluded.missing_fixture++; continue; }
    if (!Array.isArray(row.ft) || Number(odds.FTHG) !== row.ft[0] || Number(odds.FTAG) !== row.ft[1])
      throw new Error('Full-time outcome conflict for ' + key);
    const dec = MARKET_FAMILIES[prefix].map(col => {
      const raw = odds[col];
      return raw === '' || raw === undefined ? NaN : Number(raw);
    });
    if (!dec.every(v => Number.isFinite(v) && v > 1)) { excluded.missing_prices++; continue; }
    const inv = dec.map(v => 1 / v);
    const overround = inv.reduce((s, v) => s + v, 0);
    const market = inv.map(v => v / overround);
    const y = row.winner_index;
    if (![0, 1, 2].includes(y)) throw new Error('Invalid result label for ' + key);
    const p0 = row.p_unadjusted, p1 = row.p_recent_form_alpha_0_025;
    for (const p of [p0, p1]) {
      if (!Array.isArray(p) || p.length !== 3 || p.some(x => !Number.isFinite(x) || x <= 0) ||
          Math.abs(p.reduce((s, x) => s + x, 0) - 1) > 1e-8)
        throw new Error('Invalid model probability vector: ' + key);
    }
    paired.push({ season: row.season, overround, market: score(market, y),
      unadjusted: score(p0, y), form: score(p1, y) });
  }
  if (expected !== null && modelData.rows.length !== expected)
    throw new Error('Expected ' + expected + ' model rows, got ' + modelData.rows.length);
  if (!paired.length) throw new Error('No eligible exact model-versus-market fixture pairs');

  const summarize = subset => {
    if (!subset.length) return { n: 0 };
    const stats = { n: subset.length, mean_raw_overround: mean(subset, 'overround') };
    for (const variant of ['market', 'unadjusted', 'form']) {
      stats[variant] = {
        mean_log_loss: subset.reduce((s, x) => s + x[variant].log_loss, 0) / subset.length,
        mean_multiclass_brier: subset.reduce((s, x) => s + x[variant].brier, 0) / subset.length,
        top1_accuracy: subset.reduce((s, x) => s + x[variant].correct, 0) / subset.length,
      };
    }
    stats.form_minus_market_log_loss = stats.form.mean_log_loss - stats.market.mean_log_loss;
    return stats;
  };
  return {
    status: 'RETROSPECTIVE_DESCRIPTIVE_ONLY', research_only: true,
    model_validation: 'UNVALIDATED', publication_gate: 'BLOCKED',
    model_origin: 'INDEPENDENT_RECONSTRUCTION_NOT_ORIGINAL_SKY',
    quotes_time_attested: false, bookmaker_licence_verified: false,
    odds_family: prefix, outcome_order: ['home', 'draw', 'away'],
    normalization: 'proportional_recipient_odds_inverse',
    input_csv_counts: inputCounts, model_rows: modelData.rows.length,
    excluded, overall: summarize(paired),
    by_season: Object.fromEntries(['2024-25', '2025-26'].map(
      s => [s, summarize(paired.filter(x => x.season === s))])),
    warning: 'Closing odds are copied historical data, not independently timestamp-certified or executable prices. This comparison does not prove live market edge, ROI or original Sky model performance.',
  };
}
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 7) {
    console.error('Usage: node compare.mjs MODEL_JSON SEASON_2425.csv SEASON_2526.csv B365C|PSC|AvgC OUTPUT.json');
    process.exit(2);
  }
  const [modelPath, file2425, file2526, prefix, outputPath] = process.argv.slice(2);
  const text0 = fs.readFileSync(file2425, 'utf8'), text1 = fs.readFileSync(file2526, 'utf8');
  const modelText = fs.readFileSync(modelPath, 'utf8');
  const output = compare(JSON.parse(modelText), { '2024-25': text0, '2025-26': text1 }, prefix);
  output.local_input_sha256 = {
    model: sha(modelText), season_2425: sha(text0), season_2526: sha(text1),
  };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ output: outputPath, overall: output.overall,
    excluded: output.excluded, status: output.status }, null, 2));
}
