import assert from 'node:assert/strict';
import { compare, csvRows, normalizeDate } from '../research/football-baseline-v1/compare.mjs';

const model = { rows: [
  { season:'2024-25', date:'2024-10-05', home:'Arsenal FC', away:'Southampton FC', ft:[2,1],
    winner_index:0,p_unadjusted:[0.5,0.3,0.2],p_recent_form_alpha_0_025:[0.6,0.25,0.15] },
  { season:'2025-26', date:'2025-10-05', home:'Liverpool FC', away:'AFC Bournemouth', ft:[0,0],
    winner_index:1,p_unadjusted:[0.4,0.3,0.3],p_recent_form_alpha_0_025:[0.35,0.35,0.30] },
] };
const csvs = {
 '2024-25': 'Date,HomeTeam,AwayTeam,FTHG,FTAG,B365CH,B365CD,B365CA\n05/10/2024,Arsenal,Southampton,2,1,2.0,3.5,4.0\n',
 '2025-26': 'Date,HomeTeam,AwayTeam,FTHG,FTAG,B365CH,B365CD,B365CA\n2025-10-05,Liverpool,Bournemouth,0,0,1.9,3.4,4.5\n',
};
assert.equal(normalizeDate('05/10/24'), '2024-10-05');
assert.equal(csvRows('Date,HomeTeam\n"x","A,B"\n')[0].HomeTeam, 'A,B');
const result = compare(model, csvs, 'B365C', 2);
assert.equal(result.overall.n, 2);
assert.equal(result.by_season['2024-25'].n, 1);
assert.equal(result.by_season['2025-26'].n, 1);
assert.deepEqual(result.excluded, {missing_fixture:0,missing_prices:0});
assert.equal(result.model_validation, 'UNVALIDATED');
assert.equal(result.quotes_time_attested, false);
const inverse=[1/2,1/3.5,1/4];
const p0=inverse[0]/inverse.reduce((a,b)=>a+b,0);
const expectedMarketLL=-Math.log(p0);
assert.ok(Math.abs(result.by_season['2024-25'].market.mean_log_loss - expectedMarketLL) < 1e-12);
const missing = { ...csvs, '2025-26': csvs['2025-26'].replace(',1.9,3.4,4.5',',1.9,,4.5') };
assert.equal(compare(model,missing,'B365C',2).excluded.missing_prices,1);
assert.throws(()=>compare(model, { ...csvs, '2024-25':csvs['2024-25'].replace(',2,1,',',3,1,') }, 'B365C',2), /outcome conflict/);
assert.throws(()=>compare(model, { ...csvs, '2024-25':csvs['2024-25']+csvs['2024-25'].split('\n')[1]+'\n' }, 'B365C',2), /duplicate odds fixture/);
console.log('PASS: synthetic fixture alignment, normalized market, missing odds, outcomes and duplicate controls.');
