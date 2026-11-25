"""CI-only static export after actual scheduled fixed QA."""
import os
from pathlib import Path
from hosted_acceptance import main
from scheduled_acceptance import admit
from status_export import export

def observe(snapshot,admission,revision):
    if os.environ.get("GITHUB_EVENT_NAME")!="pull_request":
        raise RuntimeError("Pull request QA only")
    export(snapshot,admission,revision,Path(os.environ["RUNNER_TEMP"])/"operational-status",os.environ["GITHUB_RUN_ID"],os.environ["GITHUB_RUN_ATTEMPT"])
    print("PASS redacted operational QA evidence exported; no live status or production execution")

if __name__=="__main__":
    main(admit,observe)
