# Cloudflare account preflight — dry run only

This follow-up adds an authenticated local preflight to the exact disabled deployment kit. It does not change the accepted Worker source or enable any routes. The package still targets `sky-research-controller.aurelian2483.workers.dev` and keeps `SKY_MODE=DISABLED`, `SKY_PROVISION_ENABLED=false`, and `SKY_QUEUE_ENABLED=false`.

After extracting the complete ZIP into a new folder, sign Wrangler in using the OS keyring where supported:

```powershell
npx --yes wrangler@4.165.0 login --use-keyring
```

Find the expected Cloudflare account ID in Dashboard > Account details, then run in the extracted package directory:

```powershell
node preflight.mjs <EXPECTED_ACCOUNT_ID>
```

The script checks the exact package inventory, regular-file status and every manifest SHA-256; verifies the exact Wrangler version; runs `wrangler whoami --account <id> --json`; lists deployments for the exact Worker using a temporary account-scoped Wrangler config; confirms the public endpoint still returns exactly `Hello World!`; then runs `wrangler deploy --dry-run` and verifies a bounded non-empty bundle. The temporary account-scoped config and bundle are deleted on exit. Only a redacted summary is printed; no token, email or credential is emitted. The script contains no live deployment command and always reports `liveDeploymentPerformed=false`.

The script does not itself prove dashboard plan tier, absence of user-created data, billing status or that all bindings are disposable. Owner must visually inspect those items before approving replacement. A successful preflight is not deployment authorization. Never pass a token or API key as an argument or paste it into chat.

Wrangler command contracts are documented by Cloudflare: [whoami](https://developers.cloudflare.com/workers/wrangler/commands/general/) and [deployments list](https://developers.cloudflare.com/workers/wrangler/commands/workers/). The CI test mocks account and deployment responses; it never contacts a real Cloudflare account. Actual account authentication and local dry run remain owner-machine steps.
