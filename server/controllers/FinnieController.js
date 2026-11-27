const { answer } = require("../services/FinnieAssistant");

async function chat(req, res) {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message || message.length > 2000) {
    return res.status(400).json({ error: "Enter a message between 1 and 2,000 characters." });
  }
  if (history.length > 10 || history.some((item) =>
    !item || !["user", "assistant"].includes(item.role) ||
    typeof item.content !== "string" || item.content.length > 2000
  )) {
    return res.status(400).json({ error: "Conversation history is invalid. Please start a new chat." });
  }

  try {
    const response = await answer({ message, history });
    return res.json({ response });
  } catch (error) {
    console.error("Finnie request failed:", error.message);
    return res.status(error.statusCode || 502).json({
      error: error.statusCode === 503
        ? "Finnie is not configured yet. Please try again later."
        : "Finnie could not respond right now. Please try again.",
    });
  }
}

module.exports = { chat };
