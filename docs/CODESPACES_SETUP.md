# Value Watch 3.0 — Codespaces setup

This is a development-only configuration on `feature/cardano-race-video-prototype`; the live site is not deployed from this branch.

1. Open the repository on GitHub. Select **Code → Codespaces → Create codespace on feature/cardano-race-video-prototype**.
2. Wait for the container to build and `npm ci` to finish. The preinstalled Node 22 environment does not automatically download Chromium.
3. In the terminal, run `node --version` and `npm test` only if that script is added later. Current checks:
   - `for script in paper-lab/*.js; do node --check "$script" || break; done`
   - `node tests/*.cjs` is **not** a safe generic command; tests have different prerequisites. Use the repository's documented commands and GitHub Actions.
4. For a preview, run `python3 -m http.server 8000 --bind 0.0.0.0`, then open forwarded port **8000**. This is a development preview, not a live deployment.
5. For browser tests, first run `npx playwright install chromium` (download may take time), then `node tests/race_video_browser.cjs` and `node tests/cardano_lab_widget_browser.cjs`. If the browser runtime cannot install, use GitHub Actions rather than claiming tests passed.
6. Ask Copilot Chat to read `.github/copilot-instructions.md` and the relevant GitHub issue, and to propose a small, testable patch. Copilot Free may not support autonomous PR creation; commits can be made in Codespaces with Git permissions.
7. Commit only to a development branch and open a pull request for review. Never merge to `main` without approval.

**Cost control:** Codespaces compute is metered by machine size and uptime. Stop the codespace when not using it; storage may continue to count. Monitor GitHub billing and allowances. Never store credentials in repository files.
