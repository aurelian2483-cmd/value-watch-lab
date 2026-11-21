# Phase 66 visual review

The baseline was open draft [PR #130](https://github.com/aurelian2483-cmd/value-watch-lab/pull/130) at `11c7573f4eb3e073889200e79116403130085b3b`. GitHub's artifact download returned HTTP 403 from the workspace. I reproduced the browser screenshots from the exact PR head using the repository snapshots. The audit used rendered 1440, 820 and 390 px views and full-resolution inspection of the affected controls. The [reference review](phase3-integration-and-reference-review.md) informed the emphasis on scan order, progressive disclosure and immediately useful controls.

## Verified issues

| Evidence file at baseline | Viewport | Severity | Observation and change |
| --- | --- | --- | --- |
| `racing-820.png`, `racing-390.png`, `tennis-390.png` | 820, 390 px | Moderate | Research actions jumped to opposite ends of wrapped rows, and the racing helper came between the build scope and its action in keyboard order. Kept the scope and build action adjacent, used a two-column phone layout, and aligned the secondary actions below or beside them. Primary scope and action have at least 44 px height. |
| `paper-lab-workspace-390.png` | 390 px | Moderate | The three-digit racing count broke across two lines and the label wrapped between icon and count. Snapshot counts now retain one line throughout the rail. The narrowest phone layout uses the full label for each sport and keeps the All sports marker. |
| `golf-820.png`, `cricket-820.png` | 820 px | Minor | Long selected labels clipped in compact native selects. The options now use the sports' names. The adjacent evidence panel still explains directory-only and discovery-only coverage. |
| `ops-control-workspace-390.png` | 390 px | Moderate | The three pieces of the VW·OC mark occupied separate grid rows, with the final piece outside the tile. The mark now reads on one centered line. |
| `ops-control-workspace-1440.png`, `ops-control-workspace-820.png`, `ops-control-workspace-390.png` | All three widths | Moderate | The live counter displayed 11/11 while the caption said “of four published data sources.” The caption now refers to the configured feeds. The four-desk metric identifies the core desks and describes the check as automated. |

## What the review covered

- The shared desk showed distinct content for football and NFL event discovery, stale racing evidence, empty tennis coverage, darts and rugby calendars, and discovery-only basketball, cricket and golf. The desktop evidence rail and gold paper-research panel retain their own visual hierarchy. The verified defects were in shared navigation and controls.
- Football Match Centre, Market Intelligence, Racing Research, Darts, Rugby, Sports Watch, Validation, Operations, Wildcard, Analyst Terminal and Paper Lab were captured at all three widths. I compared the rendered hierarchy, captions and state treatments. The Match Centre and the sport-specific labs each give their core task a distinct entry point.
- Narrow market and analyst evidence tables still use local horizontal scrolling. The 390 px Gold Council navigation also scrolls and its edge item is partially visible. These remain minor discoverability friction. The browser check found no page-wide overflow in the captured views. The change leaves the table columns and navigation choices available.
- Evidence, selection logic, source behavior, storage and publication safeguards are preserved. No data or market status was changed.

## Before and after captures

The browser workflow replays the same three views on the exact base and on the final tree with a fixed UTC clock and the same committed data. The artifact folders are `phase66-before/` and `phase66-after/`. Each contains these nine PNGs and the capture report:

- `racing-{1440,820,390}.png` (shared research toolbar)
- `paper-lab-workspace-{1440,820,390}.png` (sport rail)
- `ops-control-workspace-{1440,820,390}.png` (Operations masthead and metrics)

`all-sports/` contains the broader desktop, tablet and phone review. Reproduce locally after installing Playwright Chromium:

```sh
node scripts/all_sports_browser_qa.cjs
node scripts/all_sports_browser_qa.cjs --polish-only
```
