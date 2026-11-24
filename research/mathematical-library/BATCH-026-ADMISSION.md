# Batch 026 — mathematical source and overlap review

24 November 2026. Both exact-head workflows passed at c40626ac3e9af385f01f5576e38dcff99451a1bf (45458702764, 45458702604). Entries 321–325 admitted as SPECIFIED only.

- [Arnoldi](https://www.cs.cornell.edu/courses/cs6210/2025fa/lec/2025-11-17.html): reviewed matrix-vector product, sequential projections, normalization and rectangular Hessenberg relation. Separate from the existing dense Hessenberg reduction; the latter uses similarity transformations on a full matrix.
- [Lanczos](https://www.cs.cornell.edu/courses/cs4220/2026sp/lec/2026-03-16.html): verified symmetry, tridiagonal projection and three-term recurrence. Specialization of Arnoldi with materially different operation/storage requirements, not an independent statistical result.
- [QR iteration](https://www.cs.cornell.edu/courses/cs4220/2026sp/lec/2026-03-06.html): verified repeated QR/RQ similarity, distinct from a single QR factorization; equal modulus limitation retained.
- [Givens rotations](https://www.cs.cornell.edu/courses/cs4220/2026sp/lec/2026-02-23.html): checked plane rotation and annihilation, translating source's sine sign convention. Related [Berkeley Stat 243](https://stat243.berkeley.edu/fall-2024/units/unit10-linalg.html) confirms QR via local rotations. Distinct computational mechanism from Householder QR.
- [Modified Gram-Schmidt](https://www.math.cmu.edu/~zechengz/spring_2023_nla/0317.pdf): inspected p. 2 Algorithm 2, including the rendered page; successive residual projections and normalization confirmed. Different finite-precision procedure from Householder QR.

Compared existing family index and IDs; this is not exhaustive semantic novelty certification. Original provisional candidate versions retained in parent history; citations updated to sources actually inspected. No numerical implementation, empirical validation, protected data or prediction experiments. Three provisional candidates staged for subsequent source review.
