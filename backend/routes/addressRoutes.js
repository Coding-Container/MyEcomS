const express = require("express");
const mongoose = require("mongoose");
const Address = require("../models/address");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const requiredAddressFields = [
  "fullName",
  "phone",
  "addressLine1",
  "city",
  "state",
  "pincode",
];

router.post("/", protect, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = req.body || {};
    if (
      requiredAddressFields.some(
        (field) => typeof data[field] !== "string" || !data[field].trim(),
      ) ||
      data.fullName.length > 100 ||
      data.addressLine1.length > 200 ||
      (data.addressLine2 && (typeof data.addressLine2 !== "string" || data.addressLine2.length > 200)) ||
      data.phone.length > 20 ||
      data.city.length > 100 ||
      data.state.length > 100 ||
      !/^\+?[0-9]{10,15}$/.test(data.phone) ||
      !/^\d{6}$/.test(data.pincode) ||
      !["Home", "Work", "Other"].includes(data.label || "Home")
    ) {
      return res.status(400).json({ message: "Invalid address details" });
    }

    let address;
    await session.withTransaction(async () => {
      const hasAddresses = await Address.exists({ user: req.user._id }).session(session);
      [address] = await Address.create(
        [
          {
            ...Object.fromEntries(
              [...requiredAddressFields, "addressLine2", "label"].map((key) => [
                key,
                data[key] || (key === "label" ? "Home" : ""),
              ]),
            ),
            user: req.user._id,
            isDefault: !hasAddresses,
          },
        ],
        { session },
      );
    });
    res.status(201).json(address);
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    res.json(addresses);
  } catch (error) {
    next(error);
  }
});

router.put("/default/:id", protect, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Address not found" });
    }
    let address;
    await session.withTransaction(async () => {
      address = await Address.findOne({
        _id: req.params.id,
        user: req.user._id,
      }).session(session);
      if (!address) return;
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: address._id } },
        { $set: { isDefault: false } },
        { session },
      );
      address.isDefault = true;
      await address.save({ session });
    });
    if (!address) return res.status(404).json({ message: "Address not found" });
    res.json(address);
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
});

router.delete("/:id", protect, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Address not found" });
    }
    let deleted;
    await session.withTransaction(async () => {
      const address = await Address.findOne({
        _id: req.params.id,
        user: req.user._id,
      }).session(session);
      if (!address) return;

      const result = await Address.deleteOne(
        { _id: address._id, user: req.user._id },
        { session },
      );
      deleted = result.deletedCount > 0;
      if (deleted && address.isDefault) {
        const replacement = await Address.findOne({ user: req.user._id })
          .sort({ createdAt: 1 })
          .session(session);
        if (replacement) {
          replacement.isDefault = true;
          await replacement.save({ session });
        }
      }
    });
    if (!deleted) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Address deleted" });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
});

module.exports = router;
