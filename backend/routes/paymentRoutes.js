const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Address = require("../models/address");
const AuditLog = require("../models/auditLog");
const Cart = require("../models/cart");
const Order = require("../models/order");
const PaymentIntent = require("../models/paymentIntent");
const Product = require("../models/products");
const { protect } = require("../middleware/authMiddleware");
const { verifyRazorpaySignature } = require("../utils/paymentSecurity");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

router.post("/create-order", protect, async (req, res, next) => {
  try {
    const { addressId } = req.body || {};
    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "A valid address is required" });
    }

    const [address, cartItems] = await Promise.all([
      Address.findOne({ _id: addressId, user: req.user._id }).lean(),
      Cart.find({ user: req.user._id }).lean(),
    ]);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    if (!cartItems.length || cartItems.length > 50) {
      return res.status(400).json({ message: "Cart is empty or too large" });
    }

    const quantities = new Map();
    for (const cartItem of cartItems) {
      if (!Number.isSafeInteger(cartItem.qty) || cartItem.qty < 1) {
        return res.status(400).json({ message: "Invalid cart quantity" });
      }
      const key = cartItem.product.toString();
      quantities.set(key, (quantities.get(key) || 0) + cartItem.qty);
    }

    const products = await Product.find({
      _id: { $in: [...quantities.keys()] },
      isActive: { $ne: false },
    }).lean();
    const productById = new Map(products.map((product) => [product._id.toString(), product]));

    const items = [];
    for (const [productId, qty] of quantities) {
      const product = productById.get(productId);
      if (!product) {
        return res.status(400).json({ message: "A cart product is no longer available" });
      }
      if (qty > product.countInStock) {
        return res.status(409).json({ message: `${product.name} has insufficient stock` });
      }
      const pricePaise = toPaise(product.price);
      if (!Number.isSafeInteger(pricePaise) || pricePaise < 1) {
        return res.status(400).json({ message: "A cart product has an invalid price" });
      }
      items.push({
        product: product._id,
        name: product.name,
        pricePaise,
        imageUrl: product.imageUrl,
        qty,
      });
    }

    const amountPaise = items.reduce((total, item) => total + item.pricePaise * item.qty, 0);
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) {
      return res.status(400).json({ message: "Invalid checkout amount" });
    }

    const gatewayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: crypto.randomUUID(),
    });

    await PaymentIntent.create({
      user: req.user._id,
      razorpayOrderId: gatewayOrder.id,
      amountPaise,
      currency: "INR",
      address: {
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      items,
    });

    res.status(201).json({
      id: gatewayOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", protect, async (req, res, next) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};
  if (
    ![orderId, paymentId].every((value) => typeof value === "string" && value.length <= 100) ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return res.status(400).json({ message: "Payment verification data is required" });
  }

  if (
    !verifyRazorpaySignature(
      orderId,
      paymentId,
      signature,
      process.env.RAZORPAY_KEY_SECRET,
    )
  ) {
    return res.status(400).json({ message: "Payment signature is invalid" });
  }

  const session = await mongoose.startSession();
  try {
    const intent = await PaymentIntent.findOne({
      razorpayOrderId: orderId,
      user: req.user._id,
    });
    if (!intent) {
      return res.status(404).json({ message: "Checkout not found" });
    }
    if (intent.status === "paid") {
      const existingOrder = await Order.findOne({ paymentIntent: intent._id });
      if (existingOrder) return res.json(existingOrder);
      return res.status(409).json({ message: "Payment is already being processed" });
    }
    if (intent.status !== "pending") {
      return res.status(409).json({ message: "This checkout is no longer available" });
    }

    const payment = await razorpay.payments.fetch(paymentId);
    if (
      payment.order_id !== orderId ||
      payment.status !== "captured" ||
      payment.amount !== intent.amountPaise ||
      payment.currency !== intent.currency
    ) {
      return res.status(400).json({ message: "Captured payment does not match checkout" });
    }

    let order;
    await session.withTransaction(async () => {
      const currentIntent = await PaymentIntent.findOneAndUpdate(
        { _id: intent._id, user: req.user._id, status: "pending" },
        { $set: { status: "paid", paymentId } },
        { new: true, session },
      );
      if (!currentIntent) {
        order = await Order.findOne({ paymentIntent: intent._id }).session(session);
        if (!order) throw new Error("Checkout was concurrently updated");
        return;
      }

      const inventory = await Product.bulkWrite(
        currentIntent.items.map((item) => ({
          updateOne: {
            filter: { _id: item.product, countInStock: { $gte: item.qty } },
            update: { $inc: { countInStock: -item.qty } },
          },
        })),
        { session },
      );
      if (inventory.modifiedCount !== currentIntent.items.length) {
        const error = new Error("One or more items no longer have sufficient stock");
        error.statusCode = 409;
        throw error;
      }

      const [createdOrder] = await Order.create(
        [
          {
            user: req.user._id,
            paymentIntent: currentIntent._id,
            paymentId,
            paymentStatus: "paid",
            items: currentIntent.items.map((item) => ({
              product: item.product,
              name: item.name,
              price: item.pricePaise / 100,
              qty: item.qty,
              imageUrl: item.imageUrl,
            })),
            totalAmount: currentIntent.amountPaise / 100,
            shippingAddress: currentIntent.address,
            statusHistory: [{ status: "Placed", changedBy: req.user._id }],
          },
        ],
        { session },
      );
      order = createdOrder;

      await Cart.deleteMany({
        user: req.user._id,
        $or: currentIntent.items.map((item) => ({
          product: item.product,
          qty: item.qty,
        })),
      }).session(session);

      await AuditLog.create(
        [{
          actor: req.user._id,
          role: req.user.isAdmin ? "admin" : "customer",
          action: "ORDER_CREATED",
          target: createdOrder._id.toString(),
        }],
        { session },
      );
    });

    return res.status(201).json(order);
  } catch (error) {
    if (error.statusCode === 409 && paymentId) {
      try {
        await PaymentIntent.updateOne(
          { razorpayOrderId: orderId, user: req.user._id, status: "pending" },
          { $set: { status: "refund_pending", paymentId } },
        );
        await razorpay.payments.refund(paymentId, {
          notes: { reason: "Inventory unavailable during checkout" },
        });
        await PaymentIntent.updateOne(
          { razorpayOrderId: orderId, paymentId, status: "refund_pending" },
          { $set: { status: "refunded" } },
        );
        return res.status(409).json({
          message: "The item became unavailable. A refund has been initiated.",
        });
      } catch (refundError) {
        console.error("Payment refund could not be confirmed", {
          orderId,
          paymentId,
          error: refundError.name,
        });
        return res.status(502).json({
          message: "Payment succeeded but refund confirmation is pending. Contact support with your payment reference.",
        });
      }
    }
    if (error.code === 11000) {
      const duplicateOrder = await Order.findOne({ paymentId });
      if (duplicateOrder && duplicateOrder.user.equals(req.user._id)) {
        return res.json(duplicateOrder);
      }
    }
    return next(error);
  } finally {
    await session.endSession();
  }
});

module.exports = router;
