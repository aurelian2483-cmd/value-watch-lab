# Cloud-first hybrid dispatch — hosted QA milestone

The website is intended to be cloud-first, with a separate optional home PC worker. This branch builds on PR #189 without modifying the production website or enabling scheduled research. The hosted GitHub Actions runner performs only the previously approved fixed synthetic QA queue and exports an aggregate receipt and a self-contained status page. The home PC is not used. No paid GPU service is configured.

The receipt marks the optional GPU as NOT_CONNECTED; it is not a live heartbeat. Actual remote worker enrollment, authenticated lease assignment, duplicate-job prevention across hosts, revocation, remote result intake, durable shared storage, website integration and publication of an online site are outstanding. No arbitrary commands, secrets, real-data research, protected evaluation or production execution. CI concurrency serializes runs within this PR; it does not provide a distributed lock or cross-run deduplication. The artifact expires after 14 days; retain accepted bytes separately for durable evidence. A receipt self-hash does not authenticate a worker, and the local byte anchor used for the CI rendering is generated in the same workflow, not an independent trust authority. Production receipt intake must independently bind source workflow identity and trusted bytes.

Run only the reviewed fixed QA in CI. No schedules, external provider polling, automatic retry, merging, Pages deployment, or self-hosted runner registration are added. The portable static HTML can be viewed offline or hosted by a future approved deployment. The existing ten-section website is unchanged.

Research UNVALIDATED. Production dispatch and publication BLOCKED.
