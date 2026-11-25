# Premier League Market Comparison

The Market Intelligence page includes a disabled-by-default Premier League 1X2 comparison. It is independent of model outputs, paper slips, EV, validation, and the existing public Sky Bet publisher. The production checkout contains no comparison prices or raw archive.

## Source and release boundary

The Odds API [terms, updated 31 August 2026](https://the-odds-api.com/terms-and-conditions.html) permit UI display, storage and derived analytics while prohibiting standalone raw-feed redistribution. This review did not verify account-specific terms, a multi-book entitlement, or each bookmaker's settlement specification. The previous [authorised run](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45500026671) confirmed Sky Bet access within the existing bounded collection; it did not establish multi-book access. The checked-in bookmaker registry is disabled and unverified. Before a real poll, confirm the account’s entitlement to the exact provider key, the public UI and derived-data display rights for that account and bookmaker, and the bookmaker’s published settlement rules for that exact provider market. No new paid request is scheduled by this change. No exchange is included.

The private collector uses the existing credential and quota checks, one Premier League h2h endpoint per poll. The registry separately records account entitlement, public-display rights and settlement review. Each needs an evidence reference, verification date and expiry date. Reviews expire at the end of the specified UTC date. Unknown provider keys and incomplete, expired or incompatible enabled entries block collection before the first request. Adding a provider key requires a code review as well as an evidence record.

The provider label `h2h` identifies an API market. Canonical 1X2 identity comes only from reviewed bookmaker rules covering 90 minutes plus stoppage time, exclusion of extra time and penalties, no line, and three distinct outcomes. The private poll carries the review fingerprint. The renderer revalidates it against the current registry and suppresses records if the review changes or expires. The synthetic registry is accepted by mocked tests only and establishes no live authorization. Provider aliases are explicit; a collision, duplicate, missing outcome, period mismatch, or uncertain identity is withheld. Prices checked against these gates are source observations with execution unverified.

## Private build

Run from repository root in an authorised environment:

```sh
python scripts/collect_pl_comparison.py --config work/pl-market/reviewed-bookmakers.json
node scripts/render_pl_comparison.cjs --private-preview --config work/pl-market/reviewed-bookmakers.json
```

Use a private registry with evidence references free of credentials. Use this only once the relevant bookmaker is cleared for that account and market. Run the renderer even when collection exits unsuccessfully so it replaces the preview with a source warning. The renderer preserves validated snapshots in the ignored, private `work/pl-market/history.json` file. Run both commands from the same workspace to retain history between polls. It guards concurrent ledger writes and retains private rejection codes, provider event IDs and fixture candidate counts for the last poll. For UI testing, place the generated `work/pl-market/index.html` at `market-intelligence/index.html` in a **private temporary site copy**, so relative assets resolve. Keep the raw poll and ledger outside the site root. Never publish the generated page, raw JSON or ledger through Pages or a public workflow until review approves the exact display scope. Omitting `--private-preview` rebuilds the disabled page without erasing history. The existing main, Pages and odds-publishing workflows are separate.

## Calculations and freshness

The board compares complete home/draw/away sets within the exact EPL fixture and regulation market, with fixed 90 minutes plus stoppage time and no line or extra time. For each complete bookmaker set, raw implied probability is `1/odds`, overround is the sum minus one, the proportional de-vig reference divides each implied value by that sum, and reference fair odds invert the adjusted probability. Price comparisons are bounded by the eligible current bookmakers shown. No price or market reference implies a validated model or positive EV.

Current observations expire 30 minutes after observation or at scheduled kickoff, whichever comes first. A failed or empty poll withholds current prices while keeping historical observations. The ledger retains every distinct poll, including unchanged odds and both observation and check timestamps. The earliest observed record is a sample, not the bookmaker's opening price. The closing benchmark is the last checked observation within the 30 minutes before scheduled kickoff, finalised after kickoff. If there are no compatible observations in that window, close is unavailable. The research CLV proxy is earliest recorded decimal price divided by the same bookmaker's closing price minus one. It is not realised bettor CLV, profitability or model accuracy. Any aggregate inference needs adequate sample size and uncertainty reporting.
