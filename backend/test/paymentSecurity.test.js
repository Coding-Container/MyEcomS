const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createRazorpaySignature,
  verifyRazorpaySignature,
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
