const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentIntent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentIntent",
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid"],
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: { type: String, required: true, trim: true, maxlength: 200 },
        price: { type: Number, required: true, min: 0 },
        qty: { type: Number, required: true, min: 1, validate: Number.isInteger },
        imageUrl: String,
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingAddress: {
      label: String,
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },

    status: {
      type: String,
      enum: ["Placed", "Processing", "Shipped", "Delivered"],
      default: "Placed",
      required: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Placed", "Processing", "Shipped", "Delivered"],
          required: true,
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index(
  { paymentIntent: 1 },
  { unique: true, partialFilterExpression: { paymentIntent: { $type: "objectId" } } },
);
orderSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } },
);

module.exports = mongoose.model("Order", orderSchema);
