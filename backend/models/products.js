const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    imageUrl: String,
    description: String,
    countInStock: Number,
    type: String,
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
