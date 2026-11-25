# Optional PC worker — presence-only QA

Based on PR #191 commit c70ac0b8239666911cbf6317858dd6128d9fad53. Controller QA run 45530645660 passed 27 tests plus actual hosted fixed CPU dispatch over loopback TLS (two jobs, 500 synthetic checks); full regression 45530645459 passed.

This branch adds a separate durable presence registry with a dedicated PC-only credential, monotonic sequence and server time, persistent revocation and a 120-second freshness threshold. A recent report is self-reported availability, not hardware attestation. Optional loopback TLS routes are explicitly configured, scoped to the same revision and credential policy; controller observer revocation applies to network presence reads. PC credentials never authorize claims, result submission, or status reading. The cloud CPU queue does not require PC presence.

Run the optional tests with PYTHONPATH=research/shared-job-controller python -B -m unittest discover -s research/optional-pc-worker -p 'test_*.py' -v on Linux. Eleven new tests are configured, including TLS role separation.

No external networking, automatic credential provisioning, installation on the home PC, physical GPU probe, GPU dispatch, scheduled production research, deployment or publication. Presence database is a separate local QA store; production backup/rollback, rotation, sequence recovery after a lost acknowledgement and unified authorization across external hosts still need design and acceptance. Revocation of the controller observer role does not change the separate presence database, so the transport must check the controller role before reading presence. Direct database and service access is trusted administrative access only. Research UNVALIDATED; publication and production dispatch BLOCKED.
