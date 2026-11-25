'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {sides, fixtures, matchPoll, metrics, comparison, movement, maxAge} = require('../market-intelligence/comparison-core.cjs');

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const uk = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', dateStyle:'medium', timeStyle:'short'});
const time = ms => '<time datetime="' + new Date(ms).toISOString() + '">' + uk.format(ms) + ' UK</time>';
const pc = n => (n * 100).toFixed(2) + '%';
const number = n => n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
const title = side => ({home:'Home', draw:'Draw', away:'Away'}[side]);
const book = key => escape(key === 'skybet' ? 'Sky Bet' : key);
const slot = /<section id="pl-comparison"[^>]*>[\s\S]*?<\/section><!-- end pl-comparison -->/g;

function mergePoll(ledger, poll, rows, allowed, now) {
  const checked = typeof poll?.checked === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(poll.checked) ? Date.parse(poll.checked) : NaN;
  if (!['ok', 'empty', 'failed'].includes(poll?.status) || !Array.isArray(poll.records) ||
      poll.records.length > 1000 || !poll.records.every(row => row && typeof row === 'object') ||
      !Number.isFinite(checked) || checked > now || checked < (ledger.checked ?? -Infinity)) {
    return {...ledger, status:'failed'};
  }
  const digest = createHash('sha256').update(JSON.stringify(poll)).digest('hex');
  if (checked === ledger.checked) return digest === ledger.digest ? ledger : {...ledger,status:'failed'};
  const {accepted, rejects, rejected} = matchPoll(rows, poll.status === 'ok' ? poll.records : [], checked, allowed);
  return {checked, digest, status: poll.status === 'ok' && !accepted.length ? 'empty' : poll.status,
    rejects, rejected, observations:[...ledger.observations, ...accepted.map(row => ({...row,poll:checked}))]};
}

function historical(rows, start, now) {
  const result = movement(rows, start, now);
  if (!result) return '';
  const {earliest, latest, close, outcomes} = result;
  const prices = row => sides.map(side => number(row.prices[side])).join(' / ');
  return '<details><summary>' + book(latest.bookmaker) + ' · observation history</summary>' +
    '<p>Earliest ' + prices(earliest) + ' · ' + time(earliest.observed) +
    '<br>Latest ' + prices(latest) + ' · ' + time(latest.observed) +
    '<br>Closing ' + (close ? prices(close) + ' · ' + time(close.observed) : 'unavailable') +
    '<br>' + rows.length + ' polls, including unchanged prices</p><ul>' + sides.map(side => {
      const out = outcomes[side];
      return '<li>' + title(side) + ' · odds change ' + number(out.oddsDelta) +
        ' · implied change ' + (out.impliedDelta * 100).toFixed(2) + ' pp' +
        (out.closingComparison === null ? '' : ' · earliest-to-close CLV proxy ' + pc(out.closingComparison)) + '</li>';
    }).join('') + '</ul></details>';
}

function renderFixture(fixture, rows, ledger, now, active) {
  // A bookmaker must appear in the latest successful poll to be displayed as current.
  const duringPoll = active && ledger.status === 'ok' ? rows.filter(row => row.poll === ledger.checked) : [];
  const {books, best, current} = comparison(duringPoll, now);
  const expires = current.length ? Math.min(fixture.start, ...current.map(row => row.observed + maxAge)) : now;
  const status = books ? (books === 1 ? 'One bookmaker checked · single-source prices' : 'Best found among ' + books + ' checked') :
    ledger.status === 'failed' ? 'Source failed · current prices withheld' :
    ledger.status === 'empty' ? 'Empty or unmatched source refresh · current prices withheld' :
    duringPoll.length ? 'Prices expired' : 'No matched current market';
  return '<article><h3>' + escape(fixture.home + ' v ' + fixture.away) + '</h3><p>' + time(fixture.start) + '</p>' +
    '<div hidden data-pl-current data-expires="' + expires + '">' + (books ?
    '<p>' + status + ' · exact fixture and complete market matched · execution unverified</p><ul>' +
    sides.map(side => '<li>' + title(side) + ' · ' + number(best[side][0].prices[side]) + ' · ' +
      best[side].map(row => book(row.bookmaker) + ' · ' + time(row.observed)).join('; ') + '</li>').join('') +
    '</ul>' + current.map(row => {
      const m = metrics(row.prices);
      return '<p>' + book(row.bookmaker) + ' · overround ' + pc(m.overround) +
        ' · margin-adjusted reference (proportional de-vig): ' +
        sides.map(side => title(side) + ' ' + pc(m.outcomes[side].probability) + ' / fair ' +
          m.outcomes[side].fairOdds.toFixed(2)).join(' · ') + '</p>';
    }).join('') : '') + '</div><p data-pl-status' + (books ? ' hidden' : '') + '>' +
    (books ? 'Prices expired · last observations are historical' : status) + '</p>' +
    [...new Set(rows.map(row => row.bookmaker))].map(key =>
      historical(rows.filter(row => row.bookmaker === key), fixture.start, now)).join('') + '</article>';
}
function render(html, ledger, rows, allowed, enabled, now) {
  if ([...html.matchAll(slot)].length !== 1) throw Error('Comparison markup missing or repeated.');
  if (!enabled) return html;
  const scheduled = fixtures(rows.filter(row => row.result == null && !/POSTPON|CANCEL|ABANDON/i.test(row.status || row.event_status || ''))).filter(row => row.start > now);
  const histories = new Map();
  const known = new Map();
  for (const row of ledger.observations) {
    if (!allowed.has(row.bookmaker)) continue;
    known.set(row.fixture.id, row.fixture);
    if (!histories.has(row.fixture.id)) histories.set(row.fixture.id, []);
    histories.get(row.fixture.id).push(row);
  }
  for (const fixture of scheduled) known.set(fixture.id, fixture);
  const active = new Set(scheduled.map(row => row.id));
  const blocks = [...known.values()].sort((a,b) => (a.start <= now) - (b.start <= now) || a.start - b.start);
  const warnings = Object.entries(ledger.rejects || {}).map(([key,n]) =>
    ({no_market:'Incomplete or unsupported market',no_match:'Unmatched or ambiguous fixture',expired:'Expired or invalid observation'}[key] || 'Rejected observation') + ' ' + n);
  return html.replace(slot, () => '<section id="pl-comparison" class="terminal-panel">' +
    '<h2>Market Comparison · Premier League 1X2</h2><p>Data as of ' +
    (Number.isFinite(ledger.checked) ? time(ledger.checked) : 'unavailable') +
    ' · The Odds API · 90 minutes plus stoppage time · exchanges excluded</p>' +
    (ledger.status === 'failed' ? '<p role="status">Source failed. Current prices withheld.</p>' :
      ledger.status === 'empty' ? '<p role="status">No usable markets matched in the latest refresh.</p>' : '') +
    '<p>Models UNVALIDATED · model EV withheld. Proportional de-vig is a market reference. ' +
    'Closing is the final captured observation in the last 30 minutes before kickoff. CLV proxy compares earliest recorded odds to that same bookmaker’s close.</p>' +
    (warnings.length ? '<p>' + warnings.map(escape).join(' · ') + '</p>' : '') +
    (blocks.length ? blocks.map(f => renderFixture(f, histories.get(f.id) || [], ledger, now, active.has(f.id))).join('') : '<p>No fixture observations.</p>') +
    '<p>18+ · Gamble responsibly.</p></section><!-- end pl-comparison -->');
}
async function main() {
  const args = process.argv.slice(2);
  const preview = args[0] === '--private-preview';
  const books = preview ? args.slice(1) : args;
  if (!books.length || !books.every(b => /^[a-z0-9_]{2,40}$/.test(b))) throw Error('Reviewed bookmaker keys are required.');
  const allowed = new Set(books);
  const dir = 'work/pl-market';
  const read = name => fs.readFile(name,'utf8').then(JSON.parse);
  const atomic = async (file, data) => {
    await fs.writeFile(file + '.tmp', data, {mode:0o600});
    await fs.rename(file + '.tmp',file);
  };
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  const lock = await fs.open(path.join(dir,'history.lock'),'wx',0o600);
  try {
    const [dashboard,poll,html] = await Promise.all([
      read('research-dashboard-data.json'), read(dir + '/poll.json').catch(() => null),
      fs.readFile('market-intelligence/index.html','utf8')
    ]);
    const file = dir + '/history.json';
    const history = await read(file).catch(error => {if(error.code==='ENOENT') return {observations:[]}; throw error;});
    const now = Date.now();
    const next = mergePoll(history, poll, dashboard.upcoming_fixtures, allowed, now);
    await atomic(file, JSON.stringify(next));
    await atomic(dir + '/index.html', render(html,next,dashboard.upcoming_fixtures,allowed,preview,now));
    console.log('Private market build: ' + next.status + '; ' + next.observations.length + ' matched observations retained.');
  } finally {
    await lock.close();
    await fs.unlink(path.join(dir,'history.lock'));
  }
}
if (require.main===module) main().catch(() => {
  console.error('Market comparison build failed. No source payload was printed.');
  process.exitCode=1;
});
module.exports = {mergePoll, render};
