# Bottleneck Lab — original response integrity gate

**Research-only and read-only.** This stage closes a different gap from matching two web-source result claims: whether the **original source response bytes** can still be obtained and shown to have the same SHA-256 digest as the source receipt recorded at collection time. **A matching hash does not establish independence, original publication time, identity or authenticity.**

The canonical Result Review and Source Verification stages remain untouched. This stage adds an optional private input for original response bodies. It does not read or change the verified outcomes feed, select a method, score predicted winners or publish a betting recommendation.

## What this stage measures

- A retained response is either absent, byte-consistent with its recorded source SHA-256, mismatched, or accompanied by contradictory source metadata.
- Each review packet has separate primary and secondary statuses; a paired SHA-256 match is a byte-consistency finding **only**.
- The output never carries the original response bytes, the full private file paths or fabricated reviewer signatures.
- Extra, duplicate, wrong-event and malformed sources are rejected; unsafe paths, symlinks and files over 3 MB are refused.
- The 1,000-item mathematical catalogue milestone, source verification, clean validation windows and explicit user review remain mandatory before any tournament.

## Run against current canonical source archives (Node 22)

~~~sh
node --test research/bottleneck-selector/selector.test.mjs research/bottleneck-selector/evidence-bridge.test.mjs research/bottleneck-selector/method-identity.test.mjs research/bottleneck-selector/result-review.test.mjs research/bottleneck-selector/source-verification.test.mjs research/bottleneck-selector/raw-source-evidence.test.mjs
node research/bottleneck-selector/result-review-cli.mjs > /tmp/bottleneck-review.json
node research/bottleneck-selector/source-verification-cli.mjs /tmp/bottleneck-review.json > /tmp/bottleneck-dossier.json
node research/bottleneck-selector/raw-source-evidence-cli.mjs /tmp/bottleneck-dossier.json > /tmp/bottleneck-raw-audit.json
~~~

With no private original-response files, the real-data audit deliberately reports every original response as missing, **not** as a failure of the code or evidence that the sources were fake.

## Optional private original-response manifest

Keep original source bodies and the manifest **outside the public GitHub repository**. Example file named private-manifest.json beside a local subfolder named originals:

~~~json
{
  "schema_version": 1,
  "kind": "PRIVATE_RESULT_SOURCE_BYTES_V1",
  "records": [
    {
      "prediction_id": "EXACT_PREDICTION_ID_FROM_DOSSIER",
      "side": "first_source",
      "source_url": "https://EXACT_ORIGINAL_SOURCE_URL_FROM_DOSSIER",
      "observed_at_utc": "EXACT_OBSERVATION_TIMESTAMP_FROM_DOSSIER",
      "relative_path": "originals/response.bin"
    }
  ]
}
~~~

The example is a *schema illustration only*; do not create or label any source as genuinely captured if it was not. For real comparisons, provide the actual bytes captured at the time, **not newly fetched HTML, copied text or reconstructed JSON**. Then run:

~~~sh
node research/bottleneck-selector/raw-source-evidence-cli.mjs /tmp/bottleneck-dossier.json /private/location/private-manifest.json > /tmp/bottleneck-raw-audit.json
~~~

The original bytes must be an externally provided local file with exact source URL and observation-time metadata. Source digests remain assertions until independently tied to real original responses and to an auditable collection process. Do not commit restricted provider responses, personal data or licensed raw documents to the public repository.

## Next required verification

1. Establish which original provider response bytes, if any, actually survive from the original capture time, with permitted reuse and retention.
2. Audit independent upstream result origin, exact event/participant/market settlement and timestamp evidence. A second URL or different host alone is not sufficient.
3. Have a human reviewer resolve discrepancies and record a transparent signed-off decision, without silently adding results to the published archive.
4. Separately verify mapping between website dropdown methods and immutable forecast versions before model-versus-model comparison.
5. Continue full chronological testing and statistical evaluation without reopening previously exposed holdout windows.

**No verified outcome, dropdown winner, positive ROI or bet is produced here. Keep the PR draft.**
