const Schedule = require("../models/Schedule");
const ScheduleReminder = require("../models/ScheduleReminder");
const { createNotification } = require("./NotificationService");

const DAY_INDEX = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}
function localToUtc(year, month, day, hour, minute, timezone) {
  let result = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(result, timezone);
    const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    result = new Date(result.getTime() + wanted - represented);
  }
  return result;
}
function upcomingOccurrences(schedule, now) {
  const local = zonedParts(now, schedule.timezone);
  const base = new Date(Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day)));
  const [hour, minute] = schedule.startTime.split(":").map(Number);
  const results = [];
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(base); day.setUTCDate(day.getUTCDate() + offset);
    const key = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getUTCDay()];
    if (!schedule.days.includes(key)) continue;
    const occurrence = localToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, minute, schedule.timezone);
    const dueAt = new Date(occurrence.getTime() - schedule.reminder * 60_000);
    if (dueAt <= now && dueAt > new Date(now.getTime() - 24 * 60 * 60_000) && occurrence > now) results.push({ occurrence, dueAt });
  }
  return results;
}
async function processDueReminders(now = new Date()) {
  const schedules = await Schedule.find({ reminderEnabled: true }).lean();
  for (const schedule of schedules) {
    for (const { occurrence } of upcomingOccurrences(schedule, now)) {
      const key = `${schedule._id}:${schedule.updatedAt.getTime()}:${occurrence.toISOString()}`;
      let delivery;
      try {
        delivery = await ScheduleReminder.findOneAndUpdate(
          { key, status: "pending", retryAt: { $lte: now } },
          { $set: { status: "sending" }, $inc: { attempts: 1 }, $setOnInsert: { schedule: schedule._id, occurrence } },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if (error.code === 11000) continue;
        throw error;
      }
      if (!delivery || delivery.status !== "sending") continue;
      try {
        const current = await Schedule.findOne({ _id: schedule._id, updatedAt: schedule.updatedAt, reminderEnabled: true }).lean();
        if (!current) { await ScheduleReminder.deleteOne({ _id: delivery._id, status: "sending" }); continue; }
        const classTime = occurrence.toLocaleTimeString("en", { timeZone: schedule.timezone, hour: "numeric", minute: "2-digit" });
        const lead = schedule.reminder === 60 ? "1 hour" : `${schedule.reminder} minutes`;
        await createNotification({
          user: schedule.user,
          dedupeKey: `class:${key}`,
          type: "class-reminder",
          title: `Upcoming class: ${schedule.subject}`,
          message: `${schedule.subject} starts in ${lead}, at ${classTime}.`,
          href: "/schedule",
          occurredAt: now,
        });
        await ScheduleReminder.updateOne({ _id: delivery._id, status: "sending" }, { $set: { status: "sent" } });
      } catch (error) {
        console.error("Class reminder delivery failed:", error.message);
        await ScheduleReminder.updateOne({ _id: delivery._id, status: "sending" }, { $set: { status: "pending", retryAt: new Date(now.getTime() + Math.min(60, 2 ** delivery.attempts) * 60_000) } });
      }
    }
  }
}
function startScheduleReminderWorker() {
  ScheduleReminder.updateMany({ status: "sending" }, { $set: { status: "pending", retryAt: new Date() } }).catch((error) => console.error("Could not recover reminders:", error.message));
  const run = () => processDueReminders().catch((error) => console.error("Reminder processing failed:", error.message));
  run();
  return setInterval(run, 30_000);
}
module.exports = { processDueReminders, upcomingOccurrences, localToUtc, startScheduleReminderWorker };
