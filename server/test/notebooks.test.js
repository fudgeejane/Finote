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
const NotebookRoutes = require("../routes/NotebookRoutes");
const NoteRoutes = require("../routes/NoteRoutes");

process.env.JWT_ACCESS_SECRET = "test-only-notes-jwt-secret";

let mongo;
let server;
let baseUrl;
let firstUser;
let secondUser;
let firstToken;
let secondToken;

async function createUser(email) {
  return User.create({
    email,
    passwordHash: "test-password-hash",
    emailVerifiedAt: new Date(),
    tokenVersion: 0,
  });
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
  return {
    status: response.status,
    body: await response.json(),
  };
}

function tokenFor(user) {
  return jwt.sign(
    { sub: String(user._id), typ: "access", tokenVersion: user.tokenVersion },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "5m" }
  );
}

before(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 30_000 },
  });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Notebook.init(), Note.init()]);

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/notebooks", NotebookRoutes);
  app.use("/api/notes", NoteRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await Note.deleteMany({});
  await Notebook.deleteMany({});
  await User.deleteMany({});
  firstUser = await createUser("first@example.test");
  secondUser = await createUser("second@example.test");
  firstToken = tokenFor(firstUser);
  secondToken = tokenFor(secondUser);
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

test("notebook and note CRUD persists and deleting a notebook removes its notes", async () => {
  const unauthorized = await request("/api/notebooks");
  assert.equal(unauthorized.status, 401);

  const createdNotebook = await request("/api/notebooks", firstToken, {
    method: "POST",
    body: JSON.stringify({ name: "Biology" }),
  });
  assert.equal(createdNotebook.status, 201);
  const notebookId = createdNotebook.body.notebook.id;

  const createdNote = await request("/api/notes", firstToken, {
    method: "POST",
    body: JSON.stringify({
      notebookId,
      title: "Cell structure",
      content: "<h2>Cells</h2><p>Cells are the basic units of life.</p>",
    }),
  });
  assert.equal(createdNote.status, 201);
  assert.equal(createdNote.body.note.notebookId, notebookId);
  assert.match(createdNote.body.note.content, /basic units of life/);

  const updatedNote = await request(
    `/api/notes/${createdNote.body.note.id}`,
    firstToken,
    {
      method: "PATCH",
      body: JSON.stringify({ title: "Cell theory", content: "<p>Updated</p>" }),
    }
  );
  assert.equal(updatedNote.status, 200);
  assert.equal(updatedNote.body.note.title, "Cell theory");
  assert.equal(updatedNote.body.note.content, "<p>Updated</p>");

  const notebookList = await request("/api/notebooks", firstToken);
  assert.equal(notebookList.body.notebooks[0].noteCount, 1);
  const scopedNotes = await request(
    `/api/notes?notebookId=${notebookId}`,
    firstToken
  );
  assert.equal(scopedNotes.body.notes.length, 1);
  const deletedNote = await request(
    `/api/notes/${createdNote.body.note.id}`,
    firstToken,
    { method: "DELETE" }
  );
  assert.equal(deletedNote.status, 200);
  assert.equal(await Note.countDocuments({ notebook: notebookId }), 0);

  await request("/api/notes", firstToken, {
    method: "POST",
    body: JSON.stringify({ notebookId, title: "Another note", content: "Cascade" }),
  });

  const renamed = await request(`/api/notebooks/${notebookId}`, firstToken, {
    method: "PATCH",
    body: JSON.stringify({ name: "Biology 101" }),
  });
  assert.equal(renamed.body.notebook.name, "Biology 101");

  const deleted = await request(`/api/notebooks/${notebookId}`, firstToken, {
    method: "DELETE",
  });
  assert.equal(deleted.status, 200);
  assert.equal(await Note.countDocuments({ notebook: notebookId }), 0);
});

test("notebook and note IDs cannot be used to access another user's data", async () => {
  const notebook = await request("/api/notebooks", firstToken, {
    method: "POST",
    body: JSON.stringify({ name: "Private notebook" }),
  });
  const notebookId = notebook.body.notebook.id;
  const note = await request("/api/notes", firstToken, {
    method: "POST",
    body: JSON.stringify({ notebookId, title: "Private note", content: "Secret" }),
  });
  const noteId = note.body.note.id;

  assert.equal((await request(`/api/notebooks/${notebookId}`, secondToken)).status, 404);
  assert.equal((await request(`/api/notes?notebookId=${notebookId}`, secondToken)).status, 404);
  assert.equal(
    (await request("/api/notes", secondToken, {
      method: "POST",
      body: JSON.stringify({ notebookId, title: "Injected", content: "" }),
    })).status,
    404
  );
  assert.equal(
    (await request(`/api/notes/${noteId}`, secondToken, {
      method: "PATCH",
      body: JSON.stringify({ title: "Changed" }),
    })).status,
    404
  );
  assert.equal(
    (await request(`/api/notes/${noteId}`, secondToken, { method: "DELETE" })).status,
    404
  );
  assert.equal((await request("/api/notes", secondToken)).body.notes.length, 0);
});

test("legacy note imports preserve content and are idempotent", async () => {
  const legacyNotes = [
    { id: 12, title: "Old note", content: "<p>Preserved formatting</p>" },
  ];
  const firstImport = await request("/api/notes/migrate", firstToken, {
    method: "POST",
    body: JSON.stringify({ notes: legacyNotes }),
  });
  const retryImport = await request("/api/notes/migrate", firstToken, {
    method: "POST",
    body: JSON.stringify({ notes: legacyNotes }),
  });

  assert.equal(firstImport.status, 200);
  assert.equal(firstImport.body.imported, 1);
  assert.equal(retryImport.body.imported, 0);
  assert.equal(await Notebook.countDocuments({ user: firstUser._id }), 1);
  const note = await Note.findOne({ user: firstUser._id }).lean();
  assert.equal(note.title, "Old note");
  assert.equal(note.content, "<p>Preserved formatting</p>");
  assert.equal(note.legacyId, "12");
});

test("notebook and note validation rejects malformed IDs and content", async () => {
  assert.equal((await request("/api/notebooks/not-an-id", firstToken)).status, 400);
  assert.equal(
    (await request("/api/notebooks", firstToken, {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    })).status,
    400
  );

  const notebook = await request("/api/notebooks", firstToken, {
    method: "POST",
    body: JSON.stringify({ name: "Notebook" }),
  });
  assert.equal(
    (await request("/api/notes", firstToken, {
      method: "POST",
      body: JSON.stringify({ notebookId: notebook.body.notebook.id, content: 3 }),
    })).status,
    400
  );
});
