const React = require("react");
const { Html, Head, Preview, Body, Container, Heading, Text, Button } = require("@react-email/components");

function NotificationEmail({ title, message, href }) {
  return React.createElement(Html, null,
    React.createElement(Head),
    React.createElement(Preview, null, message),
    React.createElement(Body, { style: { backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", color: "#1e293b" } },
      React.createElement(Container, { style: { maxWidth: "560px", margin: "32px auto", padding: "28px", backgroundColor: "#ffffff", borderRadius: "12px" } },
        React.createElement(Text, { style: { color: "#2563eb", fontWeight: 700 } }, "Finote"),
        React.createElement(Heading, { as: "h1", style: { fontSize: "22px" } }, title),
        React.createElement(Text, null, message),
        React.createElement(Button, { href, style: { backgroundColor: "#2563eb", color: "#ffffff", padding: "12px 18px", borderRadius: "8px", textDecoration: "none" } }, "Open in Finote"),
      ),
    ),
  );
}
module.exports = NotificationEmail;
