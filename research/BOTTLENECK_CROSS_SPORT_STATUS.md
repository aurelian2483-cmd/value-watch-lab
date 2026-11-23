# Bottleneck Lab cross-sport status

Status at `main` `196f128a`: **research readiness display implemented; sport-specific Bottleneck challengers are not deployed**. All outputs remain research-only, unvalidated and blocked from betting, EV and qualification.

The football V0 adjusts a football 1X2 forecast using previous goal-difference features. Those inputs, coefficients and outcome meaning do not transfer directly to another sport. The desk now makes the current state visible in **Engine view → Bottleneck Lab · all sports** and states the next sport-specific evidence requirement.

| Sport | Existing research path | Bottleneck status | Evidence required next |
| --- | --- | --- | --- |
| Football | Current-season Poisson / saved forecast | Retrospective goal-difference tilt only; its historical holdout is exposed | New untouched chronological evaluation and pre-match receipts |
| Horse racing | Context/form runner model | No Bottleneck comparison | Complete field-matched inputs and independently checked placings |
| Tennis | ATP/WTA Elo | No Bottleneck comparison | Surface-aware chronological histories and independent results |
| NFL | K24 Elo with tie prior | No Bottleneck comparison | Complete season histories and cutoff-safe team/availability data |
| Darts | D1 Elo | No Bottleneck comparison | Exact match identity, format and timed pre-event histories |
| Rugby | Pro D2 Elo only | No Bottleneck comparison | Separate Union/League identities and competition-specific histories |
| Basketball | None | Blocked | Permitted fixtures, event identity and historical results |
| Cricket | None | Blocked | Permitted fixtures, format identity and historical results |
| Golf | None | Blocked | Tournament/player identity and round-level histories |

The registry currently contains 286 of the planned 1,000 entries and zero empirically qualified entries. This panel reports readiness; it does not run a tournament, synthesize forecasts or change the master plan's evidence/release gates. A sport-specific candidate must be implemented and evaluated separately before its status changes.
