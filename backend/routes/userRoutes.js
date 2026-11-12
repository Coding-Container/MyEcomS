const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");
const PendingUser = require("../models/pendingUser");
const ResetGrant = require("../models/resetGrant");
const sendEmail = require("../utils/sendEmail");
const { loginLimiter, otpLimiter } = require("../middleware/rateLimiter");

const router = express.Router();
const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";
const otpHash = (email, otp) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${email}:${otp}`)
    .digest("hex");
const hashGrant = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const createOtp = () => crypto.randomInt(100000, 1000000).toString();
const validPassword = (password) =>
  typeof password === "string" && password.length >= 10 && password.length <= 128;
const otpEmailHtml = (heading, otp, minutes) => `
  <div>
    <h2>${heading}</h2>
    <h1>${otp}</h1>
    <p>Valid for ${minutes} minutes.</p>
  </div>
`;

router.post("/signup", otpLimiter, async (req, res, next) => {
  try {
    const { username, password, mobile } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!username || !email || !password || !mobile) {
      return res.status(400).json({ message: "All fields required" });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ message: "Invalid username" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }
    if (!/^\+91[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number" });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ message: "Password must be 10 to 128 characters" });
    }
    if (await User.exists({ $or: [{ username }, { email }] })) {
      return res.status(409).json({ message: "Username or Email already exists" });
    }

    const otp = createOtp();
    const hashedPassword = await bcrypt.hash(password, 12);
    await PendingUser.findOneAndUpdate(
      { email },
      {
        $set: {
          username,
          email,
          mobile,
          password: hashedPassword,
          otpHash: otpHash(email, otp),
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          resendCount: 0,
          otpAttempts: 0,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await sendEmail(
      email,
      "Verify Your MyEcoms Account",
      otpEmailHtml("MyEcoms Verification", otp, 5),
    );
    res.status(200).json({ message: "OTP sent successfully", email });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", otpLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp;
    if (!email || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const pendingUser = await PendingUser.findOneAndDelete({
      email,
      otpHash: otpHash(email, otp),
      otpExpiresAt: { $gt: new Date() },
      otpAttempts: { $lt: 5 },
    });
    if (!pendingUser) {
      const current = await PendingUser.findOne({
        email,
        otpExpiresAt: { $gt: new Date() },
        otpAttempts: { $lt: 5 },
      }).select("_id otpHash");
      if (current) {
        await PendingUser.updateOne(
          { _id: current._id, otpHash: current.otpHash, otpAttempts: { $lt: 5 } },
          { $inc: { otpAttempts: 1 } },
        );
      }
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    await User.create({
      username: pendingUser.username,
      email: pendingUser.email,
      mobile: pendingUser.mobile,
      password: pendingUser.password,
    });
    res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/resend-otp", otpLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: "Invalid request" });

    const otp = createOtp();
    const pendingUser = await PendingUser.findOneAndUpdate(
      { email, resendCount: { $lt: 2 }, otpExpiresAt: { $gt: new Date() } },
      {
        $set: {
          otpHash: otpHash(email, otp),
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          otpAttempts: 0,
        },
        $inc: { resendCount: 1 },
      },
      { new: true },
    );
    if (!pendingUser) {
      return res.status(400).json({ message: "Signup expired or resend limit reached" });
    }

    await sendEmail(
      email,
      "Verify Your MyEcoms Account",
      otpEmailHtml("MyEcoms Verification", otp, 5),
    );
    res.json({ message: "OTP resent" });
  } catch (error) {
    next(error);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const user = email ? await User.findOne({ email }) : null;
    const isPasswordValid =
      user && typeof password === "string"
        ? await bcrypt.compare(password, user.password)
        : false;
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "1h",
        issuer: "myecoms-api",
        audience: "myecoms-web",
      },
    );
    res.json({
      message: "Login Successful",
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", otpLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const genericResponse = { message: "If the account exists, a reset code has been sent" };
    const user = email ? await User.findOne({ email }) : null;
    if (user) {
      const otp = createOtp();
      user.resetOtpHash = otpHash(email, otp);
      user.resetOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.resetOtpAttempts = 0;
      await user.save();
      await sendEmail(
        email,
        "Password Reset OTP",
        otpEmailHtml("Password Reset", otp, 5),
      );
    }
    res.json(genericResponse);
  } catch (error) {
    next(error);
  }
});

router.post("/verify-reset-otp", otpLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp;
    if (!email || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const user = await User.findOneAndUpdate(
      {
        email,
        resetOtpHash: otpHash(email, otp),
        resetOtpExpiry: { $gt: new Date() },
        resetOtpAttempts: { $lt: 5 },
      },
      {
        $unset: { resetOtpHash: 1, resetOtpExpiry: 1 },
        $set: { resetOtpAttempts: 0 },
      },
      { new: true },
    );
    if (!user) {
      await User.updateOne(
        {
          email,
          resetOtpExpiry: { $gt: new Date() },
          resetOtpAttempts: { $lt: 5 },
        },
        { $inc: { resetOtpAttempts: 1 } },
      );
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await ResetGrant.deleteMany({ user: user._id });
    await ResetGrant.create({
      user: user._id,
      tokenHash: hashGrant(resetToken),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    if (
      process.env.NODE_ENV !== "production" &&
      process.env.RETURN_RESET_TOKEN_IN_TESTS === "true"
    ) {
      return res.json({ message: "OTP verified", resetToken });
    }

    const resetUrl = new URL("/login", process.env.FRONTEND_URL || "http://localhost:3000");
    resetUrl.searchParams.set("resetToken", resetToken);
    await sendEmail(
      user.email,
      "Reset Your MyEcoms Password",
      `<div><h2>Password Reset</h2><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>This link expires in 10 minutes.</p></div>`,
    );
    res.json({ message: "OTP verified. A password reset link has been sent to your email." });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { resetToken, password } = req.body || {};
    if (typeof resetToken !== "string" || resetToken.length !== 64 || !validPassword(password)) {
      return res.status(400).json({
        message: "A valid reset grant and a 10 to 128 character password are required",
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await session.withTransaction(async () => {
      const grant = await ResetGrant.findOneAndDelete({
        tokenHash: hashGrant(resetToken),
        expiresAt: { $gt: new Date() },
      }).session(session);
      if (!grant) {
        const error = new Error("Reset grant is invalid or expired");
        error.statusCode = 400;
        throw error;
      }
      const update = await User.updateOne(
        { _id: grant.user },
        { $set: { password: passwordHash }, $inc: { tokenVersion: 1 } },
        { session, runValidators: true },
      );
      if (update.modifiedCount !== 1) {
        throw new Error("Unable to update account credentials");
      }
      await ResetGrant.deleteMany({ user: grant.user }, { session });
    });
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
});

module.exports = router;
