# All-weather challenger pilot V1

The trained challenger **did not beat either baseline** on the later test sample.
It is not promoted. Current estimates are a separate shadow experiment, not an
improved betting model. Publication remains BLOCKED, validation UNVALIDATED and
official challenge credit 0/100.

## Actual experiment

Collected 92 completed GB all-weather handicaps, with no collection errors, on
every third calendar day from 1 September through 31 October 2026. Selection
used date, country, surface, handicap status, at least four final runners and a
single winner, rather than the model's success. Complete pre-date form, rating
and weight requirements retained 58 races; 34 exclusions are listed in the data.

| Period | Purpose | Races |
| --- | --- | ---: |
| Before 1 October | Initial fitting | 14 |
| 1–15 October | Select L2 regularization | 18 |
| 16–31 October | Later test, untouched by fitting | 26 |

The regularization grid was 0.1, 1, 10, 100. Validation log loss selected 1.
Coefficients were then refitted on the first 32 races only. No tuning followed
inspection of the test scores.

| Test metric (lower is better) | Challenger | Original form formula | Uniform |
| --- | ---: | ---: | ---: |
| Log loss | 2.438146 | 2.346384 | 2.351176 |
| Multiclass Brier, summed per race | 0.925900 | 0.903849 | 0.903153 |

All three methods are scored on exactly the same 26 final fields. The original
formula is run on the histories available in the reconstructed cards, rather
than an independently attested historical capture. These are descriptive,
single-publisher retrospective results, not a prospective forecast record.

## Features and model

Regularized conditional multinomial logistic regression: one softmax across
the active horses in a race, trained by minimizing winning-horse log loss plus
L2 regularization. No bookmaker prices, starting prices, editorial tips, target
finishes or current/future history rows enter the feature matrix.

Ten race-centered features: official rating / 10, carried pounds / 10,
recency-shrunk finish percentile, last finish percentile, surface-specific form,
distance-specific form, course-specific form, prior minus current class,
log(1 + days since last valid run) / 5, and rating change / 10. The challenger
uses at most four valid prior Flat finishes, at least three, strictly before
the target date and within 730 days. Recency half-life is 90 days and neutral
shrinkage is five weighted runs. Distance match is within 20%. Surface history
uses the prior going label beginning `Standard`, not course name alone, because
some tracks have both turf and artificial surfaces. Missing previous class or
rating changes are neutral; missing current rating/weight abstains for the field.

This small sample cannot support a reliable ten-feature model or calibration
claim. Ratings and carried weight can be highly correlated in handicaps.
There is no learned draw, trainer, jockey, pace or detailed going model.

## Provenance and limitations

`features-v1.json` preserves the exact training matrix, ordered horse IDs,
labels, source URLs, source SHA-256 receipts and observation timestamps. The
dataset and model carry integrity hashes. Per-race test scores and coefficients
are in `model-v1.json`. Historical cards were downloaded on 3 November 2026,
after their outcomes. History is filtered before the target date, but the cards
may have been corrected; first availability is not attested. Final runner
fields are known retrospectively. This is not an auditable pre-off withdrawal
simulation. Source HTML is not retained in this repository; hashes do not
substitute for an independently retained source snapshot.

## Reproduction

With Python 3.12, numpy and scipy installed:

```sh
python scripts/reproduce_horse_challenger.py
```

This reruns fitting, regularization selection and testing from the committed
feature data, checking the model/dataset hashes and score agreement. To repeat
source collection and feature extraction (remote source pages may change):

```sh
python scripts/collect_horse_training_pilot.py
python scripts/train_horse_challenger.py --input /tmp/horse-challenger-training/horse-training-data.json --output /tmp/horse-challenger-rebuild
```

The scheduled collector runs inference with standard-library code only. It
freezes challenger records in a separate immutable archive, with model artifact
hash, feature vector, baseline weight and runner-source receipt. Field changes
produce revisions; only the latest revision per race/model is scored. Stale
fields are withheld from current challenger display. Result scoring remains
single-source provisional and separate from the original model's results.

## Next experiment

Build a substantially larger earlier-period training set and use a new,
untouched evaluation period. Keep this failed pilot and its test scores
unchanged. Additional features or more confident percentages are not evidence
of improvement. Compare paired proper scores and calibration prospectively
before promotion; price-based claims require auditable market benchmarks too.
