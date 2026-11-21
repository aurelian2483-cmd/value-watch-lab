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
  loopback. No public live feed or publication workflow is enabled.
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
