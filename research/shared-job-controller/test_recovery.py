import hashlib
import tempfile
import unittest
from pathlib import Path
from controller import Controller
from service import Service
from recovery import backup,restore_isolated

class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.live=self.root/"live.db"
        self.tokens={"operator":"1"*64,"hosted-qa":"2"*64,"observer":"3"*64}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.s=self.service(self.live)
        self.s.enqueue(self.tokens["operator"],"probe","cpu-probe")
    def tearDown(self):
        self.temp.cleanup()
    def service(self,path):
        return Service(Controller(path),self.digests,"a"*40,clock=lambda:10)
    def test_backup_restore_revocation_and_history(self):
        self.s.claim(self.tokens["hosted-qa"])
        self.s.revoke(self.tokens["operator"],"hosted-qa")
        before=self.s.status(self.tokens["observer"])
        copy=self.root/"copy.db"
        sha=backup(self.live,copy)
        restored=self.root/"isolated.db"
        self.assertEqual(restore_isolated(copy,restored,sha),sha)
        s=self.service(restored)
        self.assertEqual(s.status(self.tokens["observer"]),before)
        with self.assertRaises(ValueError):
            s.claim(self.tokens["hosted-qa"])
    def test_no_overwrite_and_tamper(self):
        copy=self.root/"copy.db"
        sha=backup(self.live,copy)
        before=self.live.read_bytes()
        with self.assertRaises(FileExistsError):
            restore_isolated(copy,self.live,sha)
        with self.assertRaises(FileExistsError):
            backup(self.live,copy)
        self.assertEqual(self.live.read_bytes(),before)
        copy.write_bytes(copy.read_bytes()+b"tampered")
        with self.assertRaises(ValueError):
            restore_isolated(copy,self.root/"rejected.db",sha)
        self.assertFalse((self.root/"rejected.db").exists())
    def test_invalid_database_even_with_matching_hash(self):
        copy=self.root/"invalid.db"
        copy.write_bytes(b"not sqlite")
        import sqlite3
        with self.assertRaises(sqlite3.DatabaseError):
            restore_isolated(copy,self.root/"rejected.db",hashlib.sha256(copy.read_bytes()).hexdigest())
        self.assertFalse((self.root/"rejected.db").exists())
