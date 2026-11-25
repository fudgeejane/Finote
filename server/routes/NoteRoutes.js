const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const {
  createNote,
  deleteNote,
  listNotes,
  migrateLegacyNotes,
  updateNote,
} = require("../controllers/NoteController");

const router = express.Router();

router.use(RequireAuth);
router.get("/", listNotes);
router.post("/", createNote);
router.post("/migrate", migrateLegacyNotes);
router.patch("/:noteId", updateNote);
router.delete("/:noteId", deleteNote);

module.exports = router;
