#!/usr/bin/env bash
# One auditable collection cycle, shared by ordinary and bounded active sessions.
set -euo pipefail
: "${HORSE_SESSION_CYCLE:?Cycle identifier required}"
if [[ ! "$HORSE_SESSION_CYCLE" =~ ^cycle-[0-9]{2}$ ]]; then exit 2; fi
snapshot_dir="/tmp/horse-session/$HORSE_SESSION_CYCLE"
retain_cycle() { mkdir -p "$snapshot_dir"; if [ -d /tmp/horse-research ]; then cp -a /tmp/horse-research/. "$snapshot_dir/"; fi; }
trap retain_cycle EXIT
publish() {
  if ! git diff --cached --quiet; then
    git commit -m "$1"
    git pull --rebase origin main
    git push origin HEAD:main
  fi
}
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
python scripts/discover_horse_races.py
python scripts/enrich_horse_runners.py
python scripts/archive_horse_markets.py
cp /tmp/horse-research/racing-research-data.json racing-research-data.json
git add -- racing-research-data.json
if [ -d research/horse-market-archive ]; then git add -- research/horse-market-archive; fi
publish "Refresh racecards and timestamped source-price observations"
if python scripts/collect_future_racing.py; then
  git add -- racing-future-data.json
else
  echo "::warning::Future source refresh failed; retained existing future snapshot"
fi
python scripts/collect_racing_community.py
git add -- racing-research/source-observations.json
publish "Refresh future racecards and source-linked published racing selections"
python scripts/horse_reference_baseline.py
python scripts/horse_secondary_source.py
python scripts/horse_model_pipeline.py
python scripts/horse_context_pipeline.py
python scripts/horse_challenger.py
HORSE_EVIDENCE_ARTIFACT_PREFIX="$HORSE_SESSION_CYCLE" python scripts/preserve_horse_evidence.py
for feed in racing-research-data horse-model-data horse-challenger-data horse-context-data horse-predictions-data; do cp "/tmp/horse-research/$feed.json" "$feed.json"; git add -- "$feed.json"; done
for archive in horse-challenger horse-evidence-receipts horse-context-archive horse-context-results horse-market-archive horse-reference-archive horse-form-archive horse-results horse-secondary-results; do
  if [ -d "research/$archive" ]; then git add -- "research/$archive"; fi
done
publish "Refresh experimental racing discovery observations"
