# Cardano controlled HTTPS source capture — development prototype

Node module: `cardano-lab/source-capture.js`. Its `capture(url,{allowedHosts})` fetches a URL only when its exact hostname is explicitly allowlisted. It rejects non-HTTPS URLs, nonstandard ports, credentials, fragments, redirects, non-200 responses, empty responses and responses larger than 2 MiB. Timeout is bounded. It returns raw bytes and a SHA-256 digest with capture time.

**Security/trust limits:** Allowlisting hostnames does not itself guarantee that an allowed host is safe, that DNS resolution avoids private/internal addresses, or that a response is authentic evidence of a sports outcome. Do not expose this as a generic user-supplied URL fetch endpoint. This prototype does not independently authenticate publisher identity, verify event outcomes, preserve source history, validate content type, or protect against DNS rebinding; those controls are required before untrusted production use. Do not use on arbitrary URLs or production infrastructure. No sources are fetched by CI: tests use mocked transport.

`publisher_authenticated=false`, `outcome_verified=false`, and publication `BLOCKED` are intentional. Source capture is not proof of positive expected value. Tests: `node tests/cardano_source_capture.cjs`.
