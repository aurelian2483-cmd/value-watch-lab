"""Private first-write-wins storage for ORIGINAL result-response bytes.

Research only. Nothing is downloaded here, placed in Git, uploaded to Actions,
or treated as independently verified. Requires an explicit private local root
outside the public checkout. Used only after a collector actually observes a final.
"""
from __future__ import annotations
import hashlib
import json
import os
import re
import stat
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

MAX_BODY = 3_000_000
SHA = re.compile(r"^[a-f0-9]{64}$")
ISO = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$")

class PrivateCaptureError(ValueError):
    """Fail-closed private evidence retention error."""

def _timestamp(value):
    if not isinstance(value, str) or not ISO.fullmatch(value):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False

def _private_directory(path):
    if path.is_symlink() or not path.is_dir():
        raise PrivateCaptureError("Unsafe private evidence directory")
    info = path.stat()
    if info.st_mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise PrivateCaptureError("Private evidence directory is accessible to other users")
    if hasattr(os, "getuid") and info.st_uid != os.getuid():
        raise PrivateCaptureError("Private evidence directory not owned by process")

def _atomic_create(path, data):
    """Atomic exclusive hard-link publication on the same filesystem."""
    if path.exists() or path.is_symlink():
        if path.is_symlink() or not path.is_file():
            raise PrivateCaptureError("Unsafe existing private file")
        s = path.stat()
        if s.st_mode & (stat.S_IRWXG | stat.S_IRWXO) or path.read_bytes() != data:
            raise PrivateCaptureError("Conflicting or exposed first-write evidence")
        return False
    fd, tmp = tempfile.mkstemp(prefix=".new-", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as handle:
            fd = -1
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(tmp, path, follow_symlinks=False)
        except FileExistsError:
            if path.is_symlink() or not path.is_file() or path.read_bytes() != data:
                raise PrivateCaptureError("Concurrent private evidence conflict")
            return False
        return True
    finally:
        if fd != -1:
            os.close(fd)
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass

class PrivateResultCapture:
    def __init__(self, root, repository_root):
        supplied = Path(root).expanduser()
        repository = Path(repository_root).resolve(strict=True)
        if supplied.is_symlink() or not supplied.exists():
            raise PrivateCaptureError("Explicit pre-existing private evidence root required")
        self.root = supplied.resolve(strict=True)
        if self.root == repository or repository in self.root.parents:
            raise PrivateCaptureError("Private evidence cannot be inside the Git checkout")
        _private_directory(self.root)
        self.raw = self.root / "raw"
        self.receipts = self.root / "receipts"
        for folder in (self.raw, self.receipts):
            if not folder.exists() and not folder.is_symlink():
                folder.mkdir(mode=0o700)
            _private_directory(folder)

    def preserve_observation(self, observation, original_response):
        if not isinstance(original_response, bytes) or not 0 < len(original_response) <= MAX_BODY:
            raise PrivateCaptureError("Missing or oversized original source bytes")
        if not isinstance(observation, dict) or observation.get("status") != "SINGLE_PROVIDER_FINAL_UNVERIFIED" or (
            observation.get("independently_verified") is not False or observation.get("betting_eligible") is not False
        ):
            raise PrivateCaptureError("Not an eligible unverified provider observation")
        prediction = observation.get("prediction_id")
        source = observation.get("source_url")
        expected = observation.get("provider_response_sha256")
        observed_at = observation.get("source_observed_at_utc")
        if not isinstance(prediction, str) or not 0 < len(prediction) <= 180:
            raise PrivateCaptureError("Missing immutable prediction identifier")
        if not isinstance(source, str) or len(source) > 1200 or not _timestamp(observed_at):
            raise PrivateCaptureError("Invalid source identity or capture timestamp")
        try:
            url = urlsplit(source)
            allowed = (
                url.scheme == "https" and url.netloc == "site.api.espn.com"
                and not url.username and not url.password and not url.fragment
                and url.path in (
                    "/apis/site/v2/sports/football/nfl/scoreboard",
                    "/apis/site/v2/sports/tennis/atp/scoreboard",
                    "/apis/site/v2/sports/tennis/wta/scoreboard"
                )
            )
        except ValueError:
            allowed = False
        if not allowed:
            raise PrivateCaptureError("Source not on the explicit provider allowlist")
        actual = hashlib.sha256(original_response).hexdigest()
        if not isinstance(expected, str) or not SHA.fullmatch(expected) or expected != actual:
            raise PrivateCaptureError("Provider response digest does not match original bytes")
        if not all(isinstance(observation.get(k), str) and observation[k]
                   for k in ("sport", "event_id", "market", "actual_outcome")):
            raise PrivateCaptureError("Missing result observation identity")
        if observation["sport"] not in ("tennis", "nfl"):
            raise PrivateCaptureError("Unsupported result sport")
        filename = "raw/" + actual + ".bin"
        receipt = {
            "schema_version": 1, "kind": "PRIVATE_RESULT_SOURCE_CAPTURE_V1",
            "prediction_id": prediction, "side": "first_source",
            "source_url": source, "observed_at_utc": observed_at,
            "relative_path": filename, "body_sha256": actual,
            "sport": observation["sport"], "event_id": observation["event_id"],
            "market": observation["market"], "result_claim": observation["actual_outcome"],
            "independently_authenticated": False, "betting_eligible": False
        }
        blob = (json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n").encode()
        receipt_name = hashlib.sha256(prediction.encode()).hexdigest() + ".json"
        created = _atomic_create(self.raw / (actual + ".bin"), original_response)
        try:
            _atomic_create(self.receipts / receipt_name, blob)
        except Exception:
            # An orphan shared raw object may remain; never delete another
            # concurrent receipt's shared body or modify public archives.
            raise
        return {"status": "ORIGINAL_BYTES_PRESERVED_LOCALLY_UNATTESTED",
                "body_sha256": actual, "raw_object_new": created,
                "independently_authenticated": False}

    def preserve_secondary_observation(self, observation, original_response):
        """Retain a newly fetched NFL secondary claim, never independently certify it.

        A second publisher, different hostname or byte hash does NOT establish
        upstream independence. No existing primary receipt is replaced.
        """
        if not isinstance(original_response, bytes) or not 0 < len(original_response) <= MAX_BODY:
            raise PrivateCaptureError("Missing or oversized original second-source bytes")
        if not isinstance(observation, dict) or (
            observation.get("status") != "SECONDARY_UNVERIFIED"
            or observation.get("independently_verified") is not False
            or observation.get("betting_eligible") is not False
        ):
            raise PrivateCaptureError("Not an eligible unverified second-source observation")
        prediction = observation.get("prediction_id")
        source = observation.get("source_url")
        observed_at = observation.get("observed_at_utc")
        expected = observation.get("response_sha256")
        if not isinstance(prediction, str) or not 0 < len(prediction) <= 180:
            raise PrivateCaptureError("Missing immutable prediction identifier")
        if not isinstance(source, str) or not 0 < len(source) <= 1200 or not _timestamp(observed_at):
            raise PrivateCaptureError("Invalid secondary URL or capture timestamp")
        try:
            url = urlsplit(source)
            no_auth = (url.scheme == "https" and not url.username and not url.password
                       and not url.fragment and url.port is None)
            nflverse = (source == "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv")
            qs = parse_qs(url.query, strict_parsing=True)
            sportsdb = (
                url.hostname == "www.thesportsdb.com"
                and url.path == "/api/v1/json/123/eventsday.php"
                and set(qs) == {"d", "s", "l"}
                and len(qs["d"]) == len(qs["s"]) == len(qs["l"]) == 1
                and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", qs["d"][0]))
                and qs["s"] == ["American Football"] and qs["l"] == ["NFL"]
            )
            allowed = no_auth and (nflverse or sportsdb)
        except (ValueError, TypeError, KeyError):
            allowed = False
        if not allowed:
            raise PrivateCaptureError("Secondary result source not on allowlist")
        actual = hashlib.sha256(original_response).hexdigest()
        if not isinstance(expected, str) or not SHA.fullmatch(expected) or actual != expected:
            raise PrivateCaptureError("Secondary response hash does not match original bytes")
        if (observation.get("sport") != "nfl"
                or observation.get("market") != "GAME_RESULT_INCLUDING_OVERTIME"
                or not all(isinstance(observation.get(k), str) and observation[k]
                           for k in ("event_id", "actual_outcome", "source_match_status"))):
            raise PrivateCaptureError("Unsupported secondary result market or identity")
        if not isinstance(observation.get("participant_ids"), list) or len(observation["participant_ids"]) != 2:
            raise PrivateCaptureError("Incomplete secondary participant IDs")
        filename = "raw/" + actual + ".bin"
        receipt = {
            "schema_version": 1, "kind": "PRIVATE_RESULT_SOURCE_CAPTURE_V1",
            "prediction_id": prediction, "side": "second_source",
            "source_url": source, "observed_at_utc": observed_at,
            "relative_path": filename, "body_sha256": actual,
            "sport": observation["sport"], "event_id": observation["event_id"],
            "market": observation["market"], "result_claim": observation["actual_outcome"],
            "independently_authenticated": False, "betting_eligible": False
        }
        blob = (json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n").encode()
        receipt_name = hashlib.sha256(("second_source:" + prediction).encode()).hexdigest() + ".json"
        created = _atomic_create(self.raw / (actual + ".bin"), original_response)
        _atomic_create(self.receipts / receipt_name, blob)
        return {"status": "SECOND_SOURCE_BYTES_PRESERVED_LOCALLY_UNATTESTED",
                "body_sha256": actual, "raw_object_new": created,
                "independently_authenticated": False}

    def preserve_tennis_secondary_observation(self, observation, original_response):
        """Store exactly matching ORIGINAL WTA PDF or ATP Finals article bytes.

        The supplied original response may be historical and is NOT proof of
        its claimed observation time. This function never fetches or backdates.
        """
        if not isinstance(original_response, bytes) or not 0 < len(original_response) <= MAX_BODY:
            raise PrivateCaptureError("Missing or oversized original tennis evidence bytes")
        if not isinstance(observation, dict) or (
            observation.get("status") != "SECONDARY_UNVERIFIED"
            or observation.get("independently_verified") is not False
            or observation.get("betting_eligible") is not False
            or observation.get("sport") != "tennis"
            or observation.get("market") != "MATCH_WINNER"
            or observation.get("source_match_status") != "COMPLETED_SINGLES_RESULT"
        ):
            raise PrivateCaptureError("Not an eligible unverified tennis result")
        prediction, source = observation.get("prediction_id"), observation.get("source_url")
        seen, expected = observation.get("observed_at_utc"), observation.get("response_sha256")
        if not isinstance(prediction, str) or not 0 < len(prediction) <= 180:
            raise PrivateCaptureError("Invalid tennis prediction receipt")
        if not isinstance(source, str) or not 0 < len(source) <= 1200 or not _timestamp(seen):
            raise PrivateCaptureError("Missing tennis source URL or observation time")
        try:
            url = urlsplit(source)
            no_auth = (url.scheme == "https" and not url.username and not url.password
                       and not url.fragment and url.port is None and not url.query)
            wta = (
                url.hostname == "wtafiles.wtatennis.com"
                and bool(re.fullmatch(r"/pdf/draws/\d{4}/\d{1,6}/[A-Za-z0-9_-]+\.pdf", url.path))
                and observation.get("receipt_kind") == "PROVIDER_PDF"
                and original_response.startswith(b"%PDF-")
            )
            atp = (
                url.hostname == "www.nittoatpfinals.com"
                and bool(re.fullmatch(r"/en/news/[A-Za-z0-9-]+/?", url.path))
                and observation.get("receipt_kind") == "REVIEWED_SOURCE_FACTS"
                and b"<html" in original_response[:4096].lower()
            )
            allowed = no_auth and (wta or atp)
        except (TypeError, ValueError):
            allowed = False
        if not allowed:
            raise PrivateCaptureError("Unrecognised tennis source, receipt kind or body format")
        if (not isinstance(expected, str) or not SHA.fullmatch(expected)
                or hashlib.sha256(original_response).hexdigest() != expected):
            raise PrivateCaptureError("Tennis source original-byte fingerprint mismatch")
        players = observation.get("source_match_players")
        winner = observation.get("source_match_winner")
        participants = observation.get("participant_ids")
        if (not isinstance(players, list) or len(players) != 2
                or not all(isinstance(p, str) and p.strip() for p in players)
                or players[0] == players[1] or winner not in players
                or not isinstance(participants, list) or len(participants) != 2
                or len(set(participants)) != 2
                or not all(isinstance(x, str) and x for x in participants)
                or observation.get("actual_outcome") not in participants
                or not all(isinstance(observation.get(k), str) and observation[k]
                           for k in ("event_id", "source_competition"))):
            raise PrivateCaptureError("Tennis match identity or settlement not traceable")
        digest = expected
        receipt = {
            "schema_version": 1, "kind": "PRIVATE_RESULT_SOURCE_CAPTURE_V1",
            "prediction_id": prediction, "side": "second_source",
            "source_url": source, "observed_at_utc": seen,
            "relative_path": "raw/" + digest + ".bin",
            "body_sha256": digest,
            "sport": "tennis", "event_id": observation["event_id"],
            "market": "MATCH_WINNER", "result_claim": observation["actual_outcome"],
            "independently_authenticated": False, "betting_eligible": False
        }
        blob = (json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n").encode()
        receipt_name = hashlib.sha256(("second_source:" + prediction).encode()).hexdigest() + ".json"
        created = _atomic_create(self.raw / (digest + ".bin"), original_response)
        _atomic_create(self.receipts / receipt_name, blob)
        return {"status": "TENNIS_ORIGINAL_BYTES_MATCH_PRIVATE_RECEIPT_UNATTESTED",
                "body_sha256": digest, "raw_object_new": created,
                "independently_authenticated": False, "historical_capture_time_attested": False}

    def manifest(self):
        """Private manifest only. Verify stored bytes before exporting references."""
        records = []
        for receipt_path in sorted(self.receipts.glob("*.json")):
            if receipt_path.is_symlink() or not receipt_path.is_file():
                raise PrivateCaptureError("Unsafe receipt file")
            body = receipt_path.read_bytes()
            if receipt_path.stat().st_mode & (stat.S_IRWXG | stat.S_IRWXO):
                raise PrivateCaptureError("Exposed receipt file")
            r = json.loads(body)
            if r.get("kind") != "PRIVATE_RESULT_SOURCE_CAPTURE_V1" or r.get("side") not in ("first_source", "second_source"):
                raise PrivateCaptureError("Invalid saved private receipt")
            digest = r.get("body_sha256")
            if not isinstance(digest, str) or not SHA.fullmatch(digest):
                raise PrivateCaptureError("Invalid saved response digest")
            expected_name = (r["prediction_id"] if r["side"] == "first_source"
                             else "second_source:" + r["prediction_id"])
            if receipt_path.name != hashlib.sha256(expected_name.encode()).hexdigest() + ".json":
                raise PrivateCaptureError("Saved receipt identity mismatch")
            raw_file = self.raw / (digest + ".bin")
            if raw_file.is_symlink() or not raw_file.is_file() or not 0 < raw_file.stat().st_size <= MAX_BODY:
                raise PrivateCaptureError("Original response missing or unsafe")
            if raw_file.stat().st_mode & (stat.S_IRWXG | stat.S_IRWXO):
                raise PrivateCaptureError("Exposed raw source response")
            if hashlib.sha256(raw_file.read_bytes()).hexdigest() != digest:
                raise PrivateCaptureError("Original response tampered")
            records.append({k: r[k] for k in
                            ("prediction_id", "side", "source_url", "observed_at_utc", "relative_path")})
        return {"schema_version": 1, "kind": "PRIVATE_RESULT_SOURCE_BYTES_V1", "records": records}
