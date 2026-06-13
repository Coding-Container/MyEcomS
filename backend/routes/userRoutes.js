const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const PendingUser = require("../models/pendingUser");
const sendOtpEmail = require("../utils/sendEmail");
const sendEmail = require("../utils/sendEmail");
const { loginLimiter, otpLimiter } = require("../middleware/rateLimiter");

router.post("/signup", otpLimiter, async (req, res, next) => {
  try {
    const { username, password, email, mobile } = req.body;

    if (!username || !email || !password || !mobile) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message: "Invalid username",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    const mobileRegex = /^\+91[6-9]\d{9}$/;

    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        message: "Invalid mobile number",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password too short",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or Email already exists",
      });
    }

    await PendingUser.deleteMany({
      email,
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await PendingUser.create({
      username,
      email,
      mobile,
      password: hashedPassword,
      otp,
      otpExpiresAt: new Date(Date.now() + 60000),
    });

    await sendEmail(
      email,
      "Verify Your MyEcoms Account",
      `
  <div>
    <h2>MyEcoms Verification</h2>
    <h1>${otp}</h1>
    <p>Valid for 1 minute</p>
  </div>
  `,
    );

    res.status(200).json({
      message: "OTP sent successfully",
      email,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const pendingUser = await PendingUser.findOne({
      email,
    });

    if (!pendingUser) {
      return res.status(400).json({
        message: "Verification expired",
      });
    }

    if (pendingUser.otpExpiresAt < new Date()) {
      await PendingUser.deleteOne({
        _id: pendingUser._id,
      });

      return res.status(400).json({
        message: "OTP expired",
      });
    }

    if (pendingUser.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const newUser = new User({
      username: pendingUser.username,
      email: pendingUser.email,
      mobile: pendingUser.mobile,
      password: pendingUser.password,
    });

    await newUser.save();

    await PendingUser.deleteOne({
      _id: pendingUser._id,
    });

    res.status(201).json({
      message: "Account created successfully",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/resend-otp", otpLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    const pendingUser = await PendingUser.findOne({
      email,
    });

    if (!pendingUser) {
      return res.status(400).json({
        message: "Signup expired",
      });
    }

    if (pendingUser.resendCount >= 2) {
      return res.status(400).json({
        message: "Maximum resend limit reached",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    pendingUser.otp = otp;

    pendingUser.resendCount += 1;

    pendingUser.otpExpiresAt = new Date(Date.now() + 60000);

    await pendingUser.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({
      message: "OTP resent",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });
    if (!user) {
      return res.status(401).json("Invalid User");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json("Invalid Password");
    }
    if (user && isPasswordValid) {
      const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );
      res.status(200).json({
        message: "Login Successful",
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token,
      });
    } else {
      res.status(401).json({ message: "Invalid Credentials" });
    }
  } catch (e) {
    next(e);
  }
});

router.post("/forgot-password", otpLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "Email not registered",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;

    user.resetOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.resetOtpAttempts = 0;

    await user.save();

    await sendEmail(
      user.email,
      "Password Reset OTP",
      `
  <div>
    <h2>Password Reset</h2>
    <h1>${otp}</h1>
    <p>Use this OTP to reset your password.</p>
    <p>Valid for 5 minutes.</p>
  </div>
  `,
    );

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/verify-reset-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.resetOtpAttempts >= 5) {
      user.resetOtp = undefined;
      user.resetOtpExpiry = undefined;

      await user.save();

      return res.status(400).json({
        message: "OTP blocked. Request new OTP",
      });
    }

    if (!user.resetOtp) {
      return res.status(400).json({
        message: "No OTP found",
      });
    }

    if (user.resetOtpExpiry < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    if (user.resetOtp !== otp) {
      user.resetOtpAttempts += 1;

      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    res.status(200).json({
      message: "OTP verified",
    });
    user.passwordResetVerified = true;

    await user.save();
  } catch (e) {
    next(e);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.passwordResetVerified) {
      return res.status(400).json({
        message: "OTP verification required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.resetOtpAttempts = 0;

    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
    });
    user.passwordResetVerified = false;

    await user.save();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
