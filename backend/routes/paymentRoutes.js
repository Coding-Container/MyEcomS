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
const WebhookEvent = require("../models/webhookEvent");
const { protect } = require("../middleware/authMiddleware");
const {
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} = require("../utils/paymentSecurity");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const retryStockRefund = async (intent) => {
  const paymentId = intent.paymentId;
  const intentId = intent._id.toString();
  await PaymentIntent.updateOne(
    { _id: intent._id, status: { $in: ["pending", "failed", "expired", "refund_pending"] } },
    { $set: { status: "refund_pending", paymentId } },
  );

  const existingRefunds = await razorpay.refunds.all({ payment_id: paymentId });
  const refunds = Array.isArray(existingRefunds.items) ? existingRefunds.items : [];
  const existingRefund = refunds.find(
    (refund) => refund.notes && refund.notes.checkout_intent_id === intentId,
  );
  if (existingRefund && existingRefund.status !== "failed") {
    const refunded = existingRefund.status === "processed";
    await PaymentIntent.updateOne(
      { _id: intent._id, status: "refund_pending" },
      {
        $set: {
          status: refunded ? "refunded" : "refund_pending",
          refundId: existingRefund.id,
        },
      },
    );
    return { refunded, refundId: existingRefund.id };
  }

  const claimed = await PaymentIntent.findOneAndUpdate(
    {
      _id: intent._id,
      status: "refund_pending",
      $or: [
        { refundRequestedAt: { $exists: false } },
        { refundRequestedAt: { $lt: new Date(Date.now() - 60 * 1000) } },
      ],
    },
    { $set: { refundRequestedAt: new Date() } },
    { new: true },
  );
  if (!claimed) return { refunded: false };

  const refund = await razorpay.payments.refund(paymentId, {
    notes: {
      reason: "Inventory unavailable during checkout",
      checkout_intent_id: intentId,
    },
  });
  const refunded = refund.status === "processed";
  await PaymentIntent.updateOne(
    { _id: intent._id, status: "refund_pending" },
    {
      $set: {
        status: refunded ? "refunded" : "refund_pending",
        refundId: refund.id,
      },
    },
  );
  return { refunded, refundId: refund.id };
};

const retryStockRefundSafely = async (intent) => {
  try {
    return await retryStockRefund(intent);
  } catch (error) {
    console.error("Payment refund could not be confirmed", {
      orderId: intent.razorpayOrderId,
      paymentId: intent.paymentId,
      error: error.name,
    });
    error.statusCode = 502;
    throw error;
  }
};

const reconcileCapturedPayment = async ({ orderId, paymentId, userId, actorRole, payment }) => {
  const intentQuery = { razorpayOrderId: orderId };
  if (userId) intentQuery.user = userId;
  const intent = await PaymentIntent.findOne(intentQuery);
  if (!intent) {
    const error = new Error("Checkout not found");
    error.statusCode = 404;
    throw error;
  }

  const existingOrder = await Order.findOne({ paymentIntent: intent._id });
  if (existingOrder) return { order: existingOrder };

  if (
    payment.order_id !== orderId ||
    payment.id !== paymentId ||
    payment.status !== "captured" ||
    payment.amount !== intent.amountPaise ||
    payment.currency !== intent.currency
  ) {
    const error = new Error("Captured payment does not match checkout");
    error.statusCode = 400;
    throw error;
  }

  if (intent.status === "expired") {
    await PaymentIntent.updateOne(
      { _id: intent._id, status: "expired" },
      { $set: { status: "refund_pending", paymentId } },
    );
    return {
      refundPending: true,
      ...(await retryStockRefundSafely({ ...intent.toObject(), paymentId })),
    };
  }
  if (intent.status === "refund_pending") {
    return { refundPending: true, ...(await retryStockRefundSafely(intent)) };
  }
  if (!["pending", "failed"].includes(intent.status)) {
    const error = new Error("This checkout is no longer available");
    error.statusCode = 409;
    throw error;
  }

  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const currentIntent = await PaymentIntent.findOneAndUpdate(
        { _id: intent._id, status: { $in: ["pending", "failed"] } },
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
            user: currentIntent.user,
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
            statusHistory: [{ status: "Placed", changedBy: currentIntent.user }],
          },
        ],
        { session },
      );
      order = createdOrder;

      await Cart.deleteMany({
        user: currentIntent.user,
        $or: currentIntent.items.map((item) => ({
          product: item.product,
          qty: item.qty,
        })),
      }).session(session);

      await AuditLog.create(
        [{
          actor: currentIntent.user,
          role: actorRole || "customer",
          action: "ORDER_CREATED",
          target: createdOrder._id.toString(),
        }],
        { session },
      );
      await PaymentIntent.updateOne(
        { _id: currentIntent._id, status: "paid" },
        { $set: { status: "reconciled" } },
        { session },
      );
    });
    return { order };
  } catch (error) {
    if (error.statusCode === 409) {
      await PaymentIntent.updateOne(
        { _id: intent._id, status: { $in: ["pending", "failed", "paid"] } },
        { $set: { status: "refund_pending", paymentId } },
      );
      return {
        refundPending: true,
        ...(await retryStockRefundSafely({ ...intent.toObject(), paymentId })),
      };
    }
    if (error.code === 11000) {
      const duplicateOrder = await Order.findOne({ paymentIntent: intent._id });
      if (duplicateOrder) return { order: duplicateOrder };
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const processWebhook = async (body) => {
  const payment = body.payload && body.payload.payment && body.payload.payment.entity;
  if (body.event === "payment.captured" || body.event === "order.paid") {
    if (!payment || typeof payment.order_id !== "string" || typeof payment.id !== "string") {
      throw new Error("Captured payment webhook is missing payment details");
    }
    const fetchedPayment = await razorpay.payments.fetch(payment.id);
    return reconcileCapturedPayment({
      orderId: payment.order_id,
      paymentId: payment.id,
      payment: fetchedPayment,
    });
  }

  if (body.event === "payment.failed" && payment && payment.order_id) {
    await PaymentIntent.updateOne(
      { razorpayOrderId: payment.order_id, status: "pending" },
      { $set: { status: "failed", paymentId: payment.id } },
    );
  } else if (body.event === "order.expired" && body.payload && body.payload.order) {
    const order = body.payload.order.entity;
    if (order && order.id) {
      await PaymentIntent.updateOne(
        { razorpayOrderId: order.id, status: "pending" },
        { $set: { status: "expired" } },
      );
    }
  } else if (body.event === "refund.processed" && body.payload && body.payload.refund) {
    const refund = body.payload.refund.entity;
    if (refund && refund.payment_id) {
      await PaymentIntent.updateOne(
        { paymentId: refund.payment_id, status: "refund_pending" },
        { $set: { status: "refunded", refundId: refund.id } },
      );
    }
  } else if (body.event === "refund.failed" && body.payload && body.payload.refund) {
    const refund = body.payload.refund.entity;
    if (refund && refund.payment_id) {
      const intent = await PaymentIntent.findOne({
        paymentId: refund.payment_id,
        status: "refund_pending",
      });
      if (intent) {
        await PaymentIntent.updateOne(
          { _id: intent._id, status: "refund_pending" },
          { $unset: { refundId: 1, refundRequestedAt: 1 } },
        );
        await retryStockRefundSafely(intent);
      }
    }
  }
};

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

  try {
    const intent = await PaymentIntent.findOne({
      razorpayOrderId: orderId,
      user: req.user._id,
    });
    if (!intent) {
      return res.status(404).json({ message: "Checkout not found" });
    }
    const existingOrder = await Order.findOne({ paymentIntent: intent._id });
    if (existingOrder) return res.json(existingOrder);
    if (["failed", "expired", "refunded"].includes(intent.status)) {
      return res.status(409).json({ message: "This checkout is no longer available" });
    }
    const payment = await razorpay.payments.fetch(paymentId);
    const result = await reconcileCapturedPayment({
      orderId,
      paymentId,
      userId: req.user._id,
      actorRole: req.user.isAdmin ? "admin" : "customer",
      payment,
    });
    if (result.order) return res.status(201).json(result.order);
    if (result.refundPending) {
      return res.status(result.refunded ? 409 : 502).json({
        message: result.refunded
          ? "The item became unavailable. A refund has been initiated."
          : "Payment succeeded but refund confirmation is pending. Contact support with your payment reference.",
      });
    }
    return res.status(409).json({ message: "Payment reconciliation is pending" });
  } catch (error) {
    if (error.statusCode) {
      if (error.statusCode === 502) {
        return res.status(502).json({
          message: "Payment succeeded but refund confirmation is pending. Contact support with your payment reference.",
        });
      }
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Payment reconciliation failed", {
      orderId,
      paymentId,
      error: error.name,
    });
    return next(error);
  }
});

router.post("/webhook", async (req, res) => {
  const signature = req.get("x-razorpay-signature");
  const eventId = req.get("x-razorpay-event-id");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ message: "Payment webhook is not configured" });
  }
  if (
    !verifyRazorpayWebhookSignature(req.body, signature, secret) ||
    typeof eventId !== "string" ||
    !eventId.length ||
    eventId.length > 255
  ) {
    return res.status(400).json({ message: "Invalid payment webhook signature or event ID" });
  }

  let body;
  try {
    body = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ message: "Invalid payment webhook payload" });
  }
  if (!body || typeof body !== "object" || typeof body.event !== "string" || !body.event) {
    return res.status(400).json({ message: "Invalid payment webhook event" });
  }

  let event;
  try {
    event = await WebhookEvent.create({
      eventId,
      event: body.event,
      status: "processing",
    });
  } catch (error) {
    if (error.code !== 11000) {
      console.error("Payment webhook could not be recorded", { error: error.name });
      return res.status(500).json({ message: "Payment webhook could not be recorded" });
    }

    const previous = await WebhookEvent.findOne({ eventId });
    if (!previous || previous.event !== body.event) {
      return res.status(400).json({ message: "Payment webhook event ID conflict" });
    }
    if (previous.status === "processed") return res.status(200).json({ received: true });

    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    event = await WebhookEvent.findOneAndUpdate(
      {
        eventId,
        $or: [
          { status: "failed" },
          { status: "processing", updatedAt: { $lt: staleBefore } },
        ],
      },
      { $set: { status: "processing" } },
      { new: true },
    );
    if (!event) return res.status(200).json({ received: true });
  }

  try {
    const result = await processWebhook(body);
    if (result && result.refundPending && !result.refunded && !result.refundId) {
      throw new Error("Stock-shortage refund is already being retried");
    }
    await WebhookEvent.updateOne({ _id: event._id }, { $set: { status: "processed" } });
    return res.status(200).json({ received: true });
  } catch (error) {
    await WebhookEvent.updateOne({ _id: event._id }, { $set: { status: "failed" } });
    console.error("Payment webhook processing failed", {
      eventId,
      event: body.event,
      error: error.name,
    });
    return res.status(500).json({ message: "Payment webhook processing failed" });
  }
});

module.exports = router;
