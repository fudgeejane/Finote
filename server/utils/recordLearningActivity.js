const LearningActivity = require("../models/LearningActivity");

function validZone(zone) {
  if (typeof zone !== "string" || zone.length > 100) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return true; } catch { return false; }
}

async function recordLearningActivity({ user, eventId, type, reference, timezone, ...details }) {
  if (timezone !== undefined && !validZone(timezone)) {
    const error = new Error("Timezone must be a valid IANA timezone.");
    error.statusCode = 400;
    throw error;
  }
  const zone = timezone || "UTC";
  try {
    return await LearningActivity.create({ user, eventId, type, reference, timezone: zone, ...details });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await LearningActivity.findOne({ user, eventId }).lean();
    if (!existing || existing.type !== type || String(existing.reference) !== String(reference)) {
      const conflict = new Error("This operation ID was already used for another activity.");
      conflict.statusCode = 409;
      throw conflict;
    }
    return existing;
  }
}

module.exports = { recordLearningActivity, validZone };
