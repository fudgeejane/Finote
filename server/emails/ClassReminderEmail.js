const React = require("react");
const {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} = require("@react-email/components");

const h = React.createElement;

function detail(label, value) {
  if (!value) return null;

  return h(
    React.Fragment,
    null,
    h(
      Row,
      { style: styles.detailRow },
      h(Column, { style: styles.detailLabel }, label),
      h(Column, { style: styles.detailValue }, value),
    ),
    h(Hr, { style: styles.rowDivider }),
  );
}

function ClassReminderEmail({
  subject,
  classDate,
  startTime,
  endTime,
  reminderLead,
  instructor,
  room,
  classType,
}) {
  return h(
    Html,
    null,
    h(Head),
    h(
      Preview,
      null,
      `Your class starts in ${reminderLead}, at ${startTime} to ${endTime}.`,
    ),
    h(
      Body,
      { style: styles.body },
      h(
        Container,
        { style: styles.container },
        h(Heading, { as: "h1", style: styles.heading }, "Class Reminder"),
        h(
          Text,
          { style: styles.summary },
          `Your class starts in ${reminderLead}, at ${startTime} to ${endTime}.`,
        ),
        h(Hr, { style: styles.mainDivider }),
        h(Heading, { as: "h2", style: styles.subject }, subject),
        h(Text, { style: styles.date }, classDate),
        h(Hr, { style: styles.rowDivider }),
        detail("Instructor", instructor),
        detail("Room", room),
        detail("Class", classType),
        h(
          Section,
          { style: styles.footer },
          h(
            Text,
            { style: styles.footerText },
            "Manage reminders in Finote schedule.",
          ),
          h(Text, { style: styles.footerText }, "Thank you for using Finote."),
        ),
      ),
    ),
  );
}

const styles = {
  body: {
    backgroundColor: "#ffffff",
    color: "#111111",
    fontFamily: "Arial, Helvetica, sans-serif",
    margin: 0,
    padding: "14px 18px",
  },
  container: { margin: "0 auto", maxWidth: "520px", width: "100%" },
  heading: { fontSize: "24px", lineHeight: "30px", margin: "0 0 10px" },
  summary: { fontSize: "14px", lineHeight: "22px", margin: "0 0 24px" },
  mainDivider: { borderColor: "#111111", margin: "0 0 18px" },
  subject: { fontSize: "18px", lineHeight: "24px", margin: "0 0 3px" },
  date: { color: "#64748b", fontSize: "14px", lineHeight: "20px", margin: 0 },
  rowDivider: { borderColor: "#dedede", margin: "12px 0" },
  detailRow: { width: "100%" },
  detailLabel: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "20px",
    verticalAlign: "top",
    width: "110px",
  },
  detailValue: {
    color: "#111111",
    fontSize: "14px",
    lineHeight: "20px",
    verticalAlign: "top",
  },
  footer: { marginTop: "22px" },
  footerText: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "19px",
    margin: "0 0 2px",
  },
};

module.exports = ClassReminderEmail;
