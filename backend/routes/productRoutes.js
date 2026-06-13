const express = require("express");
const router = express.Router();
const Product = require("../models/products");
const AuditLog = require("../models/auditLog");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", protect, admin, async (req, res, next) => {
  try {
    const { name, price, imageUrl, description, countInStock, type } = req.body;

    const product = new Product({
      name,
      price,
      imageUrl,
      description,
      countInStock,
      type,
    });

    const createProduct = await product.save();
    await AuditLog.create({
      admin: req.user._id,
      action: "PRODUCT_CREATED",
      target: createProduct.name,
    });

    res.status(201).json(createProduct);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", protect, admin, async (req, res, next) => {
  try {
    const { name, price, description, countInStock, type } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.name = name;
    product.price = price;
    product.description = description;
    product.countInStock = countInStock;
    product.type = type;

    const updatedProduct = await product.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "PRODUCT_UPDATED",
      target: updatedProduct.name,
    });

    res.json(updatedProduct);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    const productName = product.name;

    await AuditLog.create({
      admin: req.user._id,
      action: "PRODUCT_DELETED",
      target: productName,
    });

    res.json({
      message: "Product deleted successfully",
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
