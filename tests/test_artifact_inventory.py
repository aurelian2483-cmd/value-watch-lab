import json
import os
import unittest
from unittest.mock import patch
from scripts import artifact_inventory as m

class ArtifactControls(unittest.TestCase):
    def setUp(self):
        m._RUNS.clear()
        self.a={'id':2,'workflow_run':{'id':1,'head_sha':'abc'}}
        self.result={'id':1,'head_sha':'abc','head_branch':'main','status':'completed','conclusion':'success'}
    def run_case(self,change):
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(m.subprocess,'check_output',return_value=json.dumps({**self.result,**change})):
            return m.successful_artifact(self.a)
    def test_success_requires_verified_producer(self):
        self.assertTrue(self.run_case({}))
    def test_failed_or_unfinished_producer_is_not_forecast_evidence(self):
        self.assertFalse(self.run_case({'conclusion':'failure'}))
        m._RUNS.clear()
        self.assertFalse(self.run_case({'status':'in_progress','conclusion':None}))
    def test_mismatched_identity_blocks(self):
        with self.assertRaises(ValueError):self.run_case({'head_sha':'different'})
    def test_untrusted_branch_rejected(self):
        self.assertFalse(self.run_case({'head_branch':'untrusted'}))

if __name__=='__main__':unittest.main()
