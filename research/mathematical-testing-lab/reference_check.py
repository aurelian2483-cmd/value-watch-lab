"""Independent standard-library verification of the fixed synthetic-math-v1 suite."""
import json
import math
import re
import sys
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path

def require(condition, message):
    if not condition:
        raise ValueError(message)

def decimal_fraction(x):
    return Decimal(x.numerator) / Decimal(x.denominator)

def references():
    # Independent analytic references, not calls into the JavaScript solver.
    with localcontext() as context:
        context.prec = 60
        return {
            "sqrt-two": ("bisection", Decimal(2).sqrt(), Decimal("1e-12"), Decimal(2).sqrt(), Decimal("1e-12")),
            "linear-integral": ("composite-trapezoid", Decimal(12), Decimal("1e-12"), Decimal(12), Decimal("1e-12")),
            "quadratic-trapezoid": ("composite-trapezoid", decimal_fraction(Fraction(1,3)), Decimal("1.667e-5"),
                                    decimal_fraction(Fraction(1,3)+Fraction(1,6*100**2)), Decimal("1e-14")),
            "cubic-simpson": ("composite-simpson", Decimal(4), Decimal("1e-12"), Decimal(4), Decimal("1e-12")),
            "negative-dominant-eigenvalue": ("power-iteration-eigenvector", Decimal(-5), Decimal("1e-9"), Decimal(-5), Decimal("1e-9")),
        }

def parse_number(value):
    require(type(value) in (int, float), "Non-numeric or missing benchmark field")
    require(math.isfinite(value), "Nonfinite benchmark field")
    return Decimal(str(value))

def check_report(report):
    refs = references()
    require(report.get("kind") == "SYNTHETIC_MATHEMATICAL_BENCHMARKS" and report.get("schemaVersion") == 1
            and report.get("suite") == "synthetic-math-v1", "Unsupported report")
    require(report.get("researchOnly") is True and report.get("modelValidation") == "UNVALIDATED"
            and report.get("publicationGate") == "BLOCKED" and report.get("executionAuthorized") is False
            and report.get("validationAuthorized") is False, "Research safeguards missing")
    require(re.fullmatch(r"[a-f0-9]{40}", report.get("declaredCodeRevision", "")) is not None, "Invalid revision label")
    rows = report.get("results")
    require(isinstance(rows, list) and len(rows) == len(refs), "Incomplete or unexpected fixture set")
    require({r["id"] for r in rows} == set(refs), "Missing or duplicate fixture")
    require(len({r.get("experimentId") for r in rows}) == len(refs), "Duplicate experiment identity")
    output = []
    with localcontext() as ctx:
        ctx.prec = 60
        for row in rows:
            method, expected, tolerance, discrete, discrete_tolerance = refs[row["id"]]
            require(row.get("formulaId") == method, "Incorrect method identity")
            require(re.fullmatch(r"[a-f0-9]{64}", row.get("experimentId", "")) is not None, "Invalid experiment ID")
            require(re.fullmatch(r"[a-f0-9]{64}", row.get("fixtureSha256", "")) is not None, "Invalid fixture hash")
            require(parse_number(row.get("tolerance")) == tolerance, "Tolerance changed")
            declared_expected = parse_number(row.get("expected"))
            require(abs(declared_expected-expected) <= Decimal("1e-15"), "Declared expected value differs from analytic reference")
            if row.get("observed") is None:
                output.append({"id":row["id"], "status":"FAIL", "reason":"Missing observed value"})
                continue
            observed = parse_number(row["observed"])
            error = abs(observed-expected)
            discrete_error = abs(observed-discrete)
            # Float subtraction in the originating JS report is allowed a tiny rounding discrepancy.
            reported_error = parse_number(row.get("absoluteError"))
            error_consistent = abs(reported_error-abs(observed-declared_expected)) <= Decimal("2e-15")
            passed = (row.get("status") == "PASS" and row.get("converged") is True
                      and error <= tolerance and discrete_error <= discrete_tolerance and error_consistent)
            if row["id"] == "negative-dominant-eigenvalue":
                passed = passed and Decimal(0) <= parse_number(row["diagnostics"]["residual"]) <= Decimal("1e-10")
            if row["id"] == "sqrt-two":
                passed = passed and Decimal(0) <= parse_number(row["diagnostics"]["bracketWidth"]) <= Decimal("1e-12")
            output.append({"id":row["id"], "analyticAbsoluteError":str(error),
                           "discreteReferenceAbsoluteError":str(discrete_error),
                           "status":"PASS" if passed else "FAIL"})
    counts = {"total":len(output), "passed":sum(r["status"]=="PASS" for r in output)}
    counts["failed"] = counts["total"] - counts["passed"]
    declared_pass = sum(r.get("status") == "PASS" for r in rows)
    require(report.get("counts") == {"total":len(rows),"passed":declared_pass,"failed":len(rows)-declared_pass}, "Reported counts inconsistent")
    return {"kind":"INDEPENDENT_SYNTHETIC_REFERENCE_CHECK", "schemaVersion":1,
            "declaredCodeRevision":report["declaredCodeRevision"], "results":output, "counts":counts,
            "researchOnly":True,"publicationGate":"BLOCKED","executionAuthorized":False,"validationAuthorized":False,
            "limitations":["Independent analytical checks of five fixed numerical cases, not general correctness or empirical qualification.",
                           "Report identity hashes are format checked here, not independently reconstructed."]}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python reference_check.py <synthetic-report.json>")
    try:
        result = check_report(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
        print(json.dumps(result, indent=2, allow_nan=False))
        sys.exit(int(result["counts"]["failed"] > 0))
    except (ValueError, KeyError, TypeError, OSError, ArithmeticError) as error:
        sys.exit(str(error))
