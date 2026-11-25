# Portable optional PC presence client

Base: accepted PR #194, ddf3a61edf426cd50c108007ee7461b3a74f4364, workflows 45531570259 and 45531571121 passed. This sibling of the static release candidate adds the missing outbound presence client, not a production backend or GPU execution agent.

Run python -B research/pc-presence-client/client.py for a no-network dry run. The optional --send operation makes exactly one TLS-authenticated heartbeat after reading the server's dedicated worker cursor. It reports UNKNOWN for GPU status by default; it does not inspect or modify your hardware. No token file, credential command-line option, remote commands, scheduler installation or inbound PC listener. A remote hostname requires an explicit --allow-remote option, HTTPS port 443, pinned application revision and verified server certificate. Never use the loopback test server as an internet service. No remote server has been provisioned.

The cursor returns only the worker's sequence, approved revision and blocked GPU flag, never observer status, jobs, secrets or receipts. An ambiguous acknowledgement is not automatically retried; the next explicitly initiated report reads the durable cursor again. Revocation and revision mismatches fail closed. One credential must identify one optional worker; the sequence is not independent device attestation. No protected data, research execution or production dispatch.

CI verifies seven portable scenarios on Windows and Linux, plus three actual loopback TLS integration scenarios on Linux. Existing controller QA remains enabled. A real cross-host TLS endpoint, secure credential provisioning, installation on the authorized PC and actual hardware acceptance remain outstanding. No production or publication change.
