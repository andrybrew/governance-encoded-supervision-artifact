# Guard-mutation analysis (V3.1-R2)

Generate mutants, then run the suite against each one (from this folder):

    python3 mutate.py
    python3 run_mutants.py

`run_mutants.py` overwrites `contracts/VATGovernancePoC.sol` with each mutant in turn and restores the original at the end. A mutant is killed if at least one case no longer passes. With only `test/governance.spec.ts` present the run reproduces Round 1 (EC1-EC19); with `test/adversarial.spec.ts` also present it reproduces Round 2 (EC1-EC19 plus AC1-AC37).

`mutation_results_V3.1-R2_round1.csv` and `mutation_results_V3.1-R2_round2.csv` report each mutant, its outcome, and the cases that killed it in Round 1 and Round 2. Summary results for both rounds are in Supplementary File 1, Table SM15.

Reported run: Node.js 22.23.4, Hardhat 3 (package-lock.json), solc 0.8.28 WASM build, EVM target Cancun.
