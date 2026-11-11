# Cardano pinned HTTPS capture — development prototype

The source collector now resolves the approved hostname before opening an HTTPS request, rejects the entire DNS answer set if any destination is unsafe under the conservative network policy, and passes a pinned `lookup` callback into Node HTTPS. It retains the original URL hostname for TLS certificate checking and SNI, explicitly enables `rejectUnauthorized`, and disables connection pooling with `agent:false`.

The mocked tests check that the HTTPS transport receives the pinned lookup and TLS options, and that private DNS results reject the capture before the transport is called. No live network or actual TLS handshake is exercised by these tests.

**Remaining risks:** The custom destination classifier is not a complete IANA special-purpose registry; unusual IPv6 allocations, proxies, custom transports, resolver anomalies, content-type verification, publisher identity, connection-level TLS integration, and full end-to-end tests still need review. The caller-supplied resolver/transport injection exists for testing and must not be exposed to untrusted users. No automatic sports-result verification or betting publication is permitted. Models remain UNVALIDATED and publication BLOCKED.
