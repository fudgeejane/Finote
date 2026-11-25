const express = require("express");
const multer = require("multer");
const RequireAuth = require("../middlewares/RequireAuth");
const {
  completeProfile,
  deleteProfilePicture,
  getProfile,
  searchAddress,
  uploadProfilePicture,
} = require("../controllers/UserController");

const router = express.Router();
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const parseProfilePicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) =>
    callback(null, acceptedImageTypes.has(file.mimetype)),
}).single("profilePicture");

function handleProfilePictureUpload(req, res, next) {
  parseProfilePicture(req, res, (error) => {
    if (!error) return next();
    if (!(error instanceof multer.MulterError)) return next(error);

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Profile pictures must be 5 MB or smaller."
        : "Upload one profile picture at a time.";
    return res.status(400).json({ error: message });
  });
}

router.get("/me", RequireAuth, getProfile);
router.put("/complete-profile", RequireAuth, completeProfile);
router.get("/address-search", RequireAuth, searchAddress);
router.post(
  "/profile-picture",
  RequireAuth,
  handleProfilePictureUpload,
  uploadProfilePicture
);
router.delete("/profile-picture", RequireAuth, deleteProfilePicture);

module.exports = router;