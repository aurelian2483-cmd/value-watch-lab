# Phase 66 | New Research Design

The approved visual target is the compact preview at `?view=visual-preview`. This branch starts at PR #130's exact head `11c7573f4eb3e073889200e79116403130085b3b`. The classic-mode captures and the separate Research Terminal draft are outside this review.

| Evidence | Severity | Finding and change |
| --- | --- | --- |
| `overview-{1440,820,390}.png` | High | The later terminal stylesheet overrode the preview's light cards. Dark headings, source captions and alternating fixture rows became hard to read against a dark panel. Load the preview styles last, restoring the intended light cards and legible pagination. |
| `racing-390.png`, `racing-820.png` | Moderate | The secondary racing action separated the scope from Build research slips. Keep the scope and build operation adjacent, with the secondary actions following. Use aligned columns on phones. |
| `golf-820.png`, `basketball-390.png`, `cricket-820.png` | Minor | The long discovery qualifiers competed for limited space in the native sport select. Keep the label short and the coverage explanation in the adjacent evidence panel. |

The nine sport screens share the compact navigation and retain their distinct evidence. Football, racing and NFL have event rows where snapshots support them. Tennis can show an empty schedule. Darts and rugby retain their calendar disclosures. Golf, basketball and cricket retain their directory or discovery limitations and cannot build selections from an unsupported sport filter. The timed-event summary remains limited to its connected feeds.

The market table still scrolls locally at phone widths to retain all evidence columns. The default homepage, desk selection, storage and publication safeguards are preserved. No data or model behavior changed.

## Browser evidence

Run `node scripts/all_sports_browser_qa.cjs --compact-preview` with the repository's Playwright dependencies and Chromium installed. The run freezes the clock at 21 November 2026 10:30 UTC, asserts preview mode and captures the nine sport views plus the overview at 1440, 820 and 390 px. The hosted run repeats the same captures from the exact base and compares them with the draft using `compact-before/` and `compact-after/`. The regular browser suite separately covers the classic and standalone workspaces.
