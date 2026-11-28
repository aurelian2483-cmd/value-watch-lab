# Batch 096 staging correction — 2026-11-28

Parent: `2cdf626f9cb41d6f0c042e627ded4e42b30acda1`. PR #171 remains open/draft on the authorised branch at preflight.

Registry run 46111147900, job 140874748177, reported 65 passing tests and one failing test: `staged candidates pass structural intake without inflating registered counts`. `validate-v1.mjs:61` rejected `persistent-sweep-planar-point-location` because the original definition contained none of the required mathematical relation symbols. Full research regression run 46111147899 reported success.

Correction: give an explicit edge-height interpolation equation, active-set condition and face-selection rule, and restrict the provisional specification to open-slab off-edge queries. Nonvertical noncrossing edges and consistent face labels are required; event, boundary and exterior query handling and persistent complexity remain pending review. This is a staging correction, not admission. The fractional-cascading candidate is unchanged.

Source check: MIT 6.851 Spring 2012 lecture 3 landing page confirms the persistent sweep approach (https://courses.csail.mit.edu/6.851/spring12/lectures/L03.html). The Princeton institutional abstract and citation for Sarnak and Tarjan (1986), DOI 10.1145/6138.6151, were checked (https://collaborate.princeton.edu/en/publications/planar-point-location-using-persistent-search-trees-2/). The full original paper was not reviewed. The interpolation formula follows from the two-point line equation; domain and label conventions are local specification choices, not attributed to the paper.

Targeted preflight: both staged records satisfy the mathematical-symbol predicate and batch/lifecycle requirements; their IDs differ. This is not the complete intake test, independent mathematical testing, or novelty review. No registered batch, snapshots, validator, tests or publication gates changed. Registered count remains 487 according to the parent progress snapshot; empirical qualification count remains zero. No datasets or prediction experiments accessed. Both hosted checks must pass on the corrected head before further writes.
