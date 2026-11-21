# Future fixture receipt intake v1

Supply an object containing integer `schema_version: 1` and a `receipts` array.
Every receipt has a unique lowercase `receipt_id` token matching
`[a-z0-9][a-z0-9._-]{0,127}` and all fields below. Each field is an object
with exactly `state` and `value`. Use `known` with a valid value,
`unknown` when it cannot be established, or `unavailable` when the evidence
cannot be accessed or retained. The last two states require JSON null.
Omitted fields, duplicate JSON members and unrecognized fields fail validation.

| Field | Known value |
| --- | --- |
| `provider` | Source-reported provider label. |
| `acquisition` | Object with `collector`, `basis`, and state-wrapped `upstream_providers` and `evidence`. Basis is `provider_label`, `aggregate_documentation`, or `fixture_level_receipt`. The last requires a known evidence reference. Known upstream providers are a nonempty array of distinct labels. Evidence uses the source-reference shape below. |
| `event` | Object with an ID `namespace` token and an opaque string `id`. This records an asserted provider-specific identity. |
| `fixture` | Object with `competition`, ordered `home` and `away` names, and state-wrapped `scheduled`. A known schedule has `precision` and `value`. Use `date_only` with YYYY-MM-DD or `utc_timestamp` with an explicit UTC timestamp. |
| `settlement_scope` | `regulation_time`, `including_extra_time` or `including_penalties`. |
| `score` | Two nonnegative integers in home/away order. |
| `retrieved_at_utc` | UTC timestamp YYYY-MM-DDTHH:MM:SSZ, with optional 1–6 fractional digits. This is the claimed retrieval time. |
| `source` | Object with `kind` and `reference`. Use `https_url` with a URL without user information or fragment, or `permitted_receipt_reference` with an opaque lowercase token. |
| `content_sha256` | Lowercase SHA-256 of the original receipt bytes, if lawfully retained. |
| `licence_retention` | Object with `policy_reference` in source-reference format and `retention` of `permitted`, `metadata_only`, or `prohibited`. The submitter supplies these claims. |

Ordinary strings are printable, trimmed, nonempty and at most 2,048 characters.
An absent acquisition trail stays unknown or unavailable even when the names,
score, event ID or provider label match another observation. A date-only
fixture does not establish kickoff or chronology. Aggregate documentation
does not attest acquisition of an individual fixture. Preserve settlement
scope and the order of the teams when preparing a manual review.

Run:

```sh
python scripts/football_evidence_intake.py research/football-result-provenance/intake.empty.json
```

The validator reports structure and field availability to stdout. It reads only
the specified JSON file. It does not open referenced files, request URLs, inspect
licence permissions, rehash payloads, corroborate claims, or update the ledger.
Empty, partial and fully populated files all contribute zero verified results
and zero automatic classification changes. Reviewers would need separately
retained fixture-level receipts and an audited identity crosswalk to assess
independence. The repository example contains no receipts.
