const assert = require("node:assert/strict");
const { test } = require("node:test");
const GeminiStudyTools = require("../services/GeminiStudyTools");

const originalFetch = global.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
const originalFallbackModel = process.env.GEMINI_FALLBACK_MODEL;

function restoreEnvironment() {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
  if (originalFallbackModel === undefined) delete process.env.GEMINI_FALLBACK_MODEL;
  else process.env.GEMINI_FALLBACK_MODEL = originalFallbackModel;
}

test("sends selected note text to the configured Gemini model and parses JSON", async () => {
  const calls = [];
  process.env.GEMINI_API_KEY = "server-only-test-key";
  process.env.GEMINI_MODEL = "gemini-test-model";
  delete process.env.GEMINI_FALLBACK_MODEL;
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [{
                  type: "Identification",
                  prompt: "What are cells?",
                  answer: "The basic units of life.",
                }],
              }),
            }],
          },
        }],
      }),
    };
  };

  try {
    const result = await GeminiStudyTools.generateStudyMaterial({
      type: "mock-exams",
      title: "Cell exam",
      totalQuestions: 1,
      instructions: "Keep it concise.",
      notes: [{
        title: "Cell structure",
        content: "<p>Cells are the basic units of life.</p><script>not note content</script>",
      }],
    });

    assert.equal(result.questions[0].answer, "The basic units of life.");
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /models\/gemini-test-model:generateContent/);
    assert.doesNotMatch(calls[0].url, /server-only-test-key/);
    assert.equal(calls[0].options.headers["x-goog-api-key"], "server-only-test-key");
    const requestBody = JSON.parse(calls[0].options.body);
    const prompt = requestBody.contents[0].parts[0].text;
    assert.match(prompt, /Generate exactly 1 non-repetitive question/);
    assert.match(prompt, /Cells are the basic units of life/);
    assert.doesNotMatch(prompt, /not note content/);
    assert.doesNotMatch(calls[0].options.headers.authorization || "", /test-key/);
  } finally {
    restoreEnvironment();
  }
});

test("reports missing Gemini configuration without making an external request", async () => {
  process.env.GEMINI_API_KEY = "";
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error("Gemini must not be called");
  };
  try {
    await assert.rejects(
      GeminiStudyTools.generateStudyMaterial({
        type: "flashcards",
        title: "Cards",
        notes: [{ title: "Note", content: "<p>Text</p>" }],
      }),
      /Set GEMINI_API_KEY in server\/.env/
    );
    assert.equal(called, false);
  } finally {
    restoreEnvironment();
  }
});

test("uses the default Gemini model when GEMINI_MODEL is not set", async () => {
  process.env.GEMINI_API_KEY = "server-only-test-key";
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_FALLBACK_MODEL;
  global.fetch = async (url) => {
    assert.match(String(url), /models\/gemini-3\.8-flash:generateContent/);
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                cards: [{ question: "Term?", answer: "Definition." }],
              }),
            }],
          },
        }],
      }),
    };
  };
  try {
    const result = await GeminiStudyTools.generateStudyMaterial({
      type: "flashcards",
      title: "Test deck",
      notes: [{ title: "Test note", content: "<p>Example content</p>" }],
    });
    assert.equal(result.cards.length, 1);
  } finally {
    restoreEnvironment();
  }
});

test("reports Gemini provider outages with the upstream status and message", async () => {
  process.env.GEMINI_API_KEY = "server-only-test-key";
  process.env.GEMINI_MODEL = "gemini-test-model";
  delete process.env.GEMINI_FALLBACK_MODEL;
  global.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => "0" },
    json: async () => ({ error: { message: "Temporarily unavailable." } }),
  });
  try {
    await assert.rejects(
      GeminiStudyTools.generateStudyMaterial({
        type: "flashcards",
        title: "Test deck",
        notes: [{ title: "Test note", content: "<p>Example content</p>" }],
      }),
      (error) => {
        assert.equal(error.statusCode, 503);
        assert.equal(error.code, "AI_CAPACITY");
        assert.match(error.message, /HTTP 503: Temporarily unavailable/);
        return true;
      }
    );
  } finally {
    restoreEnvironment();
  }
});

test("tries additional models after Gemini capacity errors", async () => {
  const requestedModels = [];
  process.env.GEMINI_API_KEY = "server-only-test-key";
  process.env.GEMINI_MODEL = "gemini-test-primary";
  delete process.env.GEMINI_FALLBACK_MODEL;
  global.fetch = async (url) => {
    requestedModels.push(String(url));
    if (requestedModels.length < 6) {
      return {
        ok: false,
        status: 503,
        headers: { get: () => "0" },
        json: async () => ({
          error: { message: "This model is currently experiencing high demand." },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                cards: [{ question: "Term?", answer: "Definition." }],
              }),
            }],
          },
        }],
      }),
    };
  };
  try {
    const result = await GeminiStudyTools.generateStudyMaterial({
      type: "flashcards",
      title: "Test deck",
      notes: [{ title: "Test note", content: "<p>Example content</p>" }],
    });
    assert.equal(result.cards.length, 1);
    assert.match(requestedModels[0], /models\/gemini-test-primary:generateContent/);
    assert.match(requestedModels[1], /models\/gemini-test-primary:generateContent/);
    assert.match(requestedModels[2], /models\/gemini-test-primary:generateContent/);
    assert.match(requestedModels[3], /models\/gemini-3\.6-flash:generateContent/);
    assert.match(requestedModels[4], /models\/gemini-3\.1-flash-lite:generateContent/);
    assert.match(requestedModels[5], /models\/gemini-3\.5-flash-lite:generateContent/);
  } finally {
    restoreEnvironment();
  }
});

test("uses a fallback model when the configured model times out", async () => {
  const requestedModels = [];
  process.env.GEMINI_API_KEY = "server-only-test-key";
  process.env.GEMINI_MODEL = "gemini-test-primary";
  delete process.env.GEMINI_FALLBACK_MODEL;
  global.fetch = async (url) => {
    requestedModels.push(String(url));
    if (requestedModels.length === 1) {
      const timeoutError = new Error("Request timed out.");
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                cards: [{ question: "Term?", answer: "Definition." }],
              }),
            }],
          },
        }],
      }),
    };
  };
  try {
    const result = await GeminiStudyTools.generateStudyMaterial({
      type: "flashcards",
      title: "Test deck",
      notes: [{ title: "Test note", content: "<p>Example content</p>" }],
    });
    assert.equal(result.cards.length, 1);
    assert.equal(requestedModels.length, 2);
    assert.match(requestedModels[0], /models\/gemini-test-primary:generateContent/);
    assert.match(requestedModels[1], /models\/gemini-3\.6-flash:generateContent/);
  } finally {
    restoreEnvironment();
  }
});
