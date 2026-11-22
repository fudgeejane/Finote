const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }

  if (payload.typ !== "access" || !payload.sub) {
    return res.status(401).json({ error: "Invalid access token." });
  }

  try {
    const user = await User.findById(payload.sub);

    if (
      !user ||
      !user.emailVerifiedAt ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      return res.status(401).json({ error: "Session is no longer valid." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication check failed:", error.message);
    return res.status(500).json({ error: "Could not authenticate request." });
  }
}

module.exports = requireAuth;