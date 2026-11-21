#!/usr/bin/env python3
"""Append synthetic football evidence to an isolated, hash-linked paper journal."""
import argparse
import os
from pathlib import Path
import sys
from tempfile import NamedTemporaryFile

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_shadow_capture as domain
else:
    import football_shadow_capture as domain

evidence, require = domain.evidence, domain.require
ROOT = domain.candidates.replay.ROOT


def journal_path(value):
    require(not value.is_symlink(), 'journal root must not be a symlink')
    resolved = value.resolve()
    require(not resolved.is_relative_to(ROOT.resolve()), 'journal must be outside the project checkout')
    return resolved


def load(path, state, expected_head=None):
    head = None
    children = sorted(p for p in path.iterdir() if p.name != '.writer') if path.exists() else []
    for index, entry in enumerate(children, 1):
        require(entry.name == f'{index:08}.json' and not entry.is_symlink() and entry.is_file(),
                'journal contains unexpected, missing or unsafe records')
        raw = entry.read_bytes()
        envelope = evidence.decode(raw)
        domain.fields(envelope, ('sequence', 'previous_sha256', 'operation_sha256', 'operation_utf8'),
                      'journal envelope')
        require(envelope['sequence'] == index and envelope['previous_sha256'] == head and
                evidence.canonical(envelope) + b'\n' == raw, 'journal chain or exact bytes changed')
        operation = envelope['operation_utf8'].encode('utf-8')
        require(evidence.digest(operation) == envelope['operation_sha256'], 'journal operation hash changed')
        head = evidence.digest(raw)
        state.apply(evidence.decode(operation), head)
    require(expected_head is None or expected_head == head, 'journal head pin mismatch')
    return len(children), head


def append(path, state, operation_bytes, expected_head=None):
    operation = evidence.decode(operation_bytes)
    path.mkdir(exist_ok=True)
    lock = path / '.writer'
    lock.mkdir()
    try:
        sequence, previous = load(path, state, expected_head)
        index = sequence + 1
        envelope = {'sequence': index, 'previous_sha256': previous,
                    'operation_sha256': evidence.digest(operation_bytes),
                    'operation_utf8': operation_bytes.decode('utf-8')}
        raw = evidence.canonical(envelope) + b'\n'
        head = evidence.digest(raw)
        state.apply(operation, head)
        # A same-directory hard link publishes the completed file without replacement.
        # Unsupported filesystems fail closed. A crash can leave the lock for review.
        temporary = None
        try:
            with NamedTemporaryFile(prefix='.pending-', dir=path, delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(raw)
                handle.flush()
                os.fsync(handle.fileno())
            os.link(temporary, path / f'{index:08}.json')
        finally:
            if temporary is not None:
                temporary.unlink()
        return head
    finally:
        lock.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    write = commands.add_parser('append', help='append one local synthetic operation file')
    write.add_argument('operation', type=Path)
    read = commands.add_parser('report', help='inspect one local journal at an explicit UTC cutoff')
    read.add_argument('--as-of', required=True)
    for command in (write, read):
        command.add_argument('--journal', required=True, type=Path)
        command.add_argument('--expect-head', help='optional separately retained journal hash')
    args = parser.parse_args()
    try:
        path = journal_path(args.journal)
        require(args.expect_head is None or evidence.valid_hash(args.expect_head), 'invalid journal head pin')
        bound = domain.candidates.registry()
        # Empty readiness reports need no archived code. Every operation that
        # can check a captured vector must load the full pinned runtime.
        runtime = (domain.candidates.kernel() if args.command == 'append' or path.exists() else None)
        state = domain.Lifecycle(bound, runtime)
        if args.command == 'append':
            head = append(path, state, args.operation.read_bytes(), args.expect_head)
            result = {'label': domain.LABEL, 'head_sha256': head, 'paper_only': True, **evidence.SAFETY}
        else:
            _, head = load(path, state, args.expect_head)
            result = domain.report(state, domain.instant(args.as_of), head)
        sys.stdout.buffer.write(evidence.canonical(result) + b'\n')
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
