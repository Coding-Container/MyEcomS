const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/products");
const Cart = require("../models/cart");
const AuditLog = require("../models/auditLog");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(products);
  } catch (e) {
    next(e);
  }
});

router.post("/", protect, admin, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { name, price, imageUrl, description, countInStock, type } = req.body || {};

    const product = new Product({
      name,
      price,
      imageUrl,
      description,
      countInStock,
      type,
    });

    await session.withTransaction(async () => {
      await product.save({ session });
      await AuditLog.create(
        [{
          actor: req.user._id,
          role: "admin",
          action: "PRODUCT_CREATED",
          targetType: "product",
          targetId: product._id.toString(),
          target: product.name,
        }],
        { session },
      );
    });

    res.status(201).json(product);
  } catch (e) {
    next(e);
  } finally {
    await session.endSession();
  }
});

router.put("/:id", protect, admin, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const fields = ["name", "price", "imageUrl", "description", "countInStock", "type"];
    const body = req.body || {};
    const updates = Object.fromEntries(
      fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]),
    );
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No product fields provided" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    let updatedProduct;
    await session.withTransaction(async () => {
      updatedProduct = await Product.findOneAndUpdate(
        { _id: req.params.id, isActive: { $ne: false } },
        { $set: updates },
        { new: true, runValidators: true, session },
      );
      if (updatedProduct) {
        await AuditLog.create(
          [{
            actor: req.user._id,
            role: "admin",
            action: "PRODUCT_UPDATED",
            targetType: "product",
            targetId: updatedProduct._id.toString(),
            target: updatedProduct.name,
          }],
          { session },
        );
      }
    });
    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });

    res.json(updatedProduct);
  } catch (e) {
    next(e);
  } finally {
    await session.endSession();
  }
});

router.delete("/:id", protect, admin, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    let product;
    await session.withTransaction(async () => {
      product = await Product.findOneAndUpdate(
        { _id: req.params.id, isActive: { $ne: false } },
        { $set: { isActive: false } },
        { new: true, session },
      );
      if (!product) return;
      await Cart.deleteMany({ product: product._id }, { session });
      await AuditLog.create(
        [{
          actor: req.user._id,
          role: "admin",
          action: "PRODUCT_DELETED",
          targetType: "product",
          targetId: product._id.toString(),
          target: product.name,
        }],
        { session },
      );
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({
      message: "Product deleted successfully",
    });
  } catch (e) {
    next(e);
  } finally {
    await session.endSession();
  }
});

module.exports = router;
