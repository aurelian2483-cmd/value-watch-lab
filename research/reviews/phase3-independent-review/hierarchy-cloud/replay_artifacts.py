"""Reproduce the two authorised synthetic custody rehearsals before hosted expiry."""
import argparse
import base64
from datetime import datetime, timedelta, timezone
from io import BytesIO
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

PACKAGE = Path(__file__).resolve().parent
RESEARCH = PACKAGE.parents[2]
for name in ('phase3-hierarchy','phase3-lifecycle'):
    sys.path.insert(0,str(RESEARCH/name))
from hierarchy import Profile, Trust, verify_token
from stamps import sha
from vault import Policy, Vault, protocol
from ledger import workspace

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ubuntu_zip', type=Path)
    parser.add_argument('windows_zip', type=Path)
    args = parser.parse_args()
    pin = PACKAGE.parent/'external-dependencies'/'timestamp-observations.json'
    observations = json.loads(pin.read_bytes())
    report={}
    for index, (runner,expiry) in enumerate((('ubuntu-24.04','2026-12-26T17:07:24+00:00'),
                                               ('windows-2025','2026-12-26T17:07:51+00:00'))):
        artifact = (args.ubuntu_zip,args.windows_zip)[index]
        digest=observations['runners'][runner]['offline_reverification']['artifact_zip_sha256']
        assert sha(artifact.read_bytes())==digest
        recipient='fixture-local-replay'
        owner='fixture-synthetic-custodian'
        policy=Policy('fixture-artifact','disposable-local-replay',('TIMESTAMP',),3600,expiry,(recipient,))
        with workspace() as (source, capability),workspace() as (destination,new_capability):
            vault=Vault(source,capability,(policy,),owner)
            item=vault.keep(policy.provider,'TIMESTAMP',artifact.read_bytes(),actor=owner,permission=policy.permission)
            handle=vault.export([item],recipient,actor=owner,approval='fixture-local-archive-replay')
            document=vault.read_transfer(handle,recipient)
            restored=Vault(destination,new_capability,(policy,),owner)
            assert restored.restore(document,handle,recipient,actor=owner)==1
            copied=restored.export([item],recipient,actor=owner,approval='fixture-local-verify-restored')
            archive=bytes.fromhex(protocol.strict_json(restored.read_transfer(copied,recipient))['items'][0]['body_hex'])
            assert sha(archive)==digest
            restored.verify_integrity()
            with ZipFile(BytesIO(archive)) as zipfile:
                assert zipfile.testzip() is None
                streams={}
                for authority in ('freetsa','open-tsa'):
                    raw=zipfile.read(f'{authority}/fixture.txt')
                    req=zipfile.read(f'{authority}/request.tsq')
                    expected=observations['runners'][runner]['offline_reverification']['evidence'][authority]
                    assert sha(raw)==expected['fixture_sha256'] and sha(req)==expected['query_sha256']
                    streams[authority]={'fixture_base64':base64.b64encode(raw).decode(),
                                        'client_request_base64':base64.b64encode(req).decode(),
                                        'fixture_sha256':sha(raw),'client_request_sha256':sha(req)}
                pem=zipfile.read('open-tsa/root.pem')
                provider=observations['runners'][runner]['observations']['open-tsa']
                root_hash=provider['root_pin']['calculated_raw_sha256']
                leaf=observations['runners'][runner]['offline_reverification']['evidence']['open-tsa']
                chain=tuple(cert+b'\n' for cert in re.findall(rb'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----',
                             zipfile.read('open-tsa/chain.pem'),re.S) if cert.strip()!=pem.strip())
                profile=Profile('operator-provided-offline-only',Trust(pem,root_hash,'1.3.6.1.4.1.59085.1.1',1_000_000),
                                leaf['signer_fingerprint'].replace(':','').lower())
                generation=datetime.fromisoformat(leaf['signed_generation_utc'])
                result=verify_token(zipfile.read('open-tsa/fixture.txt'),zipfile.read('open-tsa/request.tsq'),
                                    zipfile.read('open-tsa/receipt.tsr'),generation+timedelta(seconds=2),profile,chain)
            report[runner]={'artifact_sha256':digest,'hosted_expiry':expiry,'disposable_restore_hash_verified':True,
                            'open_tsa_restored_token':result,'owner_generated_bytes_only':streams}
    print(json.dumps(report,indent=2,sort_keys=True))


if __name__ == '__main__':
    main()
