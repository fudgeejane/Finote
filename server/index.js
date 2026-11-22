
require("dotenv").config();

const AuthRoutes = require("./routes/AuthRoutes")
const UserRoutes = require("./routes/UserRoutes");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    const requiredEnvironmentVariables = [
      "MONGODB_URI",
      "CODE_PEPPER",
      "JWT_ACCESS_SECRET",
      "EMAIL_USER",
      "EMAIL_PASS",
    ];
    const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
      (name) => !process.env[name]?.trim()
    );

    if (missingEnvironmentVariables.length > 0) {
      throw new Error(
        `Missing required server/.env values: ${missingEnvironmentVariables.join(", ")}`
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.listen(port, () => {
      console.log(`API running at http://localhost:${port}`);
    });

  } catch (error) {

    console.error("Server startup failed:", error.message);
    process.exit(1);

  }
}

app.use("/api/auth", AuthRoutes);
app.use("/api/users", UserRoutes);

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }

  return next(error);
});

startServer();