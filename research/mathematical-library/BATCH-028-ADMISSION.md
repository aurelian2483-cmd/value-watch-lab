# Batch 028 admission review

Parent: 824a2d136ab1424adf6c080d349965fea71d4fa4. Exact-parent CI: full regression 45488767403 and registry 45488767420 completed successfully. Original proposals retained in candidate-batch-028.provisional.json; reviewed candidates and admitted batch identical.

- Iterative refinement: Higham's 2023 article gives residual, correction solve and update. Nonsingularity does not guarantee finite-precision improvement. Residual precision, correction accuracy, conditioning and stopping limits matter. Existing backward-error diagnostic measures error; LU solves a system; Jacobi and Gauss–Seidel use different update mechanisms. Retained as algorithm specification.
- Spectral condition number: Illinois CS 357 SVD notes give extreme singular-value ratio and infinite singular case. It measures sensitivity, not observed error. Existing SVD computes singular values; backward error is distinct. Retained as diagnostic, not an additional solver.

Reviewed existing 328 IDs and relevant generated reference definitions, not a proof of all algebraic inequivalences. No protected data, predictive experiments, implementation or empirical test evidence accessed. Previous IDs and lifecycle claims unchanged. Four snapshots updated from green baseline in exact renderer format; fresh CI must establish equality. Next batch provisional: review SOR variant and Richardson equivalence to quadratic gradient descent. Size and independent review gates remain closed.
