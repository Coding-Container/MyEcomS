const express = require("express");
const router = express.Router();

const ai = require("../utils/gemini");
const Product = require("../models/products");
const classifyIntent = require("../utils/classifyIntent");
const searchProducts = require("../utils/searchProducts");

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const intentData = await classifyIntent(message);

    if (intentData.intent === "PRODUCT_SEARCH") {
      const products = await searchProducts(intentData);

      console.log(products);

      return res.json({
        success: true,
        products,
      });
    }

    console.log(intentData);


    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    console.log(response);

    res.status(200).json({
      success: true,
      reply: response.text,
    });
  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
