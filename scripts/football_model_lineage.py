"""Repository-observed football model lineage and prospective admission gate."""

# These labels identify research code paths. No current producer discloses an
# exact prospective model-version/configuration pair backed by review evidence.
RESEARCH_VARIANTS = (
    ('POISSON_BASELINE_2025_26_V1', 'pinned experiment102_poisson_research.py', 'implemented_research'),
    ('POISSON_CURRENT_SEASON_SHRINKAGE_V1', 'pinned experiment102_poisson_research.py', 'implemented_research'),
    *((f'LEAGUE_POISSON_SHRINKAGE_V1_{league}_{basis}', 'pinned expanded_football.py', 'implemented_research_family')
      for league in ('E1', 'SP1', 'D1', 'I1', 'F1', 'UCL')
      for basis in ('PRIOR_SEASON', 'CURRENT_SEASON_SMALL_SAMPLE')),
    ('CURRENT_SEASON_POISSON_COMPARISON_V1', 'pinned expanded_football.py', 'implemented_comparison'),
    ('RECONSTRUCTED_POISSON_RESEARCH_V1', 'research/football-baseline-v1/replay.mjs', 'implemented_retrospective'),
)

ADMITTED_CONFIGURATIONS = frozenset()


def disposition(model):
    identity = (model['name'], model['version_sha256'], model['configuration_sha256'])
    if identity in ADMITTED_CONFIGURATIONS:
        return None
    if any(model['name'] == name for name, _, _ in RESEARCH_VARIANTS):
        return 'unresolved_model_version_or_configuration'
    return 'unregistered_model'
