# Pro D2 historical Bottleneck screening protocol

This is a retrospective feasibility check on the committed LNR 2026–27
snapshot, SHA-256 `52cdf6254487577e367d2c04867740010bbccb745fb563e59a9283e55caef25a`.
The snapshot is single-source and collected after these events. The split
below is held out from this candidate's design and tuning. The fixtures
are publicly known, and their scores are neither independently checked
nor an independently blinded or prospective test set.

- Warm up on rounds 1–5 (through 25 September). The fixed desk Pro D2 Elo
  uses K=20, a 50-point home advantage and its existing draw prior.
- Run a forward diagnostic on rounds 6–7 (8–17 October). The challenger
  settings are fixed and the diagnostic cannot change them.
- Report rounds 8–10 (22 October–6 November) as the evaluation window.
  Round 11 is incomplete and excluded. Separate all same-date observations.
- Screen the regulation home/draw/away result. Require five strictly
  earlier dated results for both clubs, and the existing 35-day freshness
  window. Reject conflicting identities, scores or same-day double bookings.
- The rugby challenger tests scoring severity independently of the Elo
  win/loss update. Average each team's five latest signed points margins
  after capping each result at ±21 (three converted tries). Add the home
  minus away average, divided by 84, to the Elo conditional home-versus-away
  log odds. Keep the Elo draw probability. Use no other configurations.
- Score only common eligible fixtures. Report coverage, log loss, unscaled
  multiclass Brier score, top-label confidence versus accuracy, outcomes
  by class, per-round stability, and a date-cluster paired bootstrap
  interval with a fixed seed. With a single incomplete season, the
  interval is descriptive and does not establish transportability.
- No time-matched market benchmark is in scope. No live output, star,
  qualification, settlement, or change to the existing model is authorised.
  Independent result evidence and timestamped pre-event feature receipts
  are prerequisites for a future validation window.
