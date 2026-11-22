const React = require("react");
const transporter = require("../config/email");
const VerificationEmail = require("../emails/VerificationEmail");
const PasswordResetEmail = require("../emails/PasswordResetEmail");

async function sendVerificationEmail(email, code) {
  const { render } = await import("@react-email/render");
  const html = await render(
    React.createElement(VerificationEmail, { code })
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Your Finote verification code",
    html,
  });
}

async function sendPasswordResetEmail(email, code) {
  const { render } = await import("@react-email/render");
  const html = await render(
    React.createElement(PasswordResetEmail, { code })
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Your Finote password reset code",
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};