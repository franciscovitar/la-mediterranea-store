import assert from "node:assert/strict";
import test from "node:test";
import { CAUCE_TEST_SCENARIOS, CAUCE_TEST_VISA } from "../lib/cauce/test-payment-guide";
import { isCauceOfficialTestCard } from "../lib/cauce/payments";

test("the portfolio guide uses the official Visa test card accepted by Cauce's provider verifier", () => {
  const card = CAUCE_TEST_VISA;
  assert.equal(card.cardNumber, "4509953566233704");
  assert.equal(card.displayNumber.replaceAll(" ", ""), card.cardNumber);
  assert.equal(card.expiration, "11/30");
  assert.equal(card.securityCode, "123");
  assert.equal(card.documentNumber, "12345678");
  assert.equal(isCauceOfficialTestCard({
    payment_method_id: "visa",
    card: { first_six_digits: card.cardNumber.slice(0, 6), last_four_digits: card.cardNumber.slice(-4) },
  }), true);
});

test("approved, rejected and pending are explicit Mercado Pago cardholder scenarios, not fake local payment statuses", () => {
  assert.deepEqual(CAUCE_TEST_SCENARIOS.map((s) => [s.id, s.cardholder]), [
    ["approved", "APRO"], ["rejected", "OTHE"], ["pending", "CONT"],
  ]);
  assert.equal(new Set(CAUCE_TEST_SCENARIOS.map((s) => s.cardholder)).size, 3);
});
