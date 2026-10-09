# ResumeForge

ResumeForge is a full-stack web application for building, managing, and exporting professional resumes and cover letters, and for checking whether a resume can be read by an Applicant Tracking System (ATS). It provides a modern, user-friendly interface and supports authentication via Google and GitHub.

## Project Overview
- **Frontend:** React (TypeScript, Vite, Tailwind CSS, shadcn/ui)
- **Backend:** Node.js (TypeScript, Express 5)
- **Database:** MySQL (via Knex)
- **PDF Generation:** Puppeteer
- **PDF Reading (ATS Scanner):** pdfjs-dist
- **Authentication:** Google & GitHub OAuth (Passport.js)
- **State Management:** Zustand
- **Rate Limiting:** express-rate-limit (in-memory, or Redis when `REDIS_URL` is set)

## Key Features
- Create, edit, clone, rename, and delete resumes and cover letters
- 10 resume templates (Galaxy and Greek Gods collections) and 5 cover letter templates
- Export resumes and cover letters as high-quality PDFs
- **Live updates:** once a resume or cover letter has a preview, edits are saved and the preview regenerates automatically a couple of seconds after you stop typing
- **ATS Scanner:** upload a PDF resume and see how an ATS would read it (see below)
- Secure authentication and session management, with a confirmed **logout** button on the dashboards and the ATS Scanner page
- Dashboards for managing multiple resumes and cover letters, with grid and list views
- Dark mode
- Rate limiting and CSRF protection for security

## ATS Scanner

The ATS Scanner (`/ats-scanner`) lets a signed-in user upload a PDF resume and get a **readability score** from 0 to 100, a verdict, and a list of findings. It is stateless: the PDF is scanned in memory and never stored.

**How it works**
1. The client uploads the PDF (max 5 MB) to `POST /ats/scan`.
2. The server extracts the text layer with `pdfjs-dist`, the same way most ATS parsers read a file, and times the read.
3. It runs six checks: readable text, reading speed, character quality, reading order, key information (email, phone, experience, education, skills), and length.
4. It returns the verdict, the score, the findings, and the extracted text ("what the ATS sees").

**Scoring**

| Check | Weight |
|---|---|
| Readable text | 35 |
| Character quality | 20 |
| Key information | 20 |
| Reading order | 10 |
| Reading speed | 10 |
| Length | 5 |

A passed check earns its full weight and a warning earns half. A resume with no readable text (for example a scanned image) is capped at a score of 30.

| Verdict | Meaning |
|---|---|
| Friendly | Every check passed |
| Partial | At least one warning, no failures |
| Not friendly | At least one failure |

**Limits**
- 10 scans per 30 minutes per user.
- One PDF per request, up to 5 MB, at most 10 pages scanned, 30-second timeout per scan.
- The score is a heuristic. Real ATS products differ from each other, so treat it as guidance rather than a guarantee. OCR is not performed, so image-only PDFs are reported as not readable.

## Folder Structure

```
resumeforge-full/
├── client/                         # React + Vite frontend
├── server/                         # Express + MySQL backend
├── CODE_OF_CONDUCT.md
├── LICENSE
└── README.md
```

### client/

```
client/
├── public/                         # Static files (logo, favicon)
├── src/
│   ├── api/
│   │   ├── axiosInstance.ts        # Configured axios client (base URL, credentials)
│   │   └── request.ts              # PDF generation request helper
│   ├── assets/
│   │   ├── snapshots/              # Resume template preview images (galaxy/, greek/)
│   │   ├── cl-snapshots/           # Cover letter template previews (elements/)
│   │   └── icons/
│   ├── components/
│   │   ├── blocks/editor-00/       # Rich text editor building blocks
│   │   ├── cover-letter/
│   │   │   ├── cl-forms/           # Cover letter form sections (Personal, Recipient, Content)
│   │   │   └── cl-templates/elements/  # aether, aqua, ignis, terra, ventus
│   │   ├── editor/                 # Editor UI and themes
│   │   ├── forms/                  # Resume form sections (Personal, Experience, Education, ...)
│   │   ├── templates/
│   │   │   ├── galaxy/             # andromeda, cigar, comet, milky_way
│   │   │   └── greek/              # apollo, artemis, athena, hera, hermes, zeus
│   │   ├── ui/                     # shadcn/ui primitives (button, dialog, tooltip, ...)
│   │   ├── CLForm.tsx              # Cover letter form (supports live edit)
│   │   ├── ResumeForm.tsx          # Resume form (supports live edit)
│   │   ├── LogoutButton.tsx        # Floating logout button with confirmation dialog
│   │   ├── ProtectedRoute.tsx      # Redirects unauthenticated users to /login
│   │   ├── TemplateCard.tsx / CLTemplateCard.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ...
│   ├── contexts/
│   │   └── ThemeContext.tsx        # Dark / light theme
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx           # Resume dashboard
│   │   ├── Templates.tsx           # Resume template selection
│   │   ├── Preview.tsx             # Resume editor + live PDF preview
│   │   ├── CLDashboard.tsx         # Cover letter dashboard
│   │   ├── CLTemplates.tsx         # Cover letter template selection
│   │   ├── CLPreview.tsx           # Cover letter editor + live PDF preview
│   │   ├── ATSScanner.tsx          # ATS Scanner (upload, progress, results)
│   │   ├── PrivacyPolicy.tsx
│   │   ├── TermsOfService.tsx
│   │   └── NotFound.tsx
│   ├── schema/                     # Yup validation schemas (resume and cover letter)
│   ├── store/                      # Zustand stores (useMainStore, useDashboardStore)
│   ├── styles/                     # Template CSS (templates/, cover-letter/), shared form classes
│   ├── types/                      # TypeScript interfaces for form data
│   ├── utils/                      # helper.ts (CSRF, PDF payloads, formatting), template metadata
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx                  # Route definitions (lazy loaded, protected)
├── components.json                 # shadcn/ui configuration
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

### server/

```
server/
├── src/
│   ├── controllers/
│   │   ├── ats.ts                  # ATS scan request handling
│   │   ├── auth.ts                 # OAuth callbacks, logout, CSRF token
│   │   ├── resume.ts               # Resume CRUD, clone, rename, export tracking
│   │   ├── cover-letter.ts         # Cover letter CRUD, clone, rename, export tracking
│   │   ├── pdf.ts                  # Resume PDF generation (Puppeteer)
│   │   └── cl-pdf.ts               # Cover letter PDF generation (Puppeteer)
│   ├── db/
│   │   ├── migrations/             # Knex migrations (users, resumes, cover letters, exports)
│   │   ├── db.ts                   # MySQL connection pool
│   │   └── knex.ts
│   ├── middlewares/
│   │   ├── ats.ts                  # ATS rate limit (10 per 30 min per user) and PDF upload handling
│   │   └── auth.ts                 # Auth checks, CSRF protection, general rate limiter
│   ├── models/                     # User, Resume, CoverLetter
│   ├── routes/
│   │   ├── ats.ts                  # /ats
│   │   ├── auth.ts                 # /, /auth/*, /logout, /csrf-token
│   │   ├── resume.ts               # /resume
│   │   └── cover-letter.ts         # /cover-letter
│   ├── types/                      # TypeScript interfaces and Express session typings
│   ├── utils/
│   │   ├── atsScanner.ts           # PDF text extraction, checks, scoring (pdfjs-dist)
│   │   ├── helper.ts
│   │   └── pdfGenerator.ts
│   └── index.ts                    # App setup: CORS, sessions, Passport, CSRF, routes
├── knexfile.js
├── nodemon.json
├── package.json
└── tsconfig.json
```

## API Overview

All routes except the OAuth ones require a signed-in user, and state-changing requests need the CSRF token from `GET /csrf-token` in the `X-CSRF-Token` header.

| Area | Endpoints |
|---|---|
| Auth | `GET /auth/google`, `GET /auth/github` (and callbacks), `POST /logout`, `GET /csrf-token` |
| Resumes | `POST /resume/generate`, `POST /resume/save-data`, `GET /resume/fetch-resumes/:userId`, `GET /resume/fetch-data/:id/:userId`, `POST /resume/create-init/:userId`, `POST /resume/rename/:id/:userId`, `POST /resume/clone/:id/:userId`, `DELETE /resume/delete-resume/:id/:userId`, `POST /resume/save-exports/:id/:userId` |
| Cover letters | Same pattern under `/cover-letter`, with `POST /cover-letter/generate-cl` |
| ATS Scanner | `POST /ats/scan` (multipart form, file field `resume`) |

Logout ends the session on the server and clears the session and CSRF cookies. The browser also clears its own cookies, `localStorage`, and `sessionStorage`.

## Getting Started

### Prerequisites
- Node.js 20 or later
- MySQL
- A Google and/or GitHub OAuth app
- Redis (optional): only needed to share rate-limit counters across several server instances

### Setup
1. Clone the repository
2. Install dependencies in both `client` and `server` (the server's install also downloads Chrome for Puppeteer)
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
3. Create a `.env` file in each directory (see below)
4. Run the database migrations
   ```bash
   cd server && npm run migrate
   ```
5. Start both development servers
   ```bash
   cd server && npm run dev     # http://localhost:8080
   cd client && npm run dev     # http://localhost:5173
   ```

### Environment variables

**client/.env**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, for example `http://localhost:8080` |

**server/.env**

| Variable | Description |
|---|---|
| `PORT` | Server port (default `8080`) |
| `FRONTEND_URL` | Allowed CORS origin. Set it to your client URL (for example `http://localhost:5173`); the default is `http://localhost:3000` |
| `BASE_URL` | Public URL of the server, used for OAuth callbacks |
| `SESSION_SECRET`, `JWT_SECRET` | Secrets for sessions and tokens |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `REDIS_URL` | Optional. Stores ATS rate-limit counters in Redis instead of memory |

### Useful scripts

| Where | Command | Purpose |
|---|---|---|
| client | `npm run dev` / `build` / `lint` | Dev server, production build, linting |
| server | `npm run dev` | Start with nodemon and ts-node |
| server | `npm run build` / `start` | Compile to `dist/` and run it |
| server | `npm run migrate` / `migrate:rollback` | Apply or roll back database migrations |

For more detail, see the READMEs in the `client` and `server` directories.

---

© ResumeForge Project
