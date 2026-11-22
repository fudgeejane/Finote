async function completeProfile(req, res) {
  try {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const contactNumber = String(req.body.contactNumber || "").trim();
    const additionalInfo = req.body.additionalInfo || {};

    if (!firstName || firstName.length > 80) {
      return res.status(400).json({
        error: "First name is required and must be 80 characters or fewer.",
      });
    }

    if (!lastName || lastName.length > 80) {
      return res.status(400).json({
        error: "Last name is required and must be 80 characters or fewer.",
      });
    }

    if (
      contactNumber.length < 7 ||
      contactNumber.length > 32 ||
      !/^[+\d()\-\s]+$/.test(contactNumber)
    ) {
      return res.status(400).json({ error: "Enter a valid contact number." });
    }

    if (
      typeof additionalInfo !== "object" ||
      Array.isArray(additionalInfo) ||
      additionalInfo === null
    ) {
      return res.status(400).json({ error: "Additional information must be an object." });
    }

    const school = String(additionalInfo.school || "").trim();
    const course = String(additionalInfo.course || "").trim();
    const yearLevel = String(additionalInfo.yearLevel || "").trim();

    if (school.length > 120 || course.length > 120 || yearLevel.length > 40) {
      return res.status(400).json({ error: "One or more profile fields are too long." });
    }

    req.user.firstName = firstName;
    req.user.lastName = lastName;
    req.user.contactNumber = contactNumber;
    req.user.additionalInfo = { school, course, yearLevel };
    req.user.profileCompletedAt = new Date();

    await req.user.save();

    return res.status(200).json({
      message: "Profile completed.",
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        contactNumber: req.user.contactNumber,
        additionalInfo: req.user.additionalInfo,
        profileComplete: Boolean(req.user.profileCompletedAt),
      },
    });
  } catch (error) {
    console.error("Profile completion failed:", error.message);
    return res.status(500).json({ error: "Could not save profile." });
  }
}

function getProfile(req, res) {
  return res.status(200).json({
    user: {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      contactNumber: req.user.contactNumber,
      additionalInfo: req.user.additionalInfo,
      profilePictureUrl: req.user.profilePictureUrl,
      emailVerified: Boolean(req.user.emailVerifiedAt),
      profileComplete: Boolean(req.user.profileCompletedAt),
    },
  });
}

module.exports = { completeProfile, getProfile };