const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const {
  createNotebook,
  deleteNotebook,
  getNotebook,
  listNotebooks,
  updateNotebook,
} = require("../controllers/NotebookController");

const router = express.Router();

router.use(RequireAuth);
router.get("/", listNotebooks);
router.post("/", createNotebook);
router.get("/:notebookId", getNotebook);
router.patch("/:notebookId", updateNotebook);
router.delete("/:notebookId", deleteNotebook);

module.exports = router;
