const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const ScheduleReminder = require("../models/ScheduleReminder");
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIELDS = ["subject", "code", "instructor", "startTime", "endTime", "days", "room", "building", "type", "section", "notes", "color", "reminderEnabled", "reminder", "timezone"];
function validate(body) {
  const data = {};
  for (const field of FIELDS) if (body[field] !== undefined) data[field] = body[field];
  if (typeof data.subject !== "string" || !data.subject.trim()) throw Object.assign(new Error("Subject is required."), { statusCode: 400 });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.endTime || "")) throw Object.assign(new Error("Enter valid start and end times."), { statusCode: 400 });
  if (data.endTime <= data.startTime) throw Object.assign(new Error("End time must be after the start time."), { statusCode: 400 });
  if (!Array.isArray(data.days) || !data.days.length || data.days.some((d) => !DAYS.includes(d)) || new Set(data.days).size !== data.days.length) throw Object.assign(new Error("Select at least one valid weekday."), { statusCode: 400 });
  data.subject = data.subject.trim();
  data.reminderEnabled = data.reminderEnabled === true;
  data.reminder = Number(data.reminder || 15);
  data.timezone = data.timezone || "UTC";
  try { new Intl.DateTimeFormat("en", { timeZone: data.timezone }); } catch { throw Object.assign(new Error("Timezone is invalid."), { statusCode: 400 }); }
  return data;
}
function serialize(item) { const value = item.toObject ? item.toObject() : item; return { ...value, id: String(value._id), reminder: value.reminder || 15 }; }
function handle(res, error, action) { if (error.statusCode === 400 || error.name === "ValidationError") return res.status(400).json({ error: error.message }); console.error(`${action} schedule failed:`, error.message); return res.status(500).json({ error: `Could not ${action} schedule.` }); }
async function list(req, res) { try { const schedules = await Schedule.find({ user: req.user._id }).sort({ startTime: 1 }).lean(); return res.json({ schedules: schedules.map(serialize) }); } catch (e) { return handle(res, e, "load"); } }
async function ensureNoOverlap(user, data, excludeId) { const query = { user, days: { $in: data.days }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }; const other = await Schedule.find(query).lean(); const start = data.startTime; const end = data.endTime; if (other.some((item) => start < item.endTime && end > item.startTime)) throw Object.assign(new Error("This class overlaps another class on one of the selected days."), { statusCode: 400 }); }
async function create(req, res) { try { const data = validate(req.body || {}); await ensureNoOverlap(req.user._id, data); const schedule = await Schedule.create({ ...data, user: req.user._id }); return res.status(201).json({ schedule: serialize(schedule) }); } catch (e) { return handle(res, e, "create"); } }
async function update(req, res) { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Schedule ID is invalid." }); try { const schedule = await Schedule.findOne({ _id: req.params.id, user: req.user._id }); if (!schedule) return res.status(404).json({ error: "Schedule not found." }); const data = validate({ ...schedule.toObject(), ...(req.body || {}) }); await ensureNoOverlap(req.user._id, data, schedule._id); Object.assign(schedule, data); await schedule.save(); await ScheduleReminder.deleteMany({ schedule: schedule._id, status: { $ne: "sent" } }); return res.json({ schedule: serialize(schedule) }); } catch (e) { return handle(res, e, "update"); } }
async function remove(req, res) { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Schedule ID is invalid." }); try { const schedule = await Schedule.findOneAndDelete({ _id: req.params.id, user: req.user._id }); if (!schedule) return res.status(404).json({ error: "Schedule not found." }); await ScheduleReminder.deleteMany({ schedule: schedule._id, status: { $ne: "sent" } }); return res.json({ message: "Schedule deleted." }); } catch (e) { return handle(res, e, "delete"); } }
module.exports = { list, create, update, remove, validate };
