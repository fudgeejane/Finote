const express = require("express");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} = require("../controllers/AuthController");

const router = express.Router();

function validateEmail(req, res, next) {
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const email = String(body.email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  req.body = body;
  req.body.email = email;
  next();
}

const codeRequestByEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) =>
    crypto
      .createHmac("sha256", process.env.CODE_PEPPER)
      .update(req.body.email)
      .digest("hex"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many code requests. Try again later.",
    });
  },
});

const codeRequestByIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests. Try again later.",
    });
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const verificationByEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) =>
    crypto
      .createHmac("sha256", process.env.CODE_PEPPER)
      .update(req.body.email)
      .digest("hex"),
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many failed verification attempts. Request a new code later.",
    });
  },
});

const verificationByIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many failed verification attempts. Try again later.",
    });
  },
});

const resetAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post(
  "/register",
  validateEmail,
  codeRequestByEmailLimiter,
  codeRequestByIpLimiter,
  register
);
router.post(
  "/verify-email",
  validateEmail,
  verificationByEmailLimiter,
  verificationByIpLimiter,
  verifyEmail
);
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post(
  "/resend-verification",
  validateEmail,
  codeRequestByEmailLimiter,
  codeRequestByIpLimiter,
  resendVerification
);

router.post("/verify-reset-code", resetAttemptLimiter, verifyResetCode);
router.post("/reset-password", resetAttemptLimiter, resetPassword);
router.post(
  "/forgot-password",
  validateEmail,
  codeRequestByEmailLimiter,
  codeRequestByIpLimiter,
  forgotPassword
);

module.exports = router;