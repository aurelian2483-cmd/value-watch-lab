#!/usr/bin/env python3
"""Experiment 24: fail-closed publication gate tests. Never writes repository.
GitHub commit timestamp and immutable append-only policy require later independent checks.
"""
import datetime as dt,json,pathlib,sys
from experiment21_ledger import check_record,identity,validate_ledger
def gate(candidate,ledger,now,fixture_attestation=None):
    check_record(candidate,now)
    existing=validate_ledger(ledger,now)
    if identity(candidate) in existing:raise ValueError("duplicate fixture already committed")
    if fixture_attestation is None:raise ValueError("independent fixture attestation required")
    if fixture_attestation.get("fixture_key")!=list(identity(candidate)):raise ValueError("fixture identity mismatch")
    if fixture_attestation.get("source_url")!=candidate["fixture_source"]:raise ValueError("fixture source mismatch")
    if fixture_attestation.get("verified_at_utc")!=candidate["source_verified_at_utc"]:raise ValueError("verification timestamp mismatch")
    # Attestation must be independently generated; this local check is necessary, not sufficient.
    if fixture_attestation.get("independent") is not True:raise ValueError("independent verification not established")
    # Prevent relying on old snapshots even when their timestamps were syntactically valid.
    verified=dt.datetime.fromisoformat(candidate["source_verified_at_utc"].replace("Z","+00:00"))
    if not dt.timedelta(0)<=now-verified<=dt.timedelta(hours=6):raise ValueError("fixture verification too old")
    cutoff=fixture_attestation.get("training_cutoff_utc")
    if not isinstance(cutoff,str) or not cutoff.endswith("Z"):raise ValueError("training cutoff absent")
    cutoff_dt=dt.datetime.fromisoformat(cutoff.replace("Z","+00:00"))
    generated=dt.datetime.fromisoformat(candidate["generated_at_utc"].replace("Z","+00:00"))
    if cutoff_dt>generated:raise ValueError("training cutoff after prediction")
    if fixture_attestation.get("training_data_complete") is not True:raise ValueError("training completeness not independently established")
    return {"status":"GATE_CHECKED_NOT_PUBLISHED","fixture_key":list(identity(candidate)),"publication_authorised":False}
def main():
    print("Experiment 24 is a safety gate library only; run unit tests. Publishing remains disabled.")
if __name__=="__main__":main()
