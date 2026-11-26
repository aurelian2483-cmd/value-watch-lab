"""Disposable cryptographic authorities. Their keys never leave scratch."""
from pathlib import Path

from stamps import Trust, openssl, sha

POLICY = '1.3.6.1.4.1.55555.3.1'


class FixtureAuthority:
    def __init__(self, root, policy=POLICY, accuracy='secs:1'):
        root.mkdir(mode=0o700)
        self.root = root
        root_key, root_cert, tsa_key, tsa_csr, tsa_cert = (root/p for p in ('root.key','root.pem','tsa.key','tsa.csr','tsa.pem'))
        openssl('req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN=Disposable Research CA',
                '-days','2','-addext','basicConstraints=critical,CA:TRUE',
                '-addext','keyUsage=critical,keyCertSign,cRLSign','-keyout',root_key,'-out',root_cert)
        openssl('req','-new','-newkey','rsa:2048','-nodes','-subj','/CN=Disposable Research TSA',
                '-keyout',tsa_key,'-out',tsa_csr)
        ext = root/'extensions.cnf'
        ext.write_text('basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n'
                       'extendedKeyUsage=critical,timeStamping\n', encoding='ascii')
        openssl('x509','-req','-in',tsa_csr,'-CA',root_cert,'-CAkey',root_key,'-set_serial','2',
                '-days','2','-extfile',ext,'-out',tsa_cert)
        serial = root/'serial'
        serial.write_text('01\n', encoding='ascii')
        self.config = root/'tsa.cnf'
        self.config.write_text(f'[tsa]\ndefault_tsa=fixture\n[fixture]\nserial={serial}\n'
                               f'signer_cert={tsa_cert}\nsigner_key={tsa_key}\ncerts={root_cert}\n'
                               f'signer_digest=sha256\ndefault_policy={policy}\ndigests=sha256\n'
                               f'accuracy={accuracy}\ness_cert_id_alg=sha256\n', encoding='ascii')
        anchor = root_cert.read_bytes()
        self.trust = Trust(anchor, sha(anchor), policy, 2_000_000)

    def reply(self, query):
        filename = self.root/'request.tsq'
        filename.write_bytes(query)
        return openssl('ts','-reply','-config',self.config,'-queryfile',filename)


class FixtureIdentity:
    def __init__(self, root, name):
        self.key = root/(name+'.key')
        public = root/(name+'.pem')
        openssl('genpkey','-algorithm','ED25519','-out',self.key)
        openssl('pkey','-in',self.key,'-pubout','-out',public)
        self.public = public.read_bytes()

    def sign(self, raw):
        filename = self.key.with_suffix('.data')
        filename.write_bytes(raw)
        return openssl('pkeyutl','-sign','-rawin','-inkey',self.key,'-in',filename)
