const crypto = require("node:crypto");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const getCloudinary = require("../config/cloudinary");
const {
  getProfileCompletionPercentage,
  isValidName,
} = require("../services/ProfileCompletion");
const { searchAddresses } = require("../services/AddressLookup");

const additionalInfoFields = {
  school: 120,
  course: 120,
  yearLevel: 40,
  occupation: 120,
  skillsOrQualifications: 500,
  employer: 120,
  educationDetails: 500,
  professionalExperience: 500,
};
const addressFields = {
  houseBuildingNumber: 80,
  street: 120,
  barangay: 120,
  cityMunicipality: 120,
  province: 120,
  postalCode: 20,
  country: 80,
};
const allowedGenders = new Set(["", "male", "female", "prefer_not_to_say"]);
const allowedProfileTypes = new Set(["student", "professional"]);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function readString(value, fallback, label, maxLength) {
  const candidate = value === undefined ? fallback : value;
  if (candidate === null) return "";
  if (typeof candidate !== "string") {
    throw validationError(`${label} must be a text value.`);
  }

  const result = candidate.trim();
  if (result.length > maxLength) {
    throw validationError(`${label} must be ${maxLength} characters or fewer.`);
  }
  return result;
}

function readYearsExperience(value, fallback) {
  const candidate = value === undefined ? fallback : value;
  if (candidate === null || candidate === "") return null;
  if (
    (typeof candidate !== "string" && typeof candidate !== "number") ||
    !/^\d{1,2}$/.test(String(candidate).trim()) ||
    Number(candidate) > 80
  ) {
    throw validationError("Years of experience must be a whole number from 0 to 80.");
  }
  return Number(candidate);
}

function getDocumentValue(value) {
  return value?.toObject ? value.toObject() : value || {};
}

function isValidDateOfBirth(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

function getPublicProfile(user) {
  const profileCompletionPercentage = getProfileCompletionPercentage(user);

  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    profileType: user.profileType,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    contactNumber: user.contactNumber,
    address: user.address,
    additionalInfo: user.additionalInfo,
    profilePictureUrl: user.profilePictureUrl,
    emailVerified: Boolean(user.emailVerifiedAt),
    profileComplete:
      profileCompletionPercentage === 100 &&
      Boolean(user.profileSetupCompleted),
    profileCompletionPercentage,
  };
}

function validateAddress(address) {
  const hasAddressDetails = Object.entries(address).some(
    ([field, value]) => field !== "country" && value
  );
  if (!hasAddressDetails) {
    return Object.fromEntries(Object.keys(addressFields).map((field) => [field, ""]));
  }

  const requiredFields = ["street", "cityMunicipality", "province", "country"];
  if (requiredFields.some((field) => !address[field])) {
    throw validationError(
      "Complete the street, city or municipality, province, and country for your address."
    );
  }
  return address;
}

function uploadToCloudinary(cloudinary, buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: false,
        resource_type: "image",
        transformation: [{ width: 512, height: 512, crop: "limit" }],
      },
      (error, uploadedImage) => {
        if (error) return reject(error);
        resolve(uploadedImage);
      }
    );
    stream.end(buffer);
  });
}

function deleteFromCloudinary(cloudinary, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      if (!["ok", "not found"].includes(result?.result)) {
        return reject(new Error("Cloudinary did not confirm image deletion."));
      }
      resolve();
    });
  });
}

function hasValidImageSignature(file) {
  const { buffer, mimetype } = file;
  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (mimetype === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

async function completeProfile(req, res) {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw validationError("Profile data must be an object.");
    }

    const firstName = readString(body.firstName, req.user.firstName, "First name", 80);
    const middleName = readString(body.middleName, req.user.middleName, "Middle name", 80);
    const lastName = readString(body.lastName, req.user.lastName, "Last name", 80);
    const profileType = readString(
      body.profileType,
      req.user.profileType || "student",
      "Profile type",
      20
    );
    const contactInput = readString(
      body.contactNumber,
      req.user.contactNumber,
      "Contact number",
      32
    );
    const dateOfBirth = readString(
      body.dateOfBirth,
      req.user.dateOfBirth,
      "Date of birth",
      10
    );
    const gender = readString(body.gender, req.user.gender, "Gender", 32);

    if (firstName && !isValidName(firstName)) {
      throw validationError(
        "First name may contain letters, spaces, apostrophes, and hyphens only."
      );
    }
    if (middleName && !isValidName(middleName)) {
      throw validationError(
        "Middle name may contain letters, spaces, apostrophes, and hyphens only."
      );
    }
    if (lastName && !isValidName(lastName)) {
      throw validationError(
        "Last name may contain letters, spaces, apostrophes, and hyphens only."
      );
    }
    if (!isValidDateOfBirth(dateOfBirth)) {
      throw validationError("Enter a valid date of birth that is not in the future.");
    }
    if (!allowedGenders.has(gender)) {
      throw validationError("Choose a valid gender option.");
    }
    if (!allowedProfileTypes.has(profileType)) {
      throw validationError("Choose Student or Professional.");
    }

    let contactNumber = "";
    if (contactInput) {
      const parsedNumber = parsePhoneNumberFromString(contactInput, "PH");
      if (!parsedNumber?.isValid()) {
        throw validationError("Enter a valid mobile number.");
      }
      contactNumber = parsedNumber.number;
    }

    const existingInfo = getDocumentValue(req.user.additionalInfo);
    const infoInput = body.additionalInfo;
    if (
      infoInput !== undefined &&
      (!infoInput || typeof infoInput !== "object" || Array.isArray(infoInput))
    ) {
      throw validationError("Educational and professional information must be an object.");
    }
    const additionalInfo = { ...existingInfo };
    for (const [field, maxLength] of Object.entries(additionalInfoFields)) {
      if (infoInput && Object.hasOwn(infoInput, field)) {
        additionalInfo[field] = readString(
          infoInput[field],
          "",
          field,
          maxLength
        );
      }
    }
    if (infoInput && Object.hasOwn(infoInput, "yearsExperience")) {
      additionalInfo.yearsExperience = readYearsExperience(
        infoInput.yearsExperience,
        existingInfo.yearsExperience
      );
    }

    const existingAddress = getDocumentValue(req.user.address);
    const addressInput = body.address;
    if (
      addressInput !== undefined &&
      (!addressInput || typeof addressInput !== "object" || Array.isArray(addressInput))
    ) {
      throw validationError("Address information must be an object.");
    }
    const address = { ...existingAddress };
    for (const [field, maxLength] of Object.entries(addressFields)) {
      if (addressInput && Object.hasOwn(addressInput, field)) {
        address[field] = readString(addressInput[field], "", field, maxLength);
      }
    }
    const validatedAddress = addressInput
      ? validateAddress(address)
      : address;

    req.user.firstName = firstName;
    req.user.middleName = middleName;
    req.user.lastName = lastName;
    req.user.profileType = profileType;
    req.user.dateOfBirth = dateOfBirth;
    req.user.gender = gender;
    req.user.contactNumber = contactNumber;
    req.user.address = validatedAddress;
    req.user.additionalInfo = additionalInfo;

    const profileCompletionPercentage = getProfileCompletionPercentage(req.user);
    req.user.profileSetupCompleted = profileCompletionPercentage === 100;
    req.user.profileCompletedAt =
      profileCompletionPercentage === 100
        ? req.user.profileCompletedAt || new Date()
        : null;

    await req.user.save();

    return res.status(200).json({
      message:
        profileCompletionPercentage === 100
          ? "Profile completed."
          : "Profile progress saved.",
      user: getPublicProfile(req.user),
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Profile completion failed:", error.message);
    return res.status(500).json({ error: "Could not save profile." });
  }
}

async function uploadProfilePicture(req, res) {
  if (!req.file || !hasValidImageSignature(req.file)) {
    return res.status(400).json({
      error: "Select a valid JPEG, PNG, or WebP image smaller than 5 MB.",
    });
  }

  const previousUrl = req.user.profilePictureUrl;
  const previousPublicId = req.user.profilePicturePublicId;
  const publicId = `finote_profile_pictures/${req.user._id}/${crypto
    .randomBytes(12)
    .toString("hex")}`;

  try {
    const cloudinary = getCloudinary();
    const uploadedImage = await uploadToCloudinary(
      cloudinary,
      req.file.buffer,
      publicId
    );
    if (!uploadedImage?.secure_url || !uploadedImage.public_id) {
      throw new Error("Cloudinary returned incomplete image information.");
    }

    req.user.profilePictureUrl = uploadedImage.secure_url;
    req.user.profilePicturePublicId = uploadedImage.public_id;
    try {
      await req.user.save();
    } catch (databaseError) {
      req.user.profilePictureUrl = previousUrl;
      req.user.profilePicturePublicId = previousPublicId;

      try {
        await deleteFromCloudinary(cloudinary, uploadedImage.public_id);
      } catch (cleanupError) {
        console.error("Uncommitted profile picture cleanup failed:", cleanupError.message);
        return res.status(500).json({
          error:
            "Could not save the new profile picture. Your previous picture is retained, but the uploaded file could not be cleaned up.",
        });
      }
      throw databaseError;
    }

    let cleanupWarning;
    if (previousPublicId && previousPublicId !== uploadedImage.public_id) {
      try {
        await deleteFromCloudinary(cloudinary, previousPublicId);
      } catch (cleanupError) {
        console.error("Previous profile picture cleanup failed:", cleanupError.message);
        cleanupWarning =
          "The new picture was saved, but the previous picture could not be removed.";
      }
    }

    return res.status(200).json({
      message: "Profile picture saved.",
      ...(cleanupWarning ? { warning: cleanupWarning } : {}),
      user: { profilePictureUrl: req.user.profilePictureUrl },
    });
  } catch (error) {
    console.error("Profile picture upload failed:", error.message);
    return res.status(500).json({
      error: "Could not save the new profile picture. Your previous picture is unchanged.",
    });
  }
}

async function deleteProfilePicture(req, res) {
  const previousUrl = req.user.profilePictureUrl;
  const previousPublicId = req.user.profilePicturePublicId;
  if (!previousPublicId) {
    return res.status(404).json({ error: "There is no profile picture to delete." });
  }

  try {
    const cloudinary = getCloudinary();
    req.user.profilePictureUrl = "";
    req.user.profilePicturePublicId = "";
    await req.user.save();

    try {
      await deleteFromCloudinary(cloudinary, previousPublicId);
    } catch (deletionError) {
      req.user.profilePictureUrl = previousUrl;
      req.user.profilePicturePublicId = previousPublicId;
      try {
        await req.user.save();
      } catch (restoreError) {
        console.error("Profile picture reference restore failed:", restoreError.message);
        return res.status(500).json({
          error:
            "Could not delete the profile picture or restore its database reference. Reload your profile before trying again.",
        });
      }

      console.error("Profile picture deletion failed:", deletionError.message);
      return res.status(502).json({
        error: "Could not delete the profile picture. Your previous picture was restored.",
      });
    }

    return res.status(200).json({
      message: "Profile picture deleted.",
      user: { profilePictureUrl: "" },
    });
  } catch (error) {
    req.user.profilePictureUrl = previousUrl;
    req.user.profilePicturePublicId = previousPublicId;
    console.error("Profile picture deletion failed:", error.message);
    return res.status(500).json({ error: "Could not delete the profile picture." });
  }
}

async function searchAddress(req, res) {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  if (query.length < 3 || query.length > 200) {
    return res.status(400).json({
      error: "Address searches must be 3 to 200 characters.",
    });
  }

  try {
    const results = await searchAddresses(query);
    return res.status(200).json({ results });
  } catch (error) {
    console.error("Address lookup failed:", error.message);
    return res.status(503).json({
      error: "Address search is temporarily unavailable. You can enter the address manually.",
    });
  }
}

function getProfile(req, res) {
  return res.status(200).json({ user: getPublicProfile(req.user) });
}

module.exports = {
  completeProfile,
  deleteProfilePicture,
  getProfile,
  searchAddress,
  uploadProfilePicture,
};
