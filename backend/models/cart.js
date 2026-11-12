const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    qty: {
      type: Number,
      default: 1,
      min: 1,
      validate: Number.isInteger,
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("Cart", cartSchema);
