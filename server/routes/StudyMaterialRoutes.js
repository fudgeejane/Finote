const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const {
  generate,
  getById,
  list,
  remove,
  update,
  readProgress,
  saveProgress,
  saveAttempt,
  createMissedFlashcards,
} = require("../controllers/StudyMaterialController");

const router = express.Router();

router.use(RequireAuth);
router.get("/", list);
router.get("/:materialId", getById);
router.post("/generate", generate);
router.get("/:materialId/progress", readProgress);
router.put("/:materialId/progress", saveProgress);
router.post("/:materialId/attempts", saveAttempt);
router.post("/:materialId/missed-flashcards", createMissedFlashcards);
router.patch("/:materialId", update);
router.delete("/:materialId", remove);

module.exports = router;
