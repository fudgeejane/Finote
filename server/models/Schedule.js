const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  code: { type: String, trim: true, maxlength: 40, default: "" },
  instructor: { type: String, trim: true, maxlength: 120, default: "" },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  days: { type: [{ type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }], required: true },
  room: { type: String, trim: true, maxlength: 80, default: "" },
  building: { type: String, trim: true, maxlength: 120, default: "" },
  type: { type: String, enum: ["Lecture", "Laboratory", "Online", "Hybrid"], default: "Lecture" },
  section: { type: String, trim: true, maxlength: 80, default: "" },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
  color: { type: String, match: /^#[\da-f]{6}$/i, default: "#3b82f6" },
  reminderEnabled: { type: Boolean, default: false },
  reminder: { type: Number, enum: [10, 15, 30, 60], default: 15 },
  timezone: { type: String, required: true, default: "UTC" },
}, { timestamps: true });

scheduleSchema.index({ user: 1, days: 1, startTime: 1 });
module.exports = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);
