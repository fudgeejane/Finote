const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  schedule: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true, index: true },
  occurrence: { type: Date, required: true },
  status: { type: String, enum: ["pending", "sending", "sent"], default: "pending" },
  attempts: { type: Number, default: 0 },
  retryAt: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ status: 1, retryAt: 1 });
module.exports = mongoose.models.ScheduleReminder || mongoose.model("ScheduleReminder", schema);
