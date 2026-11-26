# Phase 3 external dependency evidence

**26 November 2026.** Draft PR 143 remains pinned to `e03ff8668330a4c2020f4ccc364f935e38741db8`. This evidence is on a separate research branch. It does not enroll any observations. The model is **UNVALIDATED**, betting publication is **BLOCKED**, and registered live collection is disabled. The existing archive, weights, registered protocol and prior evidence are unchanged.

## Network comparison

The one-off [run 45864937894](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45864937894) used commit `891ac9dd649768d9af366d422ce2d8996d9a7c59`. It made one synthetic nonce/SHA-256 request to each operator per GitHub-hosted runner. Both jobs used standard DNS and TLS controls, a six-second connect limit, a 14-second total limit and zero retries. Targets received only a public synthetic fixture's imprint and nonce. Subsequent bounded certificate requests followed operator documentation.

| Route and provider | DNS | TCP connected | TLS completed | HTTP first byte | HTTP / total |
| --- | ---: | ---: | ---: | ---: | --- |
| GitHub Ubuntu 24.04 · FreeTSA | 0.690 ms | 64.932 ms | 132.002 ms | 225.736 ms | 200 / 225.853 ms |
| GitHub Windows 2025 · FreeTSA | 180.439 ms | 243.098 ms | 392.614 ms | 468.322 ms | 200 / 468.676 ms |
| GitHub Ubuntu 24.04 · Open TSA | 144.065 ms | 255.392 ms | 371.037 ms | 522.118 ms | 200 / 522.203 ms |
| GitHub Windows 2025 · Open TSA | 486.686 ms | 584.227 ms | 861.967 ms | 995.801 ms | 200 / 996.090 ms |
| Managed Linux · both origins | Native origin DNS gave temporary resolution failure. The configured proxy's name resolved and the proxy exception list did not match either origin. | Prior Open TSA probe recorded no completed TCP or proxy CONNECT. FreeTSA stage was unmeasured. | No TLS was reached in the prior Open TSA observation. | No HTTP in either prior attempt. | Prior FreeTSA 4.002751 s, Open TSA 4.003134 s |
| Owner's Windows PC / other authorised egress | No exposed session or additional approved network route for this workstream. | — | — | — | — |

Curl timings are cumulative from invocation. Hosted jobs reported no proxy configuration and TLS verification succeeded. The earlier timeouts were specific to the observed managed route and time. The managed Linux observations cannot attribute the failures to a specific egress policy, proxy incident or the provider's prior state. The Windows VM is GitHub-managed and tests a different network from the owner's PC. Two samples per authority establish connectivity at the measured time and give no uptime assurance.

## Trust, revocation and cutoff

All four exact request/receipt pairs verified from the runner downloads, and I reverified the binaries offline at the signed time with each operator's supplied chain. All four modified payloads and all four requests with the original bytes but newly generated nonces were rejected. Verification against these anchors establishes the observed binding and certificate path. Independent anchor pinning and qualification of a trusted time service remain separate.

| Authority | Cryptographic observations | Registered intake disposition |
| --- | --- | --- |
| **FreeTSA** | Downloaded root matches the operator's published raw PEM SHA-256 `2151b61137ffa86bf664691ba67e7da0b19f98c758e3d228d5d8ebf27e044438`. Actual signer fingerprint `32E841A95CC1164101FFDE41298EF2FC75C1C4372EF095E88A6BBD47DFB191FC`; valid 15 Feb 2026 to 2 Feb 2040. Same signed nonce and SHA-256 imprint validated. Direct issuer CRL signature and leaf status validated at issuance from a CRL valid 18 Sep 2026–18 Sep 2027. | **Fails signed accuracy.** Both tokens returned `Accuracy: unspecified`. The prior isolated archival policy also requires a covering revocation publication dated at or after generation. This CRL was already in force and predates both receipts. Public terms allow application/commercial use and a maximum of one request/second/IP on a best-effort basis. Ask for a signed-accuracy profile and a post-generation record with long-term independent retention rights. [Usage terms](https://www.freetsa.org/freetsa.html) · [Practice statement](https://www.freetsa.org/freetsa_cps.pdf) |
| **Open TSA** | Both signed tokens contain a one-second accuracy and policy `1.3.6.1.4.1.59085.1.1`. Locally calculated root DER fingerprint `E45A75CB526087638107D4A3E9535B51145EFDDF88C5CABEA9B09E0AB439AF95`. Actual signing fingerprint `CDA5253F30385CE0F7067D2FB51A1726C3DB5F73A02A0EEDE24CE868CD9497D4`; valid 4 Apr 2026 to 3 Apr 2028. Supplied two intermediates chained to the operator's self-signed root. The signer and supplied CA certificates advertise no CRL or OCSP URI. No applicable independently verifiable revocation receipt was obtained. | **Blocked on trust and revocation.** The operator publicly invites free SHA-256 testing and documents 60 requests/min/IP. Formal usage and retention terms for continuing research were unverified. Require operator confirmation of independent root pin, revocation evidence for each issuing level, traceable clock policy and permissions. The unchanged direct-issuer fixture verifier fails on both actual receipts with missing intermediates. Using the separately retained untrusted intermediates with OpenSSL verifies the signature and binding. Any future intake integration would need explicit chain handling once the authority and retention arrangement are approved. [Operator's public testing instructions](https://git.open-tsa.eu/open-tsa/server/src/branch/main/README.md) · [Endpoint](https://open-tsa.eu/docs/tsr-endpoint/) · [Certificate chain](https://open-tsa.eu/docs/certificates/) |

The cutoff still requires `signed generation UTC + signed accuracy < scheduled start UTC − 5 minutes`. The Open TSA samples make that upper bound calculable. No sample used a registered race or a genuine forecast, so **zero receipts qualify for registered intake**. The online TLS handshake, transport time and local wall clock do not enter that inequality. [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161)

### Alternative service routes

- **Stamper** documents a free HTTPS RFC 3161 service. Its SHA-512 example using a deliberately nonce-less request has a signed five-second field. The current SHA-256 nonce profile, trustworthy clock, root and revocation have not been verified. Terms include confidentiality exclusions and indemnity. No connection or request to the timestamp endpoint was made. Owner approval of the terms is required before any use. [Terms](https://stamper.itconsult.co.uk/terms.html) · [Documented example](https://stamper.itconsult.co.uk/stamp-tsa.html)
- **GlobalSign** publicly documents standalone enterprise timestamps and qualified policies traceable within one second. Standalone use, current signed accuracy field, relevant CA grant, retention and cost would require a written trial or quote. **SwissSign** documents RFC 3161 and an authenticated subscriber endpoint. Neither contractual service was contacted or tested. A paid service is outside the present registration. [GlobalSign product](https://www.globalsign.com/en/timestamp-service) · [GlobalSign policy](https://www.globalsign.com/en/repository/GlobalSign-TPS-v1.1.pdf) · [SwissSign access](https://www.swisssign.com/en/support/faq/zeitstempel-dienst) · [EU/EEA trusted-list browser](https://eidas.ec.europa.eu/efda/trust-services/browse/eidas/tls)

## Evidence custody and reproduction

| Archive | GitHub ZIP SHA-256 | Hosted expiry |
| --- | --- | --- |
| [Ubuntu artifact 15140276354](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45864937894/artifacts/15140276354) | `a6ece5404d2903a3115e6503b63c63931f59b6ffa9af81c7c4d7a5e31fb19eb6` | 26 December 2026 17:07 UTC |
| [Windows artifact 15139916617](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45864937894/artifacts/15139916617) | `4e8f45a122285adbcc5ab7ec61534382811d3221345f998f9429a3084fd185f0` | 26 December 2026 17:07 UTC |

The saved ZIPs matched GitHub's published digests and passed ZIP integrity checks. [Machine-readable observations](timestamp-observations.json) contain runner stage timings, each receipt/input/request hash, dates, fingerprints, offered revocation URIs and offline verification outcomes. No real forecast or racing data was transferred through these jobs. The archival retention question remains open for any ongoing provider evidence. Pin these public logs and exact observations separately from earlier local fixture evidence.

Use the downloaded and unpacked Windows or Ubuntu artifact, then run from its unpacked directory. The following Open TSA example verifies the certificate path through the supplied intermediates and both input bindings. `-attime` must use that sample's signed generation time, observable via `openssl ts -reply -text`. Run the same commands for FreeTSA with `freetsa` and `signer.pem` substituted for `open-tsa` and `chain.pem`.

```sh
mkdir empty-certs
root_uri="$(python -c 'from pathlib import Path; print(Path("open-tsa/root.pem").resolve().as_uri())')"
openssl ts -reply -in open-tsa/receipt.tsr -text
# 1795712842 is the Ubuntu Open TSA sample's signed generation time.
for target in '-queryfile open-tsa/request.tsq' '-data open-tsa/fixture.txt'; do
    openssl ts -verify -in open-tsa/receipt.tsr -CAfile open-tsa/root.pem \
      -CApath empty-certs -CAstore "$root_uri" -untrusted open-tsa/chain.pem \
      -attime 1795712842 $target
done
```

Check the review package itself from the repository root with `sha256sum -c research/reviews/phase3-independent-review/external-dependencies/SHA256SUMS`. Previous statistical, transactional and pinned archive commands remain in the [final qualification handover](../final-qualification/README.md).

## Decisions and external dependencies

| Decision | Evidence needed to resume |
| --- | --- |
| Authorise the first no-cost enquiries | Confirm sending to BHA/Weatherbys and Open TSA. The [unsent drafts](permission-requests.md) cover full official evidence, named reviewer rights, independent timestamp trust and revocation. Other drafts are available if replies leave gaps. No purchase is proposed for the registered protocol. |
| Appoint genuinely independent reviewers | Identify the statistician and the timestamp/data/transaction reviewer or reviewers. Confirm who can receive each data class under approved terms. A conflict declaration and written sign-off on the [review checklist](reviewer-checklist.md) are required. |
| Use the owner's Windows route only if intended | Supply or approve a project-specific existing Windows access route if it is to be the operating environment. GitHub runner success cannot qualify that Windows installation or its network. The same one-off probe can produce the comparable receipt once an authorised route exists. |
| Authorise prospective use separately | Wait for written source rights, complete datasets and independent outcome lineages, qualified timestamp and retention evidence, and external review. Keep the registered ledger disabled in the meantime. |

See [racing data comparison](racing-data-access.md) for named products, exact permission requests and published rates. The evidence available without further rights or external decisions has been exhausted.
