
const React = require("react");
const {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
} = require("@react-email/components");

function VerificationEmail({ code }) {
  return React.createElement(
    Html,
    null,
    React.createElement(Head),
    React.createElement(
      Body,
      {
        style: {
          backgroundColor: "#f4f6fb",
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: "0",
          padding: "40px 16px",
        },
      },
      React.createElement(
        Container,
        {
          style: {
            maxWidth: "480px",
            margin: "0 auto",
            padding: "40px 36px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e8eaf0",
          },
        },

        React.createElement(
          Heading,
          {
            style: {
              fontSize: "26px",
              fontWeight: "700",
              color: "#171923",
              textAlign: "center",
              margin: "0 0 12px",
            },
          },
          "Verify your email address"
        ),

        React.createElement(
          Text,
          {
            style: {
              fontSize: "15px",
              lineHeight: "24px",
              color: "#646b7a",
              textAlign: "center",
              margin: "0 0 28px",
            },
          },
          "Welcome to Finote! We're excited to have you on board. Please use the verification code below to confirm your email address and complete your account setup."
        ),

        React.createElement(
          Container,
          {
            style: {
              backgroundColor: "#f4f6fb",
              borderRadius: "10px",
              padding: "24px",
              textAlign: "center",
              margin: "0 0 24px",
            },
          },
          React.createElement(
            Text,
            {
              style: {
                fontSize: "12px",
                fontWeight: "600",
                color: "#858b9a",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: "0 0 12px",
              },
            },
            "Your verification code"
          ),
          React.createElement(
            Text,
            {
              style: {
                fontSize: "36px",
                fontWeight: "700",
                letterSpacing: "10px",
                color: "#4f46e5",
                margin: "0",
                textAlign: "center",
              },
            },
            code
          )
        ),

        React.createElement(
          Text,
          {
            style: {
              fontSize: "13px",
              lineHeight: "21px",
              color: "#858b9a",
              textAlign: "center",
              margin: "0 0 24px",
            },
          },
          "This verification code will expire in 15 minutes. For your security, please do not share this code with anyone."
        ),

        React.createElement(
          Text,
          {
            style: {
              fontSize: "13px",
              lineHeight: "21px",
              color: "#646b7a",
              textAlign: "center",
              margin: "0 0 24px",
            },
          },
          "If you didn't create a Finote account, you can safely ignore this email."
        ),

        React.createElement(
          Text,
          {
            style: {
              borderTop: "1px solid #e8eaf0",
              paddingTop: "24px",
              fontSize: "12px",
              lineHeight: "20px",
              color: "#a0a5b1",
              textAlign: "center",
              margin: "0",
            },
          },
          "© Finote. All rights reserved."
        )
      )
    )
  );
}

module.exports = VerificationEmail;
