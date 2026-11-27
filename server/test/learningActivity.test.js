const assert = require("node:assert/strict");
const { once } = require("node:events");
const { after, before, beforeEach, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const Notebook = require("../models/Notebook");
const Note = require("../models/Note");
const StudyMaterial = require("../models/StudyMaterial");
const StudyProgress = require("../models/StudyProgress");
const LearningActivity = require("../models/LearningActivity");
const LearningActivityRoutes = require("../routes/LearningActivityRoutes");
const NoteRoutes = require("../routes/NoteRoutes");
const StudyMaterialRoutes = require("../routes/StudyMaterialRoutes");

process.env.JWT_ACCESS_SECRET = "test-only-learning-activity-jwt-secret";
let mongo; let server; let baseUrl; let user; let otherUser; let token; let otherToken; let note; let flashcards; let exam; let notebook;
const tokenFor = (value) => jwt.sign({ sub: String(value._id), typ: "access", tokenVersion: value.tokenVersion }, process.env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
async function createUser(email) { return User.create({ email, passwordHash: "test-password-hash", emailVerifiedAt: new Date(), tokenVersion: 0 }); }
async function request(path, auth, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(auth ? { authorization: `Bearer ${auth}` } : {}) } });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 30_000 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Note.init(), StudyMaterial.init(), StudyProgress.init(), LearningActivity.init()]);
  const app = express(); app.use(express.json()); app.use("/api/learning-activity", LearningActivityRoutes); app.use("/api/notes", NoteRoutes); app.use("/api/study-materials", StudyMaterialRoutes);
  server = app.listen(0, "127.0.0.1"); await once(server, "listening"); baseUrl = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await Promise.all([LearningActivity.deleteMany({}), StudyProgress.deleteMany({}), StudyMaterial.deleteMany({}), Note.deleteMany({}), Notebook.deleteMany({}), User.deleteMany({})]);
  user = await createUser("activity@example.test"); otherUser = await createUser("other-activity@example.test"); token = tokenFor(user); otherToken = tokenFor(otherUser);
  notebook = await Notebook.create({ user: user._id, name: "Notes" });
  note = await Note.create({ user: user._id, notebook: notebook._id, title: "Saved" });
  flashcards = await StudyMaterial.create({ user: user._id, sourceNotebook: notebook._id, type: "flashcards", title: "Cards", cards: [{ question: "Q", answer: "A" }] });
  exam = await StudyMaterial.create({ user: user._id, sourceNotebook: notebook._id, type: "mock-exams", title: "Exam", questions: [{ type: "Identification", prompt: "Q", answer: "A" }] });
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test("activity writes cannot be forged by clients", async () => {
  assert.equal((await request("/api/learning-activity", null)).status, 401);
  const foreign = await request("/api/learning-activity", otherToken, { method: "POST", body: JSON.stringify({ type: "note-created", referenceId: note.id, eventId: `note:${note.id}`, timezone: "UTC" }) });
  assert.equal(foreign.status, 410);
  const badZone = await request("/api/learning-activity", token, { method: "POST", body: JSON.stringify({ type: "note-created", referenceId: note.id, eventId: `note:${note.id}`, timezone: "Mars/Olympus" }) });
  assert.equal(badZone.status, 410);
  const body = JSON.stringify({ type: "note-created", referenceId: note.id, eventId: `note:${note.id}`, timezone: "Pacific/Kiritimati" });
  assert.equal((await request("/api/learning-activity", token, { method: "POST", body })).status, 410);
  assert.equal(await LearningActivity.countDocuments({ user: user._id }), 0);
});

test("client completion events are rejected even when source records exist", async () => {
  const flashEvent = { type: "flashcards-completed", referenceId: String(flashcards._id), eventId: `flashcards:${flashcards._id}:round`, timezone: "UTC" };
  assert.equal((await request("/api/learning-activity", token, { method: "POST", body: JSON.stringify(flashEvent) })).status, 410);
  await StudyProgress.create({ user: user._id, material: flashcards._id, state: { complete: true } });
  assert.equal((await request("/api/learning-activity", token, { method: "POST", body: JSON.stringify(flashEvent) })).status, 410);
  const examEvent = { type: "mock-exam-submitted", referenceId: String(exam._id), eventId: "exam:submission-1", timezone: "UTC" };
  assert.equal((await request("/api/learning-activity", token, { method: "POST", body: JSON.stringify(examEvent) })).status, 410);
  await StudyProgress.create({ user: user._id, material: exam._id, attempts: [{ submissionId: "submission-1", answers: {}, completedAt: new Date() }] });
  assert.equal((await request("/api/learning-activity", token, { method: "POST", body: JSON.stringify(examEvent) })).status, 410);
});

test("summary deduplicates activity days and calculates the streak in the requested timezone", async () => {
  const now = new Date();
  await LearningActivity.create([{ user: user._id, eventId: "first", type: "note-created", reference: note._id, timezone: "UTC", occurredAt: now }, { user: user._id, eventId: "second", type: "flashcards-completed", reference: flashcards._id, timezone: "UTC", occurredAt: now }]);
  const result = await request("/api/learning-activity?timezone=Pacific%2FKiritimati", token);
  assert.equal(result.status, 200);
  assert.equal(result.body.streak, 1);
  assert.equal(result.body.days.length, 7);
  assert.equal(result.body.days[0].weekday, "Monday");
  assert.equal(result.body.days.at(-1).weekday, "Sunday");
  assert.equal(result.body.days[0].date, result.body.week.start);
  assert.equal(result.body.days.at(-1).date, result.body.week.end);
  assert.equal(result.body.days.some((day) => day.active), true);
  assert.equal(result.body.timezone, "Pacific/Kiritimati");
});

test("note creation and exam submission record server-authoritative progress", async () => {
  const created = await request("/api/notes", token, { method: "POST", body: JSON.stringify({ notebookId: String(notebook._id), title: "Fresh note", timezone: "UTC" }) });
  assert.equal(created.status, 201);
  assert.equal(await LearningActivity.countDocuments({ user: user._id, type: "note-created", reference: created.body.note.id }), 1);
  const attempt = { submissionId: "stable-submission-1", answers: { Q: " A " }, score: 0, timezone: "UTC" };
  const first = await request(`/api/study-materials/${exam._id}/attempts`, token, { method: "POST", body: JSON.stringify(attempt) });
  const retry = await request(`/api/study-materials/${exam._id}/attempts`, token, { method: "POST", body: JSON.stringify(attempt) });
  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.equal(first.body.attempts.length, 1);
  assert.equal(first.body.attempts[0].score, 100);
  assert.equal(await LearningActivity.countDocuments({ user: user._id, type: "mock-exam-submitted" }), 1);
  const summary = await request("/api/learning-activity?timezone=UTC", token);
  assert.equal(summary.status, 200);
  assert.ok(summary.body.recentActivity.some((item) => item.type === "note-created" && item.href === `/notes?notebookId=${notebook._id}`));
  assert.ok(summary.body.recentActivity.some((item) => item.type === "mock-exam-submitted" && item.href === `/mock-exams/${exam._id}`));
  assert.equal(summary.body.recentActivity.some((item) => "answers" in item), false);
});

test("flashcard completion requires a full valid set of learner ratings and is idempotent", async () => {
  const material = await StudyMaterial.findById(flashcards._id);
  material.cards.push({ question: "Q2", answer: "A2" });
  await material.save();
  const route = `/api/study-materials/${material._id}/sessions`;
  const partial = await request(route, token, { method: "POST", body: JSON.stringify({ sessionId: "session-1", indices: [0, 1], ratings: { 0: "got-it" }, timezone: "UTC" }) });
  assert.equal(partial.status, 400);
  const payload = { sessionId: "session-1", indices: [1, 0], ratings: { 0: "review-again", 1: "got-it" }, timezone: "UTC" };
  assert.equal((await request(route, token, { method: "POST", body: JSON.stringify(payload) })).status, 201);
  assert.equal((await request(route, token, { method: "POST", body: JSON.stringify(payload) })).status, 201);
  assert.equal(await LearningActivity.countDocuments({ user: user._id, type: "flashcards-completed" }), 1);
});
