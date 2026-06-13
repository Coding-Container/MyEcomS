const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,

  message: {
    message: "Too many login attempts. Try again after 30 minutes.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,

  message: {
    message: "Too many OTP requests. Try again later.",
  },
});

module.exports = {
  loginLimiter,
  otpLimiter,
};
