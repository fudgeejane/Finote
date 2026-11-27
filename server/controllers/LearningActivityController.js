const mongoose = require("mongoose");
const LearningActivity = require("../models/LearningActivity");
const { validZone } = require("../utils/recordLearningActivity");

const dayKey = (date, zone) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const shiftDay = (key, offset) => { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10); };

async function record(_req, res) {
  return res.status(410).json({ error: "Activity is recorded automatically when a learning action is successfully saved." });
}

async function summary(req, res) {
  const zone = validZone(req.query.timezone) ? req.query.timezone : "UTC";
  const user = new mongoose.Types.ObjectId(req.user._id);
  const events = await LearningActivity.find({ user, type: { $in: ["note-created", "flashcards-completed", "mock-exam-submitted"] } })
    .sort({ occurredAt: -1 }).limit(10000).select("type reference title score session cardsReviewed gotIt reviewAgain timezone occurredAt").lean();
  const activeDates = new Set(events.map((item) => dayKey(item.occurredAt, item.timezone || zone)));
  const today = dayKey(new Date(), zone);
  let streak = 0;
  let cursor = activeDates.has(today) ? today : shiftDay(today, -1);
  while (activeDates.has(cursor)) { streak += 1; cursor = shiftDay(cursor, -1); }
  const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = shiftDay(today, -((todayWeekday + 6) % 7));
  const end = shiftDay(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(start, i);
    const todaysEvents = events.filter((item) => dayKey(item.occurredAt, item.timezone || zone) === date);
    const types = { "note-created": 0, "flashcards-completed": 0, "mock-exam-submitted": 0 };
    todaysEvents.forEach((item) => { types[item.type] += 1; });
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(new Date(`${date}T12:00:00Z`));
    return { date, weekday, active: todaysEvents.length > 0, counts: types };
  });
  const exams = events.filter((item) => item.type === "mock-exam-submitted").sort((a,b) => a.occurredAt - b.occurredAt);
  const scored = exams.filter((item) => Number.isFinite(item.score));
  const average = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : null;
  const sessions = events.filter((item) => item.type === "flashcards-completed");
  const materialIds = [...new Set([...exams, ...sessions].map((item) => String(item.reference)))].filter(mongoose.isValidObjectId);
  const StudyMaterial = require("../models/StudyMaterial");
  const materials = materialIds.length ? await StudyMaterial.find({ _id: { $in: materialIds }, user }).select("_id title type").lean() : [];
  const titles = new Map(materials.map((item) => [String(item._id), item.title]));
  const notes = events.filter((item) => item.type === "note-created").slice(0, 20);
  const noteIds = notes.map((item) => item.reference).filter((id) => mongoose.isValidObjectId(id));
  const ownedNotes = noteIds.length ? await require("../models/Note").find({ _id: { $in: noteIds }, user }).select("_id title notebook").lean() : [];
  const notesById = new Map(ownedNotes.map((item) => [String(item._id), item]));
  const recentAttempts = exams.slice(-20).reverse().map((item) => ({ materialId: String(item.reference), title: titles.get(String(item.reference)) || item.title || "Deleted study material", reviewable: titles.has(String(item.reference)), score: Number.isFinite(item.score) ? item.score : null, completedAt: item.occurredAt }));
  const recentSessions = sessions.slice(-20).reverse().map((item) => ({ materialId: String(item.reference), title: item.title || titles.get(String(item.reference)) || "Deleted study material", completedAt: item.occurredAt, cardsReviewed: item.cardsReviewed || 0, gotIt: item.gotIt || 0, reviewAgain: item.reviewAgain || 0 }));
  const recentActivity = [
    ...recentAttempts.map((item) => ({ type: "mock-exam-submitted", title: item.title, occurredAt: item.completedAt, detail: item.score == null ? "Ungraded exam submission" : `Scored ${item.score}%`, score: item.score, href: item.reviewable ? `/mock-exams/${encodeURIComponent(item.materialId)}` : null })),
    ...recentSessions.map((item) => ({ type: "flashcards-completed", title: item.title, occurredAt: item.completedAt, detail: `${item.cardsReviewed} cards · ${item.gotIt} got it · ${item.reviewAgain} review again`, href: titles.has(item.materialId) ? `/flashcards/${encodeURIComponent(item.materialId)}` : null })),
    ...notes.map((item) => {
      const note = notesById.get(String(item.reference));
      return { type: "note-created", title: note?.title || item.title || "Deleted note", occurredAt: item.occurredAt, detail: "Note created", href: note ? `/notes?notebookId=${encodeURIComponent(String(note.notebook))}` : null };
    }),
  ].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 20);
  return res.json({ streak, days, timezone: zone, week: { start, end, label: "Monday through Sunday calendar week" }, exams: { total: exams.length, scored: scored.length, average, trend: scored.slice(-20).map(({ score, occurredAt }) => ({ score, date: occurredAt })), recent: recentAttempts }, flashcards: { sessions: sessions.length, cardsReviewed: sessions.reduce((sum, item) => sum + (item.cardsReviewed || 0), 0), gotIt: sessions.reduce((sum, item) => sum + (item.gotIt || 0), 0), reviewAgain: sessions.reduce((sum, item) => sum + (item.reviewAgain || 0), 0), recent: recentSessions }, recentActivity });
}
module.exports = { record, summary, dayKey };
