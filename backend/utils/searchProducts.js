const Product = require("../models/products");

const searchProducts = async (intentData) => {
  const query = {};

  if (intentData.category) {
    query.type = new RegExp(intentData.category, "i");
  }

  if (intentData.productName) {
    query.name = new RegExp(intentData.productName, "i");
  }

  if (intentData.maxPrice) {
    query.price = {
      $lte: intentData.maxPrice,
    };
  }

  const products = await Product.find(query);

  return products;
};

module.exports = searchProducts;