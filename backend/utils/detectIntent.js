const detectIntent = (message) => {
  const text = message.toLowerCase();

  if (
    text.includes("show") ||
    text.includes("find") ||
    text.includes("search")
  ) {
    return "PRODUCT_SEARCH";
  }

  if (text.includes("order")) {
    return "ORDER_STATUS";
  }

  if (text.includes("cart")) {
    return "CART";
  }

  return "GENERAL";
};

module.exports = detectIntent;