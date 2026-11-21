# Reference component integration

Base is draft PR #138 at `36905a20ae9cce50d8db8ef31d14250dcc9b56a6`. Its
fixture-first workspace, nine sport lanes, source status, paper controls,
shared navigation and compact fallback are the design target.

Both available copies of `sports-website-copies.zip` have SHA-256
`d22c30b2c07f857dfba5b3ad0ec72645f6c186c2adbddfc6edf1262b4b3e1708`. The
attachment directories, workspace artefacts and [previous reference audit](reference-workspace-redesign.md)
were checked. The ZIP contains 414 captured files across the five sites.
HTML structures and CSS/JS licence headers were inspected as text.
Archived application code was not executed.

| Source | Component and dependencies observed | Value Watch decision |
| --- | --- | --- |
| Flashscore | 152 files with fixture and country/league rails, favourites, CSS modules and JS chunks. Its save report lists 844 skipped links. | Adapt sport/date filtering into the existing homepage fixture overview. Competition favourites already live in Match Centre, so no second favourites store. |
| OddsPortal | 138 files with a central comparison surface, sport navigation and coupon area. The save report lists 222 skipped links and a missing icon. | Adapt the fixture-to-detail transition as a direct link to the existing Match Centre, with exact snapshot identity. No copied comparison, prices, movement arrows or coupon. |
| Betfair | 44 files with navigation and market-filter structures, bundled styling and code. A Normalize.css 3.0.1 fragment carries an MIT notice. | Use the interaction idea of combining scoped controls on the existing overview. The reset is unnecessary beside the project's existing CSS baseline. The notice does not license the remaining site. |
| Paddy Power | 43 files with saved coupon/favourites signals and mixed microfrontend/vendor bundles. Bundle headers reference companion licence files absent from the ZIP. | Retain the four wired paper slots and drawer from PR #138. No copied runtime or second selection store. |
| Sky Bet | 37 files with sport, fixture and filter structures, captured fonts, styles and JS. Dynamic content depends on the original runtime. | Adapt quick filtering by fixture name within the existing date controls. No asset, access flow, bookmaker data or tracking code imported. |

The captures lack complete licence grants and runtime dependency trees for
the useful site components. No captured code, fonts, imagery, branding,
tracking, credentials or third-party dependency was added. The shipped
filters and links are original, using existing Value Watch components.

## Changes and behaviour

- `index.html`, `reference-workspace.css` and `pro-home.js` add labelled
  timed-sport and fixture-name filters to PR #138's date controls. The
  filters intersect, reset pagination and survive a source refresh.
  Empty matches have a distinct message. Existing sport rail controls
  still open their research lanes. The existing date handoff continues
  to apply only the selected day. Compact mode hides these new controls.
- `pro-sources.js`, `football-match/core.js`, `football-match/app.js` and
  `football-match/index.html` share the exact competition, ordered team
  and offset-bearing kickoff key. The Match Centre only opens a link if
  its own published snapshot index resolves that exact key. When a
  matching provider ID exists, it opens that indexed fixture. An old
  kickoff, ambiguous identity or missing fixture remains unavailable.
  The code does not fall back to a similarly named fixture. Other sport
  rows keep their existing presentation.
- `tests/test_pro_sources.cjs`, `scripts/all_sports_browser_qa.cjs` and
  `.github/workflows/pr-browser-qa.yml` exercise schema gating, exact
  resolution, withdrawn kickoff, intersecting filters, refresh retention,
  touch activation, keyboard navigation, compact fallback and route
  smoke checks across desktop, tablet and phone widths.

No provider, forecast, outcome, price, ledger or publication policy was
changed. Models remain **UNVALIDATED** and publication **BLOCKED**.
Tests use Chromium with a touch-enabled tablet viewport. Physical
Windows-tablet testing remains outstanding. Overview filters are local
to the current page visit. Direct fixture links apply to eligible
football rows only. Other sports retain the existing research-lane
navigation until their routes have an equivalent exact-identity handoff.
