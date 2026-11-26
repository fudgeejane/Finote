# Finote Developer Documentation

Finote is a student study workspace that combines note-taking, class scheduling, flashcards, mock exams, and learning-progress views. The application is a React single-page application backed by an Express API and MongoDB.

> [!IMPORTANT]
> The repository is still under development. Authentication now uses the Express API, MongoDB accounts, short-lived access tokens, and rotating refresh-token cookies. Notes, schedules, and study materials are still stored in browser `localStorage` unless a feature explicitly uses an API.

## Project Overview

Finote helps students organize and review study material through the following features:

- Rich-text note creation, editing, search, undo/redo, formatting, and deletion
- Flashcard generation from selected notes
- Mock-exam generation from note sections
- Multiple mock-exam question formats
- Weekly class schedules with recurring classes and overlap prevention
- Workspace search across pages and study tools
- Learning-progress dashboards with sample assessment data
- Account and settings interfaces
- Terms of Service and Privacy Policy review
- Light and dark themes

Most visual and study features run entirely in the browser. Authentication and profile data use MongoDB through the API. Configure secrets, email delivery, and the production cookie settings before deployment.

## Tech Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| React 19 | Component-based user interface |
| Vite 8 | Development server and production builds |
| React Router 7 | Public and private route management |
| Tailwind CSS 4 | Styling and responsive layout |
| Lucide React | Interface icons |
| Motion | Interface animations |
| `styled-components` | Available styling dependency |

The rich-text editor UI uses browser content editing in `NotesPage.jsx`; Editor.js and Vaadin rich-text packages are also included as dependencies.

### Backend

| Technology | Purpose |
| --- | --- |
| Node.js | JavaScript server runtime |
| Express 5 | HTTP API framework |
| Mongoose 9 | MongoDB schema and data access |
| MongoDB | Account and session persistence |
| CORS | Cross-origin browser access |
| dotenv | Environment variable loading |
| Nodemon | Backend development process |

### AI study tools

On Gemini capacity errors, study-material generation retries the configured model up to three times with backoff, honors `Retry-After` (capped at 10 seconds), then tries `gemini-3.6-flash`, `gemini-3.1-flash-lite`, and `gemini-3.5-flash-lite`. If all models are unavailable, users receive a friendly retry message and their form selections remain intact.

### Authentication

`client/src/auth/AuthContext.jsx` restores sessions from an HTTP-only refresh cookie and keeps access tokens in memory. `RouteGuards.jsx` protects workspace routes and redirects signed-in users away from public pages. The auth modal calls `/api/auth` for registration, email verification, login, code resend, and password recovery. After verification, users sign in and complete their profile through `/api/users/complete-profile` before entering the workspace.

The API stores password and one-time-code hashes, expires verification and reset codes, rotates refresh tokens, revokes sessions on password reset, and rate-limits sensitive auth requests. Refresh cookies are scoped to `/api/auth`; configure `COOKIE_SECURE=true` when serving over HTTPS.

Set the following values in `server/.env`: `MONGODB_URI`, `CODE_PEPPER`, `JWT_ACCESS_SECRET`, `EMAIL_USER`, and `EMAIL_PASS`. AI mock exams and flashcards also require the server-only `GEMINI_API_KEY`; `GEMINI_MODEL` defaults to `gemini-3.8-flash` and automatically falls back to `gemini-3.5-flash-lite` on capacity errors. Override these with `GEMINI_MODEL` or `GEMINI_FALLBACK_MODEL` if needed. Profile picture uploads also require `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Optional cookie/session settings include `COOKIE_NAME`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `JWT_ACCESS_TTL`, `REFRESH_TOKEN_DAYS`, and `REMEMBER_ME_DAYS`. Set `CLIENT_URL` to the deployed frontend origin. For local Vite development, the `/api` proxy targets `http://localhost:5000`; override it with `VITE_API_PROXY` if needed. Set `VITE_API_URL` in the frontend when the deployed API is hosted on a different origin.

Address lookup uses explicit searches against the public Nominatim service, with attribution, in-process caching, and a one-request-per-second queue. Run this API as a single instance to respect the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/); use a managed or self-hosted geocoder before scaling to multiple instances.

### Deployment

- Vercel is the intended deployment platform.
- The frontend is a Vite application.
- The backend must be deployed as a serverless-compatible Express entry point or as a separately hosted Node.js API.


## Prerequisites

Install the following before starting development:

- Node.js 18 or newer
- npm
- Git
- A MongoDB Atlas cluster or another MongoDB deployment
- A modern browser
- A Vercel account for production deployment

## How It Works

### Application Flow

```text
Browser
  |
  | React routes and component state
  v
Vite/React frontend
  |
  | /api requests for authentication and account data
  v
Express API
  |
  | Mongoose
  v
MongoDB
```

Authentication endpoints are mounted under `/api/auth` (`register`, `verify-email`, `resend-verification`, `login`, `refresh`, `logout`, `forgot-password`, `verify-reset-code`, and `reset-password`). Authenticated account endpoints are mounted under `/api/users` (`me`, `complete-profile`, `address-search`, and `profile-picture`).

### Theme

`DarkModeContext` checks the saved `darkMode` value first, then the operating-system preference. It updates the document color scheme and persists future changes.
