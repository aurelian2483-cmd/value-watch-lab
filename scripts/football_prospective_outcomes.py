"""Exact reviewed result association for the offline football evaluator."""
from collections import Counter, defaultdict

if __package__:
    from . import football_prospective_contract as contract
else:
    import football_prospective_contract as contract


class OutcomeIndex:
    def __init__(self, receipts):
        self.groups = defaultdict(list)
        event_signatures = defaultdict(set)
        self.receipt_ids = Counter()
        for row in receipts:
            signature = contract.fixture_signature(row['event'])
            self.groups[signature].append(row)
            event_signatures[contract.event_key(row['event'])].add(signature)
            self.receipt_ids[row['receipt_id']] += 1
        self.collisions = {key for key, signatures in event_signatures.items() if len(signatures) > 1}
        self.identity_signatures = event_signatures

    def resolve(self, forecast, review, as_of):
        event = forecast['event']
        signature = contract.fixture_signature(event)
        key = contract.event_key(event)
        receipts = self.groups.get(signature, ())
        if key in self.collisions or (key in self.identity_signatures and
                                     signature not in self.identity_signatures[key]):
            return 'outcome_event_identity_conflict', None
        if not receipts:
            return 'missing_exact_outcome', None
        if any(contract.event_key(row['event']) in self.collisions for row in receipts):
            return 'outcome_event_identity_conflict', None
        if any(self.receipt_ids[row['receipt_id']] > 1 for row in receipts):
            return 'duplicate_outcome_receipt', None
        if any(row['origin'] != forecast['origin'] for row in receipts):
            return 'outcome_origin_conflict', None
        if any(contract.instant(row['retrieved_at']) > as_of for row in receipts):
            return 'future_outcome_receipt', None
        statuses = {row['status'] for row in receipts}
        if len(statuses) != 1:
            return 'conflicting_outcome_status', None
        status = next(iter(statuses))
        if status != 'final':
            return f'outcome_{status}', None
        scopes = {row['settlement_scope'] for row in receipts}
        if len(scopes) != 1:
            return 'conflicting_settlement_scopes', None
        scope = next(iter(scopes))
        if scope != contract.REGULATION:
            return f'outcome_{scope}', None
        scores = {tuple(row['score']['value']) for row in receipts}
        if len(scores) != 1:
            return 'conflicting_regulation_scores', None
        if review is None:
            return 'missing_reviewed_fixture_link', None
        if not contract.same_event(event, review['event']):
            return 'reviewed_event_identity_conflict', None
        if set(review['outcome_sha256']) != {row['content_sha256'] for row in receipts}:
            return 'reviewed_receipt_set_mismatch', None
        reviewed = contract.instant(review['reviewed_at'])
        if not all(contract.instant(row['retrieved_at']) <= reviewed <= as_of for row in receipts):
            return 'outcome_review_chronology_invalid', None
        for source in ('provider', 'acquisition_lineage'):
            if len({row[source] for row in receipts}) != len(receipts):
                return 'duplicate_or_shared_outcome_source', None
        if len({row['provenance']['sha256'] for row in receipts}) != len(receipts):
            return 'duplicate_outcome_payload', None
        home, away = next(iter(scores))
        return 'outcome_reviewed', 'home' if home > away else 'away' if away > home else 'draw'
