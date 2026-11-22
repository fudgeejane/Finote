import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import PublicLayout from "./layout/PublicLayout";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import TermsOfServicesPage from "./pages/public/TermsOfServicesPage";
import PrivacyPolicyPage from "./pages/public/PrivacyPolicyPage";
import ContactPage from "./pages/public/ContactPage";
import PrivateLayout from "./layout/PrivateLayout";
import HomePage from "./pages/app/HomePage";
import NotesPage from "./pages/app/NotesPage";
import StudyToolsPage from "./pages/app/StudyToolsPage";
import ProgressPage from "./pages/app/ProgressPage";
import SettingsPage from "./pages/app/SettingsPage";
import SchedulePage from "./pages/app/SchedulePage";

export default function App() {
  return (
     <>
      <Routes>

        { /* Publics Pages */}
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="terms-of-services" element={<TermsOfServicesPage />} />
          <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

        { /* Private Pages */}
        <Route element={<PrivateLayout />}>
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<Navigate to="/home" replace />} />
          <Route path="app/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="study-tools" element={<StudyToolsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="learning-progress" element={<Navigate to="/progress" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
        </Route>
      </Routes>
    </>
  )
}