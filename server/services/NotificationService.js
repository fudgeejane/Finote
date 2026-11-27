const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("./EmailService");

const preferenceKey = { "exam-result": "examResult", "class-reminder": "classReminder", "account-security": "accountSecurity" };

async function createNotification({ user: userId, dedupeKey, type, title, message, href, occurredAt = new Date() }) {
  const user = await User.findById(userId).select("notificationPreferences").lean();
  if (!user) return null;
  const preference = user.notificationPreferences?.[preferenceKey[type]] || {};
  try {
    return await Notification.create({
      user: userId, dedupeKey, type, title, message, href, occurredAt,
      inAppEnabled: preference.inApp !== false,
      email: { status: preference.email === false ? "disabled" : "pending", attempts: 0, retryAt: new Date() },
      ...(preference.inApp === false ? { readAt: new Date() } : {}),
    });
  } catch (error) {
    if (error.code === 11000) return Notification.findOne({ user: userId, dedupeKey });
    throw error;
  }
}

async function processPendingNotificationEmails(now = new Date()) {
  const pending = await Notification.find({ "email.status": "pending", "email.retryAt": { $lte: now } }).sort({ createdAt: 1 }).limit(50).lean();
  for (const item of pending) {
    const claimed = await Notification.findOneAndUpdate(
      { _id: item._id, "email.status": "pending", "email.retryAt": { $lte: now } },
      { $set: { "email.status": "sending", "email.startedAt": now }, $inc: { "email.attempts": 1 } }, { new: true },
    );
    if (!claimed) continue;
    try {
      const user = await User.findById(item.user).select("email emailVerifiedAt").lean();
      if (!user?.email || !user.emailVerifiedAt) {
        await Notification.updateOne({ _id: item._id, "email.status": "sending" }, { $set: { "email.status": "pending", "email.retryAt": new Date(now.getTime() + 60 * 60_000) } });
        continue;
      }
      await sendNotificationEmail(user.email, item);
      await Notification.updateOne({ _id: item._id, "email.status": "sending" }, { $set: { "email.status": "sent", "email.sentAt": new Date(), "email.lastError": "" } });
    } catch (error) {
      const delay = Math.min(6 * 60, 2 ** claimed.email.attempts) * 60_000;
      console.error("Notification email delivery failed:", error.message);
      await Notification.updateOne({ _id: item._id, "email.status": "sending" }, { $set: { "email.status": "pending", "email.retryAt": new Date(now.getTime() + delay), "email.lastError": String(error.message).slice(0, 300) } });
    }
  }
}

function startNotificationEmailWorker() {
  const staleBefore = new Date(Date.now() - 10 * 60_000);
  Notification.updateMany({ "email.status": "sending", $or: [{ "email.startedAt": { $lte: staleBefore } }, { "email.startedAt": null }] }, { $set: { "email.status": "pending", "email.retryAt": new Date(), "email.startedAt": null } }).catch((error) => console.error("Could not recover notification emails:", error.message));
  const run = () => processPendingNotificationEmails().catch((error) => console.error("Notification email processing failed:", error.message));
  run();
  return setInterval(run, 30_000);
}

module.exports = { createNotification, processPendingNotificationEmails, startNotificationEmailWorker };
