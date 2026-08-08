const express = require("express");
const router = express.Router();
const Product = require("../models/products");
const Cart = require("../models/cart");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, async (req, res) => {
  try {
    const { productId } = req.body;

    const existingCartItem = await Cart.findOne({
      user: req.user._id,
      product: productId,
    });

    if (existingCartItem) {
      const product = await Product.findById(productId);

      if (existingCartItem.qty >= product.countInStock) {
        return res.status(400).json({
          message: `Only ${product.countInStock} items available in stock`,
        });
      }

      existingCartItem.qty += 1;

      await existingCartItem.save();

      return res.status(200).json(existingCartItem);
    }

    const cartItem = await Cart.create({
      user: req.user._id,
      product: productId,
      qty: 1,
    });

    res.status(201).json(cartItem);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.get("/", protect, async (req, res) => {
  try {
    const cartItems = await Cart.find({
      user: req.user._id,
    }).populate("product");

    res.json(cartItems);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.put("/increment/:id", protect, async (req, res) => {
  try {
    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json({
        message: "Cart Item Not Found",
      });
    }

    const product = await Product.findById(cartItem.product);

    if (cartItem.qty >= product.countInStock) {
      return res.status(400).json({
        message: `Only ${product.countInStock} items available in stock`,
      });
    }

    cartItem.qty += 1;

    await cartItem.save();

    res.json(cartItem);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.put("/decrement/:id", protect, async (req, res) => {
  try {
    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json({
        message: "Cart Item Not Found",
      });
    }

    if (cartItem.qty === 1) {
      await Cart.findByIdAndDelete(req.params.id);

      return res.json({
        message: "Item Removed",
      });
    }

    cartItem.qty -= 1;

    await cartItem.save();

    res.json(cartItem);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.delete("/:id", protect, async (req, res) => {
  await Cart.findByIdAndDelete(req.params.id);

  res.json({
    message: "Item Removed",
  });
});


router.put("/update/:id", protect, async (req, res) => {
  try {
    const { qty } = req.body;

    if (qty < 1) {
      return res.status(400).json({
        message: "Quantity cannot be less than 1",
      });
    }

    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    cartItem.qty = qty;
    await cartItem.save();

    res.json({
      message: "Cart updated successfully",
      cartItem,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;
