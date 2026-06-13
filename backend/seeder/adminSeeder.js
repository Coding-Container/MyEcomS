const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

require("dotenv").config({ path: "../.env" });

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const isAdminExist = await User.findOne({
      $or: [
        { username: process.env.ADMIN_USERNAME },
        { email: process.env.ADMIN_EMAIL },
      ],
    });

    if (isAdminExist) {
      process.exit();
    }
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await User.create({
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      isAdmin: true,
    });

    await mongoose.disconnect();
    process.exit();
  } catch (e) {}
};

createAdmin();
