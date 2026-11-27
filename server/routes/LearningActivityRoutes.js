const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const { record, summary } = require("../controllers/LearningActivityController");
const router = express.Router();
router.use(RequireAuth);
router.get("/", summary);
router.post("/", record);
module.exports = router;
