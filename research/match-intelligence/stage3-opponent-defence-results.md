# Stage 3 — Opponent-Defence Strength Research

**Executed:** 2026-11-14. **Research-only**; publication BLOCKED; prediction validation UNVALIDATED.

## Inputs and provenance
- Public historical EPL CSV mirror: `skthewimp/football`, pinned commit `9a0fa04365f4266d95f5cbb119ec6fc64f5e773c`, season files 2020/21 through 2025/26.
- GitHub Actions workflow: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43628718256
- Source script: `scripts/match_intelligence_stage3.cjs`
- 15 unit tests passed (0 failed); one six-season diagnostic replay executed. Its output was uploaded as artifact `stage3-diagnostic-report` (artifact ID 14126124355).
- 2020/21–2023/24 calibration used 1,272 eligible matches, 2024/25–2025/26 later diagnostic block 640 eligible matches.
- The later seasons had already been inspected in prior research. **This is a reused-holdout diagnostic, not a fresh untouched validation.**

## Implemented challenger
At the time each earlier match was played, estimate opponent's defensive weakness from **pre-match home/away goals conceded**, smoothed by 5 league-average pseudo-matches. Clamp the opponent multiplier to [0.65, 1.5]. Divide that match's goals scored by multiplier^gamma. Recalculate team home attack and away defence from these adjusted observations, then feed the resulting Poisson means into the common 1X2 scoring function.

Only matches before each calendar date are used for that date; no same-day fixture scores enter another forecast. Model and baseline use the same scored fixtures and Poisson 0..11 goal enumeration.

**Scope note:** This first candidate only adjusts goals scored for the defensive strength of the opponent. It does **not** yet implement a full symmetric opponent-adjusted attack-and-defence model, xG, verified lineups, manager changes, or market information. The code records an unused diagnostic defensive residual; do not treat it as evidence of a separately estimated defensive model.

## Calibration (lower is better)

| gamma | mean log loss | mean Brier score |
|---|---:|---:|
| 0 | **0.9993164271** | **0.5958006997** |
| 0.25 | 0.9999370643 | 0.5961880495 |
| 0.50 | 1.0009937273 | 0.5968787046 |
| 0.75 | 1.0024960090 | 0.5978872300 |
| 1.0 | 1.0044595261 | 0.5992320030 |

Selected gamma = **0** (baseline). In the later 640-match evaluation, baseline and selected candidate are therefore identical:
- mean log loss **1.0333229150**
- mean Brier **0.6209302156**

## Decision
Do **not** deploy or increase gamma. Retain this negative result. Reject claims that this trial proves opponent strength is unimportant or that betting probability accuracy has improved.

Before further optimization, use fresh untouched evidence and improve scope: opponent-relative attacking *and* defensive performance, independent xG providers if licensed, squad changes, timestamped receipts and sample coverage. Account for prior exposure to 2024/25–2025/26 data.

The original football production pipeline is unchanged; this research branch has no permission to publish wagers.
