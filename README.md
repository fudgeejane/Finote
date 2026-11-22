# Finote Developer Documentation

Finote is a student study workspace that combines note-taking, class scheduling, flashcards, mock exams, and learning-progress views. The current application is a React single-page application backed by a small Express API and MongoDB schedule storage.

> [!IMPORTANT]
> The repository is still under development. The sign-in and sign-up interfaces are present, but JWT registration, login, token verification, and protected routes are not yet implemented. Notes and study materials are stored in browser `localStorage`; only class schedules are currently persisted through MongoDB.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Local Setup](#installation-and-local-setup)
- [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)
- [Development Guide](#development-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

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

Most visual and study features run entirely in the browser. MongoDB is currently used by the schedule API. Authentication and account data remain frontend prototypes and should not be treated as production authentication.

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
| MongoDB | Schedule persistence |
| CORS | Cross-origin browser access |
| dotenv | Environment variable loading |
| Nodemon | Backend development process |

### Planned Authentication

JWT authentication is planned but not implemented. When adding it, the backend will also need packages such as `jsonwebtoken` and `bcryptjs`.

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
  | relative /api requests for schedules
  v
Express API
  |
  | Mongoose
  v
MongoDB
```

### Theme

`DarkModeContext` checks the saved `darkMode` value first, then the operating-system preference. It updates the document color scheme and persists future changes.