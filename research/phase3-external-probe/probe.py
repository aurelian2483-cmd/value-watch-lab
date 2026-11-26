"""One bounded, synthetic RFC 3161 request per authority on an approved runner."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlsplit
from urllib.request import getproxies, proxy_bypass

AUTHORITIES = {
    'freetsa': {
        'endpoint': 'https://freetsa.org/tsr',
        'root': 'https://freetsa.org/files/cacert.pem',
        'signer': 'https://freetsa.org/files/tsa.crt',
        'crl': 'https://www.freetsa.org/crl/root_ca.crl',
    },
    'open-tsa': {
        'endpoint': 'https://tsr.open-tsa.eu',
        'root': 'https://open-tsa.eu/certs/ca.crt',
        'signer': 'https://open-tsa.eu/certs/tsa.crt',
        'chain': 'https://open-tsa.eu/certs/fullchain.pem',
    },
}
FREETSA_PUBLISHED_ROOT_SHA = '2151b61137ffa86bf664691ba67e7da0b19f98c758e3d228d5d8ebf27e044438'
METRICS = {
    'http': 'response_code', 'proxy_connect': 'http_connect', 'dns': 'time_namelookup',
    'tcp': 'time_connect', 'tls': 'time_appconnect', 'first_byte': 'time_starttransfer',
    'total': 'time_total', 'bytes': 'size_download', 'tls_verify_result': 'ssl_verify_result',
    'content_type': 'content_type',
}


def command(argv, timeout=9):
    try:
        run = subprocess.run(argv, timeout=timeout, capture_output=True, text=True,
                             encoding='utf-8', errors='replace')
    except (subprocess.TimeoutExpired, FileNotFoundError) as error:
        return dict(exit=None, output='', diagnostic=type(error).__name__)
    return dict(exit=run.returncode, output=run.stdout.strip(), diagnostic=run.stderr.strip())


def lookup(host):
    if not host:
        return None
    return command([sys.executable, '-c',
                    'import socket,sys\n'
                    'try: print(sorted({x[0].name for x in socket.getaddrinfo(sys.argv[1], 443, type=socket.SOCK_STREAM)}))\n'
                    'except socket.gaierror as error: sys.exit(str(error))',
                    host], timeout=5)


def network_context(endpoint):
    hostname = urlsplit(endpoint).hostname
    proxy_url = os.environ.get('https_proxy') or os.environ.get('HTTPS_PROXY')
    proxy = urlsplit(proxy_url if proxy_url and '://' in proxy_url else '//'+(proxy_url or ''))
    return dict(origin_dns=lookup(hostname), proxy_dns=lookup(proxy.hostname),
                https_proxy_environment=bool(proxy_url), all_proxy_environment=bool(os.environ.get('ALL_PROXY')
                                                                                   or os.environ.get('all_proxy')),
                no_proxy_match=bool(proxy_bypass(hostname)), proxy_auto_detected=bool(getproxies().get('https')))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(url, output, query=None):
    metrics = ''.join(key+'=%{'+field+'}\\n' for key, field in METRICS.items())
    args = ['curl', '--silent', '--show-error', '--proto', '=https', '--connect-timeout', '6',
            '--max-time', '14', '--max-filesize', '524288', '--retry', '0', '--output', str(output),
            '--write-out', metrics]
    if query:
        args += ['--header', 'Content-Type: application/timestamp-query', '--data-binary', '@'+str(query)]
    result = command([*args, url], timeout=17)
    result['metrics'] = dict(line.split('=', 1) for line in result.pop('output').splitlines() if '=' in line)
    result['https_url'] = url
    result['sha256'] = sha(output) if output.is_file() else None
    if result['exit'] != 0:
        result['diagnostic'] = f"curl transport exit {result['exit']}"
    return result


def crypto_executable():
    candidate = shutil.which('openssl')
    if not candidate and os.name == 'nt':
        bundled = Path(os.environ.get('ProgramFiles', r'C:\Program Files'))/'Git/usr/bin/openssl.exe'
        if bundled.is_file():
            return str(bundled)
    return candidate


def probe(name, config, root, context, diagnostic_only):
    directory = root/name
    directory.mkdir()
    observation = dict(network=network_context(config['endpoint']))
    if diagnostic_only:
        return observation
    crypto = crypto_executable()
    observation['openssl'] = command([crypto,'version']) if crypto else None
    if not crypto:
        observation['blocked'] = 'OPENSSL_UNAVAILABLE'
        return observation
    raw, query, response = [directory/name for name in ('fixture.txt','request.tsq','receipt.tsr')]
    raw.write_bytes(('Value Watch synthetic public RFC 3161 network diagnostic '+context+' '+name+'\n').encode())
    generated = command([crypto,'ts','-query','-data',str(raw),'-sha256','-cert','-out',str(query)])
    if generated['exit'] != 0:
        observation['request_creation'] = generated
        return observation
    observation['fixture_sha256'] = sha(raw)
    observation['query_sha256'] = sha(query)
    observation['submission_utc'] = datetime.now(timezone.utc).isoformat()
    observation['stamp_transport'] = transport = download(config['endpoint'], response, query)
    if transport['exit'] != 0 or transport['metrics'].get('http') != '200' or not response.stat().st_size:
        return observation
    observation['signed_fields_unverified_until_crypto_check'] = fields = command(
        [crypto,'ts','-reply','-text','-in',str(response)])
    if fields['exit'] != 0 or 'Status: Granted.' not in fields['output']:
        return observation
    material, observation['material'] = {}, {}
    for key in ('root','signer','chain','crl'):
        if key not in config:
            continue
        path = directory/(key+'.pem')
        item = download(config[key], path)
        observation['material'][key] = item
        if item['exit'] == 0 and item['metrics'].get('http') == '200':
            material[key] = path
    if 'root' not in material:
        return observation
    ca = material['root']
    observation['root_pin'] = {
        'operator_published_raw_sha256': FREETSA_PUBLISHED_ROOT_SHA if name == 'freetsa' else None,
        'calculated_raw_sha256': sha(ca), 'independent_pin': False,
    }
    if name == 'freetsa':
        observation['root_pin']['published_raw_hash_match'] = sha(ca) == FREETSA_PUBLISHED_ROOT_SHA
    isolated = directory/'empty-certs'
    isolated.mkdir()
    for key in ('root','signer'):
        if key in material:
            observation[key+'_certificate'] = command(
                [crypto,'x509','-in',str(material[key]),'-noout','-subject','-issuer','-dates',
                 '-serial','-fingerprint','-sha256','-ext','extendedKeyUsage,crlDistributionPoints,authorityInfoAccess'])
    chain = material.get('chain') or material.get('signer')
    base = [crypto,'ts','-verify','-in',str(response),'-CAfile',str(ca),'-CApath',str(isolated),
            '-CAstore',ca.resolve().as_uri()]
    if chain:
        base += ['-untrusted',str(chain)]
    observation['query_binding'] = command([*base,'-queryfile',str(query)])
    observation['exact_bytes_binding'] = command([*base,'-data',str(raw)])
    accuracy = re.search(r'^Accuracy:\s*(.+)$',fields['output'],re.M)
    observation['accuracy_field'] = accuracy.group(1) if accuracy else None

    if 'crl' in material:
        token, token_signer = directory/'token.der', directory/'actual-token-signer.pem'
        extracted = command([crypto,'ts','-reply','-in',str(response),'-token_out','-out',str(token)])
        if extracted['exit'] == 0:
            extracted = command([crypto,'cms','-verify','-binary','-inform','DER','-in',str(token),
                                 '-noverify','-signer',str(token_signer),'-out',str(directory/'tst-info.der')])
        observation['signed_token_extraction'] = extracted
        if extracted['exit'] != 0 or token_signer.read_bytes().count(b'-----BEGIN CERTIFICATE-----') != 1:
            return observation
        observation['token_signer_certificate'] = command(
            [crypto,'x509','-in',str(token_signer),'-noout','-sha256','-fingerprint','-issuer','-dates'])
        crl = material['crl']
        crl_check = [crypto,'crl','-in',str(crl),'-noout','-issuer','-lastupdate','-nextupdate']
        if command(crl_check)['exit'] != 0:
            converted = directory/'crl-converted.pem'
            conversion = command([crypto,'crl','-inform','DER','-in',str(crl),'-out',str(converted)])
            if conversion['exit'] != 0:
                observation['crl_decode'] = conversion
                return observation
            crl = converted
        observation['crl_dates'] = command([crypto,'crl','-in',str(crl),
                                            '-noout','-issuer','-lastupdate','-nextupdate'])
        observation['crl_signature_and_signer_status_now'] = command(
            [crypto,'verify','-trusted',str(ca),'-purpose','timestampsign',
             '-crl_check','-CRLfile',str(crl),str(token_signer)])
    return observation


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('context')
    parser.add_argument('output', type=Path)
    parser.add_argument('--dns-only', action='store_true')
    args = parser.parse_args()
    args.output.mkdir()
    data = dict(scope='SYNTHETIC_TRANSPORT_DIAGNOSTIC', context=args.context,
                observed_utc=datetime.now(timezone.utc).isoformat(), host_os=sys.platform,
                authorities={name:probe(name, config, args.output, args.context, args.dns_only)
                             for name, config in AUTHORITIES.items()},
                registered_collection_enabled=False, production_qualification=False)
    output = json.dumps(data, indent=2, sort_keys=True)
    (args.output/'observation.json').write_text(output+'\n',encoding='utf-8')
    print(output)


if __name__ == '__main__':
    main()
