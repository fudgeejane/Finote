import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { DarkModeProvider } from "./components/theme/DarkModeContext";
import LoadingPage from "./components/pages/LoadingPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <DarkModeProvider>
      <LoadingPage />
      <App />
    </DarkModeProvider>
  </BrowserRouter>
);