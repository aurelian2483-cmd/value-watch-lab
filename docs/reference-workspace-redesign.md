# Reference workspace redesign

Value Watch Lab is the application identified by the supplied sports
captures and the existing project history. The redesign uses a
Windows-first layout with Segoe UI, keyboard navigation, and larger touch
controls. The original compact homepage remains available through
`?view=visual-preview`. The repository baseline is `76faf729`.

## Reference inventory and decisions

The task attachment and the earlier copy under the workspace attachments
folder had the same SHA-256:
`d22c30b2c07f857dfba5b3ad0ec72645f6c186c2adbddfc6edf1262b4b3e1708`.
The ZIP has five saved site directories. It contains HTML, CSS, scripts,
fonts, vector and raster images, and two download reports. Flashscore
reports 844 skipped links. OddsPortal reports 222 skipped links and a
missing icon. None includes a site-wide licence for its captured design,
brand assets, fonts or application bundles.

| Capture | Evidence reviewed | Integrated design idea |
| --- | --- | --- |
| Flashscore | Saved HTML contains sport navigation, fixture lists, country/league menus and favourites. Its browser render needed unavailable runtime state when scripts were disabled. | The homepage puts the sport directory next to the fixture overview and gives fixture date its own labelled control. |
| OddsPortal | Saved HTML and script-disabled rendering show a sport rail, central comparison area and a separate coupon surface. The downloaded centre table did not hydrate. | Desktop separates the nine lanes, sourced event table and research status. Market comparison uses a distinct fixture/source control row above the original evidence table. |
| Betfair | Saved markup and bundle metadata show market filters and selection/navigation structures. The capture did not render into a usable market screen without scripts. | Controls and evidence sit in distinct areas. The existing research selection workspace retains its own state. |
| Paddy Power | Saved markup mentions coupons and favourites. The script-disabled rendering showed branding and structural shells. | Paper approaches are grouped in one quieter strip, connected to the current four slips and the existing touch drawer. |
| Sky Bet | Saved markup identifies sport navigation, fixtures, filters and coupon controls. The script-disabled rendering required runtime state. | Contextual sport selection stays with fixtures. A shared primary navigation connects the main workspaces. |

The saved pages were inspected without executing their JavaScript.
Network access was blocked for the static preview render. Some captured
bundles point to licence files that were absent. Betfair includes an
MIT-noticed Normalize.css fragment. No new copy was needed since Value
Watch already has a CSS baseline. No third-party source, assets, fonts,
logos, data or dependencies were added to the repository. Reference
screenshots were examined locally. The comparison evidence distributed
with the work contains Value Watch screenshots.

## Implementation

- The homepage puts timed fixtures ahead of paper slips and uses an
  original sport rail, a responsive comparison table and a separate status
  card. The nine lanes still delegate to the existing desk controller.
- The fixture overview filters All upcoming, Today or Tomorrow using UK
  calendar dates. Pagination resets on selection. Refresh preserves the
  chosen view. Exploring the selected day applies the corresponding
  existing desk date preset.
- Research Desk, Match Centre, Market Intelligence, Analyst, Validation
  and Operations share primary destinations and a current-page state.
  Less frequent tools are grouped in the More disclosure.
- The Market Intelligence fixture and source selectors share the same row
  on desktop and tablet and stack on phones. Existing event, source and
  market matching are retained.
- The four paper slots still use the existing drawer, state and ledger.
  No forecast, result, market eligibility or evidence contract changed.
  Models remain **UNVALIDATED** and publication **BLOCKED**.

## Verify

Run the project regression, then the browser suites with Playwright.
The all-sports browser suite covers 1440, 820 and 390 px and checks UK
summer-time boundaries, date handoff, refresh retention, keyboard focus,
cross-workspace navigation and the existing compact fallback. The
tablet evidence uses a touch-enabled Chromium viewport, with physical
Windows tablet verification still outstanding.
