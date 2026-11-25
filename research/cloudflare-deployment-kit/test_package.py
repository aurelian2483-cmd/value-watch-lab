import io
import json
import unittest
import zipfile
from package import build,verify,sha,config

class PackageTests(unittest.TestCase):
    def setUp(self):
        self.raw=build()
    def test_exact_reproducible_package(self):
        self.assertEqual(self.raw,build())
        m=verify(self.raw,sha(self.raw))
        self.assertFalse(m["activationAuthorized"])
        self.assertEqual(m["host"],"sky-research-controller.aurelian2483.workers.dev")
    def test_tamper(self):
        with self.assertRaises(ValueError):verify(self.raw+b"x",sha(self.raw))
    def test_rehashed_unsafe_policy(self):
        out=io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(self.raw)) as src,zipfile.ZipFile(out,"w") as dst:
            data={i.filename:src.read(i) for i in src.infolist()}
            c=json.loads(data["wrangler.json"]);c["vars"]["SKY_MODE"]="PRESENCE_ONLY_QA"
            data["wrangler.json"]=json.dumps(c).encode()
            m=json.loads(data["manifest.json"])
            for r in m["files"]:
                if r["path"]=="wrangler.json":r.update(bytes=len(data["wrangler.json"]),sha256=sha(data["wrangler.json"]))
            data["manifest.json"]=json.dumps(m).encode()
            for i in src.infolist():dst.writestr(i,data[i.filename])
        raw=out.getvalue()
        with self.assertRaises(ValueError):verify(raw,sha(raw))
    def test_disabled_mode_and_target(self):
        c=config()
        self.assertEqual(c["name"],"sky-research-controller")
        self.assertTrue(c["workers_dev"])
        self.assertFalse(c["preview_urls"])
        self.assertEqual(c["vars"]["SKY_QUEUE_ENABLED"],"false")
        self.assertEqual(c["vars"]["SKY_PROVISION_ENABLED"],"false")
        self.assertEqual(c["vars"]["SKY_MODE"],"DISABLED")
