"""Disposable signed fixtures for the isolated multi-tier verifier."""
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from hierarchy import Profile, Status, Trust, verify_archive, verify_token
from stamps import EvidenceError, generation_time, max_error_us, openssl, request, sha

EXACT = b'Value Watch synthetic multi-tier test\n'
OID = '1.3.6.1.4.1.55555.3.91'


class Authority:
    def __init__(self, work, depth=2):
        self.work = work
        self.root = work/'root.pem'
        self.keys = {}
        key_options = ('-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes')
        self.keys[self.root] = work/'root.key'
        openssl('req','-x509',*key_options,'-subj','/CN=Disposable root','-days','3',
                '-addext','basicConstraints=critical,CA:TRUE',
                '-addext','keyUsage=critical,keyCertSign,cRLSign','-keyout',self.keys[self.root],'-out',self.root)
        parent = self.root
        self.intermediates = []
        for index in range(depth+1):
            signer = index == depth
            certificate = work/f'cert-{index}.pem'
            key, csr = work/f'key-{index}.pem', work/f'csr-{index}.pem'
            self.keys[certificate] = key
            openssl('req','-new',*key_options,'-subj',f'/CN=Disposable cert {index}',
                    '-keyout',key,'-out',csr)
            ext = work/f'extensions-{index}.cnf'
            ext.write_text(('basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n'
                            'extendedKeyUsage=critical,timeStamping\n') if signer else
                           'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n',
                           encoding='ascii')
            openssl('x509','-req','-in',csr,'-CA',parent,'-CAkey',self.keys[parent],
                    '-set_serial',str(index+11),'-days','2','-extfile',ext,'-out',certificate)
            if signer:
                self.signer = certificate
            else:
                self.intermediates.insert(0, certificate)
                parent = certificate
        (work/'serial').write_text('01\n',encoding='ascii')
        self.config = work/'tsa.cnf'
        self.config.write_text(f'[tsa]\ndefault_tsa=fixture\n[fixture]\nserial={work/"serial"}\n'
                               f'signer_cert={self.signer}\nsigner_key={self.keys[self.signer]}\n'
                               f'certs={self.root}\nsigner_digest=sha256\ndefault_policy={OID}\n'
                               'digests=sha256\naccuracy=secs:1,millisecs:100,microsecs:9\n'
                               'ess_cert_id_alg=sha256\n',encoding='ascii')
        root = self.root.read_bytes()
        self.profile = Profile('fixture-current',Trust(root,sha(root),OID,1_500_000),self.identity(self.signer))
        self.query = request(EXACT,self.profile.trust)
        filename = work/'request.tsq'
        filename.write_bytes(self.query)
        self.response = openssl('ts','-reply','-config',self.config,'-queryfile',filename)
        resp = work/'response.tsr'
        resp.write_bytes(self.response)
        self.generation = generation_time(openssl('ts','-reply','-in',resp,'-text').decode('ascii'))
        self.cutoff = self.generation+timedelta(minutes=1)

    @staticmethod
    def identity(certificate):
        return sha(openssl('x509','-in',certificate,'-outform','DER'))

    @property
    def chain(self):
        return tuple(cert.read_bytes() for cert in self.intermediates)

    @property
    def links(self):
        chain = [self.signer,*self.intermediates,self.root]
        return list(zip(chain,chain[1:]))

    def crl(self, certificate, issuer, *, revoked=False, older=False):
        index, config = self.work/'crl-index.txt', self.work/'crl.cnf'
        index.write_text('', encoding='ascii')
        config.write_text(f'[ca]\ndefault_ca=issuer\n[issuer]\ndatabase={index}\n'
                          f'certificate={issuer}\nprivate_key={self.keys[issuer]}\n'
                          'default_md=sha256\ndefault_crl_days=1\n', encoding='ascii')
        if revoked:
            openssl('ca','-config',config,'-revoke',certificate,'-crl_reason','keyCompromise')
        start = self.generation-timedelta(seconds=1) if older else self.generation
        end = self.generation+timedelta(hours=1)
        crl = openssl('ca','-config',config,'-gencrl','-crl_lastupdate',start.strftime('%Y%m%d%H%M%SZ'),
                      '-crl_nextupdate',end.strftime('%Y%m%d%H%M%SZ'))
        return Status(self.identity(certificate),'CRL_PEM',crl,self.generation+timedelta(seconds=3))

    def ocsp(self, certificate, issuer, *, wrong_key=False, unknown=False):
        index, response = self.work/'ocsp-index.txt', self.work/'ocsp.der'
        serial = openssl('x509','-in',certificate,'-noout','-serial').decode().strip().split('=')[1]
        index.write_text('' if unknown else f'V\t{(self.generation+timedelta(days=1)):%y%m%d%H%M%SZ}'
                         f'\t\t{serial}\tunknown\t/CN=Fixture target\n',encoding='ascii')
        responder = self.root if wrong_key else issuer
        openssl('ocsp','-index',index,'-issuer',issuer,'-cert',certificate,
                '-rsigner',responder,'-rkey',self.keys[responder],'-CA',issuer,
                '-ndays','1','-resp_no_certs','-respout',response)
        return Status(self.identity(certificate),'OCSP_DER',response.read_bytes(),
                      datetime.now(timezone.utc)+timedelta(seconds=2))


class HierarchyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.work = Path(cls.enterClassContext(TemporaryDirectory()))
        cls.authority = Authority(cls.work)

    def setUp(self):
        self.a = self.authority

    def verify(self, **kwargs):
        values = dict(exact=EXACT,query=self.a.query,response=self.a.response,cutoff=self.a.cutoff,
                      profile=self.a.profile,intermediates=self.a.chain)
        return verify_token(**(values|kwargs))

    def statuses(self):
        return tuple(self.a.crl(*pair) for pair in self.a.links)

    def archive(self, statuses):
        return verify_archive(EXACT,self.a.query,self.a.response,self.a.cutoff,self.a.profile,self.a.chain,statuses)

    def test_requires_full_supplied_hierarchy_and_signed_binding(self):
        result = self.verify()
        self.assertEqual(len(result['chain_der_sha256']),4)
        self.assertEqual(result['accuracy_us'],1_100_009)
        self.assertFalse(result['external_attestation_qualified'])
        for chain in ((),self.a.chain[:1],self.a.chain[::-1],self.a.chain+self.a.chain[:1]):
            with self.subTest(chain=len(chain)),self.assertRaises(EvidenceError):
                self.verify(intermediates=chain)

    def test_pins_signer_and_root_and_does_not_enrol(self):
        with self.assertRaisesRegex(EvidenceError,'UNAPPROVED_TSA_SIGNER'):
            self.verify(profile=replace(self.a.profile,signer_der_sha256='0'*64))
        with TemporaryDirectory() as directory:
            alternate = Authority(Path(directory),depth=0)
            with self.assertRaises(EvidenceError):
                self.verify(profile=replace(self.a.profile,trust=alternate.profile.trust))
            old = self.verify()
            current = verify_token(EXACT,alternate.query,alternate.response,alternate.cutoff,
                                   replace(alternate.profile,version='fixture-rollover'))
            self.assertNotEqual(old['root_der_sha256'],current['root_der_sha256'])
        with self.assertRaisesRegex(EvidenceError,'SYNTHETIC_INPUT_REQUIRED'):
            self.verify(exact=b'{"race_id":"race-1"}')

    def test_certificate_expiry_at_verification_time_rejects_archive(self):
        statuses = self.statuses()
        future = self.a.generation+timedelta(days=3)
        leaf, issuer = self.a.links[0]
        cert = self.a.work/'expired-cert.pem'
        key = self.a.keys[leaf]
        csr = self.a.work/'expired-csr.pem'
        openssl('req', '-new', '-key', key, '-subj', '/CN=Expired TSA', '-out', csr)
        openssl('x509', '-req', '-in', csr, '-CA', issuer, '-CAkey', self.a.keys[issuer],
                '-set_serial', '31', '-days', '0', '-extfile', self.a.work/'extensions-2.cnf', '-out', cert)
        config = self.a.work/'expired-tsa.cnf'
        config.write_text(self.a.config.read_text().replace(f'signer_cert={leaf}',f'signer_cert={cert}'))
        response = openssl('ts','-reply','-config',config,'-queryfile',self.a.work/'request.tsq')
        with self.assertRaises(EvidenceError):
            self.verify(response=response,profile=replace(self.a.profile,signer_der_sha256=self.a.identity(cert)))
        with self.assertRaisesRegex(EvidenceError,'REVOCATION_OUTSIDE_OBSERVATION_WINDOW'):
            self.archive((replace(statuses[0],observed_utc=future),*statuses[1:]))

    def test_rejects_mutation_and_new_nonce_for_identical_payload(self):
        with self.assertRaises(EvidenceError):
            self.verify(exact=EXACT+b'changed')
        with self.assertRaisesRegex(EvidenceError,'TSA_NONCE_MISMATCH'):
            self.verify(query=request(EXACT,self.a.profile.trust))
        with self.assertRaises(EvidenceError):
            self.verify(response=self.a.response[:-1]+bytes([self.a.response[-1]^1]))

    def test_strict_cutoff_at_microsecond_boundary(self):
        bound = self.a.generation+timedelta(microseconds=1_100_009)
        with self.assertRaisesRegex(EvidenceError,'TIMESTAMP_TOO_LATE'):
            self.verify(cutoff=bound)
        self.assertEqual(self.verify(cutoff=bound+timedelta(microseconds=1))['latest_possible_utc'],bound.isoformat())
        with self.assertRaisesRegex(EvidenceError,'TIMESTAMP_NOT_AWARE'):
            self.verify(cutoff=bound.replace(tzinfo=None))

    def test_malformed_or_missing_accuracy_and_timestamp_are_rejected(self):
        for value in ('unspecified','-0x01 seconds, unspecified millis, unspecified micros',
                      '0x0 seconds, 0x3e8 millis, 0x0 micros'):
            with self.subTest(value=value),self.assertRaises(EvidenceError):
                max_error_us('Accuracy: '+value,1_500_000)
        for timestamp in ('Nov 26 01:23:45.1234567 2026 GMT','Nov 26 01:23:45 2026 PST'):
            with self.subTest(timestamp=timestamp),self.assertRaises(EvidenceError):
                generation_time('Time stamp: '+timestamp)
        self.assertEqual(generation_time('Time stamp: Nov 26 01:23:45.123456 2026 GMT').microsecond,123456)

    def test_crls_for_each_level_and_expired_at_review_rejected(self):
        statuses = self.statuses()
        self.assertEqual(len(self.archive(statuses)['chain_status']),3)
        with self.assertRaisesRegex(EvidenceError,'INCOMPLETE_CHAIN_STATUS'):
            self.archive(statuses[:-1])
        with self.assertRaisesRegex(EvidenceError,'REVOCATION_OUTSIDE_OBSERVATION_WINDOW'):
            self.archive((replace(statuses[0],observed_utc=self.a.generation+timedelta(hours=1)),*statuses[1:]))
        with self.assertRaisesRegex(EvidenceError,'REVOCATION_OUTSIDE_OBSERVATION_WINDOW'):
            self.archive((self.a.crl(*self.a.links[0],older=True),*statuses[1:]))

    def test_retrospective_compromise_of_intermediate_rejects_entire_chain(self):
        statuses = self.statuses()
        with self.assertRaises(EvidenceError):
            self.archive((statuses[0],self.a.crl(*self.a.links[1],revoked=True),statuses[2]))

    def test_signed_ocsp_bound_to_target_and_status(self):
        statuses = self.statuses()
        response = self.a.ocsp(*self.a.links[0])
        self.assertEqual(self.archive((response,*statuses[1:]))['chain_status'][0]['kind'],'OCSP_DER')
        cases = {
            'wrong responder': self.a.ocsp(*self.a.links[0],wrong_key=True),
            'unknown status': self.a.ocsp(*self.a.links[0],unknown=True),
            'invalid signature': replace(response,raw=response.raw[:-1]+bytes([response.raw[-1]^1])),
            'different certificate': replace(self.a.ocsp(*self.a.links[1]),
                                             certificate_der_sha256=response.certificate_der_sha256),
        }
        for case, status in cases.items():
            with self.subTest(case=case),self.assertRaises(EvidenceError):
                self.archive((status,*statuses[1:]))


if __name__ == '__main__':
    unittest.main()
