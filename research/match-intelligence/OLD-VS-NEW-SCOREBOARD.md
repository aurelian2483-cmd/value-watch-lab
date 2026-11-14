# Old vs New — Match-by-match Scoreboard (research only)

**Status:** committed to research branch, no change to production tips or betting selections. No verified betting edge.

## Locked comparisons
- **Original:** existing frozen Poisson 1X2 probabilities.
- **Recent form:** existing frozen Poisson plus recent-form alpha 0.025.
- **Candidate:** 50% frozen recent-form and 50% de-vigged captured market probabilities; fixed decimal-odds maximum 5.00.
- **Decision rule:** flat one-unit illustrative stake, highest estimated EV among home/draw/away if EV >= 5%; otherwise PASS. Same available quote for all three models. The first two have no odds cap, the candidate has cap 5.00. These are frozen controls/candidates; no coefficient tuning from previous losses.
- Score all settled fixtures for probabilities even when no odds exist; do not discard draws or passes.
- Market candidate cannot be computed without complete 1X2 quote. It must be marked PASS / missing benchmark, not assigned fake prices or counted as worse prediction.

## Data and evidence
Use the existing pre-kickoff freeze and separate after-match settlement protocol in `PROSPECTIVE-VALIDATION-PROTOCOL.md`.
The scoreboard validates frozen prediction record hashes and detects duplicates through the existing lab. **A record hash or supplied timestamp is not external proof of pre-kickoff publication**. Authenticity and bookmaker quote availability require independent evidence. Market odds supplied to the scoreboard are unverified, so returns are labelled paper-only.
Historical reconstructed runs must be separated from genuinely prospectively published records.

## How to run
```bash
node research/match-intelligence/model-scoreboard.cjs frozen-predictions.json settlements.json > scoreboard.json
node --test tests/test_match_intelligence_model_scoreboard.cjs
```

Inputs are JSON arrays: (1) frozen prediction objects output by existing `prospective-lab-cli.cjs freeze`, (2) separate settlement objects used by existing `prospective-lab-cli.cjs score`. Omit second argument for an awaiting-results scoreboard. A settlement has fixture_id, home_goals, away_goals, source_uri, and result_observed_at_utc. Exact fields and chronology must meet the existing lab validation.

Output: every fixture, timestamp, frozen digest, 1X2 probabilities, odds status, three model selections or passes, settlement, per-model log loss and multiclass Brier, paper profit, and model summary. `paired` compares log loss and Brier only on identical settled fixtures where both vectors exist; negative B-minus-A is better. Quote-dependent paper profit is *not* a valid bookmaker edge without independent price verification. Missing quotes, pending results and pass counts remain visible.

## Release gate
Until a real prospective fixture collector and independently verified quotes are connected, the scoreboard is a **working comparison/reporting component, not a live automated proof system**. GitHub Actions runs code tests only; it does not populate new results, automatically fetch bookmaker odds, certify bookmaker prices or schedule predictions. No live model or tip publication change.
