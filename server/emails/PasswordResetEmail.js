const React = require("react");
const {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
} = require("@react-email/components");

function PasswordResetEmail({ code }) {
  return React.createElement(
    Html,
    null,
    React.createElement(Head),
    React.createElement(
      Body,
      {
        style: {
          backgroundColor: "#f6f9fc",
          fontFamily: "Arial, sans-serif",
        },
      },
      React.createElement(
        Container,
        {
          style: {
            margin: "40px auto",
            padding: "24px",
            backgroundColor: "#ffffff",
          },
        },
        React.createElement(Heading, null, "Reset your Finote password"),
        React.createElement(Text, null, "Enter this code to continue:"),
        React.createElement(
          Text,
          {
            style: {
              fontSize: "28px",
              fontWeight: "bold",
              letterSpacing: "6px",
            },
          },
          code
        ),
        React.createElement(Text, null, "This code expires in 15 minutes.")
      )
    )
  );
}

module.exports = PasswordResetEmail;