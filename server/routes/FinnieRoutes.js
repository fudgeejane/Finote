const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const { chat } = require("../controllers/FinnieController");

const router = express.Router();
router.use(RequireAuth);
router.post("/chat", chat);

module.exports = router;
