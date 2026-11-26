const assert = require("node:assert/strict");
const { once } = require("node:events");
const { after, before, beforeEach, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const Schedule = require("../models/Schedule");
const ScheduleRoutes = require("../routes/ScheduleRoutes");
const { upcomingOccurrences } = require("../services/ScheduleReminderService");

process.env.JWT_ACCESS_SECRET = "schedule-test-secret";
let mongo, server, baseUrl, first, second, firstToken, secondToken;
async function makeUser(email) { return User.create({ email, passwordHash: "test-hash", emailVerifiedAt: new Date(), tokenVersion: 0 }); }
function token(user) { return jwt.sign({ sub: String(user._id), typ: "access", tokenVersion: 0 }, process.env.JWT_ACCESS_SECRET); }
async function request(path, auth, options = {}) { const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(auth ? { authorization: `Bearer ${auth}` } : {}) } }); return { status: response.status, body: await response.json() }; }
const entry = (patch = {}) => ({ subject: "Physics", code: "PHY101", instructor: "Dr. Lee", startTime: "14:00", endTime: "15:00", days: ["Mon"], room: "204", building: "Science", reminderEnabled: false, reminder: 60, timezone: "Asia/Manila", ...patch });

before(async () => { mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 30_000 } }); await mongoose.connect(mongo.getUri()); const app = express(); app.use(express.json()); app.use("/api/schedules", ScheduleRoutes); server = app.listen(0, "127.0.0.1"); await once(server, "listening"); baseUrl = `http://127.0.0.1:${server.address().port}`; });
beforeEach(async () => { await Schedule.deleteMany({}); await User.deleteMany({}); first = await makeUser("one@example.test"); second = await makeUser("two@example.test"); firstToken = token(first); secondToken = token(second); });
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test("schedule CRUD persists, is owner scoped, validates overlap, and deletes", async () => {
  assert.equal((await request("/api/schedules")).status, 401);
  const created = await request("/api/schedules", firstToken, { method: "POST", body: JSON.stringify(entry()) });
  assert.equal(created.status, 201); const id = created.body.schedule.id;
  assert.equal((await request("/api/schedules", secondToken)).body.schedules.length, 0);
  assert.equal((await request(`/api/schedules/${id}`, secondToken, { method: "PUT", body: JSON.stringify(entry({ subject: "Changed" })) })).status, 404);
  assert.equal((await request("/api/schedules", firstToken, { method: "POST", body: JSON.stringify(entry({ subject: "Overlap", startTime: "14:30", endTime: "15:30" })) })).status, 400);
  const updated = await request(`/api/schedules/${id}`, firstToken, { method: "PUT", body: JSON.stringify({ ...entry(), subject: "Updated" }) });
  assert.equal(updated.body.schedule.subject, "Updated");
  assert.equal((await request(`/api/schedules/${id}`, firstToken, { method: "DELETE" })).status, 200);
  assert.equal(await Schedule.countDocuments({ user: first._id }), 0);
});

test("schedule validation rejects invalid times, weekdays, and identifiers", async () => {
  assert.equal((await request("/api/schedules", firstToken, { method: "POST", body: JSON.stringify(entry({ endTime: "14:00" })) })).status, 400);
  assert.equal((await request("/api/schedules", firstToken, { method: "POST", body: JSON.stringify(entry({ days: [] })) })).status, 400);
  assert.equal((await request("/api/schedules/nope", firstToken, { method: "DELETE" })).status, 400);
});

test("reminder occurrence is one hour before Monday 2 PM in the saved timezone", () => {
  const schedule = { days: ["Mon"], startTime: "14:00", reminder: 60, timezone: "Asia/Manila" };
  const now = new Date("2026-11-30T05:00:00.000Z"); // Monday 1:00 PM in Manila
  const occurrences = upcomingOccurrences(schedule, now);
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].occurrence.toISOString(), "2026-11-30T06:00:00.000Z");
  assert.equal(occurrences[0].dueAt.toISOString(), "2026-11-30T05:00:00.000Z");
});
