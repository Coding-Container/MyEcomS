const express = require("express");
const router = express.Router();

const Order = require("../models/order");
const Cart = require("../models/cart");
const Address = require("../models/address");
const AuditLog = require("../models/auditLog");
const mongoose = require("mongoose");
const { protect, admin } = require("../middleware/authMiddleware");

const getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [stats] = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
              },
            },
          ],
          products: [
            { $unwind: "$items" },
            {
              $group: {
                _id: { $ifNull: ["$items.product", "$items.name"] },
                name: { $first: "$items.name" },
                sold: { $sum: "$items.qty" },
                revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
              },
            },
            { $sort: { sold: -1 } },
            { $limit: 10 },
          ],
          productCount: [
            { $unwind: "$items" },
            { $group: { _id: null, sold: { $sum: "$items.qty" } } },
          ],
          daily: [{ $match: { createdAt: { $gte: startOfDay, $lte: now } } }, { $count: "count" }],
          weekly: [{ $match: { createdAt: { $gte: weekAgo, $lte: now } } }, { $count: "count" }],
          monthly: [{ $match: { createdAt: { $gte: startOfMonth, $lte: now } } }, { $count: "count" }],
          yearly: [{ $match: { createdAt: { $gte: startOfYear, $lte: now } } }, { $count: "count" }],
          salesTrend: [
            { $match: { createdAt: { $gte: startOfYear, $lte: now } } },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                  day: { $dayOfMonth: "$createdAt" },
                },
                revenue: { $sum: "$totalAmount" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
            {
              $project: {
                _id: 0,
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: {
                      $dateFromParts: {
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day",
                      },
                    },
                    timezone: "UTC",
                  },
                },
                revenue: 1,
              },
            },
          ],
        },
      },
    ]).option({ maxTimeMS: 5000 });
    const totals = stats.totals[0] || {};
    res.json({
      totalOrders: totals.totalOrders || 0,
      totalRevenue: totals.totalRevenue || 0,
      totalProductsSold: stats.productCount[0]?.sold || 0,
      topProducts: stats.products.map(({ _id, ...product }) => ({
        productId: mongoose.isValidObjectId(_id) ? _id.toString() : null,
        ...product,
      })),
      dailyOrders: stats.daily[0]?.count || 0,
      weeklyOrders: stats.weekly[0]?.count || 0,
      monthlyOrders: stats.monthly[0]?.count || 0,
      yearlyOrders: stats.yearly[0]?.count || 0,
      salesTrend: stats.salesTrend,
    });
  } catch (e) {
    next(e);
  }
};

const getGraphAnalytics = async (req, res, next) => {
  try {
    const productSales = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.product", "$items.name"] },
          name: { $first: "$items.name" },
          sold: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 0,
          productId: {
            $cond: [
              { $eq: [{ $type: "$_id" }, "objectId"] },
              { $toString: "$_id" },
              null,
            ],
          },
          name: 1,
          sold: 1,
          revenue: 1,
        },
      },
    ]).option({ maxTimeMS: 5000 });
    res.json(productSales);
  } catch (e) {
    next(e);
  }
};

const getProductTrend = async (req, res, next) => {
  try {
    const { productName, productId } = req.query;
    const year = Number.parseInt(req.query.year, 10);
    if (!Number.isInteger(year) || year < 2000 || year > new Date().getUTCFullYear() + 1) {
      return res.status(400).json({ message: "Invalid year" });
    }
    if (!productName && !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "A product is required" });
    }
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const productMatch = productId
      ? { "items.product": new mongoose.Types.ObjectId(productId) }
      : { "items.name": productName };

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const grouped = await Order.aggregate([
      { $match: { status: "Delivered", createdAt: { $gte: start, $lt: end } } },
      { $unwind: "$items" },
      { $match: productMatch },
      { $group: { _id: { $month: "$createdAt" }, sold: { $sum: "$items.qty" } } },
    ]).option({ maxTimeMS: 3000 });
    const monthlyData = months.map((month, index) => ({
      month,
      sold: grouped.find((row) => row._id === index + 1)?.sold || 0,
    }));
    res.json(monthlyData);
  } catch (e) {
    next(e);
  }
};

router.post("/", protect, async (req, res, next) => {
  return res.status(410).json({
    message: "Direct order creation is disabled. Complete checkout through payment verification.",
  });
});

router.get("/myorders", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admin access only",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const orders = await Order.find({})
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ orders, page, limit });
  } catch (e) {
    next(e);
  }
});
router.get("/analytics", protect, admin, getAnalytics);
router.get("/graphs", protect, admin, getGraphAnalytics);
router.get("/product-trend", protect, admin, getProductTrend);
router.get("/:id", protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Order not found" });
    }
    const query = req.user.isAdmin
      ? Order.findById(req.params.id).populate("user", "username email")
      : Order.findOne({ _id: req.params.id, user: req.user._id });
    const order = await query;

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

router.put("/:id/status", protect, admin, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { status } = req.body || {};

    const allowedStatuses = ["Placed", "Processing", "Shipped", "Delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const validTransitions = {
      Placed: ["Processing"],
      Processing: ["Shipped"],
      Shipped: ["Delivered"],
      Delivered: [],
    };

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`,
      });
    }

    const oldStatus = order.status;
    let updatedOrder;
    await session.withTransaction(async () => {
      updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: oldStatus },
        {
          $set: { status },
          $push: {
            statusHistory: { status, changedBy: req.user._id, changedAt: new Date() },
          },
        },
        { new: true, runValidators: true, session },
      );
      if (updatedOrder) {
        await AuditLog.create(
          [{
            actor: req.user._id,
            role: "admin",
            action: "ORDER_STATUS_UPDATED",
            targetType: "order",
            targetId: updatedOrder._id.toString(),
            target: `${oldStatus} -> ${status}`,
          }],
          { session },
        );
      }
    });
    if (!updatedOrder) {
      return res.status(409).json({ message: "Order status changed; reload and retry" });
    }

    res.json(updatedOrder);
  } catch (e) {
    next(e);
  } finally {
    await session.endSession();
  }
});

module.exports = router;
