"""End-to-end CLI rehearsal with exact pinned kernels and synthetic evidence."""
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_football_shadow_capture import (
    capture, journal, capture_packet, sealed_capture, scheduled, outcome_set, operation,
    EVENT, AFTER, text,
)


def rehearse(root):
    journal_dir = root / 'synthetic journal'
    cli = [sys.executable, str(journal.ROOT / 'scripts/football_shadow_journal.py')]
    request = root / 'operation.json'
    runtime, registry = capture.candidates.kernel(), capture.candidates.registry()
    observed_sources = [
        'prediction-ledger.json', 'results-feed.json', 'research-dashboard-data.json',
        'football-expanded-data.json', 'index.html', 'scripts/football_chronological_replay.py',
    ]
    before = {path: (journal.ROOT / path).read_bytes() for path in observed_sources}
    frozen = []
    source_bytes = []
    head = None

    def append(event):
        nonlocal head
        raw = (text(event) + '\r\n').encode('utf-8')
        request.write_bytes(raw)
        source_bytes.append(raw)
        args = [*cli, 'append', str(request), '--journal', str(journal_dir)]
        if head is not None:
            args += ['--expect-head', head]
        head = json.loads(subprocess.check_output(args, cwd=root))['head_sha256']
        target = journal_dir / f'{len(source_bytes):08}.json'
        frozen.append(target.read_bytes())

    append(scheduled())
    append(sealed_capture(capture_packet(registry, runtime)))
    append(outcome_set(review=False))
    append(outcome_set(previous=head))
    args = [*cli, 'report', '--journal', str(journal_dir), '--as-of', AFTER, '--expect-head', head]
    observed = json.loads(subprocess.check_output(args, cwd=root))
    assert observed['synthetic_lifecycle_counts'] == {'adjudicated':1}
    assert set(observed['synthetic_captures_by_path'].values()) == {1}
    assert observed['status'] == 'insufficient_data'
    assert observed['eligible_real_captures'] == observed['eligible_real_outcomes'] == 0
    append(operation('exclude', AFTER, {'event':EVENT, 'supersedes_sha256':head,
                                       'reason':'synthetic review withdrew the fixture'}))
    final = subprocess.check_output([*args[:-1], head], cwd=root)
    assert json.loads(final)['synthetic_lifecycle_counts'] == {'excluded':1}
    assert json.loads(final)['label'] == capture.LABEL
    assert {path: (journal.ROOT / path).read_bytes() for path in observed_sources} == before
    for i, (raw, envelope) in enumerate(zip(source_bytes, frozen), 1):
        assert (journal_dir / f'{i:08}.json').read_bytes() == envelope
        assert json.loads(envelope)['operation_utf8'].encode('utf-8') == raw
    return frozen, final


if __name__ == '__main__':
    with TemporaryDirectory(prefix='shadow rehearsal A ') as a, TemporaryDirectory(prefix='shadow rehearsal B ') as b:
        first = rehearse(Path(a))
        second = rehearse(Path(b))
        assert first == second, 'identical operations did not produce identical records'
    print(capture.LABEL)
    print('PASS: repeated full lifecycle, exact registry formulas, byte-identical journals, and untouched source files')
