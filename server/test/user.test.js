const assert = require("node:assert/strict");
const { test } = require("node:test");
const { v2: cloudinary } = require("cloudinary");

process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-api-key";
process.env.CLOUDINARY_API_SECRET = "test-api-secret";

const {
  completeProfile,
  deleteProfilePicture,
  uploadProfilePicture,
} = require("../controllers/UserController");
const { searchAddresses } = require("../services/AddressLookup");

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function makeUser(overrides = {}) {
  return {
    _id: "test-user-id",
    email: "user@example.test",
    firstName: "",
    middleName: "",
    lastName: "",
    profileType: "student",
    dateOfBirth: "",
    gender: "",
    contactNumber: "",
    address: {},
    additionalInfo: {
      school: "Existing school",
      course: "",
      yearLevel: "",
      occupation: "",
      employer: "",
      yearsExperience: null,
      educationDetails: "",
      professionalExperience: "",
      skillsOrQualifications: "",
    },
    profilePictureUrl: "",
    profilePicturePublicId: "",
    profileCompletedAt: null,
    profileSetupCompleted: false,
    async save() {},
    ...overrides,
  };
}

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

test("partial profile saves preserve optional data and report completion progress", async () => {
  const req = {
    body: {
      firstName: "Anne-Marie",
      lastName: "O'Neil",
      contactNumber: "",
    },
    user: makeUser(),
  };
  const res = makeResponse();

  await completeProfile(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.profileComplete, false);
  assert.equal(res.body.user.profileCompletionPercentage, 67);
  assert.equal(req.user.profileCompletedAt, null);
  assert.equal(req.user.profileSetupCompleted, false);
  assert.equal(req.user.additionalInfo.school, "Existing school");
});

test("complete profile normalizes phone and stores structured optional fields", async () => {
  const req = {
    body: {
      firstName: "Ana",
      middleName: "Maria",
      lastName: "Dela Cruz",
      profileType: "professional",
      contactNumber: "+639171234567",
      dateOfBirth: "2000-01-02",
      gender: "female",
      address: {
        street: "Rizal Street",
        cityMunicipality: "Cebu City",
        province: "Cebu",
        country: "Philippines",
      },
      additionalInfo: {
        occupation: "Tutor",
        employer: "Finote",
        yearsExperience: "4",
        professionalExperience: "Tutoring for four years",
      },
    },
    user: makeUser(),
  };
  const res = makeResponse();

  await completeProfile(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.profileComplete, true);
  assert.equal(res.body.user.profileCompletionPercentage, 100);
  assert.equal(req.user.profileSetupCompleted, true);
  assert.equal(req.user.contactNumber, "+639171234567");
  assert.equal(req.user.profileType, "professional");
  assert.equal(req.user.additionalInfo.school, "Existing school");
  assert.equal(req.user.additionalInfo.occupation, "Tutor");
  assert.equal(req.user.additionalInfo.yearsExperience, 4);
  assert.equal(
    req.user.additionalInfo.professionalExperience,
    "Tutoring for four years"
  );
  assert.equal(req.user.address.cityMunicipality, "Cebu City");
});

test("profile validation rejects invalid phone numbers and incomplete addresses", async () => {
  const invalidPhoneResponse = makeResponse();
  await completeProfile(
    {
      body: { firstName: "Ana", lastName: "Santos", contactNumber: "123" },
      user: makeUser(),
    },
    invalidPhoneResponse
  );
  assert.equal(invalidPhoneResponse.statusCode, 400);

  const incompleteAddressResponse = makeResponse();
  await completeProfile(
    {
      body: {
        firstName: "Ana",
        lastName: "Santos",
        contactNumber: "",
        address: { street: "Rizal Street", country: "Philippines" },
      },
      user: makeUser(),
    },
    incompleteAddressResponse
  );
  assert.equal(incompleteAddressResponse.statusCode, 400);

  const invalidExperienceResponse = makeResponse();
  await completeProfile(
    {
      body: {
        firstName: "Ana",
        lastName: "Santos",
        contactNumber: "",
        additionalInfo: { yearsExperience: "100" },
      },
      user: makeUser(),
    },
    invalidExperienceResponse
  );
  assert.equal(invalidExperienceResponse.statusCode, 400);
});

test("profile picture replacement saves the new image before deleting the old one", async () => {
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;
  const actions = [];
  let newPublicId;
  const req = {
    file: { buffer: validPng, mimetype: "image/png" },
    user: makeUser({
      profilePictureUrl: "https://res.cloudinary.com/test/old.png",
      profilePicturePublicId: "old-profile-picture",
      async save() {
        actions.push("save");
      },
    }),
  };
  const res = makeResponse();

  cloudinary.uploader.upload_stream = (options, callback) => {
    newPublicId = options.public_id;
    assert.equal(options.overwrite, false);
    return {
      end(buffer) {
        assert.equal(buffer, validPng);
        actions.push("upload");
        callback(null, {
          secure_url: "https://res.cloudinary.com/test/new.png",
          public_id: newPublicId,
        });
      },
    };
  };
  cloudinary.uploader.destroy = (publicId, callback) => {
    actions.push(`delete:${publicId}`);
    callback(null, { result: "ok" });
  };

  try {
    await uploadProfilePicture(req, res);
  } finally {
    cloudinary.uploader.upload_stream = originalUploadStream;
    cloudinary.uploader.destroy = originalDestroy;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(req.user.profilePictureUrl, "https://res.cloudinary.com/test/new.png");
  assert.notEqual(newPublicId, "old-profile-picture");
  assert.deepEqual(actions, [
    "upload",
    "save",
    "delete:old-profile-picture",
  ]);
});

test("profile picture upload rejects a spoofed image MIME type", async () => {
  const res = makeResponse();

  await uploadProfilePicture(
    {
      file: { buffer: Buffer.from("not an image"), mimetype: "image/png" },
      user: makeUser(),
    },
    res
  );

  assert.equal(res.statusCode, 400);
});

test("failed profile picture save keeps the old reference and removes the new upload", async () => {
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;
  let newPublicId;
  let deletedPublicId;
  const req = {
    file: { buffer: validPng, mimetype: "image/png" },
    user: makeUser({
      profilePictureUrl: "https://res.cloudinary.com/test/old.png",
      profilePicturePublicId: "old-profile-picture",
      async save() {
        throw new Error("database unavailable");
      },
    }),
  };
  const res = makeResponse();

  cloudinary.uploader.upload_stream = (options, callback) => {
    newPublicId = options.public_id;
    return {
      end() {
        callback(null, {
          secure_url: "https://res.cloudinary.com/test/new.png",
          public_id: newPublicId,
        });
      },
    };
  };
  cloudinary.uploader.destroy = (publicId, callback) => {
    deletedPublicId = publicId;
    callback(null, { result: "ok" });
  };

  try {
    await uploadProfilePicture(req, res);
  } finally {
    cloudinary.uploader.upload_stream = originalUploadStream;
    cloudinary.uploader.destroy = originalDestroy;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(req.user.profilePictureUrl, "https://res.cloudinary.com/test/old.png");
  assert.equal(req.user.profilePicturePublicId, "old-profile-picture");
  assert.equal(deletedPublicId, newPublicId);
});

test("profile picture deletion clears its reference only for the authenticated user's asset", async () => {
  const originalDestroy = cloudinary.uploader.destroy;
  let deletedPublicId;
  const req = {
    body: { publicId: "another-users-picture" },
    user: makeUser({
      profilePictureUrl: "https://res.cloudinary.com/test/avatar.png",
      profilePicturePublicId: "user-owned-picture",
    }),
  };
  const res = makeResponse();

  cloudinary.uploader.destroy = (publicId, callback) => {
    deletedPublicId = publicId;
    callback(null, { result: "ok" });
  };

  try {
    await deleteProfilePicture(req, res);
  } finally {
    cloudinary.uploader.destroy = originalDestroy;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(deletedPublicId, "user-owned-picture");
  assert.equal(req.user.profilePictureUrl, "");
  assert.equal(req.user.profilePicturePublicId, "");
});

test("failed profile picture deletion restores the saved reference", async () => {
  const originalDestroy = cloudinary.uploader.destroy;
  const savedPictures = [];
  const req = {
    user: makeUser({
      profilePictureUrl: "https://res.cloudinary.com/test/avatar.png",
      profilePicturePublicId: "user-owned-picture",
      async save() {
        savedPictures.push(this.profilePicturePublicId);
      },
    }),
  };
  const res = makeResponse();

  cloudinary.uploader.destroy = (publicId, callback) => {
    callback(new Error("Cloudinary unavailable"));
  };

  try {
    await deleteProfilePicture(req, res);
  } finally {
    cloudinary.uploader.destroy = originalDestroy;
  }

  assert.equal(res.statusCode, 502);
  assert.deepEqual(savedPictures, ["", "user-owned-picture"]);
  assert.equal(req.user.profilePictureUrl, "https://res.cloudinary.com/test/avatar.png");
  assert.equal(req.user.profilePicturePublicId, "user-owned-picture");
});

test("Nominatim address results are mapped and cached", async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async (url, options) => {
    fetchCount += 1;
    assert.match(url.toString(), /format=jsonv2/);
    assert.match(options.headers["user-agent"], /Finote/);
    return {
      ok: true,
      async json() {
        return [
          {
            place_id: 42,
            display_name: "Rizal Street, Cebu City, Philippines",
            address: {
              house_number: "12",
              road: "Rizal Street",
              suburb: "Barangay Santo Niño",
              city: "Cebu City",
              state: "Cebu",
              postcode: "6000",
              country: "Philippines",
            },
          },
        ];
      },
    };
  };

  try {
    const firstResults = await searchAddresses("Rizal Street Cebu");
    const cachedResults = await searchAddresses("rizal   street cebu");

    assert.equal(fetchCount, 1);
    assert.equal(firstResults[0].placeId, 42);
    assert.equal(firstResults[0].barangay, "Barangay Santo Niño");
    assert.deepEqual(cachedResults, firstResults);
  } finally {
    global.fetch = originalFetch;
  }
});
