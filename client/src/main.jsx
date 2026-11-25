import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { DarkModeProvider } from "./components/theme/DarkModeContext";
import LoadingPage from "./components/pages/LoadingPage";
import { AuthProvider } from "./auth/AuthContext";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <DarkModeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 11000 }}
          toastOptions={{ duration: 2000 }}
        />
        <LoadingPage />
        <App />
      </AuthProvider>
    </DarkModeProvider>
  </BrowserRouter>
);
