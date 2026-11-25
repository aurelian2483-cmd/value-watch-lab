import copy
import unittest
from readiness import digest,tree_rows,BLOBS,review
from temporal import fixture,admission

class TemporalTest(unittest.TestCase):
    def setUp(self):
        self.plan,self.rows=fixture()
        self.anchor=digest(self.plan)
    def evaluate(self,rows):
        return admission(self.plan,self.anchor,rows)
    def test_clean_windows(self):
        r=self.evaluate(self.rows)
        self.assertEqual(r["accepted"],3)
        self.assertEqual(r["acceptedByPartition"],{"development":1,"calibration":1,"holdout":1})
        self.assertFalse(r["accessAuthorized"])
        self.assertFalse(r["executionAuthorized"])
        self.assertEqual(r["realEvaluationEligibleRows"],0)
        self.assertEqual(r,self.evaluate(self.rows))
    def test_empty_rows(self):
        self.assertEqual(self.evaluate([])["accepted"],0)
    def test_mutations(self):
        changes=[
         ("precision","DATE_ONLY_END_OF_DAY","TIME_PRECISION_UNSUPPORTED"),
         ("contract","OTHER","CONTRACT_MISMATCH"),
         ("partition","development","PARTITION_MISMATCH"),
         ("issuedAt","2020-01-12T12:00:00Z","ISSUE_OR_LABEL_WINDOW_INVALID"),
         ("featureAvailableAt","2020-01-12T10:00:00Z","FEATURE_LOOKAHEAD"),
         ("trainingCutoffAt","2020-01-12T10:00:00Z","TRAINING_LOOKAHEAD"),
         ("trainingCutoffAt","2020-01-10T00:00:00Z","TRAINING_CUTOFF_NOT_FROZEN"),
         ("labelAvailableAt","2020-01-20T00:00:00Z","ISSUE_OR_LABEL_WINDOW_INVALID"),
         ("eventAt","2020-01-10T12:00:00Z","OUTSIDE_WINDOWS"),
         ("eventAt","2020-01-12","TIMESTAMP_INVALID"),
         ("trainingManifestSha256","missing","INVALID_TRAINING_MANIFEST"),
        ]
        for field,value,reason in changes:
            with self.subTest(field=field,reason=reason):
                rows=copy.deepcopy(self.rows);rows[1][field]=value
                r=self.evaluate(rows)
                self.assertEqual(r["rejectedByReason"],{reason:1})
                self.assertEqual(r["accepted"],2)
    def test_cross_partition_and_duplicates(self):
        rows=copy.deepcopy(self.rows);rows[1]["groupId"]=rows[0]["groupId"]
        self.assertEqual(self.evaluate(rows)["rejectedByReason"],{"CROSS_PARTITION_GROUP":2})
        rows=copy.deepcopy(self.rows);rows.append(copy.deepcopy(rows[0]))
        r=self.evaluate(rows)
        self.assertEqual(r["rejectedByReason"],{"DUPLICATE_EVENT":2})
        self.assertEqual(r["accepted"],2)
    def test_anchor_and_embargo(self):
        plan=copy.deepcopy(self.plan)
        plan["windows"][1]["start"]="2020-01-10T12:00:00Z"
        with self.assertRaisesRegex(ValueError,"anchor"):
            admission(plan,self.anchor,self.rows)
        with self.assertRaisesRegex(ValueError,"embargo"):
            admission(plan,digest(plan),self.rows)
    def test_schema_rejects_non_synthetic_and_payload(self):
        rows=copy.deepcopy(self.rows);rows[0]["eventId"]="real-event-1"
        with self.assertRaisesRegex(ValueError,"non-synthetic"):
            self.evaluate(rows)
        rows=copy.deepcopy(self.rows);rows[0]["label"]=1
        with self.assertRaisesRegex(ValueError,"schema"):
            self.evaluate(rows)
        with self.assertRaises(ValueError):self.evaluate(self.rows*334)

class MetadataTest(unittest.TestCase):
    def setUp(self):
        self.tree={"truncated":False,"tree":[{"path":p,"type":"blob","mode":"100644","sha":s,"size":n} for p,(s,n) in BLOBS.items()]}
    def test_exact_metadata(self):
        self.assertEqual(tree_rows(self.tree),BLOBS)
    def test_tree_tamper(self):
        for change in ("truncated","sha","missing","duplicate","symlink"):
            with self.subTest(change=change):
                t=copy.deepcopy(self.tree)
                if change=="truncated":t["truncated"]=True
                elif change=="sha":t["tree"][0]["sha"]="0"*40
                elif change=="missing":t["tree"].pop()
                elif change=="duplicate":t["tree"].append(copy.deepcopy(t["tree"][0]))
                else:t["tree"][0]["mode"]="120000"
                with self.assertRaises(ValueError):tree_rows(t)
    def test_archive_fails_before_parsing(self):
        with self.assertRaisesRegex(ValueError,"fingerprint"):
            review(b"untrusted",self.tree,self.tree)
if __name__=="__main__":unittest.main()
