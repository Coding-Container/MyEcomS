const express = require("express");
const router = express.Router();

const Order = require("../models/order");
const Cart = require("../models/cart");
const Address = require("../models/address");
const AuditLog = require("../models/auditLog");
const { protect, admin } = require("../middleware/authMiddleware");

const getAnalytics = async (req, res, next) => {
  try {
    const deliveredOrders = await Order.find({
      status: "Delivered",
    })
      .select("items totalAmount createdAt")
      .lean();

    const totalOrders = deliveredOrders.length;

    const totalRevenue = deliveredOrders.reduce(
      (acc, order) => acc + order.totalAmount,
      0,
    );

    const productStats = {};

    deliveredOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            sold: 0,
            revenue: 0,
          };
        }

        productStats[item.name].sold += item.qty;

        productStats[item.name].revenue += item.qty * item.price;
      });
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({
        name,
        sold: stats.sold,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.sold - a.sold);

    const totalProductsSold = topProducts.reduce(
      (acc, product) => acc + product.sold,
      0,
    );
    const now = new Date();

    const dailyOrders = deliveredOrders.filter(
      (order) =>
        new Date(order.createdAt).toDateString() === now.toDateString(),
    ).length;

    const weeklyOrders = deliveredOrders.filter((order) => {
      const diff = (now - new Date(order.createdAt)) / (1000 * 60 * 60 * 24);

      return diff <= 7;
    }).length;

    const monthlyOrders = deliveredOrders.filter((order) => {
      const date = new Date(order.createdAt);

      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    const yearlyOrders = deliveredOrders.filter((order) => {
      const date = new Date(order.createdAt);

      return date.getFullYear() === now.getFullYear();
    }).length;

    const salesTrend = deliveredOrders.map((order) => ({
      date: new Date(order.createdAt).toLocaleDateString(),

      revenue: order.totalAmount,
    }));

    res.status(200).json({
      totalOrders,
      totalRevenue,
      totalProductsSold,
      topProducts,
      dailyOrders,
      weeklyOrders,
      monthlyOrders,
      yearlyOrders,

      salesTrend,
    });
  } catch (e) {
    next(e);
  }
};

const getGraphAnalytics = async (req, res, next) => {
  try {
    const deliveredOrders = await Order.find({
      status: "Delivered",
    })
      .select("items")
      .lean();

    const productStats = {};

    deliveredOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            sold: 0,
            revenue: 0,
          };
        }

        productStats[item.name].sold += item.qty;
        productStats[item.name].revenue += item.qty * item.price;
      });
    });

    const productSales = Object.entries(productStats).map(([name, stats]) => ({
      name,
      sold: stats.sold,
      revenue: stats.revenue,
    }));

    res.status(200).json(productSales);
  } catch (e) {
    next(e);
  }
};

const getProductTrend = async (req, res, next) => {
  try {
    const { productName, year } = req.query;

    const deliveredOrders = await Order.find({
      status: "Delivered",
    })
      .select("items createdAt")
      .lean();

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

    const monthlyData = months.map((month) => ({
      month,
      sold: 0,
    }));

    deliveredOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);

      if (orderDate.getFullYear() !== Number(year)) {
        return;
      }

      order.items.forEach((item) => {
        if (item.name === productName) {
          monthlyData[orderDate.getMonth()].sold += item.qty;
        }
      });
    });

    res.status(200).json(monthlyData);
  } catch (e) {
    next(e);
  }
};

router.post("/", protect, async (req, res, next) => {
  try {
    const { items, totalAmount, addressId } = req.body;
    const address = await Address.findById(addressId);

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items found" });
    }

    const Product = require("../models/products");

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (item.qty > product.countInStock) {
        return res.status(400).json({
          message: `${product.name} is out of stock. Only ${product.countInStock} left.`,
        });
      }
    }

    for (let item of items) {
      try {
        if (!item.product) continue;

        const product = await Product.findById(item.product);
        if (!product) continue;

        product.countInStock = Math.max(0, product.countInStock - item.qty);

        await product.save();
      } catch (e) {
        next(e);
      }
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      totalAmount,

      shippingAddress: {
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
    });

    await AuditLog.create({
      admin: req.user._id,
      action: "ORDER_CREATED",
      target: order._id.toString(),
    });

    await Cart.deleteMany({ user: req.user._id });

    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

router.get("/myorders", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(401).json({
        message: "Admin access only",
      });
    }

    const orders = await Order.find({})
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (e) {
    next(e);
  }
});
router.get("/analytics", protect, admin, getAnalytics);
router.get("/graphs", protect, admin, getGraphAnalytics);
router.get("/product-trend", protect, admin, getProductTrend);
router.get("/:id", protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "username email",
    );

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
  try {
    const { status } = req.body;

    const allowedStatuses = ["Placed", "Processing", "Shipped", "Delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const validTransitions = {
      Placed: ["Processing"],
      Processing: ["Shipped"],
      Shipped: ["Delivered"],
      Delivered: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`,
      });
    }

    const oldStatus = order.status;

    order.status = status;

    const updatedOrder = await order.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "ORDER_STATUS_UPDATED",
      target: `${oldStatus} → ${status}`,
    });

    res.json(updatedOrder);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
