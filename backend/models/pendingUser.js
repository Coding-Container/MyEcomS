const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    otpExpiresAt: {
      type: Date,
      required: true,
    },

    resendCount: {
      type: Number,
      default: 0,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

pendingUserSchema.index({ email: 1 }, { unique: true });
pendingUserSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.PendingUser ||
  mongoose.model(
    "PendingUser",
    pendingUserSchema
  );