const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { render } = require("@react-email/render");
const ClassReminderEmail = require("../emails/ClassReminderEmail");

test("class reminder renders a clear summary and escapes user supplied text", async () => {
  const html = await render(
    React.createElement(ClassReminderEmail, {
      subject: "Biology <101>",
      classDate: "Monday, June 1",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      reminderLead: "1 hour",
      instructor: "Dr. Lee",
      room: "Room 204, Science Building",
      classType: "Lecture",
    }),
  );

  assert.match(html, /Class Reminder/);
  assert.match(html, /Biology &lt;101&gt;/);
  assert.match(html, /Monday, June 1/);
  assert.match(html, /starts in 1 hour, at 2:00 PM to 3:00 PM/);
  assert.match(html, /2:00 PM/);
  assert.match(html, /Room 204/);
});
