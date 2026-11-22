# Reference redesign release review

The cumulative candidate is draft PR #140. Review the proposed changes
in dependency order. PR #138 brings the fixture-first design to `main`.
PR #139 adds overview filtering and the exact football handoff on #138.
PR #140 adds cross-sport links and history revalidation on #139. The
default redesign and approved compact preview remain available.

The [coverage matrix](all-sports-coverage.md#exact-fixture-navigation-audit)
records the link decision for each sport. The racecard observation window
is 30 minutes. An older snapshot can legitimately show a calendar or an
unavailable state without an exact link. Publication is **BLOCKED** and
models remain **UNVALIDATED**.

The main-snapshot check overlays current research data into an ephemeral
runner checkout. It tests actual source availability and replays the
captured Manchester City v Fulham model for cutoff regression, even
after that fixture has rolled out of the upcoming feed. Calendar
recovery tests use each snapshot's own capture time. Neither test changes
published evidence or the validation rules.

## Windows tablet preview

This candidate has no hosted preview deployment. On the tablet, download
and extract the [PR #140 branch ZIP](https://github.com/aurelian2483-cmd/value-watch-lab/archive/refs/heads/codex/exact-cross-sport-navigation.zip).
In the extracted folder containing `index.html`, open Windows Terminal
and run `py -m http.server 8000 --bind 127.0.0.1`. Leave it open during the
test.

Open the [redesigned desk](http://127.0.0.1:8000/) and the [approved compact
view](http://127.0.0.1:8000/?view=visual-preview) in Edge. Run the server on
the tablet itself because these links point to that device.

1. Rotate the desk and then the compact overview from portrait to
   landscape and back. Check that fixture rows and navigation remain
   readable, with no horizontal page scroll or obscured controls.
2. Tap a sport, choose a UK date and use fixture search. Confirm adjacent
   controls are easy to hit. Tap a linked fixture if present, then use
   Edge's Back gesture or Back button. Confirm the sport, date and search
   are restored. If the feed has expired, check that there is a clear
   unavailable state and the sport lane still opens.
3. Refresh after choosing filters. With a keyboard attached, Tab to the
   sport selector and an available fixture, then press Enter. Check that
   focus is visible, moves to the sport content on selection and remains
   usable on return.
