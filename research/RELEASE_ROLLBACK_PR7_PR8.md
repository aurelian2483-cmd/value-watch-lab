# Value Watch — PR #7 + PR #8 controlled release and rollback plan

Status: **NOT AUTHORISED FOR DEPLOYMENT**. Prepared 11 November 2026. This is an operational checklist, not an assertion that deployment has occurred.

## Frozen review identifiers

- Repository: `aurelian2483-cmd/value-watch-lab`.
- Current `main` observed at preparation: `26951478776ad0e9e772c8b077b950254bb82a7c` (automated data update; may advance).
- PR #7: `copilot/evidence-research-handover`, head at review `3d9e2fd7727b5520d38f1b8ae898a6981096b30e`.
- PR #8: `fix/community-evidence-eligibility-pr7` targeting PR #7. Re-read its actual head and tests just before any release.
- Active repository ruleset `Protect prospective research ledger` applies to `research/prospective-100`, **not** to `main`; GitHub branch metadata reported `main` `protected:false`.
- GitHub Pages publishing source and external deployment settings: **NOT VERIFIED**. Obtain an actual Settings > Pages screenshot or GitHub Pages API evidence before proceeding.

## Required pre-release evidence — stop if missing

1. Obtain the actual GitHub Settings > Pages source, branch and directory (or Actions workflow) and any custom domain configuration. Verify where the public website really points. Do not assume a Pages URL is live merely because a repository is named Value Watch.
2. Inventory all workflows triggered by a push to `main`, including `research-desk-release.yml` (which compiles CSS, refreshes racing test inputs and can upload artifacts). Identify workflow permissions and any deployment triggers. Record baseline screenshots and URLs.
3. Review combined changes against the latest `main` head, including all static assets, and run current-main snapshot overlay QA again after the last commit. Never mistake synthetic QA records for real bookmaker odds.
4. Preserve the current `main` SHA and a read-only code tree/commit reference; document exact PR merge SHAs and merge method if integration is approved. Preserve the existing data archives and frozen prospective ledger unchanged.
5. Confirm original browser-local paper slip/history/journal storage still loads. It is stored in the browser and is **not** transferred automatically between devices; export a local backup where the UI permits before production changes.
6. Independently approve integration and publishing as separate decisions. Draft PRs stay unmerged unless separately authorised. Models remain UNVALIDATED; betting publication BLOCKED.

## Safe integration sequence (only after explicit approval)

- Integrate PR #8 into the PR #7 development branch first, or prepare an isolated combined integration branch; re-run all tests after the actual integration commit.
- Review the combined diff against current `main`. Require QA PASS and independent Pages/publishing confirmation.
- Release only with explicit approval, a recorded baseline SHA, and a designated reviewer. Do not enable auto-merge.
- On the live deployment, confirm the actual published commit/asset versions, both entrypoints, mobile racing cards, evidence counts, original-source details, slip save/reload, journal history, missing-data behavior, and publication BLOCKED labels. Capture timestamps and URLs.
- If any verification fails, stop further publication and use the rollback decision tree below.

## Rollback decision tree

**Before merge:** close or leave the draft PRs alone. No production rollback is necessary; do not rewrite `main`.

**After integration to a development branch but before production:** revert that integration on the development branch via a new reviewable PR. Never use a force-push that overwrites someone else's concurrent commits.

**After merging to main:** locate the *actual* merge/squash commits from the GitHub PR timeline. Create a separate **revert PR** against current `main` for the application changes. If PR #7 and #8 were merged separately, revert the later integration first, then the earlier one, but inspect dependent changes and conflicts. For a merge commit, use a reviewed revert with the correct mainline parent; do not assume a commit hash or execute a blind rollback command. GitHub's Revert UI is preferable when available. Run regression/QA on the revert PR.

**Data safety:** do not reset `main` to an old SHA, force-push, delete newly created observation archives, or undo unrelated automated collector updates. Revert only the reviewed application/feature changes, preserving all newer snapshot and immutable research records.

**If GitHub Pages is stale after code revert:** verify the configured publishing source and await/inspect the corresponding deployment run; verify the served assets on the real URL. Do not claim success based on the Git revert alone. Use Pages-specific recovery only after inspecting the actual stuck deployment; the existing `pages-recovery.yml` targets a specific historical deployment ID and is not a generic rollback.

## Success criteria and outstanding limitations

- Successful recovery requires the expected prior UI behavior on the real site, no unexpected browser errors, and untouched saved paper records.
- Current PR branch synthetic/Chromium and 13-file current-main overlay tests are necessary evidence but do **not** establish actual user-device, production deployment, real bookmaker price, or model performance validity.
- Maintain `research_only:true`, `model_validation:UNVALIDATED`, `publication_gate:BLOCKED`, no real wagers, and no invented EV or market data.
