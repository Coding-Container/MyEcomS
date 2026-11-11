const mongoose = require("mongoose");

const paymentIntentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },
    address: {
      label: String,
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        pricePaise: {
          type: Number,
          required: true,
          min: 1,
          validate: Number.isSafeInteger,
        },
        imageUrl: String,
        qty: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "paid", "refund_pending", "refunded"],
      default: "pending",
      required: true,
    },
    paymentId: {
      type: String,
    },
  },
  { timestamps: true },
);

paymentIntentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentIntentSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } },
);

module.exports = mongoose.model("PaymentIntent", paymentIntentSchema);
