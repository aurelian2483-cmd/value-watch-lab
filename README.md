# Value Watch Lab 3.0

A multi-sport paper research desk with four flexible approaches, cross-day selections, source-backed evidence, preserved research history and explicit uncertainty.

- [Open the research desk](https://aurelian2483-cmd.github.io/value-watch-lab/)
- [Implementation, architecture, tests and data limitations](paper-lab/README.md)
- [Preserved previous dashboard](https://aurelian2483-cmd.github.io/value-watch-lab/legacy-dashboard.html)

Models remain **UNVALIDATED**. Betting publication remains **BLOCKED**. No real-money wallet, bet placement or verified positive-EV claim is provided.

Build the static Tailwind asset with `npm ci && npm run build:css`. Run browser checks with `npm run test:browser` after installing the Playwright Chromium runtime. All existing research collectors, historical records and regression tests are retained.

## Value Watch Pro reference design (new, additive UI)

The existing research desk on the homepage is **preserved**. The reference-inspired betting-friendly overview is added above it, using `pro-design.css` and a small `pro-home.js` bridge to the existing sport filter and paper-slip controls. The original four paper slip states, engine switch, historical notes, source handling, research models, calculations, and saved local data remain in their current code. The artwork references are visual inspiration, not sources for odds, fixtures, returns, model confidence, EV, Grade A/B or real wins.

The separate `/analyst/` page is a **read-only** research terminal. It reads the currently published football, racing, tennis/NFL and research-history JSON snapshots. Its filters, observed event counts, source indicators and event table are based on those sources. Confirmed ROI, hit rate, positive expected value, executable Sky Bet odds and validated grades show **unavailable/not certified** rather than illustrative figures. A source without `research_only:true`, `UNVALIDATED` and `BLOCKED` is excluded from displayed event research. Archived model observations are not treated as auditable betting profit. The Gold Wildcard and four slips link to the original homepage controls instead of creating duplicate engines or calculators.

Run `node tests/test_pro_design.cjs` and `node scripts/pro_design_browser_qa.cjs` with Playwright Chromium installed. The standard research browser tests, full regression and current-main snapshot integration are also required. The PR must remain unmerged until those checks pass; post-merge verify GitHub Pages actually serves both pages.
