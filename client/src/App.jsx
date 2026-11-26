import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

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
import FlashCardPage from "./pages/app/FlashCardPage";
import MockExamPage from "./pages/app/MockExamPage";
import ProgressPage from "./pages/app/ProgressPage";
import SettingsPage from "./pages/app/SettingsPage";
import SchedulePage from "./pages/app/SchedulePage";
import { PublicOnly, RequireUser } from "./auth/RouteGuards";
import CompleteProfilePage from "./pages/app/CompleteProfilePage";
import StatusPage from "./components/pages/StatusPage";

const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: "terms-of-services", element: <TermsOfServicesPage /> },
          { path: "privacy-policy", element: <PrivacyPolicyPage /> },
          { path: "contact", element: <ContactPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireUser />,
    children: [
      { path: "complete-profile", element: <CompleteProfilePage /> },
      {
        element: <PrivateLayout />,
        children: [
          { path: "home", element: <HomePage /> },
          { path: "dashboard", element: <Navigate to="/home" replace /> },
          { path: "app/dashboard", element: <Navigate to="/home" replace /> },
          { path: "notes", element: <NotesPage /> },
          { path: "study-tools", element: <StudyToolsPage /> },
          { path: "flashcards/:materialId", element: <FlashCardPage /> },
          { path: "mock-exams/:materialId", element: <MockExamPage /> },
          { path: "progress", element: <ProgressPage /> },
          { path: "learning-progress", element: <Navigate to="/progress" replace /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "schedule", element: <SchedulePage /> },
        ],
      },
    ],
  },
  { path: "*", element: <StatusPage type="notFound" /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
