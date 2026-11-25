const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notebook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Untitled note",
    },
    content: {
      type: String,
      maxlength: 750000,
      default: "",
    },
    legacyId: {
      type: String,
      maxlength: 128,
      default: undefined,
    },
  },
  { timestamps: true, collection: "notes" }
);

NoteSchema.index({ user: 1, notebook: 1, updatedAt: -1 });
NoteSchema.index(
  { user: 1, legacyId: 1 },
  { unique: true, partialFilterExpression: { legacyId: { $type: "string" } } }
);

module.exports = mongoose.models.Note || mongoose.model("Note", NoteSchema);
