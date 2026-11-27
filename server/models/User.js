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
    occupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    skillsOrQualifications: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    employer: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    yearsExperience: {
      type: Number,
      min: 0,
      max: 80,
      default: null,
    },
    educationDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    professionalExperience: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    houseBuildingNumber: { type: String, trim: true, maxlength: 80, default: "" },
    street: { type: String, trim: true, maxlength: 120, default: "" },
    barangay: { type: String, trim: true, maxlength: 120, default: "" },
    cityMunicipality: { type: String, trim: true, maxlength: 120, default: "" },
    province: { type: String, trim: true, maxlength: 120, default: "" },
    postalCode: { type: String, trim: true, maxlength: 20, default: "" },
    country: { type: String, trim: true, maxlength: 80, default: "" },
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

    middleName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    lastName: { 
        type: String, 
        trim: true, 
        maxlength: 80, 
        default: "" 
    },

    profileType: {
      type: String,
      enum: ["student", "professional"],
      default: "student",
    },

    dateOfBirth: {
      type: String,
      trim: true,
      default: "",
    },

    gender: {
      type: String,
      enum: ["", "male", "female", "prefer_not_to_say"],
      default: "",
    },

    contactNumber: { 
        type: String, 
        trim: true, 
        maxlength: 20,
        default: "" 
    },

    address: {
      type: addressSchema,
      default: () => ({}),
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
    profileSetupCompleted: {
        type: Boolean,
        default: false,
    },

    // Later, this can invalidate access tokens across devices.
    tokenVersion: { 
        type: Number, 
        default: 0, 
        min: 0 
    },

    notificationPreferences: {
      type: new mongoose.Schema({
        examResult: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
        classReminder: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
        accountSecurity: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
      }, { _id: false }),
      default: () => ({}),
    },

  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
