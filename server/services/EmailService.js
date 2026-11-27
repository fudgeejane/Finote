const React = require("react");
const transporter = require("../config/email");
const VerificationEmail = require("../emails/VerificationEmail");
const PasswordResetEmail = require("../emails/PasswordResetEmail");
const ClassReminderEmail = require("../emails/ClassReminderEmail");
const NotificationEmail = require("../emails/NotificationEmail");

async function sendVerificationEmail(email, code) {
  const { render } = await import("@react-email/render");
  const html = await render(React.createElement(VerificationEmail, { code }));

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Your Finote verification code",
    html,
  });
}

async function sendPasswordResetEmail(email, code) {
  const { render } = await import("@react-email/render");
  const html = await render(React.createElement(PasswordResetEmail, { code }));

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Your Finote password reset code",
    html,
  });
}

async function sendClassReminder(email, schedule, occurrence) {
  const occurrenceDate = new Date(occurrence);
  const classDate = occurrenceDate.toLocaleDateString("en", {
    timeZone: schedule.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const startTime = occurrenceDate.toLocaleTimeString("en", {
    timeZone: schedule.timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = (() => {
    const [hours, minutes] = schedule.endTime.split(":").map(Number);
    const dateParts = new Intl.DateTimeFormat("en", {
      timeZone: schedule.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(occurrenceDate);
    const localDate = Object.fromEntries(
      dateParts.map(({ type, value }) => [type, value]),
    );
    const year = Number(localDate.year);
    const month = Number(localDate.month);
    const day = Number(localDate.day);
    // Build the end time from the occurrence's local calendar day to keep the
    // class display consistent around timezone and daylight-saving changes.
    let end = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    for (let attempt = 0; attempt < 3; attempt++) {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: schedule.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(end);
      const values = Object.fromEntries(
        parts.map(({ type, value }) => [type, value]),
      );
      const actual = Date.UTC(
        +values.year,
        +values.month - 1,
        +values.day,
        +values.hour,
        +values.minute,
      );
      const desired = Date.UTC(year, month - 1, day, hours, minutes);
      end = new Date(end.getTime() + desired - actual);
    }
    return end.toLocaleTimeString("en", {
      timeZone: schedule.timezone,
      hour: "numeric",
      minute: "2-digit",
    });
  })();
  const room = [schedule.room, schedule.building].filter(Boolean).join(", ");
  const reminderLead =
    schedule.reminder === 60 ? "1 hour" : `${schedule.reminder} minutes`;
  const { render } = await import("@react-email/render");
  const html = await render(
    React.createElement(ClassReminderEmail, {
      subject: schedule.subject,
      classDate,
      startTime,
      endTime,
      reminderLead,
      instructor: schedule.instructor,
      room,
      classType: schedule.type,
    }),
  );
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: `Upcoming class: ${schedule.subject}`,
    text: `Class Reminder\nYour class starts in ${reminderLead}, at ${startTime} to ${endTime}.\n\n${schedule.subject}\n${classDate}${schedule.instructor ? `\nInstructor: ${schedule.instructor}` : ""}${room ? `\nRoom: ${room}` : ""}${schedule.type ? `\nClass: ${schedule.type}` : ""}\n\nManage reminders in Finote schedule.\nThank you for using Finote.`,
    html,
  });
}

async function sendNotificationEmail(email, notification) {
  const { render } = await import("@react-email/render");
  const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const href = new URL(notification.href, baseUrl).toString();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: notification.title,
    messageId: `<finote-notification-${notification._id}@${process.env.EMAIL_DOMAIN || "finote.local"}>`,
    text: `${notification.title}\n\n${notification.message}\n\nOpen in Finote: ${href}`,
    html: await render(React.createElement(NotificationEmail, { ...notification, href })),
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendClassReminder,
  sendNotificationEmail,
};
