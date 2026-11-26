const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, maxlength: 60 },
    prompt: { type: String, required: true, maxlength: 5000 },
    options: { type: [String], default: undefined },
    answer: { type: String, required: true, maxlength: 5000 },
    explanation: { type: String, default: "", maxlength: 5000 },
  },
  { _id: false }
);

const flashcardSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, maxlength: 2000 },
    answer: { type: String, required: true, maxlength: 5000 },
  },
  { _id: false }
);

const studyMaterialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["mock-exams", "flashcards"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    sourceNotebook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
    },
    sourceNotes: [
      {
        note: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Note",
          required: true,
        },
        title: { type: String, required: true, maxlength: 120 },
      },
    ],
    questions: { type: [questionSchema], default: undefined },
    cards: { type: [flashcardSchema], default: undefined },
  },
  { timestamps: true, collection: "study_materials" }
);

studyMaterialSchema.index({ user: 1, type: 1, updatedAt: -1 });

module.exports =
  mongoose.models.StudyMaterial ||
  mongoose.model("StudyMaterial", studyMaterialSchema);
