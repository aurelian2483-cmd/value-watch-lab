# Three-expert review — 4 November 2026

## Scope and verdict

Independent betting/model, data-integrity, and web/GitHub reviews inspected the racing upgrade, its retained records, workflow and tests. It remains experimental research: UNVALIDATED, publication BLOCKED, official challenge 0/100. Successful software checks do not establish an edge.

## Confirmed defects addressed

1. Malformed recent same-discipline form could be skipped in favour of older results. Missing race identities and invalid dates now withhold the context forecast.
2. An archived revision could inherit the latest revision's current-field check. Displayed records now use their own identity and check.
3. Meetings appearing only in archived records could disappear from the filter. Options now include the recent archive.
4. A legitimate start-time change for the same race could abort source-price archiving and prevent raw racecards publishing. Schedule changes are retained as non-comparable observations.
5. A backlog of unresolved results could monopolise the 30-result batch. Persistent retry rotation prevents newer results being permanently deferred.

The archive selector is labelled Recent frozen forecast records because the public feed exposes the latest 50 records. Full archives remain retained in GitHub. The page script version is advanced for cache refresh.

## Remaining limitations and next improvements

- Raw source artifacts expire after 30 days. Permanent full-source reproducibility needs longer-term source retention; hashes and extracted records are retained.
- Already scored provisional results are not automatically revisited for later official corrections. A bounded recheck and append-only amendment protocol remains needed.
- Equal-chance comparisons do not establish improvement over the original model or market. Paired same-race comparisons by discipline and surface remain needed.
- Any change to exploratory parameters should create a new model version or separate evaluation group; current evaluation groups by model name.
- Independent capture-time attestation, executable odds, SP/BSP, profitability and an independently validated betting edge remain unestablished.
- Automatic tipster collection remains unconnected. Jump-racing calculation support does not guarantee an eligible full-field forecast.

## Validation

Targeted regressions reproduce the identified failures. Combined verification passed: 83 Python tests and all JavaScript test suites, including rendering the actual archive script with old/new revisions and archive-only meetings. Deployment status is verified separately after publication.
