# Race 887765 — initial retrospective form recovery (2026-11-15)

User-supplied original 2025-autumn dataset: 5 final runners in Wolverhampton 2025-11-03 nursery; 3 missing-history horses. Original frozen archive remains unchanged.

Seven identifiable older Sporting Life result records were located:
- Bassenthwaite (1184424): 2025-07-09 Ffos Las race 867109, 1/10; 2025-05-23 Bath race 858853, 5/6.
- Angel Numbers (1184552): 2025-10-24 Southwell 886552, 7/9; 2025-09-13 Chester 879353, 5/7; 2025-08-18 Windsor 874163, 2/9.
- Moira Express (1183531): 2025-09-06 Wolverhampton 877641, 4/8; 2025-08-07 Nottingham 872335, 7/9.

Primary result links:
- https://www.sportinglife.com/racing/results/2025-07-09/ffos-las/867109/winningpost-bookmakers-swansea-novice-stakes-gbb-race
- https://www.sportinglife.com/racing/results/2025-05-23/bath/858853/heavenly-desserts-british-ebf-novice-stakes-gbb-race
- https://www.sportinglife.com/racing/results/2025-10-24/southwell/886552/win-250000-with-betmgms-golden-goals-nursery
- https://www.sportinglife.com/racing/results/2025-09-13/chester/879353/lotus-manchester-at-hr-owen-nursery
- https://www.sportinglife.com/racing/results/2025-08-18/windsor/874163/get-raceday-ready-nursery
- https://www.sportinglife.com/racing/results/2025-09-06/wolverhampton/877641/remembering-ted-and-sally-sergent-ebf-fillies-novice-stakes-gbb-race
- https://www.sportinglife.com/racing/results/2025-08-07/nottingham/872335/weatherbys-global-stallions-app-ebf-maiden-fillies-stakes-gbb-race

Result: a separate overlay gives every one of the **five** runners at least **three** dated, prior, finishing Flat records. This passes the *history-count check* only. The model's complete feature eligibility and independent source/data-capture checks have **not** been executed against that overlay in Actions, and there is **no preserved pre-event snapshot**.

**Safeguards**: `training_eligible=false`, `model_validation=UNVALIDATED`, `publication_gate=BLOCKED`. Retrospective observed pages cannot be called genuinely prospective snapshots. The model must not be tuned or assessed as a clean holdout using this race. No bet or payout conclusions. The complete overlay and receipt ledger are distributed separately in `horse-v3-race-887765-recovery.zip` to the user.
