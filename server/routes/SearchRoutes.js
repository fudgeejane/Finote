const express = require("express");
const RequireAuth = require("../middlewares/RequireAuth");
const { search } = require("../controllers/SearchController");
const router = express.Router();
router.use(RequireAuth);
router.get("/", search);
module.exports = router;
