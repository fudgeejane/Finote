const mongoose = require("mongoose");

const learningActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: String, required: true, maxlength: 180 },
  type: { type: String, enum: ["note-created", "flashcards-completed", "mock-exam-submitted", "flashcards-used", "mock-exam-used"], required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, required: true },
  timezone: { type: String, required: true },
  occurredAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true, collection: "learning_activities" });
learningActivitySchema.index({ user: 1, eventId: 1 }, { unique: true });
learningActivitySchema.index({ user: 1, occurredAt: 1 });
module.exports = mongoose.models.LearningActivity || mongoose.model("LearningActivity", learningActivitySchema);
