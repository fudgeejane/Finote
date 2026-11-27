const Notification = require("../models/Notification");
const User = require("../models/User");

const preferenceFields = {
  examResult: ["examResult", "Exam results"],
  classReminder: ["classReminder", "Class reminders"],
  accountSecurity: ["accountSecurity", "Account and security updates"],
};

async function list(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id, inAppEnabled: { $ne: false } }).sort({ occurredAt: -1 }).limit(50).select("type title message href occurredAt createdAt readAt").lean(),
      Notification.countDocuments({ user: req.user._id, inAppEnabled: { $ne: false }, readAt: null }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) { console.error("Notification list failed:", error.message); return res.status(500).json({ error: "Could not load notifications." }); }
}

async function markRead(req, res) {
  try {
    if (req.params.id === "all") await Notification.updateMany({ user: req.user._id, inAppEnabled: { $ne: false }, readAt: null }, { $set: { readAt: new Date() } });
    else {
      const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
      if (!notification) return res.status(404).json({ error: "Notification not found." });
    }
    const unreadCount = await Notification.countDocuments({ user: req.user._id, inAppEnabled: { $ne: false }, readAt: null });
    return res.json({ unreadCount });
  } catch (error) { console.error("Notification update failed:", error.message); return res.status(500).json({ error: "Could not update notification." }); }
}

async function getPreferences(req, res) {
  const user = await User.findById(req.user._id).select("notificationPreferences").lean();
  const preferences = user?.notificationPreferences || {};
  return res.json({ preferences: Object.fromEntries(Object.keys(preferenceFields).map((key) => [key, {
    inApp: preferences[key]?.inApp !== false,
    email: preferences[key]?.email !== false,
  }])) });
}

async function updatePreferences(req, res) {
  const input = req.body?.preferences;
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !preferenceFields[key])) return res.status(400).json({ error: "Notification preferences are invalid." });
  for (const [key, value] of Object.entries(input)) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((channel) => !["inApp", "email"].includes(channel)) || Object.values(value).some((enabled) => typeof enabled !== "boolean")) return res.status(400).json({ error: "Choose in-app and email preferences for each event type." });
  }
  const set = {};
  for (const [key, value] of Object.entries(input)) for (const [channel, enabled] of Object.entries(value)) set[`notificationPreferences.${key}.${channel}`] = enabled;
  try {
    await User.updateOne({ _id: req.user._id }, { $set: set });
    return getPreferences(req, res);
  } catch (error) { console.error("Notification preferences update failed:", error.message); return res.status(500).json({ error: "Could not save notification preferences." }); }
}

module.exports = { list, markRead, getPreferences, updatePreferences };
