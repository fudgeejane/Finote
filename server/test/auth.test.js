const assert = require("node:assert/strict");
const { once } = require("node:events");
const { after, before, beforeEach, test } = require("node:test");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const mongoose = require("mongoose");
const Module = require("node:module");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.CODE_PEPPER = "test-only-code-pepper";
process.env.JWT_ACCESS_SECRET = "test-only-jwt-secret";

const verificationMessages = [];
const resetMessages = [];
const emailServicePath = require.resolve("../services/EmailService");
const emailServiceModule = new Module(emailServicePath, module);
emailServiceModule.filename = emailServicePath;
emailServiceModule.loaded = true;
emailServiceModule.exports = {
  sendVerificationEmail: async (email, code) => {
    verificationMessages.push({ email, code });
  },
  sendPasswordResetEmail: async (email, code) => {
    resetMessages.push({ email, code });
  },
};
require.cache[emailServicePath] = emailServiceModule;

const AuthController = require("../controllers/AuthController");
const { hashCode } = require("../emails/OneTimeCode");
const User = require("../models/User");
const Session = require("../models/Session");
const AuthRoutes = require("../routes/AuthRoutes");

let mongo;
let server;
let baseUrl;

function makeRequest(body = {}, extras = {}) {
  return {
    body,
    cookies: {},
    get: (name) => (name === "user-agent" ? "auth-test-agent" : ""),
    ...extras,
  };
}

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    clearedCookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    },
  };
}

async function call(handler, body, extras = {}) {
  const response = makeResponse();
  await handler(makeRequest(body, extras), response);
  return response;
}

before(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 30_000 },
  });
  await mongoose.connect(mongo.getUri());

  const app = express();
  app.use(express.json());
  app.use("/api/auth", AuthRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  verificationMessages.length = 0;
  resetMessages.length = 0;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("registration, verification, login, refresh, and logout persist correctly", async () => {
  const email = "auth-flow@example.test";
  const registration = await call(AuthController.register, {
    email,
    password: "Test-password-123",
  });
  assert.equal(registration.statusCode, 201);
  assert.equal(verificationMessages.length, 1);

  const code = verificationMessages[0].code;
  const verified = await call(AuthController.verifyEmail, { email, code });
  assert.equal(verified.statusCode, 200);

  const alreadyVerified = await call(AuthController.verifyEmail, { email, code });
  assert.equal(alreadyVerified.statusCode, 200);

  const login = await call(AuthController.login, {
    email,
    password: "Test-password-123",
    rememberMe: false,
  });
  assert.equal(login.statusCode, 200);
  assert.ok(login.body.accessToken);

  const cookieName = process.env.COOKIE_NAME || "finote_refresh";
  const oldRefreshToken = login.cookies[cookieName].value;
  const refreshed = await call(
    AuthController.refresh,
    {},
    { cookies: { [cookieName]: oldRefreshToken } }
  );
  assert.equal(refreshed.statusCode, 200);
  assert.ok(refreshed.body.accessToken);

  const newRefreshToken = refreshed.cookies[cookieName].value;
  assert.notEqual(newRefreshToken, oldRefreshToken);
  assert.equal(await Session.countDocuments({}), 1);

  const oldTokenReuse = await call(
    AuthController.refresh,
    {},
    { cookies: { [cookieName]: oldRefreshToken } }
  );
  assert.equal(oldTokenReuse.statusCode, 401);

  const replayedSession = await Session.findOne({});
  assert.equal(replayedSession.revokeReason, "reuse");
  assert.ok(replayedSession.revokedAt);

  const secondLogin = await call(AuthController.login, {
    email,
    password: "Test-password-123",
    rememberMe: false,
  });
  assert.equal(secondLogin.statusCode, 200);

  const logout = await call(
    AuthController.logout,
    {},
    { cookies: { [cookieName]: secondLogin.cookies[cookieName].value } }
  );
  assert.equal(logout.statusCode, 200);

  const session = await Session.findOne({}).sort({ createdAt: -1 });
  assert.ok(session.revokedAt);
  assert.equal(session.revokeReason, "logout");
});

test("login sends users with required contact details but unfinished setup to profile setup", async () => {
  const password = "Test-password-123";
  await User.create({
    email: "profile-setup@example.test",
    passwordHash: await bcrypt.hash(password, 12),
    emailVerifiedAt: new Date(),
    firstName: "Anne",
    lastName: "Smith",
    contactNumber: "+639171234567",
  });

  const login = await call(AuthController.login, {
    email: "profile-setup@example.test",
    password,
  });

  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.profileComplete, false);
});

test("password reset verifies the code, changes the password, and revokes sessions", async () => {
  const email = "reset-flow@example.test";
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash("Old-password-123", 4),
    emailVerifiedAt: new Date(),
  });

  await Session.create({
    user: user._id,
    refreshTokenHash: crypto.randomBytes(32).toString("hex"),
    sessionId: crypto.randomUUID(),
    familyId: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 60_000),
  });

  const request = await call(AuthController.forgotPassword, { email });
  assert.equal(request.statusCode, 200);
  assert.equal(resetMessages.length, 1);

  const code = resetMessages[0].code;
  const verification = await call(AuthController.verifyResetCode, { email, code });
  assert.equal(verification.statusCode, 200);

  const reset = await call(AuthController.resetPassword, {
    email,
    code,
    newPassword: "New-password-456",
  });
  assert.equal(reset.statusCode, 200);

  const savedUser = await User.findById(user._id).select("+passwordHash");
  assert.equal(
    await bcrypt.compare("New-password-456", savedUser.passwordHash),
    true
  );

  const session = await Session.findOne({});
  assert.equal(session.revokeReason, "password-reset");
  assert.ok(session.revokedAt);

  const reusedCode = await call(AuthController.resetPassword, {
    email,
    code,
    newPassword: "Another-password-789",
  });
  assert.equal(reusedCode.statusCode, 400);
});

test("verification limits failed attempts by email and IP", async () => {
  const email = "verification-limit@example.test";
  await User.create({
    email,
    passwordHash: await bcrypt.hash("Test-password-123", 4),
    emailVerificationCodeHash: hashCode("123456"),
    emailVerificationExpiresAt: new Date(Date.now() + 60_000),
  });

  const submitVerification = (requestEmail) =>
    fetch(`${baseUrl}/api/auth/verify-email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: requestEmail, code: "000000" }),
    });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await submitVerification(email);
    assert.equal(response.status, 400);
  }

  const emailLimited = await submitVerification(email);
  assert.equal(emailLimited.status, 429);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await submitVerification(`ip-limit-${attempt}@example.test`);
    assert.equal(response.status, 400);
  }

  const ipLimited = await submitVerification("ip-limit-final@example.test");
  assert.equal(ipLimited.status, 429);
});

test("forgot-password is registered only once", () => {
  const registrations = AuthRoutes.stack.filter(
    ({ route }) => route?.path === "/forgot-password"
  );
  assert.equal(registrations.length, 1);
});
