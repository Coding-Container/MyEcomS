const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
mongoose.set("autoIndex", false);

const User = require("../models/user");

const createAdmin = async () => {
  const required = ["MONGO_URI", "ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_MOBILE"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required admin seeding variables: ${missing.join(", ")}`);
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(process.env.ADMIN_USERNAME)) {
    throw new Error("ADMIN_USERNAME must be 3-20 letters, digits, or underscores");
  }
  if (process.env.ADMIN_PASSWORD.length < 10 || process.env.ADMIN_PASSWORD.length > 128) {
    throw new Error("ADMIN_PASSWORD must be 10 to 128 characters");
  }
  if (!/^\+91[6-9]\d{9}$/.test(process.env.ADMIN_MOBILE)) {
    throw new Error("ADMIN_MOBILE must be a valid +91 mobile number");
  }

  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const username = process.env.ADMIN_USERNAME.trim();
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    if (!existing.isAdmin) {
      throw new Error("Configured admin identity already belongs to a non-admin user");
    }
    console.log("Admin account already exists");
    return;
  }

  await User.create({
    username,
    email,
    mobile: process.env.ADMIN_MOBILE,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    isAdmin: true,
  });
  console.log("Admin account created");
};

createAdmin()
  .catch((error) => {
    console.error("Admin seeding failed", { message: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
