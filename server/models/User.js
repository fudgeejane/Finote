const mongoose = require("mongoose");

const additionalInfoSchema = new mongoose.Schema(
  {
    school: { 
        type: String, 
        trim: true, 
        maxlength: 120, 
        default: "" 
    },
    course: { 
        type: String, 
        trim: true, 
        maxlength: 120, 
        default: "" 
    },
    yearLevel: { 
        type: String, 
        trim: true, 
        maxlength: 40, 
        default: "" 
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },

    // Authentication code will save a bcrypt hash here, never the plain password.
    passwordHash: { 
        type: String, 
        required: true, 
        select: false 
    },

    // A date means verified. null means not verified.
    emailVerifiedAt: {
        type: Date, 
        default: null 
    },

    // Store hashes of verification/reset codes, never the codes themselves.
    emailVerificationCodeHash: { 
        type: String, 
        select: false 
    },

    emailVerificationExpiresAt: { 
        type: Date, 
        select: false 
    },

    passwordResetCodeHash: { 
        type: String, 
        select: false 
    },

    passwordResetExpiresAt: { 
        type: Date, 
        select: false 
    },

    firstName: { 
        type: String,
        trim: true, 
        maxlength: 80, 
        default: "" 
    },

    lastName: { 
        type: String, 
        trim: true, 
        maxlength: 80, 
        default: "" 
    },

    contactNumber: { 
        type: String, 
        trim: true, 
        maxlength: 32, 
        default: "" 
    },

    additionalInfo: { 
        type: additionalInfoSchema, 
        default: () => ({}) 
    },

    profilePictureUrl: { 
        type: String, 
        trim: true, 
        default: "" 
    },

    profilePicturePublicId: { 
        type: String, 
        trim: true, 
        default: "" 
    },

    // null means profile setup is incomplete.
    profileCompletedAt: { 
        type: Date, 
        default: null 
    },

    // Later, this can invalidate access tokens across devices.
    tokenVersion: { 
        type: Number, 
        default: 0, 
        min: 0 
    },

  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);