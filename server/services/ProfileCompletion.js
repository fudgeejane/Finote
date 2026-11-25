const { parsePhoneNumberFromString } = require("libphonenumber-js");

const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

function isValidName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length > 0 && name.length <= 80 && namePattern.test(name);
}

function isValidContactNumber(value) {
  const phoneNumber = parsePhoneNumberFromString(value || "", "PH");
  return Boolean(phoneNumber?.isValid());
}

function getProfileCompletionPercentage(profile) {
  const completeFields = [
    isValidName(profile.firstName),
    isValidName(profile.lastName),
    isValidContactNumber(profile.contactNumber),
  ].filter(Boolean).length;

  return Math.round((completeFields / 3) * 100);
}

module.exports = {
  getProfileCompletionPercentage,
  isValidContactNumber,
  isValidName,
};
