import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from package import build,verify,sha,FILES,ROOT

class KitTests(unittest.TestCase):
    def setUp(self):
        self.raw=build()
        self.anchor=sha(self.raw)
    def test_deterministic_pinned_members(self):
        self.assertEqual(build(),self.raw)
        m=verify(self.raw,self.anchor)
        self.assertEqual({r["path"] for r in m["files"]},FILES)
        self.assertFalse(m["networkDefault"])
    def test_tampered_archive_rejected(self):
        with self.assertRaises(ValueError): verify(self.raw+b"x",self.anchor)
    def test_extra_member_rejected_even_rehashed(self):
        stream=io.BytesIO(self.raw)
        with zipfile.ZipFile(stream,"a") as z: z.writestr("extra.py","pass")
        raw=stream.getvalue()
        with self.assertRaises(ValueError): verify(raw,sha(raw))
    def test_manifest_gate_rejected_even_rehashed(self):
        out=io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(self.raw)) as src,zipfile.ZipFile(out,"w") as dest:
            for info in src.infolist():
                raw=src.read(info)
                if info.filename=="manifest.json":
                    m=json.loads(raw);m["networkDefault"]=True;raw=json.dumps(m).encode()
                dest.writestr(info,raw)
        raw=out.getvalue()
        with self.assertRaises(ValueError): verify(raw,sha(raw))
    def test_extracted_client_and_windows_launcher(self):
        with tempfile.TemporaryDirectory(prefix="sky kit ") as tmp:
            with zipfile.ZipFile(io.BytesIO(self.raw)) as z: z.extractall(tmp)
            r=subprocess.run([sys.executable,"-I","-B",str(Path(tmp)/"client.py")],cwd=tmp,capture_output=True,text=True,check=True,timeout=15)
            self.assertEqual(json.loads(r.stdout),{"kind":"PC_PRESENCE_CLIENT_DRY_RUN","networkUsed":False,"gpuDispatchAuthorized":False,"productionDispatchAuthorized":False})
            if os.name=="nt":
                r=subprocess.run(["cmd.exe","/d","/c","Run-PC-Client.cmd"],cwd=tmp,capture_output=True,text=True,check=True,timeout=20)
                self.assertFalse(json.loads(r.stdout)["networkUsed"])
                r=subprocess.run(["cmd.exe","/d","/c","Run-PC-Client.cmd","--send"],cwd=tmp,capture_output=True,text=True,timeout=20)
                self.assertEqual(r.returncode,2)
            self.assertEqual({p.name for p in Path(tmp).iterdir()},FILES|{"manifest.json"})
