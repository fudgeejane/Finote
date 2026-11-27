const mongoose = require("mongoose");
const Notebook = require("../models/Notebook");
const Note = require("../models/Note");
const StudyMaterial = require("../models/StudyMaterial");
const StudyProgress = require("../models/StudyProgress");
const GeminiStudyTools = require("../services/GeminiStudyTools");
const uniqueName = require("../utils/uniqueName");

const MAX_TITLE_LENGTH = 100;
const MAX_NOTE_IDS = 25;
const MAX_QUESTIONS = 100;
const MAX_CARDS = 100;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function readTitle(value) {
  if (typeof value !== "string") {
    throw validationError("Study material name must be a text value.");
  }
  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw validationError(
      `Study material name must be between 1 and ${MAX_TITLE_LENGTH} characters.`
    );
  }
  return title;
}

function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Study material data must be an object.");
  }
  if (!["mock-exams", "flashcards"].includes(body.type)) {
    throw validationError("Study material type is invalid.");
  }
  if (
    typeof body.notebookId !== "string" ||
    !mongoose.isValidObjectId(body.notebookId)
  ) {
    throw validationError("Notebook ID is invalid.");
  }
  if (
    !Array.isArray(body.noteIds) ||
    body.noteIds.length < 1 ||
    body.noteIds.length > MAX_NOTE_IDS ||
    body.noteIds.some(
      (id) => typeof id !== "string" || !mongoose.isValidObjectId(id)
    )
  ) {
    throw validationError(`Select between 1 and ${MAX_NOTE_IDS} valid notes.`);
  }
  const noteIds = [...new Set(body.noteIds.map(String))];
  if (noteIds.length !== body.noteIds.length) {
    throw validationError("Selected notes must be unique.");
  }
  if (
    body.type === "mock-exams" &&
    (!Number.isInteger(body.totalQuestions) ||
      body.totalQuestions < 1 ||
      body.totalQuestions > MAX_QUESTIONS)
  ) {
    throw validationError(`Question count must be between 1 and ${MAX_QUESTIONS}.`);
  }
  if (
    body.instructions !== undefined &&
    (typeof body.instructions !== "string" || body.instructions.length > 1000)
  ) {
    throw validationError("Instructions must be 1,000 characters or fewer.");
  }
  return {
    title: readTitle(body.title),
    type: body.type,
    notebookId: body.notebookId,
    noteIds,
    totalQuestions: body.totalQuestions,
    instructions: (body.instructions || "").trim(),
  };
}

function readText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw validationError(`Gemini returned an invalid ${field}. Please try again.`);
  }
  return value.trim();
}

function uniqueBy(items, key) {
  const normalized = items.map((item) => key(item).toLowerCase().replace(/\s+/g, " ").trim());
  return new Set(normalized).size === items.length;
}

function validateGeneratedContent(type, result, totalQuestions) {
  if (type === "mock-exams") {
    if (!Array.isArray(result?.questions) || result.questions.length !== totalQuestions) {
      throw validationError("Gemini did not generate the requested number of questions. Please try again.");
    }
    const questions = result.questions.map((question) => {
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        throw validationError("Gemini returned an invalid question. Please try again.");
      }
      const normalized = {
        type: readText(question.type, "question type", 60),
        prompt: readText(question.prompt, "question", 5000),
        answer: readText(question.answer, "answer", 5000),
        explanation: "",
      };
      if (
        question.explanation !== undefined &&
        (typeof question.explanation !== "string" ||
          question.explanation.length > 5000)
      ) {
        throw validationError("Gemini returned an invalid explanation. Please try again.");
      }
      normalized.explanation = (question.explanation || "").trim();
      if (question.options !== undefined) {
        if (
          !Array.isArray(question.options) ||
          question.options.length < 2 ||
          question.options.length > 6
        ) {
          throw validationError("Gemini returned invalid answer choices. Please try again.");
        }
        normalized.options = question.options.map((option) =>
          readText(option, "answer choice", 1000)
        );
        if (!uniqueBy(normalized.options, (option) => option)) {
          throw validationError("Gemini returned duplicate answer choices. Please try again.");
        }
        if (!normalized.options.includes(normalized.answer)) {
          throw validationError("Gemini returned an answer that is not one of the choices. Please try again.");
        }
      }
      return normalized;
    });
    if (!uniqueBy(questions, (question) => question.prompt)) {
      throw validationError("Gemini returned repetitive questions. Please try again.");
    }
    return { questions };
  }

  if (
    !Array.isArray(result?.cards) ||
    result.cards.length < 1 ||
    result.cards.length > MAX_CARDS
  ) {
    throw validationError("Gemini returned an invalid flashcard set. Please try again.");
  }
  const cards = result.cards.map((card) => {
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      throw validationError("Gemini returned an invalid flashcard. Please try again.");
    }
    return {
      question: readText(card.question, "flashcard front", 2000),
      answer: readText(card.answer, "flashcard back", 5000),
    };
  });
  if (!uniqueBy(cards, (card) => card.question)) {
    throw validationError("Gemini returned repetitive flashcards. Please try again.");
  }
  return { cards };
}

function serializeMaterial(material) {
  return {
    id: String(material._id),
    type: material.type,
    title: material.title,
    sourceNotebookId: String(material.sourceNotebook),
    sourceNotes: material.sourceNotes.map((source) => ({
      id: String(source.note),
      title: source.title,
    })),
    questions: material.questions || [],
    cards: material.cards || [],
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

function handleError(res, error, action) {
  if (error.statusCode === 400 || error.name === "ValidationError") {
    return res.status(400).json({ error: error.message });
  }
  if (error.statusCode === 503 || error.statusCode === 502) {
    console.error(`${action} failed:`, error.message);
    const message = error.code === "AI_CAPACITY"
      ? "The AI service is temporarily busy. Your selections are still here; please try again shortly."
      : error.code === "AI_TIMEOUT"
        ? "AI generation took too long. Your selections are still here; please try again."
        : error.message;
    return res.status(error.statusCode).json({ error: message });
  }
  console.error(`${action} failed:`, error.message);
  return res.status(500).json({ error: `Could not ${action}.` });
}

async function generate(req, res) {
  try {
    const input = validateInput(req.body);
    const notebook = await Notebook.findOne({
      _id: input.notebookId,
      user: req.user._id,
    }).select("_id");
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found." });
    }
    const notes = await Note.find({
      _id: { $in: input.noteIds },
      user: req.user._id,
      notebook: notebook._id,
    })
      .select("_id title content")
      .lean();
    if (notes.length !== input.noteIds.length) {
      return res.status(404).json({ error: "One or more selected notes were not found in this notebook." });
    }
    const generated = await GeminiStudyTools.generateStudyMaterial({
      type: input.type,
      title: input.title,
      notes,
      totalQuestions: input.totalQuestions,
      instructions: input.instructions,
    });
    const content = validateGeneratedContent(
      input.type,
      generated,
      input.totalQuestions
    );
    const existingTitles = await StudyMaterial.distinct("title", {
      user: req.user._id,
      type: input.type,
    });
    const material = await StudyMaterial.create({
      user: req.user._id,
      type: input.type,
      title: uniqueName(input.title, existingTitles, MAX_TITLE_LENGTH),
      sourceNotebook: notebook._id,
      sourceNotes: notes.map((note) => ({ note: note._id, title: note.title })),
      ...content,
    });
    return res.status(201).json({ material: serializeMaterial(material) });
  } catch (error) {
    return handleError(res, error, "generate study material");
  }
}

async function list(req, res) {
  const filter = { user: req.user._id };
  if (req.query.type !== undefined) {
    if (!["mock-exams", "flashcards"].includes(req.query.type)) {
      return res.status(400).json({ error: "Study material type is invalid." });
    }
    filter.type = req.query.type;
  }
  try {
    const materials = await StudyMaterial.find(filter)
      .sort({ updatedAt: -1 })
      .lean();
    return res.status(200).json({
      materials: materials.map(serializeMaterial),
    });
  } catch (error) {
    return handleError(res, error, "load study materials");
  }
}

async function getById(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) {
    return res.status(400).json({ error: "Study material ID is invalid." });
  }
  try {
    const material = await StudyMaterial.findOne({
      _id: req.params.materialId,
      user: req.user._id,
    }).lean();
    if (!material) {
      return res.status(404).json({ error: "Study material not found." });
    }
    return res.status(200).json({ material: serializeMaterial(material) });
  } catch (error) {
    return handleError(res, error, "load study material");
  }
}

async function update(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) {
    return res.status(400).json({ error: "Study material ID is invalid." });
  }
  try {
    const requestedTitle = readTitle(req.body?.title);
    const existingMaterial = await StudyMaterial.findOne({
      _id: req.params.materialId,
      user: req.user._id,
    }).select("type");
    if (!existingMaterial) {
      return res.status(404).json({ error: "Study material not found." });
    }
    const existingTitles = await StudyMaterial.distinct("title", {
      user: req.user._id,
      type: existingMaterial.type,
      _id: { $ne: existingMaterial._id },
    });
    const title = uniqueName(requestedTitle, existingTitles, MAX_TITLE_LENGTH);
    const material = await StudyMaterial.findOneAndUpdate(
      { _id: req.params.materialId, user: req.user._id },
      { $set: { title } },
      { new: true, runValidators: true }
    ).lean();
    if (!material) {
      return res.status(404).json({ error: "Study material not found." });
    }
    return res.status(200).json({ material: serializeMaterial(material) });
  } catch (error) {
    return handleError(res, error, "update study material");
  }
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) {
    return res.status(400).json({ error: "Study material ID is invalid." });
  }
  try {
    const material = await StudyMaterial.findOneAndDelete({
      _id: req.params.materialId,
      user: req.user._id,
    });
    if (!material) {
      return res.status(404).json({ error: "Study material not found." });
    }
    return res.status(200).json({ message: "Study material deleted." });
  } catch (error) {
    return handleError(res, error, "delete study material");
  }
}

async function readProgress(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) return res.status(400).json({ error: "Study material ID is invalid." });
  const material = await StudyMaterial.findOne({ _id: req.params.materialId, user: req.user._id }).select("_id");
  if (!material) return res.status(404).json({ error: "Study material not found." });
  const progress = await StudyProgress.findOne({ user: req.user._id, material: material._id }).lean();
  return res.json({ state: progress?.state || {}, attempts: progress?.attempts || [] });
}

async function saveProgress(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) return res.status(400).json({ error: "Study material ID is invalid." });
  if (!req.body || typeof req.body.state !== "object" || Array.isArray(req.body.state) || JSON.stringify(req.body.state).length > 100000) return res.status(400).json({ error: "Study progress is invalid." });
  const material = await StudyMaterial.findOne({ _id: req.params.materialId, user: req.user._id }).select("_id");
  if (!material) return res.status(404).json({ error: "Study material not found." });
  const progress = await StudyProgress.findOneAndUpdate({ user: req.user._id, material: material._id }, { $set: { state: req.body.state } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return res.json({ state: progress.state });
}

async function saveAttempt(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) return res.status(400).json({ error: "Study material ID is invalid." });
  const material = await StudyMaterial.findOne({ _id: req.params.materialId, user: req.user._id, type: "mock-exams" }).select("_id questions");
  if (!material) return res.status(404).json({ error: "Mock exam not found." });
  if (!req.body || typeof req.body.answers !== "object" || Array.isArray(req.body.answers) || typeof req.body.submissionId !== "string" || !/^[\w-]{1,100}$/.test(req.body.submissionId)) return res.status(400).json({ error: "Exam attempt is invalid." });
  const attempt = { submissionId: req.body.submissionId, answers: req.body.answers, completedAt: new Date(), score: Number.isFinite(req.body.score) ? req.body.score : null };
  const filter = { user: req.user._id, material: material._id };
  await StudyProgress.updateOne(filter, { $setOnInsert: { user: req.user._id, material: material._id } }, { upsert: true });
  const progress = await StudyProgress.findOneAndUpdate({ ...filter, "attempts.submissionId": { $ne: attempt.submissionId } }, { $push: { attempts: { $each: [attempt], $slice: -50 } } }, { new: true });
  const result = progress || await StudyProgress.findOne(filter);
  return res.status(201).json({ attempts: result.attempts });
}

async function createMissedFlashcards(req, res) {
  if (!mongoose.isValidObjectId(req.params.materialId)) return res.status(400).json({ error: "Study material ID is invalid." });
  const exam = await StudyMaterial.findOne({ _id: req.params.materialId, user: req.user._id, type: "mock-exams" });
  if (!exam) return res.status(404).json({ error: "Mock exam not found." });
  const answers = req.body?.answers || {};
  const missed = exam.questions.filter((q) => (Boolean(q.options) || ["True or False", "Fill in the Blanks", "Identification", "Matching Type"].includes(q.type)) && String(answers[q.id || q.prompt] || "").trim().replace(/\s+/g, " ").toLowerCase() !== q.answer.trim().replace(/\s+/g, " ").toLowerCase());
  if (!missed.length) return res.status(400).json({ error: "There are no missed automatically gradable questions to turn into flashcards." });
  const existingTitles = await StudyMaterial.distinct("title", { user: req.user._id, type: "flashcards" });
  const material = await StudyMaterial.create({ user: req.user._id, type: "flashcards", title: uniqueName(`${exam.title} missed questions`, existingTitles, MAX_TITLE_LENGTH), sourceNotebook: exam.sourceNotebook, sourceNotes: exam.sourceNotes, cards: missed.map((q) => ({ question: q.prompt, answer: q.answer })) });
  return res.status(201).json({ material: serializeMaterial(material) });
}

module.exports = { generate, getById, list, remove, update, readProgress, saveProgress, saveAttempt, createMissedFlashcards };
