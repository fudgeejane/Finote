const Note = require("../models/Note");
const StudyMaterial = require("../models/StudyMaterial");
const Schedule = require("../models/Schedule");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compact = (value, max = 100) => {
  const text = String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

async function search(req, res) {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 2 || query.length > 100) {
    return res.status(400).json({ error: "Search must be between 2 and 100 characters." });
  }
  try {
    const pattern = new RegExp(escapeRegex(query), "i");
    const user = req.user._id;
    const [notes, flashcards, mockExams, schedules] = await Promise.all([
      Note.find({ user, $or: [{ title: pattern }, { content: pattern }] }).select("_id title content notebook").sort({ updatedAt: -1 }).limit(6).lean(),
      StudyMaterial.find({ user, type: "flashcards", $or: [{ title: pattern }, { "cards.question": pattern }, { "cards.answer": pattern }] }).select("_id title type cards").sort({ updatedAt: -1 }).limit(6).lean(),
      StudyMaterial.find({ user, type: "mock-exams", title: pattern }).select("_id title type").sort({ updatedAt: -1 }).limit(6).lean(),
      Schedule.find({ user, $or: ["subject", "code", "instructor", "room", "building", "type", "section", "notes", "days"].map((field) => ({ [field]: pattern })) }).select("_id subject code instructor room building type section notes days startTime endTime").sort({ startTime: 1 }).limit(6).lean(),
    ]);
    const serializeMaterial = (item) => {
      const isCard = item.type === "flashcards";
      const entries = isCard ? item.cards || [] : item.questions || [];
      const field = isCard ? "question" : "prompt";
      const matched = entries.find((entry) => [entry[field], entry.answer, entry.explanation, ...(entry.options || [])].some((text) => pattern.test(text || "")));
      return { id: String(item._id), type: item.type, title: item.title, context: compact(matched?.[field] || "Study material title match") };
    };
    return res.json({
      results: {
        notes: notes.map((item) => ({ id: String(item._id), title: item.title, notebookId: String(item.notebook), context: compact(String(item.content || "").match(new RegExp(`.{0,35}${escapeRegex(query)}.{0,50}`, "i"))?.[0] || "Note title match") })),
        flashcards: flashcards.map(serializeMaterial),
        mockExams: mockExams.map((item) => ({ id: String(item._id), type: item.type, title: item.title, context: "Mock exam" })),
        schedules: schedules.map((item) => ({ id: String(item._id), title: item.subject, context: [item.code, item.instructor, [(item.days || []).join("/"), `${item.startTime}-${item.endTime}`].join(" "), [item.room, item.building].filter(Boolean).join(" "), item.section, item.type].filter(Boolean).join(" | ") })),
      },
    });
  } catch (error) {
    console.error("Workspace search failed:", error.message);
    return res.status(500).json({ error: "Search is temporarily unavailable. Please try again." });
  }
}

module.exports = { search };
