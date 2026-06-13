const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        price: Number,
        qty: Number,
        imageUrl: String,
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
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
      default: "Placed",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
