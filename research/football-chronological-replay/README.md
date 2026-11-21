# Date-ordered retrospective replay · Phases 37–43

An exploratory replay of the pinned 608-result Premier League reconstruction.
Each calculation sees only scores from earlier calendar dates in its own
season. These estimates were reconstructed after the events. Eligible real
prospective forecasts and outcomes remain **0**.

The common cohort contains 481 fixtures. Watermarks and exclusions apply
identically to all three formulas.

| Season | Eligible / archive rows | Excluded | Common coverage |
| --- | ---: | ---: | ---: |
| 2024–25 | 260 / 320 | 60 | 81.25% |
| 2025–26 | 221 / 288 | 67 | 76.74% |

In each season, 30 exclusions had fewer than 30 earlier league results.
The remaining exclusions had insufficient earlier venue results, 30 and
37 respectively. Each season has 20 exact team names, with no duplicate
fixture IDs, conflicting ordered pairs, alias collisions, or teams appearing
twice on the same date. The report concerns a selected archive subset.
It does not estimate full-season coverage.

| Season | Fixed path | Log loss | Multiclass Brier |
| --- | --- | ---: | ---: |
| 2024–25 | Standalone baseline | 1.039174 | 0.623849 |
| 2024–25 | Standalone + form α = 0.025 | 1.036059 | 0.621340 |
| 2024–25 | Expanded current-season formula | 1.007556 | 0.602699 |
| 2025–26 | Standalone baseline | 1.120730 | 0.678704 |
| 2025–26 | Standalone + form α = 0.025 | 1.118621 | 0.676891 |
| 2025–26 | Expanded current-season formula | 1.050747 | 0.633646 |

The one-component comparison uses the standalone baseline and the exact
prior-five goal-difference multiplier at α = 0.025. Form minus baseline
log loss is −0.003115 and −0.002109, and Brier is −0.002509 and −0.001813
in season order. These are descriptive score differences on this archive.
No significance or generalization claim is made.

The standalone path divides the shrunk home product by the league away mean,
and vice versa, with a .01 denominator floor. It clamps those baseline rates
before applying the form multiplier, with no second clamp. The expanded
kernel uses same-venue denominators and clamps the resulting rates without
a form stage. The replay calls the pinned expanded kernel with a shared
current-season history adapter and no fabricated kickoff or receipt. The
standalone Python trace is checked against both vectors from the pinned
JavaScript calculation on every eligible fixture. This comparison neither
recreates the expanded production feed nor selects a preferred formula.

Squad/player, stadium, market, nonzero H2H, opponent adjustment and the
composed V1–V6 chain are **NOT EVALUABLE** under the frozen protocol. No
same-day, price, player, other evidence-tier, held-out or external source
data entered the replay. Legacy, expanded final and single-source results
remain separate.

## Reproduce and inspect

Provision the immutable Git objects first if using a shallow checkout.
The commands after provisioning run offline. Use Python 3.11+ and Node 22.

```sh
git fetch --no-tags --depth=1 origin 9898e7e7773878ec32a0bfd3c38197fddb566893 0ab96a96fd66608d931c4109392ee29fe2ba3650
python scripts/football_chronological_replay.py --check
python scripts/football_chronological_replay.py --details
python -m unittest discover -s tests -p test_football_chronological_replay.py -v
```

The compact [machine-readable report](summary.json) records the full
input, protocol, registry, model source and configuration hashes. The detailed
report includes an exclusive date, prior-history hash, venue and recent-form
features, configuration hashes, and probabilities or an exclusion reason for
every fixture. The CLI writes only to stdout. The independent audit
reconstructed all 608 history cutoffs and league totals from the input,
checked each form window, and independently recomputed the six pairs of scores.

| Hash pin | SHA-256 |
| --- | --- |
| [Frozen protocol](protocol.json) | `6710cfa4e4cfe44196c98e2b88db704394ae151f8daf72694c63aaf302195522` |
| [Protocol notes](PROTOCOL.md) | `b12788a07c264820fa7bce289748fd79d9d823a3451bebac807cf9fa8be76e69` |
| Result input | `c489bbe629470ac9858dfebccd6d896451c98b0f3cca709f8c5bcccca8797fec` |
| Standalone configuration | `45676b7593d1256e9430fef174cce4e37254fac4a8548a6939d1dd8bf036b508` |
| Expanded configuration | `2e03acce49239c030410eb7c12199063318765fbc7558d0026b6490befe73cdf` |

No results were promoted. Models remain **UNVALIDATED** and publication
remains **BLOCKED**.
