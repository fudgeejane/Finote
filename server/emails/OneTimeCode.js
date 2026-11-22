const crypto = require("crypto");

function createVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashCode(code) {
  const pepper = process.env.CODE_PEPPER;

  if (!pepper) {
    throw new Error("CODE_PEPPER is missing from server/.env");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(code)
    .digest("hex");
}

function codeMatches(code, storedHash) {
  const submittedHash = Buffer.from(hashCode(code), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");

  return (
    submittedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(submittedHash, expectedHash)
  );
}

module.exports = { createVerificationCode, hashCode, codeMatches };