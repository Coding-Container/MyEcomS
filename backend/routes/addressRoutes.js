const express = require("express");
const router = express.Router();

const Address = require("../models/address");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, async (req, res) => {
  try {
    const {
      label,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
    } = req.body;

    const existingAddresses = await Address.countDocuments({
      user: req.user._id,
    });

    const address = await Address.create({
      user: req.user._id,
      label,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      isDefault: existingAddresses === 0,
    });

    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const addresses = await Address.find({
      user: req.user._id,
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json(addresses);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.put("/default/:id", protect, async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    await Address.updateMany({ user: req.user._id }, { isDefault: false });

    address.isDefault = true;

    await address.save();

    res.json(address);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    await Address.findByIdAndDelete(req.params.id);

    res.json({
      message: "Address deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
