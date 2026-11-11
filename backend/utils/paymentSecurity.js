const crypto = require("crypto");

const createRazorpaySignature = (orderId, paymentId, secret) =>
  crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

const verifyRazorpaySignature = (orderId, paymentId, signature, secret) => {
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }
  const expected = Buffer.from(
    createRazorpaySignature(orderId, paymentId, secret),
    "hex",
  );
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && crypto.timingSafeEqual(expected, provided);
};

module.exports = { createRazorpaySignature, verifyRazorpaySignature };
