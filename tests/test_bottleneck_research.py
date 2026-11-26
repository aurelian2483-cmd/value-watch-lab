import json
from unittest import TestCase

from research.bottleneck import pro_d2
from research.bottleneck.inventory import grouped


class BottleneckResearchTests(TestCase):
    def test_frozen_result_is_reproducible_and_research_only(self):
        report = pro_d2.run(pro_d2.PATH.read_bytes())
        artifact = pro_d2.PATH.parents[1] / "research/bottleneck/pro-d2-screening.json"
        self.assertEqual(json.loads(json.dumps(report)), json.loads(artifact.read_text()))
        self.assertEqual(report["holdout"]["n"], 24)
        self.assertEqual(report["independently_verified_outcomes"], 0)
        self.assertIsNone(report["market_benchmark"])
        self.assertEqual(report["publication"], "BLOCKED")
        with self.assertRaisesRegex(ValueError, "frozen research snapshot"):
            pro_d2.run(pro_d2.PATH.read_bytes() + b" ")

    def test_earlier_dates_only(self):
        rows = list(pro_d2.validated_rows(json.loads(pro_d2.PATH.read_bytes())))
        examples = list(pro_d2.compare(rows))
        day = examples[0][0]
        altered = [(*row[:-1], (1, 200)) if row[0] >= day else row for row in rows]
        before = [row[3] for row in examples if row[0] == day]
        after = [row[3] for row in pro_d2.compare(altered) if row[0] == day]
        self.assertEqual(before, after)

    def test_duplicate_or_conflicting_identity_is_rejected(self):
        document = json.loads(pro_d2.PATH.read_bytes())
        row = dict(document["results"][0], home_points=0)
        document["results"].append(row)
        with self.assertRaisesRegex(ValueError, "Repeated event"):
            list(pro_d2.validated_rows(document))
        row["source"] = row["source"].replace("12007-", "90000-")
        with self.assertRaisesRegex(ValueError, "same-day team booking"):
            list(pro_d2.validated_rows(document))

    def test_inventory_distinguishes_conflicts_and_missing_identity(self):
        rows = [("fixture1", "home"), ("fixture1", "away"), (None, "home")]
        numbers = grouped(rows, lambda _: "league", lambda r: (r[0],), lambda _: None,
                          result=lambda r: r[1])["league"]
        self.assertEqual((numbers["raw"], numbers["missing_key"], numbers["conflicting_keys"]), (3, 1, 1))
