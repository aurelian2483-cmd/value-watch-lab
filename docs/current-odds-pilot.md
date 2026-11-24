# Current Sky Bet price pilot

Reviewed 21 November 2026. The Odds API is suitable for a limited
source-observation pilot. Its public [plans and pricing][plan] list 500
credits per month for the free plan with current odds. The [v4 guide][v4]
documents free sport discovery, one credit per returned market and region,
one region-equivalent for up to ten selected bookmakers, and three quota
response headers. Empty odds responses can cost zero. The [bookmaker
list][bookmakers] lists `skybet` in the UK region. A listing does not prove
Sky Bet will quote any specific competition or fixture on a run.

The [sports catalogue][sports] lists NFL, the eight mapped football
competitions and ATP/WTA Finals. Horse racing was absent from the published
catalogue. The current racing sources described in
[the source review](post-merge-live-and-source-review.md) do not establish
an authorized anonymous Sky Bet win/place or each-way feed. Existing
racecards and archived odds remain separate.

## Collection and use

- The manual review requests `h2h`, decimal format, and `skybet` only.
  The allowlist covers Premier League, Championship, Champions League,
  Europa League, La Liga, Serie A, Bundesliga, Ligue 1, NFL and ATP/WTA
  Finals. Active discovery skips unavailable keys. Tennis crosswalks are
  deliberately limited to explicitly mapped tournament names.
- One run can query at most 11 odds endpoints after free discovery. It
  stops at 400 account credits used or when 20 credits remain, and aborts
  on missing or unexpected cost headers. There is no schedule and no
  automatic retry. Verified costs from controlled responses are not
  evidence of a live account balance.
- The runner accepts the key only through the GitHub Actions secret
  `THE_ODDS_API_KEY`. It stores a bounded normalized snapshot under
  `work/current-odds.json`, with source bookmaker, stable provider event
  ID, market, response fingerprint, observation and checked UTC times, and
  a credential-free source endpoint. HTTP failures log sanitized status,
  and neither raw API responses nor normalized snapshots are uploaded as
  public workflow artifacts. The snapshot is ephemeral on GitHub-hosted
  runners. The live review prints counts and checks rendered cards on
  loopback. The build extracts exact matched prices into the dashboard
  HTML. No public live feed or production release is enabled.
- The provider [terms][terms] permit retention, research, derived analytics
  and UI display, and restrict using API responses as a standalone
  redistribution product, including downloadable raw feeds. The
  [market guide][markets] establishes that soccer h2h includes a draw.
  It does not attest the precise bookmaker settlement or retirement rules
  for an individual quote. A production UI would need a permitted delivery
  path that avoids publishing a downloadable feed.
- Cards recheck the named competition, ordered participants, exact UTC
  kickoff, uniqueness, complete outcome set and a 30-minute freshness
  limit. They display Sky Bet, The Odds API attribution, checked time,
  observed time, source fingerprint and proportional no-vig probabilities.
  A documented bookmaker name is not a guarantee of executability.
- EV for this pilot feed is withheld. The NFL two-way moneyline is not
  the model's three-outcome market, including a tie. Football and tennis
  still need an exact settlement attestation before these receipts can
  enter the existing EV path. Previously supported football receipts keep
  their existing verification and EV requirements. No status is promoted.

## Public dashboard build

`node scripts/render_current_odds.cjs` builds
`work/public-price-preview/index.html` from the private runner snapshot and
the exact fixture snapshots in that checkout. It inserts a bounded set of
display sections in the normal dashboard page. Each section carries a
local fixture binding and expiry, matched prices, timestamps, provenance
label and the settlement caveat. The browser mounts a section only while
the exact current fixture still matches. A visible price is removed at
kickoff or 30 minutes after observation, whichever comes first.

Publisher builds must use the generated HTML in place of the stock
`index.html` and omit the whole `work/` directory from the static site.
The page does not fetch a provider JSON file or API endpoint. The
review job builds a clean tracked-files staging tree and uses only its
generated `index.html` in the loopback check. It does not deploy. Pages
currently serves the root of `main` using the branch build. A public
release requires an approved static deployment route for the staged
build and a fresh authenticated review. A deployed check must rejoin the
same source receipts and assert the visible prices before sign-off. From
the runner checkout with the same fresh private snapshot, run
`node scripts/current_odds_browser_qa.cjs --public` after deploying the
staged tree. It checks the current Pages URL, the rendered prices and the
absence of the snapshot route.

## Follow-on integration: bounded website refresh (24 November 2026)

The separate `.github/workflows/odds-website-refresh.yml` integration adds a
controlled acceptance run against the repository's **existing** Actions secret
`THE_ODDS_API_KEY`. A pull request runs one Premier League odds endpoint at
most, after free sports discovery, and never deploys that preview. It reports
whether the secret is accessible without revealing its value. A valid key does
not guarantee Sky Bet quotes or an exact match in the published fixture feed.

Once this reviewed integration is merged to `main`, scheduled runs sample
Premier League and Championship at **12:11, 15:11, 17:11, 20:11 UTC**,
with at most two paid odds endpoints per run. Assuming a one-credit cost per
endpoint, that is at most approximately 240 scheduled credits in 30 days,
excluding optional manual runs, other account clients, and unexpected provider
charging changes. Provider response quota headers independently stop collection
at 400 total credits used or at 20 remaining. Scheduled GitHub Actions may run
late or fail; this is not continuous or guaranteed live coverage. Price sections
automatically expire 30 minutes after their source observation or at kickoff.
Unavailable or unmatched prices remain absent, never reconstructed from older
records.

The production publisher embeds a small amount of **display-only** quote
information into `index.html`, not a raw downloadable price feed. Browser QA
checks the exact joined fixtures before publication, and the workflow publishes
nothing on an API error or failed verification. Only the built page is committed;
`work/current-odds.json` and the provider credential remain unpublished.
The publisher requires GitHub Pages to continue serving the `main` branch and
an Actions secret actually accessible in the workflow. The old Hybrid 3.1
collector remains a separate research evidence source with its own cooldown
rules; it is not used as an API-key fallback or a live-price substitute.

This is **on-page observational pricing only**. It does not establish
settlement terms, trade execution, validated EV or betting eligibility.
Research remains UNVALIDATED and publication of betting recommendations BLOCKED.

## Racing manual capture

On an exact upcoming race in the default desk, expand **Record an
unverified price privately**. Record Sky Bet's HTTPS source and runner.
Use **Win** or **Place** for a separately quoted market. Use **Each-way**
for the quoted win leg plus the published places, field size and place
fraction. The form neither infers place odds nor assumes default terms.
It stores the observation and race identity in private browser storage
and never passes it to EV, model training or qualification.

## Activation

Add the free key at
[repository Settings → Secrets and variables → Actions][secrets] as
`THE_ODDS_API_KEY`. To verify the draft, apply the `odds-live-review`
label to PR #141 after the secret is available. The job is scoped to the
same-repository draft branch and that label event. Once its workflow is on
the default branch it also supports manual dispatch. Leave the PR in draft
if one or more sports do not render a live exact match. The test mode uses
controlled responses and never calls the provider.

Models remain **UNVALIDATED** and publication remains **BLOCKED**.

[plan]: https://the-odds-api.com/#pricing
[v4]: https://the-odds-api.com/liveapi/guides/v4/
[bookmakers]: https://the-odds-api.com/sports-odds-data/bookmaker-apis.html
[sports]: https://the-odds-api.com/sports-odds-data/sports-apis.html
[terms]: https://the-odds-api.com/terms-and-conditions.html
[markets]: https://the-odds-api.com/sports-odds-data/betting-markets.html
[secrets]: https://github.com/aurelian2483-cmd/value-watch-lab/settings/secrets/actions
