# All-sports coverage and development ledger

Baseline: integrated website development commit `4ea677d21150a5db211c7e6c9261d082d8c211b1`. Counts are tracked input rows from that commit, before filtering for duplicate records, dates, freshness, model or market eligibility. Collector operation and provider completeness require separate evidence. Dates below are UTC.

**Implemented** means a route is wired and testable. **Partial** means the implemented research path has evidence or coverage limits. **Missing** means no connected path exists. **Broken** records a reproduced baseline defect repaired in this branch. **Not verified** identifies behavior that requires evidence beyond the checked-in data or browser fixture.

## Inventory

| Sport | Schedule, identity and freshness | Markets and analysis | Outcomes, validation and local paper workflow | Existing verification and unresolved gates |
| --- | --- | --- | --- | --- |
| Football | **Implemented.** [PL](../research-dashboard-data.json) 40 rows, [expanded](../football-expanded-data.json) 213, [international](../international-football-data.json) 1. PL/expanded captured 21 Nov 00:00/00:12, international 18 Nov 01:01. [PL collector](../scripts/refresh_fixtures.py), [expanded workflow](../.github/workflows/football-expanded-research.yml), [international ESPN collector](../scripts/collect_international_football.py). Match Centre uses ordered league/teams, exact zoned kickoff and ESPN ID when present. Current desk normally withholds paper availability after 36 hours, inside five minutes of kickoff, or on conflicts. | **Partial.** [Market Intelligence](../market-intelligence/) and Match Centre read timestamped historical three-way observations gated to exact fixture and regulation settlement. Market coverage is limited, with collection rate limited. Current-season Poisson comparison is separate from the archived baseline and international recent-results analysis. Dashboard experiments remain unvalidated. **Broken at baseline.** The desk used the first matching forecast even with conflicting vectors or a mismatched supplied provider ID. | **Partial.** [Two-source verification](../scripts/verify_football_results.py), [history](../research-history.json) and [Validation Centre](../validation-centre/) preserve historical evidence; a comparable final score does not verify a forecast vector. [Match Centre](../football-match/), [football leagues](../football-leagues/), [Operations](../ops-control/) and [Paper Lab](../paper-lab/?sport=football) connected. Paper capture requires an available current-season comparison. Regulation-time 1X2 only in this research path. | [Match Centre tests](../tests/test_football_match.cjs), [market tests](../tests/test_football_baseline_market.cjs), [Match Centre browser QA](../scripts/football_match_browser_qa.cjs). Independently timed prospective input and settlement workflow remains outside this branch. |
| Horse racing | **Partial.** [Racecards](../racing-research-data.json) 47 rows and [future snapshot](../racing-future-data.json) 184 raw rows and 27 meetings, both captured around 21 Nov 00:14. [Future collector](../scripts/collect_future_racing.py) resolves observed Sporting Life meeting/race links, stable race/runner IDs, date/time and active declarations. Meeting listings or provisional entries do not establish a confirmed field. Desk card/source TTL is 30 minutes. | **Partial.** [Racecard contract](../racecards-core.js) separates complete timestamped source prices from publisher forecasts and checks every active runner before quoting. Context-form and form-only research remain distinct. Movement, drift, steamers, early/closing odds, SP and BSP require exact time-matched sources and are research signals. | **Partial.** [Racing verification](../scripts/verify_racing_evidence.py), [Racing Research](../racing-research/), Validation Centre, Operations and [Paper Lab](../paper-lab/?sport=racing). Active slip uses win research selections and decimal arithmetic. Place and each-way terms and settlement are outside the automated slip; existing notes and source evidence are preserved. | [Collector](../tests/test_racing_collector_integration.py), [racecards](../tests/test_racecards.cjs), [market audit](../tests/test_racing_market_audit.py), [browser](../scripts/racing_paper_browser_checks.cjs). Fresh declarations, matchable opening/closing quotes and independently corroborated results remain uneven. |
| Tennis | **Partial.** [ESPN ATP/WTA](../scripts/collect_other_sports.py), 2 rows with 2 experimental forecasts at 20 Nov 20:06 in [other-sports snapshot](../other-sports-data.json). Exact sport-specific ESPN path, event ID, two player IDs, ordered event evidence and zoned start. Partial seven-day calendar, with draws pending. Desk TTL 36 hours, overview 24 hours. | **Partial.** Separate ATP/WTA fixed K24 Elo histories, minimum evidence checked by [forecast contract](../research-audit-core.js). Match winner only. Surface, fatigue, fitness, retirement and verified current Sky odds are unavailable. **Broken at baseline.** Desk and overview could file a mismatched source row under the containing sport. | **Partial.** [ESPN and independent evidence queue](../research/TENNIS_SECOND_PROVIDER_REVIEW.md) requires human adjudication. No automatic retirement/void settlement. [Paper Lab](../paper-lab/?sport=tennis) supports unpriced experimental entries; Validation Centre and Operations show separate statuses. Sports Watch offers provider discovery only. | [Collector](../tests/test_other_sports.py), [source review](../tests/test_result_reconciliation.py), [paper engine](../tests/test_paper_engine.cjs). Rights, complete draw coverage and signed-off exact finals are open. |
| NFL | **Partial.** [ESPN NFL](../scripts/collect_other_sports.py) regular-season scoreboard, 28 rows with 28 experimental forecasts in the same snapshot. Exact sport path, event/team IDs, scheduled UTC kickoff and separate freshness. | **Partial.** Fixed K24 Elo plus historical tie prior. Three-way result including overtime, no spread, injury, quarterback or weather model, no live verified market. Aim to screen for 3–5 evidence-backed weekly candidates. PASS remains valid with any count. | **Partial.** [nflverse/ESPN reconciliation](../research/SECOND_PROVIDER_NFL_README.md), including ties; evidence can await independent human review. [Paper Lab](../paper-lab/?sport=nfl), Validation Centre and Operations connected. No postseason/offseason or verified settlement coverage inferred. | [Collector](../tests/test_other_sports.py), [secondary source](../tests/test_secondary_nfl_results.py), [paper tests](../tests/test_paper_engine.cjs). Complete slate and current price/evidence coverage remain open. |
| Rugby Union | **Partial.** [SportScore collector](../scripts/collect_rugby.py) maps provider code/competition/event ID and matches ordered sides and zoned kickoff. [Snapshot](../rugby-research-data.json) 10 Union rows, 7 of 14 requested days responded across both codes, with HTTP 429 recorded at 21 Nov 00:56. [Official LNR Pro D2](../rugby/pro-d2-results.json) has 81 source-observed finals, 20 Nov 01:47. | **Partial.** Pro D2 only applies fixed chronological Elo, home adjustment and draw prior on supported fixture joins in [fixture evidence](../paper-lab/fixture-evidence.js). Captured price evidence is view-only, time/date-bound and is not a verified value claim. Other Union competitions are schedule only unless an eligible evidence path is present. | **Partial.** Pro D2 regulation-time three-way paper estimates only on matched, eligible fixtures. [Rugby](../rugby/?code=RU), [desk calendar](../paper-lab/?sport=rugby), Validation Centre and Operations. No independent Union-wide finals/settlement pipeline. | [Coverage](../tests/test_rugby_source_health.py) and [desk fixture evidence](../tests/test_fixture_evidence.cjs). Exact provider/official schedule joins, permissions and broader results remain gaps. |
| Rugby League | **Partial.** No provider League rows in the checked snapshot. The [official NRL calendar](../rugby/?code=RL#league-calendar) and repository schedule inputs remain a distinct schedule-only path, retaining venue time and provenance when supplied. | **Missing.** Pro D2 Union Elo does not run for League. No connected selection or qualifying market. | **Missing.** No integrated settlement or paper leg pathway; operations and calendar describe coverage. | [Rugby source health](../tests/test_rugby_source_health.py). Independent exact fixtures and approved League outcomes needed first. |
| Darts | **Partial.** [Collector](../scripts/collect_darts_research.py), [provider feed](../darts/feed.json) and [official PDC snapshots](../darts/). Feed has 80 delayed result rows, 1 timed fixture, 12 tentative rows at 20 Nov 18:00. Dates and sessions remain separate from zoned match times. Provider observations can be delayed or uncorroborated. | **Partial.** [D1 Elo](../darts/model.js) and [analysis snapshot](../darts/analysis.json) are experimental and coverage-dependent. Time conflicts withhold estimates. Historical listed prices remain separate. | **Partial.** Lab and local imports, calendar and Operations connected. No qualifying paper-slip lane, outcome provenance promotion or implied verified payout. | [D1 model tests](../tests/test_darts_model.cjs), [collector contract](../tests/test_darts_analysis.py), [darts browser QA](../scripts/darts_browser_qa.cjs). Independent matched event times and result/price receipts needed. |
| Basketball | **Partial.** [Sports Watch](../sports-watch/?sport=basketball) has a SportScore category query and [NBA/FIBA and broadcaster links](../sports-watch/coverage.js). Provider-supplied sport when present must agree with the query. No published Value Watch event IDs, collectible source receipts or historical schedule snapshot. | **Missing.** No price, model, verification, ranking or candidate route. | **Missing.** No settlement or paper selection. The sport filter explains the coverage tier and links out. | [Fixture tests](../sports-watch/fixtures.test.cjs) and synthetic browser discovery and provider failure. Live endpoint access, terms and completeness **not verified**. |
| Cricket | **Partial.** [Sports Watch](../sports-watch/?sport=cricket) has a SportScore category query and [ICC/ECB and broadcaster links](../sports-watch/coverage.js); same discovery-only evidence boundary as basketball. | **Missing.** No validated fixture rights, price, model, market or ranking integration. | **Missing.** No settlement or paper selection. Legacy [Cricfy prototype](../cricfy-browser/) is a link surface, not a data adapter. | [Fixture tests](../sports-watch/fixtures.test.cjs) and synthetic browser discovery and provider failure. Live endpoint access, terms and completeness **not verified**. |
| Golf | **Implemented directory only.** [Sports Watch](../sports-watch/?sport=golf) supports manual lookup and official coverage destinations including the DP World Tour. **Missing** automatic schedule, fixture IDs or event receipts. | **Missing.** No price, forecast or candidate screen. | **Missing.** No verified results or paper workflow. | [Coverage tests](../sports-watch/coverage.test.cjs) and manual-route browser check. Event-specific broadcasting rights **not verified**. |

The nine selectors reflect these product categories. Rugby Union and League are separate evidence lanes behind one selector. The six-source overview is a summary of its connected snapshots, with broader fixture coverage available in the desk. Other sport mentions in copied references or the mathematical catalogue are not application feeds.

## Cross-sport trace and repaired behavior

- [Transport](../paper-lab/transport.js) validates published schema, safeguard flags and UTC receipt chronology. A refresh failure can retain the last successful snapshot. The desk reports source failures independently from empty filters and disables stale or mismatched selections.
- [Research engine](../paper-lab/engine.js) matches forecasts and normalizes events into sport-specific markets. Repeated exact records deduplicate. Equal-time status/identity disagreements block selection. A newer repeat for the same provider and ordered participants can supersede the old schedule. A paper leg retains its original identity and never silently moves to a changed kickoff or market.
- [Compact desk](../paper-lab/desk-compact-20261116.js) renders the homepage and Paper Lab. The URL carries the sport and browser Back returns to the previous sport. Source and market observations are dated, model output stays UNVALIDATED, and unsupported opportunities show PASS. [The Analyst Terminal](../analyst/) bounds its evidence tables to their own scroll region.
- **Broken at baseline.** A saved leg could re-use a price after a match on event and choice IDs alone. Recheck also requires the saved sport, event identity, kickoff, market and choice label. Local legacy records and manual paper arithmetic are preserved. A user-entered price stays unverified even if labelled Sky Bet.
- [Gold Council](../wildcard/) and the desk’s optional weekly review are paper-only. Research leads do not carry a betting grade, combined probability or real payout. No new picks fill missing evidence. Grade A requires robust evidence and estimated EV of at least +5%. Grade B requires credible evidence and a verified Sky Bet price, and remains speculative. With the current evidence, both remain withheld. No change to model weights or promotion criteria.
- Sports Watch fixture responses without an explicit sport remain attributed to the requested endpoint, with provider-reported status. Contradictory declared sports or cancellation signals are withheld. A missing zone stays undisclosed as a kickoff time. Sports Watch never supplies market or paper evidence.

## Reproduction

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
for test in tests/*.cjs; do node "$test" || exit; done
node --test sports-watch/*.test.cjs
for script in paper-lab/*.js; do node --check "$script" || exit; done
python -m unittest discover -s tests
npm run test:browser
node scripts/pro_design_browser_qa.cjs
node scripts/darts_browser_qa.cjs
node scripts/football_match_browser_qa.cjs
node scripts/all_sports_browser_qa.cjs
```

The [research regression](../.github/workflows/research-regression.yml) specifies catalogue and Sky 81 replays. [PR browser QA](../.github/workflows/pr-browser-qa.yml) pins the current-main snapshot overlay to the runner and invokes the existing audited racing reconciliation before testing. The new Chromium report captures all nine sports at 1440, 820 and 390 px, plus major workspaces at desktop and phone widths. External Sports Watch requests in the synthetic flow are intercepted. See the draft PR checks and artifacts for the exact revisions and results.

## Ranked evidence gaps

1. Independent, licensed and timely per-event identity, schedule and market receipts. Football/racing are highest-impact because the research lanes already have analyzable data and multiple snapshots. A publisher forecast or dated price is insufficient for an executable quote.
2. Complete input snapshots and independent regulation or sport-specific finalization. Football, racing, tennis and NFL require receipt-linked settlement. Rugby League and Darts need stronger exact fixture evidence before modelling or paper intake. Manual each-way/retirement/void settlement needs sport-specific contracts and reviewed outcomes.
3. Whole-slate coverage and outcome denominators. Tennis draws and NFL regular-season coverage are incomplete. Pro D2 does not establish Rugby Union-wide coverage. A weekly target cannot substitute for schedule coverage.
4. Provider integration decisions for basketball, cricket and golf. Establish access rights, durable event IDs, timestamp semantics and results coverage before adding markets, models or paper legs.

## Phase 69 | Free-source research lanes

The main site exposes a dedicated experimental coverage summary for all nine sports. Basketball and cricket show discovery coverage, and golf shows directory coverage. Their buttons carry no placeholder timed fixture count. Every lane reports that current odds are unavailable from approved free sources. Existing source timestamps, freshness, failure messages and research safeguards remain in place. No new connector cleared the free, no-registration access, licensing, identity, timestamp and update requirements. See the [Phase 69 decision and probe evidence](phase69-free-source-coverage.md).

## Exact fixture navigation audit

Follow-up to the shared navigation in PR #138 and the exact football
handoff in PR #139 (`6dcddba6d67301fda3b8e6d8f11df68dac348d8c`).
The scope here is the redesigned homepage and paths reachable from its
nine sport selectors. “Exact” means the destination can match the
identity in a fresh published snapshot. It does not establish independent
corroboration, a verified odds quote or a qualified model.

| Sport | Homepage to calendar/research | Direct fixture status and evidence | Blocker or limitation |
| --- | --- | --- | --- |
| Football | Research desk, Match Centre, Market Intelligence | Available for the existing competition, ordered team and UTC kickoff key. Match Centre re-resolves against its existing conflict-aware index and requires fresh dashboard coverage for an overview link. | No direct link for an unmatched or rescheduled exact key, a started event or a stale dashboard. Standalone historical reconstruction remains separate. |
| Horse racing | Timed racecards, future meeting schedules, Racing Research | Available for source-observed Sporting Life racecards with matching race ID in the source path, receipt hash, pre-off receipt time within 30 minutes, cross-checked schedule, course, card name and UTC off-time. The destination independently reloads the same published feed. | Meeting-only and uncaptured cards remain schedule-only. A card hash and ID do not certify bookmaker prices or settlement. |
| Tennis | ATP/WTA research desk, Operations and Validation | Available for ESPN tour-qualified fixture IDs, separate participant IDs in published order, exact names, competition, UTC start and fresh per-sport observation. | Partial draws and unavailable, stale or cancelled events do not become eligible. No independent result or retirement inference. |
| NFL | NFL research desk, Operations and Validation | Available for ESPN NFL event ID and matching ordered participant IDs, names, competition, UTC kickoff and fresh observation. | Coverage is a published scoreboard sample. No independent final, odds or overtime settlement inferred. |
| Darts | Darts live research desk calendar, analysis and source review | Calendar only. Timed provider observations carry provider/player IDs, but official listings can be date/session only and a shared exact-identity contract across the destination and provider schedules is not established. | Link extension needs the official/provider crosswalk and compatible schedule status. Tentative or time-conflicting rows stay separate. |
| Rugby | Rugby calendar and research, separate union/league views | Calendar only. Observed event ID, names, competition code and receipt do not supply ordered team IDs or an exact team crosswalk to the official Rugby League calendar. | League calendar announcements can be date-only. Pro D2 research remains separate and cannot fill gaps in other competitions. |
| Basketball | Discovery-only lane and manual Sports Watch coverage | Unavailable. No connected fixture IDs or timing receipts. | Manual entry is a coverage lookup. |
| Cricket | Discovery-only lane and manual Sports Watch coverage | Unavailable. Historical day-level sources do not establish prospective fixture identity. | No connected exact fixture feed. |
| Golf | Directory-only lane and manual Sports Watch coverage | Unavailable. No event, round or participant schedule contract. | No connected exact fixture feed. |

The overview's UK date, timed sport and search filters are URL-backed for
refresh and browser Back. The desk keeps its saved date range and
URL-backed sport, competition, search and status independently of the
overview. Sport changes reset the desk competition on the new history
entry. Back restores the previous competition instead of guessing a
replacement. A saved competition outside current coverage is labelled.

The new fixture evidence view validates the event tuple against the
normalised snapshot on entry and withholds stale, started, ambiguous and
mismatched records. It displays schedule provenance only. No result,
price, model or publication gate changed. **UNVALIDATED / BLOCKED.**
Use the browser QA artefacts for desktop, emulated touch tablet and
phone screenshots. Physical Windows-tablet checks remain outstanding.

### Cumulative release review

PR #138 targets `main`, PR #139 targets #138's branch, and PR #140 targets
#139's branch. The redesigned desk remains the default and
`?view=visual-preview` keeps the approved compact view. The compact overview
directs readers to the sport lanes.

When the browser restores a cached page through history, the overview
refreshes its source state and direct fixture views check identity again.
Started, changed or expired evidence stays unavailable. Browser QA checks
controlled exact-link and expiry cases separately from the repository
snapshots. The real-snapshot checks require the visible links to match
current eligible schedule evidence, including a valid zero-link state.

Physical Windows tablet sign-off is pending. See the [preview and test
checklist](reference-release-review.md).
