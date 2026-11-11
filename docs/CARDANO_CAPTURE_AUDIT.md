# Cardano capture receipt audit

`cardano-lab/capture-audit.js` checks whether an HTTPS capture receipt is internally consistent with its supplied raw bytes: SHA-256 digest, byte length, status 200, capture timestamp/freshness and required research safety gates. It refuses unsupported assertions that publisher or outcome verification has already occurred. Test: `node tests/cardano_capture_audit.cjs`.

**Boundary:** Receipt consistency is not independent source verification. Capture timestamps and URLs are self-reported, DNS/private-address protection is not implemented in the source-capture prototype, and a matching hash does not establish the truth of a sports result. Therefore `eligible_for_scoring` is always false. The component is for offline research diagnostics only, not live deployment or betting publication.
