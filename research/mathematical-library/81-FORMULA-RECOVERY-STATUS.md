# Original 81-formula inventory — recovery status

**Date:** 20 November 2026  
**Related work:** Sky / Value Watch mathematical research; draft PR #114.  
**Status:** **NOT RECOVERED — no item-level crosswalk can yet be claimed.**

## What the repository search established

A recursive Git tree inspection of the current research branch (7,175 tree entries; not truncated) found an `experiment81` workflow family:

- `.github/workflows/experiment81-third-source-dispatcher.yml`
- `.github/workflows/experiment81-third-source.yml` on branch `research/prospective-100`
- `scripts/experiment81_third_source_probe.py` on branch `research/prospective-100`

Inspection shows these files implement a **third-source fixture-coverage feasibility probe** (ESPN fixture records versus Sky Sports page mentions). The workflow explicitly marks page mentions as not fixture verification, with zero independently verified fixtures and zero forecast-eligible events. **This is not the original 81-formula inventory and must not be cross-referenced as such.**

The current PR branch has the new 286-entry catalogue and its batches, but no item-level file identified as the earlier 81-formula list. Repository code searches for the literal phrases `81 formulas`, `81-formula` and `formula 81` did not locate that inventory. Code-search coverage is not proof that the list never existed in another branch, chat, Codex task or external workspace.

## What is recovered from prior conversation context

The conversation-level record indicates:

- A previous chat reportedly constructed 81 formula/configuration candidates and the user passed them to Codex to run.
- The related discussion included Model A and Model B, a neutral baseline and market probabilities.
- The recovered description of Model B was a changed recent-performance weighting and removal of a distance factor.
- A/B discussion referenced 76 races and provisional counts of 13 winners for A and 16 for B, with B described as having slightly better log loss in that exploratory comparison.
- No authoritative item-level 81 rows, exact coefficients/configuration IDs, source-data hashes, Codex execution receipts, complete output or confirmed 81-run result have been recovered here.

These are **conversation summaries**, not a substitute for the original formula file or executable evidence. Do not promote these provisional statements to validated findings.

## Required recovery evidence

To build a trustworthy crosswalk, recover the original artifact with:

1. All 81 exact formula/configuration names and equations.
2. The original classification (algorithm, variant, parameter setting, feature transformation, ensemble or diagnostic).
3. Parameter values, inputs, target sport/market and event scope.
4. Original chat/Codex task, repository, branch and commit provenance.
5. Data snapshot hashes, split rules, execution logs and per-candidate results, if any.
6. Any link between A/B, neutral baseline and bookmaker probabilities, without assuming that these are the 81 individual formulas.

## Crosswalk rule

Once the original 81 rows are recovered, map each one to one of:

- exact match to a current catalogue ID;
- same mathematical mechanism under different name/notation;
- meaningful variant/configuration of a current entry;
- related but non-equivalent method;
- absent from the 286-entry catalogue;
- ambiguous / insufficient specification.

Do not delete, rename or merge catalogue records during the crosswalk. Report both the 81 original rows and the 286 current entries separately, and show duplicates/equivalences explicitly.

**Current decision:** leave the 81-to-286 crosswalk blocked until the original item-level source is found. The 286-entry catalogue remains preserved; no fabricated reconstruction or formula-count padding is permitted.

## Related horse-racing A/B work recovered — not the 81-item list

The repository does preserve a separate horse-racing A/B research package at `research/horse-ab-phase3-master-20261115/`. Its `PHASE3_PROTOCOL.md` defines:

- **Model A:** distance similarity 1, going 1, class 0.5, course 0.5; 90-day horizon; (K=5); β=2.
- **Model B:** distance similarity 0, going 1, class 0.5, course 0.5; 45-day horizon; (K=5); β=4. The protocol describes the 45-day recency as (r_{45}=r_{90}^2).
- The runner score uses weighted similarity (w=r(1+d s_d+g s_g+c s_c+q s_q)), a weighted historical performance average, a reliability shrinkage toward 0.5, and a softmax over runners.

The package's retrospective report evaluates the same **76 previously examined races**, with Model A correct on 13 first choices and Model B on 16; B-minus-A log-loss is -0.0222575 and Brier difference -0.0055535. The report explicitly says this is not a new holdout: **zero prospective scored races, zero independently reviewed new outcomes, no validated future accuracy claim**. This is recoverable A/B model evidence, but it is **not proof of the original 81-formula inventory** and must not be substituted for its 81 item rows.

Sources in this repository:
- `research/horse-ab-phase3-master-20261115/PHASE3_PROTOCOL.md`
- `research/horse-ab-phase3-master-20261115/analysis/REPORT.md`
- `research/horse-ab-phase3-master-20261115/EXECUTIVE_REPORT.md`

This strengthens the cross-project context available for a future comparison, but the 81-formula item-level crosswalk remains blocked.
