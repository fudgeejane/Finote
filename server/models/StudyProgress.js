const mongoose = require("mongoose");

const studyProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  material: { type: mongoose.Schema.Types.ObjectId, ref: "StudyMaterial", required: true },
  state: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  attempts: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, collection: "study_progress" });

studyProgressSchema.index({ user: 1, material: 1 }, { unique: true });
module.exports = mongoose.models.StudyProgress || mongoose.model("StudyProgress", studyProgressSchema);
