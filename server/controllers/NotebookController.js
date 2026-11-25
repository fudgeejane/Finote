const mongoose = require("mongoose");
const Notebook = require("../models/Notebook");
const Note = require("../models/Note");

const MAX_NAME_LENGTH = 120;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function readName(value) {
  if (typeof value !== "string") {
    throw validationError("Notebook name must be a text value.");
  }
  const name = value.trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw validationError(
      `Notebook name must be between 1 and ${MAX_NAME_LENGTH} characters.`
    );
  }
  return name;
}

function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

function serializeNotebook(notebook, noteCount = 0, lastEditedAt) {
  const name = notebook.name;
  return {
    id: String(notebook._id),
    name,
    title: name,
    noteCount,
    lastEditedAt: lastEditedAt || notebook.updatedAt,
    createdAt: notebook.createdAt,
    updatedAt: notebook.updatedAt,
  };
}

function handleError(res, error, action) {
  if (error.statusCode === 400) {
    return res.status(400).json({ error: error.message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ error: error.message });
  }
  console.error(`${action} failed:`, error.message);
  return res.status(500).json({ error: `Could not ${action}.` });
}

async function getNotebookStats(notebook) {
  const [stats] = await Note.aggregate([
    { $match: { user: notebook.user, notebook: notebook._id } },
    {
      $group: {
        _id: "$notebook",
        noteCount: { $sum: 1 },
        lastNoteUpdate: { $max: "$updatedAt" },
      },
    },
  ]);
  const noteDate = stats?.lastNoteUpdate;
  const lastEditedAt =
    noteDate && noteDate > notebook.updatedAt ? noteDate : notebook.updatedAt;
  return serializeNotebook(notebook, stats?.noteCount || 0, lastEditedAt);
}

async function listNotebooks(req, res) {
  try {
    const notebooks = await Notebook.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    const stats = await Note.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: "$notebook",
          noteCount: { $sum: 1 },
          lastNoteUpdate: { $max: "$updatedAt" },
        },
      },
    ]);
    const statsByNotebook = new Map(
      stats.map((item) => [String(item._id), item])
    );
    return res.status(200).json({
      notebooks: notebooks.map((notebook) => {
        const noteStats = statsByNotebook.get(String(notebook._id));
        const noteDate = noteStats?.lastNoteUpdate;
        const lastEditedAt =
          noteDate && noteDate > notebook.updatedAt
            ? noteDate
            : notebook.updatedAt;
        return serializeNotebook(
          notebook,
          noteStats?.noteCount || 0,
          lastEditedAt
        );
      }),
    });
  } catch (error) {
    return handleError(res, error, "load notebooks");
  }
}

async function getNotebook(req, res) {
  if (!isValidId(req.params.notebookId)) {
    return res.status(400).json({ error: "Notebook ID is invalid." });
  }
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.notebookId,
      user: req.user._id,
    }).lean();
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found." });
    }
    return res.status(200).json({
      notebook: await getNotebookStats(notebook),
    });
  } catch (error) {
    return handleError(res, error, "load notebook");
  }
}

async function createNotebook(req, res) {
  try {
    const name = readName(req.body?.name);
    const notebook = await Notebook.create({ user: req.user._id, name });
    return res.status(201).json({
      notebook: serializeNotebook(notebook),
    });
  } catch (error) {
    return handleError(res, error, "create notebook");
  }
}

async function updateNotebook(req, res) {
  if (!isValidId(req.params.notebookId)) {
    return res.status(400).json({ error: "Notebook ID is invalid." });
  }
  try {
    const name = readName(req.body?.name);
    const notebook = await Notebook.findOneAndUpdate(
      { _id: req.params.notebookId, user: req.user._id },
      { $set: { name } },
      { new: true, runValidators: true }
    );
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found." });
    }
    return res.status(200).json({
      notebook: await getNotebookStats(notebook),
    });
  } catch (error) {
    return handleError(res, error, "update notebook");
  }
}

async function deleteNotebook(req, res) {
  if (!isValidId(req.params.notebookId)) {
    return res.status(400).json({ error: "Notebook ID is invalid." });
  }
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.notebookId,
      user: req.user._id,
    });
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found." });
    }
    await Note.deleteMany({ notebook: notebook._id });
    await notebook.deleteOne();
    return res.status(200).json({ message: "Notebook deleted." });
  } catch (error) {
    return handleError(res, error, "delete notebook");
  }
}

module.exports = {
  createNotebook,
  deleteNotebook,
  getNotebook,
  listNotebooks,
  updateNotebook,
};
