// Mutation-guided adversarial cases (AC1-AC37), written after guard-mutation
// analysis of the frozen V3.1-R2 artifact. The pre-specified suite
// (governance.spec.ts, EC1-EC19) is unchanged. Each case attempts one
// forbidden action and asserts the exact revert reason, so that removing or
// weakening the corresponding guard is detected.
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, stringToHex, keccak256, toHex } from "viem";

const { viem, networkHelpers } = await network.create();

const ROLES = {
  TAX_AUTHORITY: keccak256(stringToHex("TAX_AUTHORITY_ROLE")),
  SELLER: keccak256(stringToHex("SELLER_ROLE")),
  BUYER: keccak256(stringToHex("BUYER_ROLE")),
  TAX_SYSTEM: keccak256(stringToHex("TAX_SYSTEM_RECORDER_ROLE")),
  PERIOD_POSTER: keccak256(stringToHex("PERIOD_POSTER_ROLE")),
  RETURN_RECORDER: keccak256(stringToHex("TAX_RETURN_RECORDER_ROLE")),
  SETTLEMENT_RECORDER: keccak256(stringToHex("SETTLEMENT_EVIDENCE_RECORDER_ROLE")),
  REVIEWER: keccak256(stringToHex("SUPERVISORY_REVIEWER_ROLE")),
};
const POS = { Payable: 0, Nil: 1, Overpaid: 2 };
const EVID = { DirectPaymentBPN: 0 };
const COMPLETION = { Complete: 1 };
const OUTCOME = { ClearedForClosure: 0 };
const ZERO = toHex(0, { size: 32 });
function id(v: string) { return stringToHex(v, { size: 32 }); }
function hash(v: string) { return keccak256(stringToHex(v)); }

describe("Mutation-guided adversarial cases (post hoc, V3.1-R2)", function () {
  async function deployFixture() {
    const wallets = await viem.getWalletClients();
    const [admin, taxAuthority, seller, buyer, taxSystem, poster, returnRec, settleRec, reviewer] = wallets;
    const vat = await viem.deployContract("VATGovernancePoC", []);
    const grant = async (role: `0x${string}`, who: any) =>
      vat.write.grantRole([role, getAddress(who.account.address)], { account: admin.account });
    await grant(ROLES.TAX_AUTHORITY, taxAuthority);
    await grant(ROLES.SELLER, seller);
    await grant(ROLES.BUYER, buyer);
    await grant(ROLES.TAX_SYSTEM, taxSystem);
    await grant(ROLES.PERIOD_POSTER, poster);
    await grant(ROLES.RETURN_RECORDER, returnRec);
    await grant(ROLES.SETTLEMENT_RECORDER, settleRec);
    await grant(ROLES.REVIEWER, reviewer);
    return { vat, admin, taxAuthority, seller, buyer, taxSystem, poster, returnRec, settleRec, reviewer };
  }
  const load = () => networkHelpers.loadFixture(deployFixture);
  const rev = (p: Promise<any>, reason: string) => viem.assertions.revertWith(p, reason);

  async function received(c: any, code: string) {
    await c.vat.write.validateEntitlement([id(code), hash("ENT")], { account: c.taxAuthority.account });
    await c.vat.write.issueInvoice([id(code), hash("INV")], { account: c.seller.account });
    await c.vat.write.recordSystemReceipt([id(code)], { account: c.taxSystem.account });
  }
  async function postedPeriod(c: any, code: string) {
    await received(c, code);
    await c.vat.write.openPeriod([id("P-" + code)], { account: c.poster.account });
    await c.vat.write.postInvoiceToPeriod([id(code), id("P-" + code)], { account: c.poster.account });
  }
  async function position(c: any, code: string, pos: number) {
    await postedPeriod(c, code);
    await c.vat.write.recordReportedPeriodPosition(
      [id("P-" + code), pos, hash("POSEV"), hash("SET"), 1n, ZERO], { account: c.returnRec.account });
  }
  async function withEvidence(c: any, code: string) {
    await position(c, code, POS.Payable);
    await c.vat.write.recordSettlementEvidence(
      [id("P-" + code), EVID.DirectPaymentBPN, hash("BPN"), hash("AMT"), hash("SRCTIME")], { account: c.settleRec.account });
  }
  async function reviewable(c: any, code: string) {
    await withEvidence(c, code);
    await c.vat.write.recordSettlementCompletionDecision([id("P-" + code), COMPLETION.Complete, hash("C")], { account: c.settleRec.account });
  }

  // ---------------- A. Role-bounded permissions (one per protected action)
  it("AC1 role administration: non-admin account cannot grant roles", async () => {
    const c = await load();
    await rev(c.vat.write.grantRole([ROLES.REVIEWER, getAddress(c.seller.account.address)], { account: c.seller.account }), "REJECTED_ADMIN_REQUIRED");
  });
  it("AC2 entitlement validation by seller is rejected", async () => {
    const c = await load();
    await rev(c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.seller.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC3 invoice issuance by buyer is rejected", async () => {
    const c = await load();
    await c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.taxAuthority.account });
    await rev(c.vat.write.issueInvoice([id("I"), hash("INV")], { account: c.buyer.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC4 system receipt by seller is rejected", async () => {
    const c = await load();
    await c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.taxAuthority.account });
    await c.vat.write.issueInvoice([id("I"), hash("INV")], { account: c.seller.account });
    await rev(c.vat.write.recordSystemReceipt([id("I")], { account: c.seller.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC5 buyer acknowledgment by seller is rejected", async () => {
    const c = await load();
    await received(c, "I");
    await rev(c.vat.write.acknowledgeBuyer([id("I"), hash("ACK")], { account: c.seller.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC6 period opening by reviewer is rejected", async () => {
    const c = await load();
    await rev(c.vat.write.openPeriod([id("P")], { account: c.reviewer.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC7 reported-position recording by period poster is rejected", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await rev(c.vat.write.recordReportedPeriodPosition([id("P-I"), POS.Payable, hash("POSEV"), hash("SET"), 1n, ZERO], { account: c.poster.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC8 settlement-completion decision by reviewer is rejected", async () => {
    const c = await load();
    await withEvidence(c, "I");
    await rev(c.vat.write.recordSettlementCompletionDecision([id("P-I"), COMPLETION.Complete, hash("C")], { account: c.reviewer.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC9 review outcome by settlement recorder is rejected", async () => {
    const c = await load();
    await reviewable(c, "I");
    await rev(c.vat.write.recordSupervisoryReviewOutcome([id("P-I"), OUTCOME.ClearedForClosure], { account: c.settleRec.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC10 Overpaid external-treatment routing by tax authority is rejected", async () => {
    const c = await load();
    await position(c, "I", POS.Overpaid);
    await rev(c.vat.write.requireOverpaidResolution([id("P-I")], { account: c.taxAuthority.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC11 review activation by tax authority is rejected", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await rev(c.vat.write.markScopeUnderReview([3, id("P-I"), hash("R")], { account: c.taxAuthority.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC12 external-resolution reference by tax authority is rejected", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await c.vat.write.markScopeUnderReview([3, id("P-I"), hash("R")], { account: c.reviewer.account });
    await rev(c.vat.write.recordExternalResolutionReference([3, id("P-I"), hash("RES")], { account: c.taxAuthority.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC13 period closure by tax authority is rejected", async () => {
    const c = await load();
    await reviewable(c, "I");
    await c.vat.write.recordSupervisoryReviewOutcome([id("P-I"), OUTCOME.ClearedForClosure], { account: c.reviewer.account });
    await rev(c.vat.write.closeSupervisoryPeriod([id("P-I")], { account: c.taxAuthority.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC14 evidence request by seller is rejected", async () => {
    const c = await load();
    await rev(c.vat.write.requestEvidence([1, id("P"), hash("S")], { account: c.seller.account }), "REJECTED_ROLE_REQUIRED");
  });
  it("AC15 evidence submission by buyer is rejected", async () => {
    const c = await load();
    await rev(c.vat.write.submitEvidence([1, id("P"), hash("E")], { account: c.buyer.account }), "REJECTED_ROLE_REQUIRED");
  });

  // ---------------- B. Invoice-level prerequisites
  it("AC16 entitlement cannot be validated twice for the same invoice", async () => {
    const c = await load();
    await c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.taxAuthority.account });
    await rev(c.vat.write.validateEntitlement([id("I"), hash("ENT2")], { account: c.taxAuthority.account }), "BLOCKED_INVOICE_ALREADY_STARTED");
  });
  it("AC17 invoice cannot be issued without validated entitlement", async () => {
    const c = await load();
    await rev(c.vat.write.issueInvoice([id("I"), hash("INV")], { account: c.seller.account }), "BLOCKED_ENTITLEMENT_REQUIRED");
  });
  it("AC18 system receipt cannot precede issuance", async () => {
    const c = await load();
    await c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.taxAuthority.account });
    await rev(c.vat.write.recordSystemReceipt([id("I")], { account: c.taxSystem.account }), "BLOCKED_INVOICE_ISSUANCE_REQUIRED");
  });
  it("AC19 buyer acknowledgment cannot precede system receipt", async () => {
    const c = await load();
    await c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.taxAuthority.account });
    await c.vat.write.issueInvoice([id("I"), hash("INV")], { account: c.seller.account });
    await rev(c.vat.write.acknowledgeBuyer([id("I"), hash("ACK")], { account: c.buyer.account }), "BLOCKED_SYSTEM_RECEIPT_REQUIRED");
  });

  // ---------------- C. Period opening and posting
  it("AC20 a period cannot be opened twice", async () => {
    const c = await load();
    await c.vat.write.openPeriod([id("P")], { account: c.poster.account });
    await rev(c.vat.write.openPeriod([id("P")], { account: c.poster.account }), "BLOCKED_PERIOD_ALREADY_OPEN");
  });
  it("AC21 posting is blocked while the period is under review", async () => {
    const c = await load();
    await received(c, "I");
    await c.vat.write.openPeriod([id("P")], { account: c.poster.account });
    await c.vat.write.markScopeUnderReview([1, id("P"), hash("R")], { account: c.reviewer.account });
    await rev(c.vat.write.postInvoiceToPeriod([id("I"), id("P")], { account: c.poster.account }), "BLOCKED_PERIOD_UNDER_REVIEW");
  });
  it("AC22 an invoice without recorded system receipt cannot be posted", async () => {
    const c = await load();
    await c.vat.write.validateEntitlement([id("I"), hash("ENT")], { account: c.taxAuthority.account });
    await c.vat.write.issueInvoice([id("I"), hash("INV")], { account: c.seller.account });
    await c.vat.write.openPeriod([id("P")], { account: c.poster.account });
    await rev(c.vat.write.postInvoiceToPeriod([id("I"), id("P")], { account: c.poster.account }), "BLOCKED_INVOICE_NOT_READY_FOR_POSTING");
  });

  // ---------------- D. Reported period position
  it("AC23 a position cannot be recorded for a period that was never opened", async () => {
    const c = await load();
    await rev(c.vat.write.recordReportedPeriodPosition([id("P-X"), POS.Nil, hash("POSEV"), ZERO, 0n, hash("NOACT")], { account: c.returnRec.account }), "BLOCKED_PERIOD_NOT_OPEN");
  });
  it("AC24 a position cannot be recorded while the period is under review", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await c.vat.write.markScopeUnderReview([1, id("P-I"), hash("R")], { account: c.reviewer.account });
    await rev(c.vat.write.recordReportedPeriodPosition([id("P-I"), POS.Payable, hash("POSEV"), hash("SET"), 1n, ZERO], { account: c.returnRec.account }), "BLOCKED_PERIOD_UNDER_REVIEW");
  });
  it("AC25 a Nil position cannot use both evidence paths at once", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await rev(c.vat.write.recordReportedPeriodPosition([id("P-I"), POS.Nil, hash("POSEV"), hash("SET"), 1n, hash("NOACT")], { account: c.returnRec.account }), "BLOCKED_NIL_EXACTLY_ONE_EVIDENCE_PATH");
  });
  it("AC26 a Payable position requires at least one posted invoice", async () => {
    const c = await load();
    await c.vat.write.openPeriod([id("P")], { account: c.poster.account });
    await rev(c.vat.write.recordReportedPeriodPosition([id("P"), POS.Payable, hash("POSEV"), hash("SET"), 0n, ZERO], { account: c.returnRec.account }), "BLOCKED_NO_POSTED_INVOICE");
  });
  it("AC27 a Payable position requires an invoice-set commitment", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await rev(c.vat.write.recordReportedPeriodPosition([id("P-I"), POS.Payable, hash("POSEV"), ZERO, 1n, ZERO], { account: c.returnRec.account }), "BLOCKED_SET_COMMITMENT_REQUIRED");
  });
  it("AC28 a position requires position evidence", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await rev(c.vat.write.recordReportedPeriodPosition([id("P-I"), POS.Payable, ZERO, hash("SET"), 1n, ZERO], { account: c.returnRec.account }), "BLOCKED_POSITION_EVIDENCE_REQUIRED");
  });

  // ---------------- E. Payable branch
  it("AC29 settlement evidence cannot be added after the review outcome is recorded", async () => {
    const c = await load();
    await reviewable(c, "I");
    await c.vat.write.recordSupervisoryReviewOutcome([id("P-I"), OUTCOME.ClearedForClosure], { account: c.reviewer.account });
    await rev(c.vat.write.recordSettlementEvidence([id("P-I"), EVID.DirectPaymentBPN, hash("BPN2"), hash("AMT"), hash("SRCTIME")], { account: c.settleRec.account }), "BLOCKED_INVALID_STATE_FOR_SETTLEMENT_EVIDENCE");
  });
  it("AC30 a completion decision cannot be recorded while the period is under review", async () => {
    const c = await load();
    await withEvidence(c, "I");
    await c.vat.write.markScopeUnderReview([2, id("P-I"), hash("R")], { account: c.reviewer.account });
    await rev(c.vat.write.recordSettlementCompletionDecision([id("P-I"), COMPLETION.Complete, hash("C")], { account: c.settleRec.account }), "BLOCKED_PERIOD_UNDER_REVIEW");
  });
  it("AC31 a completion decision requires recorded settlement evidence", async () => {
    const c = await load();
    await position(c, "I", POS.Payable);
    await rev(c.vat.write.recordSettlementCompletionDecision([id("P-I"), COMPLETION.Complete, hash("C")], { account: c.settleRec.account }), "BLOCKED_SETTLEMENT_EVIDENCE_REQUIRED");
  });

  // ---------------- F. Review, Overpaid, and handoff
  it("AC32 a review outcome cannot be recorded while the period is under review", async () => {
    const c = await load();
    await reviewable(c, "I");
    await c.vat.write.markScopeUnderReview([1, id("P-I"), hash("R")], { account: c.reviewer.account });
    await rev(c.vat.write.recordSupervisoryReviewOutcome([id("P-I"), OUTCOME.ClearedForClosure], { account: c.reviewer.account }), "BLOCKED_PERIOD_UNDER_REVIEW");
  });
  it("AC33 a review outcome requires a recorded position", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await rev(c.vat.write.recordSupervisoryReviewOutcome([id("P-I"), OUTCOME.ClearedForClosure], { account: c.reviewer.account }), "BLOCKED_POSITION_REQUIRED");
  });
  it("AC34 a Nil period cannot receive a second review outcome", async () => {
    const c = await load();
    await c.vat.write.openPeriod([id("P")], { account: c.poster.account });
    await c.vat.write.recordReportedPeriodPosition([id("P"), POS.Nil, hash("POSEV"), ZERO, 0n, hash("NOACT")], { account: c.returnRec.account });
    await c.vat.write.recordSupervisoryReviewOutcome([id("P"), OUTCOME.ClearedForClosure], { account: c.reviewer.account });
    await rev(c.vat.write.recordSupervisoryReviewOutcome([id("P"), OUTCOME.ClearedForClosure], { account: c.reviewer.account }), "BLOCKED_INVALID_STATE_FOR_NIL_REVIEW");
  });
  it("AC35 external-treatment routing requires an Overpaid position", async () => {
    const c = await load();
    await position(c, "I", POS.Payable);
    await rev(c.vat.write.requireOverpaidResolution([id("P-I")], { account: c.reviewer.account }), "BLOCKED_OVERPAID_POSITION_REQUIRED");
  });
  it("AC36 external-treatment routing cannot be repeated", async () => {
    const c = await load();
    await position(c, "I", POS.Overpaid);
    await c.vat.write.requireOverpaidResolution([id("P-I")], { account: c.reviewer.account });
    await rev(c.vat.write.requireOverpaidResolution([id("P-I")], { account: c.reviewer.account }), "BLOCKED_INVALID_STATE");
  });
  it("AC37 review cannot be activated twice on the same scope", async () => {
    const c = await load();
    await postedPeriod(c, "I");
    await c.vat.write.markScopeUnderReview([1, id("P-I"), hash("R")], { account: c.reviewer.account });
    await rev(c.vat.write.markScopeUnderReview([1, id("P-I"), hash("R2")], { account: c.reviewer.account }), "BLOCKED_ALREADY_UNDER_REVIEW");
  });
});
