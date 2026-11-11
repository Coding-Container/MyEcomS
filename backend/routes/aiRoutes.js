const express = require("express");
const classifyIntent = require("../utils/classifyIntent");
const searchProducts = require("../utils/searchProducts");
const { aiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/chat", aiLimiter, async (req, res, next) => {
  try {
    const { message } = req.body || {};
    if (typeof message !== "string" || !message.trim() || message.length > 500) {
      return res.status(400).json({ success: false, message: "Message must be 1 to 500 characters" });
    }

    const intent = await classifyIntent(message.trim());
    if (intent.intent === "PRODUCT_SEARCH") {
      const products = await searchProducts(intent);
      return res.json({
        success: true,
        products,
        reply: products.length ? "" : "No matching products found.",
      });
    }

    res.json({
      success: true,
      reply: intent.reply || "I can help you find products. What are you looking for?",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
