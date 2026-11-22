const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const { completeProfile, getProfile } = require("../controllers/UserController");

const router = express.Router();

router.get("/me", RequireAuth, getProfile);
router.put("/complete-profile", RequireAuth, completeProfile);

module.exports = router;