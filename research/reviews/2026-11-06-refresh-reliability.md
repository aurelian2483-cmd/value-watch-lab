# Racing refresh reliability — 6 November 2026

## Confirmed cause

Successful GitHub collections were separated by hours despite the configured twenty-minute cron. The public source remained reachable. Browser polling retrieves published files; it cannot run the source collector. An unchanged forecast freeze timestamp is intentional: current field checks can reconfirm the same immutable calculation. At 15:23, the displayed 14:09 field was too old.

## Changes

A bounded active session supports one to six collection cycles, twenty minutes apart. Ordinary triggers remain one cycle. An explicit workflow input selects more cycles; a repair commit marked [active-racing-refresh] starts six. Each cycle publishes raw racecards before slower result/model work, then publishes updated checks and model feeds. Per-cycle source evidence is retained for the workflow artifact. Sessions stop on failure, at their time limit or outside the collection window. No force pushes are used.

Successful main-branch football and tennis/NFL workflow completions provide fallback opportunities when racing data is at least fifteen minutes old. Self-triggering is excluded. This mitigates missed cron runs; it does not guarantee service availability or eliminate GitHub startup delays.

The website now exposes snapshot age and a delayed-collection warning separately from the last attempt to check published files. Manual Refresh retrieves snapshots without resetting page state. No timestamp is advanced merely because the browser refreshed.

## Preserved limitations

No forecast probabilities or historical records are rewritten. Insufficient full-field form still withholds a forecast. Stage policy remains conservative. Research remains UNVALIDATED and betting publication BLOCKED. A reliable independent scheduler/backend is still required for guaranteed unattended twenty-minute service beyond a running bounded session.
