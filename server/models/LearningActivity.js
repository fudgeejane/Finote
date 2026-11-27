const mongoose = require("mongoose");

const learningActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: String, required: true, maxlength: 180 },
  type: { type: String, enum: ["note-created", "flashcards-completed", "mock-exam-submitted"], required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, default: "", maxlength: 120 },
  score: { type: Number, min: 0, max: 100, default: null },
  session: { type: String, default: "" },
  cardsReviewed: { type: Number, min: 0, default: 0 },
  gotIt: { type: Number, min: 0, default: 0 },
  reviewAgain: { type: Number, min: 0, default: 0 },
  timezone: { type: String, required: true },
  occurredAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true, collection: "learning_activities" });
learningActivitySchema.index({ user: 1, eventId: 1 }, { unique: true });
learningActivitySchema.index({ user: 1, occurredAt: 1 });
learningActivitySchema.index({ user: 1, type: 1, occurredAt: 1 });
module.exports = mongoose.models.LearningActivity || mongoose.model("LearningActivity", learningActivitySchema);
