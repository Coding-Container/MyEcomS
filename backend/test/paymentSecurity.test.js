const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createRazorpaySignature,
  verifyRazorpaySignature,
  createRazorpayWebhookSignature,
  verifyRazorpayWebhookSignature,
} = require("../utils/paymentSecurity");

test("accepts a valid Razorpay payment signature", () => {
  const signature = createRazorpaySignature("order_123", "pay_456", "test-secret");
  assert.equal(
    verifyRazorpaySignature("order_123", "pay_456", signature, "test-secret"),
    true,
  );
});

test("rejects altered callback fields and malformed signatures", () => {
  const signature = createRazorpaySignature("order_123", "pay_456", "test-secret");
  assert.equal(
    verifyRazorpaySignature("order_123", "pay_other", signature, "test-secret"),
    false,
  );
  assert.equal(
    verifyRazorpaySignature("order_123", "pay_456", "not-a-signature", "test-secret"),
    false,
  );
});

test("verifies Razorpay webhooks against the exact raw request body", () => {
  const rawBody = Buffer.from('{"event":"payment.captured","payload":{}}');
  const signature = createRazorpayWebhookSignature(rawBody, "webhook-secret");
  assert.equal(verifyRazorpayWebhookSignature(rawBody, signature, "webhook-secret"), true);
  assert.equal(
    verifyRazorpayWebhookSignature(Buffer.from(`${rawBody.toString()} `), signature, "webhook-secret"),
    false,
  );
  assert.equal(verifyRazorpayWebhookSignature(rawBody, signature, "wrong-secret"), false);
  assert.equal(verifyRazorpayWebhookSignature(rawBody, "malformed", "webhook-secret"), false);
});

test("PaymentIntent accepts the complete payment reconciliation lifecycle", () => {
  const PaymentIntent = require("../models/paymentIntent");
  assert.deepEqual(PaymentIntent.schema.path("status").enumValues, [
    "pending",
    "paid",
    "refund_pending",
    "refunded",
    "failed",
    "expired",
    "reconciled",
  ]);
});
