const mongoose = require("mongoose");

const suggestionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  message: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
}, { timestamps: true, collection: "suggestions" });

module.exports = mongoose.models.Suggestion || mongoose.model("Suggestion", suggestionSchema);
