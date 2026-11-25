const mongoose = require("mongoose");

const NotebookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
  },
  { timestamps: true, collection: "notebooks" }
);

NotebookSchema.index({ user: 1, updatedAt: -1 });

module.exports =
  mongoose.models.Notebook || mongoose.model("Notebook", NotebookSchema);
