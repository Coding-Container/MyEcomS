const Product = require("../models/products");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchProducts = async (intentData) => {
  const query = { isActive: { $ne: false } };

  if (intentData.category) {
    query.type = new RegExp(escapeRegex(intentData.category), "i");
  }

  if (intentData.productName) {
    query.name = new RegExp(escapeRegex(intentData.productName), "i");
  }

  if (intentData.maxPrice !== null || intentData.minPrice !== null) {
    query.price = {
      ...(intentData.maxPrice !== null ? { $lte: intentData.maxPrice } : {}),
      ...(intentData.minPrice !== null ? { $gte: intentData.minPrice } : {}),
    };
  }

  const products = await Product.find(query)
    .select("name price imageUrl type")
    .limit(20)
    .maxTimeMS(1500)
    .lean();

  return products;
};

module.exports = searchProducts;