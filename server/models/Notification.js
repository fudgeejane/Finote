const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  dedupeKey: { type: String, required: true, maxlength: 240 },
  type: { type: String, enum: ["exam-result", "class-reminder", "account-security"], required: true },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 300 },
  href: { type: String, required: true, maxlength: 500 },
  inAppEnabled: { type: Boolean, default: true },
  occurredAt: { type: Date, required: true, default: Date.now },
  readAt: { type: Date, default: null },
  email: {
    status: { type: String, enum: ["disabled", "pending", "sending", "sent"], default: "disabled" },
    attempts: { type: Number, default: 0 },
    retryAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: "", maxlength: 300 },
  },
}, { timestamps: true });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ user: 1, occurredAt: -1 });
notificationSchema.index({ "email.status": 1, "email.retryAt": 1 });
module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
