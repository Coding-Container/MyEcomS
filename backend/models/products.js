const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    price: {
      type: Number,
      required: true,
      min: 0.01,
      max: 10000000,
      validate: {
        validator: (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
        message: "Price must have no more than two decimal places",
      },
    },
    imageUrl: {
      type: String,
      required: true,
      maxlength: 2048,
      validate: {
        validator: (value) => /^https?:\/\/\S+$/i.test(value),
        message: "Image URL must use HTTP or HTTPS",
      },
    },
    description: { type: String, default: "", maxlength: 2000 },
    countInStock: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
      validate: Number.isInteger,
    },
    type: { type: String, required: true, trim: true, maxlength: 50 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1, type: 1 });

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
