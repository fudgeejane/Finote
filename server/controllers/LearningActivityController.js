const mongoose = require("mongoose");
const LearningActivity = require("../models/LearningActivity");
const Note = require("../models/Note");
const StudyMaterial = require("../models/StudyMaterial");
const StudyProgress = require("../models/StudyProgress");

const validZone = (zone) => {
  if (typeof zone !== "string" || zone.length > 100) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return true; } catch { return false; }
};
const dayKey = (date, zone) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const shiftDay = (key, offset) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
};

async function record(req, res) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).some((key) => !["type", "referenceId", "eventId", "timezone"].includes(key))) return res.status(400).json({ error: "Activity event is invalid." });
  const { type, referenceId, eventId, timezone } = req.body || {};
  if (! ["note-created", "flashcards-completed", "mock-exam-submitted", "flashcards-used", "mock-exam-used"].includes(type) || !mongoose.isValidObjectId(referenceId) || typeof eventId !== "string" || !/^[\w:-]{1,180}$/.test(eventId) || (timezone !== undefined && !validZone(timezone))) return res.status(400).json({ error: "Activity event is invalid." });
  const zone = validZone(timezone) ? timezone : "UTC"; // Missing or invalid client zones use UTC.
  const model = type === "note-created" ? Note : StudyMaterial;
  const filter = { _id: referenceId, user: req.user._id };
  if (["flashcards-completed", "flashcards-used"].includes(type)) filter.type = "flashcards";
  if (["mock-exam-submitted", "mock-exam-used"].includes(type)) filter.type = "mock-exams";
  if (!await model.exists(filter)) return res.status(404).json({ error: "Activity source not found." });
  if (type === "flashcards-completed") {
    const progress = await StudyProgress.exists({ user: req.user._id, material: referenceId, "state.complete": true });
    if (!progress) return res.status(409).json({ error: "Complete the flashcard round before recording activity." });
  }
  if (type === "mock-exam-submitted") {
    const submissionId = eventId.startsWith("exam:") ? eventId.slice(5) : "";
    const submitted = submissionId && await StudyProgress.exists({ user: req.user._id, material: referenceId, "attempts.submissionId": submissionId });
    if (!submitted) return res.status(409).json({ error: "Submit the mock exam before recording activity." });
  }
  try {
    await LearningActivity.create({ user: req.user._id, eventId, type, reference: referenceId, timezone: zone });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await LearningActivity.findOne({ user: req.user._id, eventId }).select("type reference").lean();
    if (!existing || existing.type !== type || String(existing.reference) !== String(referenceId)) return res.status(409).json({ error: "Activity event ID was already used for a different event." });
  }
  return res.status(200).json({ recorded: true });
}

async function summary(req, res) {
  const zone = validZone(req.query.timezone) ? req.query.timezone : "UTC"; // Missing or invalid zones use UTC.
  const events = await LearningActivity.find({ user: req.user._id }).select("occurredAt").lean();
  const active = [...new Set(events.map((event) => dayKey(event.occurredAt, zone)))].sort();
  const today = dayKey(new Date(), zone);
  const yesterday = shiftDay(today, -1);
  let streak = 0;
  let cursor = active.includes(today) ? today : yesterday;
  while (active.includes(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const monday = shiftDay(today, -((todayWeekday + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDay(monday, index);
    return { date: key, active: active.includes(key) };
  });
  return res.json({ streak, days: week, timezone: zone });
}
module.exports = { record, summary };
