const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Store a hash of the refresh token, never the token itself.
    refreshTokenHash: { 
        type: String, 
        required: true, 
        select: false 
    },

    rotatedRefreshTokenHashes: {
      type: [{ type: String }],
      default: [],
      select: false,
    },

    sessionId: { 
        type: String, 
        required: true, 
        unique: true 
    },

    familyId: { 
        type: String,
         required: true 
    },

    expiresAt: { 
        type: Date, 
        required: true 
    },

    revokedAt: { 
        type: Date, 
        default: null 
    },

    revokeReason: {
      type: String,
      enum: [
        "logout",
        "rotated",
        "reuse",
        "password-reset",
        "account-deletion",
        "logout-all",
        "expired",
        null,
      ],
      default: null,
    },

    replacedBySessionId: { 
        type: String, 
        default: null 
    },

    rememberMe: { 
        type: Boolean, 
        default: false 
    },

    userAgent: { 
        type: String, 
        maxlength: 512, 
        default: "" 
    },

    lastUsedAt: { 
        type: Date, 
        default: Date.now 
    },

  },

  { timestamps: true }
  
);

// MongoDB eventually cleans up expired records.
// The refresh endpoint will still check expiration and revocation itself.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
sessionSchema.index({ rotatedRefreshTokenHashes: 1 });
sessionSchema.index({ user: 1, revokedAt: 1 });
sessionSchema.index({ familyId: 1 });

module.exports =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);
