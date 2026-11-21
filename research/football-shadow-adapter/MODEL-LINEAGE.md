# Football model lineage registry

The [registry](../../scripts/football_model_lineage.py) records labels traceable to
the pinned [dashboard and expanded research producers](ARCHITECTURE.md) and the
[retrospective replay](../football-baseline-v1/replay.mjs). The Git source pin
identifies the producer code inspected. Published rows lack separately
attested immutable model-version and configuration hashes. A data digest,
forecast digest or `V1` name cannot stand in for those values.

| Label | Finding |
| --- | --- |
| V1 | Specific research variants are implemented, including prior-season Poisson, current-season shrinkage, league variants and current-season comparison. The replay has unadjusted and form-adjusted retrospective variants. Their research names establish no common production version. |
| V2, V3, V4, V5, V6 | The reviewed football producers and tests establish no individually identified football model implementation or partial integration for these version labels. Their mapping is unverified. The mathematical [research programme](../MATHEMATICAL_RESEARCH_CENTRE_MASTER_PLAN.md) contains planned work, with no reviewed mapping of proposals to these labels. |
| Archive and dashboard metadata | Partial lifecycle evidence. The primary/revision chain and source digests can diagnose producer records but do not attest a configuration or freeze. |

The admitted configuration set is empty. Evaluation rejects a prospective
record with an unknown model or unresolved immutable version/configuration
even when the review manifest is pinned. There is no CLI override.
In-memory tests provide an isolated synthetic lineage to exercise maths
and chronology. Synthetic fixtures stay excluded from real scoring.
