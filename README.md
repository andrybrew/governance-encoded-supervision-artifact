# Governance-Encoded Supervision Artifact

This repository contains the bounded-core V3.1-R2 artifact, controlled test suites, frozen execution evidence, and guard-mutation analysis materials for a design science study of supervisory governability in VAT e-invoicing.

The artifact instantiates governance-encoded supervision as a bounded design logic for addressing structural uncertainty across separately administered institutional systems. Structural uncertainty refers to insufficient binding among event progression, actor authorization, sequence dependency, and evidentiary linkage.

## Repository structure

- `contracts/`: V3.1-R2 bounded-core Solidity artifact
- `test/governance.spec.ts`: pre-specified controlled suite (EC1-EC19)
- `test/adversarial.spec.ts`: mutation-guided adversarial cases (AC1-AC37), written after the first mutation round
- `mutation_analysis/`: mutant generator, runner, and per-mutant results for both rounds
- `evidence/`: frozen controlled-execution evidence package
- `hardhat.config.ts`: Hardhat and EVM configuration
- `package.json`: project dependencies and execution scripts

## Supervisory specification

The artifact represents two coordinated supervisory levels.

### Invoice-level progression

- entitlement validation
- invoice issuance
- system receipt
- buyer acknowledgment
- invoice-to-period posting

Buyer acknowledgment is represented as a distinct event and is not an encoded prerequisite for invoice-to-period posting. Duplicate posting and posting to a period that is no longer open are blocked.

### Supervisory-period progression

- period opening
- recording of an externally determined `Payable`, `Nil`, or `Overpaid` position
- settlement-evidence recording for the `Payable` branch
- an externally supplied `Incomplete` or `Complete` settlement-completion decision
- supervisory review
- external-resolution reference recording
- period closure

The artifact records supplied positions, decisions, references, commitments, and selected metadata. It does not calculate VAT liability, determine legal sufficiency, or perform substantive correction, refund, compensation, amendment, or dispute-resolution procedures.

### Cross-level functions

- invoice-to-period posting
- scoped evidence requests
- independently authorized evidence submissions
- review activation
- exception handoff
- external-resolution reference recording

An active review blocks ordinary progression. Releasing a represented review condition does not bypass remaining branch-specific prerequisites.

## Governance mechanisms

The artifact instantiates four supervisory mechanisms:

1. Event-based checkpoints for linked and branch-sensitive progression.
2. Role-bounded application permissions for selected artifact actions.
3. Rule-constrained sequencing for represented prerequisites and boundaries.
4. Minimal evidentiary anchoring through selected commitments, references, classifications, and metadata.

## Execution environment

- Node.js 24.18.0
- npm 11.16.0
- Hardhat 3.11.1
- Solidity 0.8.28
- EVM target: Cancun

## Reproduction commands

```bash
npm ci
npx.cmd hardhat test
npx.cmd hardhat test nodejs --coverage
## Controlled execution result

## Controlled execution result
19 pre-specified test cases completed successfully
99.23% line coverage
99.12% statement coverage
baseline, boundary, and exception-handoff cases executed
observed responses matched the pre-execution expectations
Supported inference

## The controlled execution supports:

specification-to-execution conformance
selected application-level governance enforcement
tested boundary blocking
preservation of protected state following rejected actions
controlled exception-handoff behavior
Claim boundaries

## The artifact and execution evidence do not establish:

legal correctness
official institutional approval
production readiness
scalability
performance superiority
operational adoption
representative stakeholder validation
field-level administrative effects

Application roles represent technical permissions rather than legal authority, institutional appointment, delegation, or separation of duties. Complete operational records remain in institutional source systems. Authenticity, semantic truth, evidentiary sufficiency, correction, review authority, and substantive administrative judgment remain institutionally governed.

## Evidence availability

The repository contains the versioned artifact, test suite, and frozen controlled-execution evidence package.

Participant-level records, identifying crosswalks, consent records, and confidential institutional materials are not included. Institutional-appraisal evidence and official-source mappings are reported in anonymized form in the manuscript supplementary material.

## Repository status

This repository is public. During double-anonymized review, reviewers access the artifact through the anonymized archive submitted with the manuscript; the repository URL, owner identity, and commit metadata do not appear in reviewer-visible materials.

## License

The repository license applies to the source code and does not imply institutional approval, legal validity, or fitness for production use.


## Guard-mutation analysis

The frozen V3.1-R2 contract was mutated 109 times, each mutant altering exactly one governance-relevant element. The pre-specified suite (EC1-EC19) detected 70 of 109 mutants; with the adversarial cases (AC1-AC37) added, all 109 were detected. Artifact logic and EC1-EC19 are unchanged. See `mutation_analysis/README.md` to reproduce both rounds.
