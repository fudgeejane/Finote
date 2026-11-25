const mongoose = require("mongoose");
const Notebook = require("../models/Notebook");
const Note = require("../models/Note");

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 750000;
const MAX_MIGRATION_NOTES = 250;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isObjectBody(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readTitle(value, fallback = "Untitled note") {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "string") {
    throw validationError("Note title must be a text value.");
  }
  const title = candidate.trim();
  if (title.length > MAX_TITLE_LENGTH) {
    throw validationError(
      `Note title must be ${MAX_TITLE_LENGTH} characters or fewer.`
    );
  }
  return title;
}

function readContent(value, fallback = "") {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "string") {
    throw validationError("Note content must be a text value.");
  }
  if (candidate.length > MAX_CONTENT_LENGTH) {
    throw validationError(
      `Note content must be ${MAX_CONTENT_LENGTH} characters or fewer.`
    );
  }
  return candidate;
}

function serializeNote(note, notebookName) {
  return {
    id: String(note._id),
    title: note.title,
    content: note.content,
    notebookId: String(note.notebook),
    notebookTitle: notebookName || "",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function handleError(res, error, action) {
  if (error.statusCode === 400 || error.name === "ValidationError") {
    return res.status(400).json({ error: error.message });
  }
  console.error(`${action} failed:`, error.message);
  return res.status(500).json({ error: `Could not ${action}.` });
}

async function getOwnedNotebook(notebookId, userId) {
  if (!mongoose.isValidObjectId(notebookId)) {
    throw validationError("Notebook ID is invalid.");
  }
  const notebook = await Notebook.findOne({
    _id: notebookId,
    user: userId,
  }).select("_id name");
  if (!notebook) {
    const error = new Error("Notebook not found.");
    error.statusCode = 404;
    throw error;
  }
  return notebook;
}

async function listNotes(req, res) {
  try {
    let filter = { user: req.user._id };
    if (req.query.notebookId !== undefined) {
      const notebook = await getOwnedNotebook(
        req.query.notebookId,
        req.user._id
      );
      filter = { ...filter, notebook: notebook._id };
    }
    const notes = await Note.find(filter).sort({ updatedAt: -1 }).lean();
    const notebookIds = [...new Set(notes.map((note) => String(note.notebook)))];
    const notebooks = await Notebook.find({
      _id: { $in: notebookIds },
      user: req.user._id,
    })
      .select("_id name")
      .lean();
    const namesById = new Map(
      notebooks.map((notebook) => [String(notebook._id), notebook.name])
    );
    return res.status(200).json({
      notes: notes
        .filter((note) => namesById.has(String(note.notebook)))
        .map((note) =>
          serializeNote(note, namesById.get(String(note.notebook)))
        ),
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(res, error, "load notes");
  }
}

async function createNote(req, res) {
  try {
    if (!isObjectBody(req.body)) {
      throw validationError("Note data must be an object.");
    }
    const notebook = await getOwnedNotebook(
      req.body.notebookId,
      req.user._id
    );
    const note = await Note.create({
      user: req.user._id,
      notebook: notebook._id,
      title: readTitle(req.body.title),
      content: readContent(req.body.content),
    });
    return res.status(201).json({
      note: serializeNote(note, notebook.name),
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(res, error, "create note");
  }
}

async function updateNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.noteId)) {
    return res.status(400).json({ error: "Note ID is invalid." });
  }
  try {
    if (!isObjectBody(req.body)) {
      throw validationError("Note data must be an object.");
    }
    const ownedNote = await Note.findOne({
      _id: req.params.noteId,
      user: req.user._id,
    }).select("notebook");
    if (!ownedNote) {
      return res.status(404).json({ error: "Note not found." });
    }
    const notebook = await getOwnedNotebook(ownedNote.notebook, req.user._id);
    const changes = {};
    if (Object.hasOwn(req.body, "title")) {
      changes.title = readTitle(req.body.title);
    }
    if (Object.hasOwn(req.body, "content")) {
      changes.content = readContent(req.body.content);
    }
    if (!Object.keys(changes).length) {
      throw validationError("Provide a note title or content to update.");
    }

    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.noteId,
        user: req.user._id,
        notebook: notebook._id,
      },
      { $set: changes },
      { new: true, runValidators: true }
    ).lean();
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }
    return res.status(200).json({
      note: serializeNote(note, notebook.name),
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(res, error, "update note");
  }
}

async function deleteNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.noteId)) {
    return res.status(400).json({ error: "Note ID is invalid." });
  }
  try {
    const ownedNote = await Note.findOne({
      _id: req.params.noteId,
      user: req.user._id,
    }).select("notebook");
    if (!ownedNote) {
      return res.status(404).json({ error: "Note not found." });
    }
    const notebook = await getOwnedNotebook(ownedNote.notebook, req.user._id);
    const note = await Note.findOneAndDelete({
      _id: req.params.noteId,
      user: req.user._id,
      notebook: notebook._id,
    });
    if (!note) return res.status(404).json({ error: "Note not found." });
    return res.status(200).json({ message: "Note deleted." });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(res, error, "delete note");
  }
}

async function migrateLegacyNotes(req, res) {
  try {
    if (!isObjectBody(req.body) || !Array.isArray(req.body.notes)) {
      throw validationError("Legacy notes must be provided as a list.");
    }
    if (req.body.notes.length > MAX_MIGRATION_NOTES) {
      throw validationError(
        `Import no more than ${MAX_MIGRATION_NOTES} notes at a time.`
      );
    }
    const entries = req.body.notes.map((item) => {
      if (!isObjectBody(item)) {
        throw validationError("Each legacy note must be an object.");
      }
      if (
        (typeof item.id !== "string" && typeof item.id !== "number") ||
        !String(item.id).trim() ||
        String(item.id).length > 128
      ) {
        throw validationError("Each legacy note must have a valid ID.");
      }
      return {
        legacyId: String(item.id),
        title: readTitle(item.title),
        content: readContent(item.content),
      };
    });
    if (!entries.length) {
      return res.status(200).json({ imported: 0 });
    }

    let notebook = await Notebook.findOne({
      user: req.user._id,
      name: "My Notes",
    });
    if (!notebook) {
      notebook = await Notebook.create({
        user: req.user._id,
        name: "My Notes",
      });
    }

    let imported = 0;
    for (const entry of entries) {
      const existing = await Note.findOne({
        user: req.user._id,
        legacyId: entry.legacyId,
      }).select("_id");
      if (existing) continue;

      try {
        await Note.create({
          user: req.user._id,
          notebook: notebook._id,
          ...entry,
        });
        imported += 1;
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    return res.status(200).json({ imported });
  } catch (error) {
    return handleError(res, error, "import legacy notes");
  }
}

module.exports = {
  createNote,
  deleteNote,
  listNotes,
  migrateLegacyNotes,
  updateNote,
};
