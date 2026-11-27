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
    let userMessage = "Finnie could not respond right now. Please try again.";
    if (error.code === "AI_NOT_CONFIGURED") {
      userMessage = "Finnie is unavailable because the server is missing GEMINI_API_KEY. Configure it in server/.env and restart the server.";
    } else if (error.code === "AI_AUTH") {
      userMessage = "Finnie could not authenticate with Gemini. Check that GEMINI_API_KEY is valid and enabled for the Gemini API.";
    } else if (error.statusCode === 503) {
      userMessage = "Finnie is temporarily busy. Please try again shortly.";
    } else if (error.code === "AI_MODEL") {
      userMessage = "Finnie could not find an available Gemini model. Check GEMINI_MODEL and GEMINI_FALLBACK_MODEL in server/.env.";
    } else if (error.code === "AI_CONNECTION") {
      userMessage = "Finnie could not connect to Gemini. Check the server's network access and try again.";
    } else if (error.code === "AI_TIMEOUT") {
      userMessage = "Gemini took too long to respond. Please try again.";
    } else if (error.code === "AI_UPSTREAM") {
      const detail = String(error.message || "Gemini rejected the request.")
        .replaceAll(process.env.GEMINI_API_KEY || "\u0000", "[redacted]")
        .replace(/[\r\n]+/g, " ")
        .slice(0, 300);
      userMessage = `Gemini rejected the request: ${detail}`;
    }
    return res.status(error.statusCode || 502).json({
      error: userMessage,
    });
  }
}

module.exports = { chat };
