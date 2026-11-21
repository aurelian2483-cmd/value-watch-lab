"""Fixed candidate identities and read-only calculation for paper capture."""
import sys
from unittest.mock import patch

if __package__:
    from . import football_chronological_replay as replay
else:
    import football_chronological_replay as replay

DIRECTORY = replay.ROOT / 'research/football-shadow-capture'
PIN = '38d374ee887851b60de72b78b8f57d0110438ff188c1263346dec7c7f19a9c9a'
TRACE_PIN = '12195640e76433008f839df2d56060c1eb66e46ccceaeee15399cffce55f5eba'
PATHS = ('standalone_baseline', 'standalone_form_alpha_0_025', 'expanded_current_formula')


def registry(directory=DIRECTORY):
    return replay.pinned_json(directory / 'candidates.json', PIN, 'shadow candidate registry')


def kernel():
    trace = replay.ROOT / 'scripts/football_chronological_replay.py'
    replay.require(replay.evidence.digest(trace.read_bytes().replace(b'\r\n', b'\n')) == TRACE_PIN,
                   'candidate trace source changed under frozen identity')
    protocol = replay.pinned_json(replay.DIRECTORY / 'protocol.json', replay.PROTOCOL_SHA256, 'replay protocol')
    cfg = replay.pinned_json(replay.recovery.DIRECTORY / 'registry.json', protocol['registry_sha256'], 'model registry')
    entries = {row['id']: row for row in cfg['components']}
    for item in registry().values():
        pin = item['source']
        replay.recovery.git_source(pin['commit'], pin['path'], pin['source_sha256'])
    with patch.dict(sys.modules):
        for name, identifier in (('football_h2h', 'h2h-description'), ('expanded_football', 'expanded-league-poisson')):
            item = entries[identifier]
            module = replay.recovery.run_module(name, item['path'], replay.recovery.git_source(
                item['commit'], item['path'], item['source_sha256']))
            sys.modules[name] = module
        expanded = sys.modules['expanded_football']
    return protocol, entries['retrospective-poisson-and-form']['configuration'], expanded


def probabilities(history, event, runtime):
    rule, cfg, expanded = runtime
    names = {team for row in history for team in (row['home'], row['away'])} | {event['home'], event['away']}
    aliases = {expanded.norm(name) for name in names}
    replay.require(len(aliases) == len(names) and '' not in aliases, 'input alias collision')
    stats = replay.features(history, event['home'], event['away'], cfg['form_last'])
    reason = replay.exclusion(stats, rule)
    replay.require(reason is None, reason or 'insufficient candidate input')
    standalone = replay.standalone_model(stats, cfg)
    mapped = [{'home': row['home'], 'away': row['away'], 'score_home': row['ft'][0],
               'score_away': row['ft'][1]} for row in history]
    teams, lh, la = expanded.stats(mapped)
    training = {'teams': teams, 'matches': len(mapped), 'avg_home_goals': lh, 'avg_away_goals': la,
                'training_sha256': replay.evidence.digest(replay.evidence.canonical(history)), 'source_receipts': []}
    result = expanded.model_forecast({'league': 'PL', 'home': event['home'], 'away': event['away']},
                                     {'teams': {}}, training)
    replay.require(result is not None and result['training_basis']['mode'] == 'CURRENT_SEASON_SMALL_SAMPLE',
                   'fixed expanded mode unavailable')
    return dict(zip(PATHS, (standalone['p_baseline'], standalone['p_form'],
                            [result[f'prob_{side}'] for side in replay.ORDER])))
