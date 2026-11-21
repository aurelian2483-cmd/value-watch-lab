# Fixture card evidence

The research desk reads the repository snapshots. It groups fixture-level
model estimates, verified observations and private manual records separately.
The existing Match Centre, Market Intelligence and sport workspaces remain
the source for deeper analysis. Publication is **BLOCKED** and models are
**UNVALIDATED**.

| Sport | Forecast join | Market evidence |
| --- | --- | --- |
| Football | Exact competition, ordered teams and UTC kickoff in the shared Match Centre index. Explicit training cutoff and training receipts control fair odds and EV. Rejected estimates show the original probabilities and reason. | The shared regulation-time 1X2 verifier checks event, settlement, full outcome set, provider IDs, timestamps and receipt hash. Current card limit is 30 minutes from observation. Older records belong to Market Intelligence. |
| Racing | Separate form-model vector joined to a fresh timed racecard by ID, course, name, UTC time and identical active runner IDs and names. Changed or doubtful fields and non-normalized vectors are withheld. | Race-winner probabilities only. Each-way terms and live Sky Bet prices require evidence for that exact race. The archive and staged-factor experiments remain separate. |
| Tennis and NFL | Exact published participant order, provider identity, timed pre-event capture, sport-specific market and the existing Elo evidence validator. | The schedule/model feed contains no verified price for these markets. |
| Darts, rugby, basketball, cricket and golf | Existing calendar, discovery or directory paths. | The desk adds no odds or new model claims for these lanes. |

Fair decimal odds use the reciprocal of an accepted model probability.
Football market implied probabilities retain the original overround and the
proportional margin removal from the existing market verifier. Research EV
uses model probability times matched decimal price minus one. It cannot
promote an estimate or qualify an opportunity. Sky Bet is ordered first
when an equivalent source-backed observation exists. A benchmark is
explicitly attributed and no price is described as executable.

The captured snapshots at 21 November 2026 17:28 UTC contained 36 upcoming
football fixtures with unverified model vectors, four upcoming racing cards
with three matched experimental vectors, three tennis forecasts and 28 NFL
forecasts. The current-price join returned zero for all four sports. The
existing Hybrid market archive reports a rate-limited source and contains
older evidence. An anonymous collection endpoint with documented rights
for automated retrieval, storage and display was not established for these
markets in the repository's provider reviews.

The default desk can save an unverified observation locally for a timed
fixture with exact identity. It records the bookmaker, market and line,
outcome, decimal price, HTTPS receipt and current UTC observation time.
These entries are private browser data, separate from slips and verified
evidence. They cannot enter EV or qualification.

No authoritative 10% qualification setting was found in the reviewed
source, documentation or commit subjects. Card research EV remains an
unfiltered percentage and the qualification rules remain unchanged.
Historical football and racing research, validation records, market
collectors and published snapshots are preserved.
