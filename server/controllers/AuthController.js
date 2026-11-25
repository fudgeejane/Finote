const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  createVerificationCode,
  hashCode,
  codeMatches,
} = require("../emails/OneTimeCode");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/EmailService");
const { getProfileCompletionPercentage } = require("../services/ProfileCompletion");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");

function getRefreshCookieName() {
  return process.env.COOKIE_NAME || "finote_refresh";
}

function getRefreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE === "true" ||
      process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/api/auth",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function clearRefreshCookie(res) {
  res.clearCookie(getRefreshCookieName(), getRefreshCookieOptions());
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      typ: "access",
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || "15m" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: Boolean(user.emailVerifiedAt),
    profileComplete:
      getProfileCompletionPercentage(user) === 100 &&
      Boolean(user.profileSetupCompleted),
  };
}

async function register(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (password.length < 8 || password.length > 72) {
      return res
        .status(400)
        .json({ error: "Password must be between 8 and 72 characters." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.emailVerifiedAt) {
        return res.status(409).json({ error: "An account with that email already exists." });
      }

      const code = createVerificationCode();
      existingUser.emailVerificationCodeHash = hashCode(code);
      existingUser.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await existingUser.save();

      try {
        await sendVerificationEmail(email, code);
      } catch (emailError) {
        console.error("Verification email delivery failed:", emailError.message);
        return res.status(503).json({
          error: "The account exists, but its verification email could not be sent. Retry registration or request another code.",
        });
      }

      return res.status(200).json({
        message: "A new verification code has been sent.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = createVerificationCode();

    await User.create({
      email,
      passwordHash,
      emailVerificationCodeHash: hashCode(code),
      emailVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    try {
      await sendVerificationEmail(email, code);
    } catch (emailError) {
      console.error("Verification email delivery failed:", emailError.message);
      return res.status(503).json({
        error: "Account created, but the verification email could not be sent. Retry registration or request another code.",
      });
    }

    return res.status(201).json({
      message: "Account created. Check your email for a verification code.",
    });
  } catch (error) {
    // A duplicate can still occur if two registration requests race.
    if (error.code === 11000) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    console.error("Registration failed:", error.message);
    return res.status(500).json({ error: "Could not complete registration." });
  }
}

async function verifyEmail(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Enter the six-digit code." });
    }

    const user = await User.findOne({ email }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    if (user.emailVerifiedAt) {
      return res.status(200).json({ message: "Email is already verified." });
    }

    if (!user.emailVerificationCodeHash) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt <= new Date()
    ) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    if (!codeMatches(code, user.emailVerificationCodeHash)) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    user.emailVerifiedAt = new Date();
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;

    await user.save();

    return res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error("Email verification failed:", error.message);
    return res.status(500).json({ error: "Could not verify email." });
  }
}

async function resendVerification(req, res) {
  const genericMessage =
    "If the account exists and is not verified, a new code has been sent.";

  try {
    const email = req.body.email;

    const user = await User.findOne({ email }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    // Return the same response for unknown or already-verified accounts.
    if (!user || user.emailVerifiedAt) {
      return res.status(200).json({ message: genericMessage });
    }

    const code = createVerificationCode();

    user.emailVerificationCodeHash = hashCode(code);
    user.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    try {
      await sendVerificationEmail(email, code);
    } catch (emailError) {
      // Keep account existence private; the detail goes only to the server log.
      console.error("Verification email delivery failed:", emailError.message);
    }

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error("Resend verification failed:", error.message);
    return res.status(500).json({ error: "Could not process the request." });
  }
}

async function login(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (
      req.body.rememberMe !== undefined &&
      typeof req.body.rememberMe !== "boolean"
    ) {
      return res.status(400).json({ error: "rememberMe must be true or false." });
    }
    const rememberMe = req.body.rememberMe === true;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");

    // Use the same response for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ error: "Verify your email before signing in." });
    }

    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET is missing from server/.env");
    }

    const accessToken = createAccessToken(user);
    const sessionId = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(64).toString("base64url");

    const sessionDays = rememberMe
      ? Number(process.env.REMEMBER_ME_DAYS || 30)
      : Number(process.env.REFRESH_TOKEN_DAYS || 1);

    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

    const refreshTokenHash = hashRefreshToken(refreshToken);

    await Session.create({
      user: user._id,
      refreshTokenHash,
      sessionId,
      familyId,
      expiresAt,
      rememberMe,
      userAgent: req.get("user-agent") || "",
    });

    res.cookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptions(expiresAt));

    return res.status(200).json({
      accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ error: "Could not sign in." });
  }
}

async function refresh(req, res) {
  const refreshToken = req.cookies?.[getRefreshCookieName()];

  if (typeof refreshToken !== "string" || !refreshToken) {
    return res.status(204).end();
  }

  try {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await Session.findOne({ refreshTokenHash });

    if (!session) {
      const reusedSession = await Session.findOne({
        rotatedRefreshTokenHashes: refreshTokenHash,
      });
      if (reusedSession && !reusedSession.revokedAt) {
        await Session.updateMany(
          { familyId: reusedSession.familyId, revokedAt: null },
          { $set: { revokedAt: new Date(), revokeReason: "reuse" } }
        );
      }

      clearRefreshCookie(res);
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    if (session.revokedAt) {
      if (session.revokeReason === "rotated") {
        await Session.updateMany(
          { familyId: session.familyId, revokedAt: null },
          { $set: { revokedAt: new Date(), revokeReason: "reuse" } }
        );
      }

      clearRefreshCookie(res);
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    const now = new Date();
    if (session.expiresAt <= now) {
      await Session.updateOne(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: now, revokeReason: "expired" } }
      );
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    const user = await User.findById(session.user);
    if (!user || !user.emailVerifiedAt) {
      await Session.updateOne(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: now, revokeReason: "logout" } }
      );
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Session is no longer valid." });
    }

    const accessToken = createAccessToken(user);
    const newRefreshToken = crypto.randomBytes(64).toString("base64url");
    const rotatedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          refreshTokenHash: hashRefreshToken(newRefreshToken),
          lastUsedAt: now,
        },
        $push: {
          rotatedRefreshTokenHashes: {
            $each: [refreshTokenHash],
            $slice: -100,
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!rotatedSession) {
      const reusedSession = await Session.findOne({
        rotatedRefreshTokenHashes: refreshTokenHash,
      });
      if (reusedSession && !reusedSession.revokedAt) {
        await Session.updateMany(
          { familyId: reusedSession.familyId, revokedAt: null },
          { $set: { revokedAt: new Date(), revokeReason: "reuse" } }
        );
      }

      clearRefreshCookie(res);
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    res.cookie(
      getRefreshCookieName(),
      newRefreshToken,
      getRefreshCookieOptions(session.expiresAt)
    );

    return res.status(200).json({
      accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Token refresh failed:", error.message);
    return res.status(500).json({ error: "Could not refresh session." });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies?.[getRefreshCookieName()];

  try {
    if (typeof refreshToken === "string" && refreshToken) {
      await Session.updateOne(
        {
          refreshTokenHash: hashRefreshToken(refreshToken),
          revokedAt: null,
        },
        { $set: { revokedAt: new Date(), revokeReason: "logout" } }
      );
    }

    clearRefreshCookie(res);
    return res.status(200).json({ message: "Signed out." });
  } catch (error) {
    console.error("Logout failed:", error.message);
    clearRefreshCookie(res);
    return res.status(500).json({ error: "Could not sign out." });
  }
}

async function forgotPassword(req, res) {
  const genericMessage =
    "If a verified account exists for that email, a reset code has been sent.";

  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    const user = await User.findOne({
      email,
      emailVerifiedAt: { $ne: null },
    }).select("+passwordResetCodeHash +passwordResetExpiresAt");

    // Keep the response the same whether the account exists or not.
    if (user) {
      const code = createVerificationCode();

      user.passwordResetCodeHash = hashCode(code);
      user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      try {
        await sendPasswordResetEmail(email, code);
      } catch (emailError) {
        console.error("Password reset email failed:", emailError.message);
      }
    }

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password request failed:", error.message);
    return res.status(500).json({ error: "Could not process the request." });
  }
}

async function verifyResetCode(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetCodeHash +passwordResetExpiresAt"
    );

    const valid =
      user &&
      user.emailVerifiedAt &&
      user.passwordResetCodeHash &&
      user.passwordResetExpiresAt > new Date() &&
      codeMatches(code, user.passwordResetCodeHash);

    if (!valid) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }

    return res.status(200).json({ message: "Reset code is valid." });
  } catch (error) {
    console.error("Reset code verification failed:", error.message);
    return res.status(500).json({ error: "Could not verify reset code." });
  }
}

async function resetPassword(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json({
        error: "Password must be between 8 and 72 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetCodeHash +passwordResetExpiresAt"
    );

    const valid =
      user &&
      user.emailVerifiedAt &&
      user.passwordResetCodeHash &&
      user.passwordResetExpiresAt > new Date() &&
      codeMatches(code, user.passwordResetCodeHash);

    if (!valid) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }

    // Revoke sessions first. If saving the password then fails, the user can
    // request another code and sign in again; old refresh sessions stay revoked.
    await Session.updateMany(
      { user: user._id, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokeReason: "password-reset",
        },
      }
    );

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    clearRefreshCookie(res);

    return res.status(200).json({
      message: "Password reset successfully. Sign in with your new password.",
    });
  } catch (error) {
    console.error("Password reset failed:", error.message);
    return res.status(500).json({ error: "Could not reset password." });
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
