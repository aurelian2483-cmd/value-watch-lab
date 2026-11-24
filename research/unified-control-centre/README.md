# Unified Research Control Centre — historical evidence preview

## Scope

Separate stacked draft from accepted reference revision 9f45e72fae0b693b8331db866389f88734b3a272. The static website consumes six fixed summary files; it does not run producers or read raw datasets. Source pins identify exact branch heads, workflows and artifact IDs. Central Data, laboratory, CPU and supervisor report revisions identify synthetic merge checkouts recorded in CI. The reference report has an as-of date but no internal commit field; attribution is external. The catalogue pin has 330 registered entries, compared with 325 in the inherited stack. Central Data remains a separate sibling branch. No source branches are merged.

Research remains UNVALIDATED; publication and execution are BLOCKED. The viewer is not a live system or a predictive engine.

## Open the portable preview

From an accepted private Unified research control centre workflow, download the unified-research-control-centre artifact. Compare the downloaded outer archive SHA-256 to GitHub's artifact metadata. Extract it, check local-preview.zip against local-preview.sha256 (in Windows PowerShell: Get-FileHash .\\local-preview.zip -Algorithm SHA256), and extract local-preview.zip into a new folder. Open index.html. No server, internet, AI service or installation is required to view the page. The inner manifest is an integrity receipt, not an authentication signature. Keep the package private. CI artifacts expire after seven days; retain the trusted archive and its receipt locally before expiry.

## Developer workflow

Run node research/unified-control-centre/overview.mjs <summary-directory> > overview.json, then node research/unified-control-centre/website.mjs overview.json > index.html. Use source-pins.json for fixed filenames. Missing, unsafe, unstable or invalid files remain unknown. The renderer checks projected snapshot semantics, source identities and coverage in addition to a canonical self-hash. Local contract checks cannot authenticate source origin or independently validate underlying evidence.

CI authenticates archive identity against the same private repository's metadata, source run and head, compares exact pinned archive digests, extracts only named summary members and reconciles their byte fingerprints with the overview. Missing or expired artifacts fail CI rather than silently substituting newer evidence. The workflow generates a deterministic inner ZIP, validates the exact allowlisted members and fingerprints, rejects tampering and emits an external SHA-256 receipt. A separate offline browser test opens the extracted HTML via file: URLs; its receipt is outside the inner ZIP to avoid circular fingerprints.

## Recorded quality audit

Baseline 327c4c09aabcf48e62043af75131cefcb6a1ffd2: workflow 45504210697 passed 6 integration tests (zero failures/skips), six source reconciliations, five archive receipts, twelve invalid-input scenarios, nine Chromium scenarios, fourteen rehashed-snapshot mutations across two tests, deterministic packaging and eight file fingerprints. Full research regression 45504211249 passed. The baseline output artifact ID is 14972836980, SHA-256 c9b0de3466f465d4dff9bbd7cac66903e8ddc170ca50ce50fb50148e4a757d5f, expiry 2026-12-01T22:48:26Z.

The subsequent audit correction adds actual extracted-file offline Chromium acceptance at 1440, 390 and 320 px. Its result is pending on the revised commit and must be verified before final hosted software acceptance.

## Remaining limitations

Historical pinned summaries, not live synchronized services. No independent source rights or record authenticity verification, scientific qualification, physical GPU acceptance, physical Windows-PC acceptance, live supervisor service, production deployment or publication. No raw evidence or credentials are packaged. The local viewer remains read-only. A self-hash or recomputed manifest cannot establish authenticity without a separately trusted digest. No model execution or changes to source projects.
