const assert = require("node:assert/strict");
const { once } = require("node:events");
const { after, afterEach, before, beforeEach, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const Notebook = require("../models/Notebook");
const Note = require("../models/Note");
const StudyMaterial = require("../models/StudyMaterial");
const GeminiStudyTools = require("../services/GeminiStudyTools");
const StudyMaterialRoutes = require("../routes/StudyMaterialRoutes");

process.env.JWT_ACCESS_SECRET = "test-only-study-material-jwt-secret";

let mongo;
let server;
let baseUrl;
let firstUser;
let secondUser;
let firstToken;
let secondToken;
let notebook;
let firstNote;
const originalGenerate = GeminiStudyTools.generateStudyMaterial;

async function createUser(email) {
  return User.create({
    email,
    passwordHash: "test-password-hash",
    emailVerifiedAt: new Date(),
    tokenVersion: 0,
  });
}

function tokenFor(user) {
  return jwt.sign(
    { sub: String(user._id), typ: "access", tokenVersion: user.tokenVersion },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "5m" }
  );
}

async function request(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return { status: response.status, body: await response.json() };
}

function examQuestions(count = 2) {
  return Array.from({ length: count }, (_, index) => ({
    type: index ? "Identification" : "Multiple Choice",
    prompt: `Question ${index + 1}`,
    ...(index ? {} : { options: ["Option A", "Option B"] }),
    answer: index ? "Answer B" : "Option A",
    explanation: "Supported by the selected note.",
  }));
}

before(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 30_000 },
  });
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    Notebook.init(),
    Note.init(),
    StudyMaterial.init(),
  ]);

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/study-materials", StudyMaterialRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  GeminiStudyTools.generateStudyMaterial = originalGenerate;
  await StudyMaterial.deleteMany({});
  await Note.deleteMany({});
  await Notebook.deleteMany({});
  await User.deleteMany({});
  firstUser = await createUser("first-study@example.test");
  secondUser = await createUser("second-study@example.test");
  firstToken = tokenFor(firstUser);
  secondToken = tokenFor(secondUser);
  notebook = await Notebook.create({ user: firstUser._id, name: "Biology" });
  firstNote = await Note.create({
    user: firstUser._id,
    notebook: notebook._id,
    title: "Cell structure",
    content: "<p>Cells are the basic units of life.</p>",
  });
});

afterEach(() => {
  GeminiStudyTools.generateStudyMaterial = originalGenerate;
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

test("generates and persists owner-scoped mock exams with validated questions", async () => {
  let generationInput;
  GeminiStudyTools.generateStudyMaterial = async (input) => {
    generationInput = input;
    return { questions: examQuestions() };
  };

  const created = await request("/api/study-materials/generate", firstToken, {
    method: "POST",
    body: JSON.stringify({
      type: "mock-exams",
      title: "Cell exam",
      notebookId: String(notebook._id),
      noteIds: [String(firstNote._id)],
      totalQuestions: 2,
    }),
  });

  assert.equal(created.status, 201);
  assert.equal(generationInput.totalQuestions, 2);
  assert.equal(generationInput.notes[0].content, firstNote.content);
  assert.equal(created.body.material.questions.length, 2);
  assert.equal(created.body.material.questions[0].options.length, 2);
  const saved = await StudyMaterial.findById(created.body.material.id).lean();
  assert.equal(String(saved.user), String(firstUser._id));
  assert.equal(String(saved.sourceNotebook), String(notebook._id));

  const ownList = await request("/api/study-materials?type=mock-exams", firstToken);
  const otherList = await request("/api/study-materials", secondToken);
  assert.equal(ownList.body.materials.length, 1);
  assert.equal(otherList.body.materials.length, 0);
  assert.equal(
    (await request(`/api/study-materials/${created.body.material.id}`, firstToken)).status,
    200
  );
  assert.equal(
    (await request(`/api/study-materials/${created.body.material.id}`, secondToken)).status,
    404
  );
  assert.equal((await request("/api/study-materials")).status, 401);
});

test("generates flashcards and allows only the creator to rename or delete", async () => {
  GeminiStudyTools.generateStudyMaterial = async () => ({
    cards: [{ question: "What are cells?", answer: "The basic units of life." }],
  });
  const created = await request("/api/study-materials/generate", firstToken, {
    method: "POST",
    body: JSON.stringify({
      type: "flashcards",
      title: "Cell cards",
      notebookId: String(notebook._id),
      noteIds: [String(firstNote._id)],
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.material.cards[0].answer, "The basic units of life.");

  const materialId = created.body.material.id;
  assert.equal(
    (await request(`/api/study-materials/${materialId}`, secondToken, {
      method: "PATCH",
      body: JSON.stringify({ title: "Stolen" }),
    })).status,
    404
  );
  assert.equal(
    (await request(`/api/study-materials/${materialId}`, secondToken, {
      method: "DELETE",
    })).status,
    404
  );
  const renamed = await request(`/api/study-materials/${materialId}`, firstToken, {
    method: "PATCH",
    body: JSON.stringify({ title: "Updated cards" }),
  });
  assert.equal(renamed.body.material.title, "Updated cards");
  assert.equal(
    (await request(`/api/study-materials/${materialId}`, firstToken, {
      method: "DELETE",
    })).status,
    200
  );
  assert.equal(await StudyMaterial.countDocuments({}), 0);
});

test("rejects notes from another notebook and does not call Gemini", async () => {
  const otherNotebook = await Notebook.create({
    user: firstUser._id,
    name: "Chemistry",
  });
  const otherNote = await Note.create({
    user: firstUser._id,
    notebook: otherNotebook._id,
    title: "Atoms",
    content: "Atoms contain protons and neutrons.",
  });
  let called = false;
  GeminiStudyTools.generateStudyMaterial = async () => {
    called = true;
    return { cards: [{ question: "Q", answer: "A" }] };
  };
  const response = await request("/api/study-materials/generate", firstToken, {
    method: "POST",
    body: JSON.stringify({
      type: "flashcards",
      title: "Invalid source",
      notebookId: String(notebook._id),
      noteIds: [String(otherNote._id)],
    }),
  });
  assert.equal(response.status, 404);
  assert.equal(called, false);
  assert.equal(await StudyMaterial.countDocuments({}), 0);
});

test("does not save generated material when Gemini output fails validation", async () => {
  GeminiStudyTools.generateStudyMaterial = async () => ({
    questions: examQuestions(1),
  });
  const response = await request("/api/study-materials/generate", firstToken, {
    method: "POST",
    body: JSON.stringify({
      type: "mock-exams",
      title: "Incomplete exam",
      notebookId: String(notebook._id),
      noteIds: [String(firstNote._id)],
      totalQuestions: 2,
    }),
  });
  assert.equal(response.status, 400);
  assert.equal(await StudyMaterial.countDocuments({}), 0);
});

test("returns a retry-friendly message when Gemini is overloaded", async () => {
  GeminiStudyTools.generateStudyMaterial = async () => {
    const error = new Error(
      "Gemini API returned HTTP 503: This model is currently experiencing high demand."
    );
    error.statusCode = 503;
    error.code = "AI_CAPACITY";
    throw error;
  };
  const response = await request("/api/study-materials/generate", firstToken, {
    method: "POST",
    body: JSON.stringify({
      type: "mock-exams",
      title: "Retry test",
      notebookId: String(notebook._id),
      noteIds: [String(firstNote._id)],
      totalQuestions: 2,
    }),
  });
  assert.equal(response.status, 503);
  assert.match(response.body.error, /temporarily busy/);
  assert.doesNotMatch(response.body.error, /Gemini API returned HTTP 503/);
  assert.equal(await StudyMaterial.countDocuments({}), 0);
});
