const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/products");
const Cart = require("../models/cart");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, async (req, res, next) => {
  try {
    const { productId } = req.body || {};
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "A valid product is required" });
    }

    const product = await Product.findById(productId).lean();
    if (!product || product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (!Number.isInteger(product.countInStock) || product.countInStock < 1) {
      return res.status(409).json({ message: "Product is out of stock" });
    }

    const updated = await Cart.findOneAndUpdate(
      { user: req.user._id, product: productId, qty: { $lt: product.countInStock } },
      { $inc: { qty: 1 } },
      { new: true, runValidators: true },
    );
    if (updated) return res.json(updated);

    const existing = await Cart.findOne({ user: req.user._id, product: productId });
    if (existing) {
      return res.status(409).json({ message: `Only ${product.countInStock} items available in stock` });
    }

    try {
      const item = await Cart.create({
        user: req.user._id,
        product: productId,
        qty: 1,
      });
      return res.status(201).json(item);
    } catch (error) {
      if (error.code !== 11000) throw error;
      const racedUpdate = await Cart.findOneAndUpdate(
        { user: req.user._id, product: productId, qty: { $lt: product.countInStock } },
        { $inc: { qty: 1 } },
        { new: true, runValidators: true },
      );
      if (!racedUpdate) {
        return res.status(409).json({ message: `Only ${product.countInStock} items available in stock` });
      }
      return res.json(racedUpdate);
    }
  } catch (error) {
    next(error);
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    const cartItems = await Cart.find({ user: req.user._id })
      .populate({ path: "product", match: { isActive: { $ne: false } } })
      .lean();
    res.json(cartItems);
  } catch (error) {
    next(error);
  }
});

router.put("/increment/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Cart item not found" });
    const item = await Cart.findOne({ _id: id, user: req.user._id });
    if (!item) return res.status(404).json({ message: "Cart item not found" });
    const product = await Product.findById(item.product).lean();
    if (!product || product.isActive === false) {
      return res.status(409).json({ message: "Product is no longer available" });
    }

    const updated = await Cart.findOneAndUpdate(
      { _id: id, user: req.user._id, qty: { $lt: product.countInStock } },
      { $inc: { qty: 1 } },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ message: "Requested quantity exceeds available stock" });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.put("/decrement/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Cart item not found" });
    const item = await Cart.findOne({ _id: id, user: req.user._id });
    if (!item) return res.status(404).json({ message: "Cart item not found" });
    if (item.qty === 1) {
      await Cart.deleteOne({ _id: id, user: req.user._id });
      return res.json({ message: "Item removed" });
    }
    const updated = await Cart.findOneAndUpdate(
      { _id: id, user: req.user._id, qty: { $gt: 1 } },
      { $inc: { qty: -1 } },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ message: "Cart item changed; reload and retry" });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    const result = await Cart.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: "Cart item not found" });
    res.json({ message: "Item removed" });
  } catch (error) {
    next(error);
  }
});

router.put("/update/:id", protect, async (req, res, next) => {
  try {
    const { qty } = req.body || {};
    if (!Number.isSafeInteger(qty) || qty < 1) {
      return res.status(400).json({ message: "Quantity must be a positive integer" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const item = await Cart.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: "Cart item not found" });
    const product = await Product.findById(item.product).lean();
    if (!product || product.isActive === false) {
      return res.status(409).json({ message: "Product is no longer available" });
    }
    if (qty > product.countInStock) {
      return res.status(409).json({ message: "Requested quantity exceeds available stock" });
    }

    const updated = await Cart.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { qty } },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ message: "Cart item not found" });
    res.json({ message: "Cart updated successfully", cartItem: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
