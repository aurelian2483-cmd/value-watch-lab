# Football implementation recovery · Phases 30–36

**Eligible real forecasts: 0. Eligible real outcomes: 0.** Research only.
Models remain **UNVALIDATED** and publication remains **BLOCKED**.

- [Evidence map](EVIDENCE.md) distinguishes confirmed source artifacts,
  historical claims, proposals and unavailable material.
- [Registry](registry.json) identifies code, immutable commit, source hash,
  configuration, inputs, outputs and test evidence for each reviewed component.
  The audit configuration SHA-256 binds the listed configuration and exact
  source file. It is a recovery fingerprint, with no prospective model admission
  authority. [Dependency pins](dependencies.json) bind the runner and test inputs.
- [Composition trace](COMPOSITION.md) covers the production-adjacent display
  and research paths, including differences between similar Poisson formulas.
- [Leakage boundary](BOUNDARY.md) documents the evaluator defect reproduced
  and fixed in this milestone, alongside the ineligible historical tiers.

The map covers Premier League and expanded Poisson paths, independent
international recent-goals estimates, standalone retrospective recent form,
H2H context and its isolated challenger, market displays and manual form
proxies, and their separate November research counterparts. Recovered squad
and player code provides evidence checks or isolated scenario research.
No numbered end-to-end V1–V6 pipeline, authenticated live player coefficients,
or verified stadium effect was recovered.

## Reproduce offline

Use Python 3.11+ and Node 22. A clean shallow checkout can provision the
three Value Watch Git objects with the command below. Verify and run after
provisioning. No supplied historical dataset, provider, external URL, holdout
or network source is opened by the harness.

```sh
git fetch --no-tags --depth=1 origin 9898e7e7773878ec32a0bfd3c38197fddb566893 0ab96a96fd66608d931c4109392ee29fe2ba3650 a29079994013f159f8a67861d029c6b12f5061e5
python scripts/football_model_recovery.py check
python scripts/football_model_recovery.py smoke
python scripts/football_model_recovery.py archived-tests
python -m unittest discover -s tests -p "test_football*.py"
node tests/test_football_model_recovery.cjs
python scripts/audit_football_provenance.py --check
python scripts/football_evidence_ledger.py check
python scripts/football_shadow_report.py
```

The smoke report shows synthetic intermediate rates, form deltas, market
vectors and scenario shifts with the label **SYNTHETIC TEST OUTPUT — NOT
MODEL EVIDENCE**. It executes the existing producer functions, using a
memory-only CSV and dashboard fixture and isolated pinned Node code. The
replay extracts the existing pure calculation without running its download
or file-writing entry point. The archived-test command only stages reviewed
code and synthetic test files in a temporary directory. It runs no historical
study, real-data fitting, holdout replay or parameter optimization.

A changed source, missing Git object, different configuration fingerprint or
inconsistent expected calculation fails the audit. Synthetic tests establish
arithmetic and boundary behavior. They supply no empirical result, betting
performance claim, or model validation.
