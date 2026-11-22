require("dotenv").config();

const express = require("express");
const cors = require("cors");

const mongoose = require("mongoose");
const scheduleSchema = new mongoose.Schema({
  owner: { type: String, default: "local-student", index: true },
  subject: { type: String, required: true },
  code: { type: String, default: "" },
  instructor: { type: String, default: "" },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, default: "" },
  building: { type: String, default: "" },
  type: { type: String, default: "Lecture" },
  section: { type: String, default: "" },
  notes: { type: String, default: "" },
  days: [{ type: String }],
  recurring: { type: Boolean, default: true },
  reminder: { type: Number, default: 15 },
  color: { type: String, default: "blue" },
}, { timestamps: true });

const Schedule = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);

async function connectMongoDB() {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI is not configured; schedule API will return unavailable.");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}
connectMongoDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const scheduleRouter = express.Router();

scheduleRouter.get("/", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database unavailable" });
  const owner = req.get("x-student-id") || "local-student";
  const items = await Schedule.find({ owner }).sort({ startTime: 1 });
  res.json(items);
});

scheduleRouter.post("/", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database unavailable" });
  const owner = req.get("x-student-id") || "local-student";
  const item = await Schedule.create({ ...req.body, owner });
  res.status(201).json(item);
});

scheduleRouter.put("/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database unavailable" });
  const owner = req.get("x-student-id") || "local-student";
  const item = await Schedule.findOneAndUpdate({ _id: req.params.id, owner }, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Schedule not found" });
  res.json(item);
});

scheduleRouter.delete("/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database unavailable" });
  const owner = req.get("x-student-id") || "local-student";
  const item = await Schedule.findOneAndDelete({ _id: req.params.id, owner });
  if (!item) return res.status(404).json({ error: "Schedule not found" });
  res.status(204).end();
});

app.use("/api/schedules", scheduleRouter);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});