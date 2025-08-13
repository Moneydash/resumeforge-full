# ResumeForge Express Backend

A Node.js/Express backend for a resume-building platform with Google and GitHub OAuth authentication, PDF generation, and MySQL database integration. Built with TypeScript for type safety and maintainability.

---

## Project Summary

ResumeForge Express provides secure, passwordless authentication via Google and GitHub, allowing users to create, save, and generate PDF resumes. The backend is modular, using Express.js, Passport.js, Knex.js, and Puppeteer for PDF rendering. All user data is stored in a MySQL database.

---

## Features

- **Google & GitHub OAuth authentication** (no password login)
- **MySQL database integration** with Knex.js ORM
- **PDF generation** from HTML using Puppeteer with multiple resume templates
- **Resume management** (create, read, update, delete, clone, rename)
- **Session management** with secure cookies and CSRF protection
- **Rate limiting** for authentication and PDF generation endpoints
- **Input validation** and sanitization for security
- **CORS support** for frontend integration
- **TypeScript** for type safety and better developer experience
- **Database migrations** for schema management and versioning

---

## Security Practices

- No password storage or password-based login (reduces risk of brute-force and credential leaks)
- All authentication via trusted OAuth providers (Google, GitHub)
- Session cookies are set to `secure` in production and use `httpOnly`
- Input validation and sanitization for user-provided HTML
- Rate limiting middleware for authentication endpoints
- CORS origin restricted via environment variable

**Areas for Improvement:**
- Ensure all secrets (session, OAuth) are set via environment variables
- Enforce HTTPS in production
- Consider adding global rate limiting
- Unify database access (prefer Knex.js over raw MySQL)
- Add automated tests for critical flows

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=8080
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=resumeforge
DB_PORT=3306
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=your_session_secret_key_here
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

1. Create a MySQL database named `resumeforge`
2. Run migrations to create tables:
   ```bash
   npm run migrate
   ```
3. (Optional) Run seeds to populate initial data:
   ```bash
   npm run seed
   ```

### 4. OAuth Setup

- Set up OAuth credentials for Google and GitHub in their respective developer consoles.
- Add authorized redirect URIs:
  - `http://localhost:8080/auth/google/callback`
  - `http://localhost:8080/auth/github/callback`

### 5. Run the Application

```bash
npm run dev
```

The server will start on `http://localhost:8080`

---

## API Endpoints

### Authentication
- `GET /` - Root route, redirects based on auth status
- `GET /login` - Login page (returns available providers)
- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/github` - Initiate GitHub OAuth login
- `GET /auth/github/callback` - GitHub OAuth callback
- `POST /logout` - Logout user
- `GET /auth-status` - Check authentication status
- `GET /dashboard` - Protected dashboard route
- `GET /profile` - Get user profile (requires authentication)
- `GET /csrf-token` - Get CSRF token for secure requests
- `GET /db-test` - Test database connection

### Resume Management
- `POST /resume/generate` - Generate PDF from HTML (requires authentication)
- `POST /resume/save-data` - Save or update user resume data (requires authentication)
- `GET /resume/fetch-data/:id/:userId` - Fetch specific resume data (requires authentication)
- `GET /resume/fetch-resumes/:userId` - Fetch all resumes for a user (requires authentication)
- `POST /resume/create-init/:userId` - Create a new empty resume (requires authentication)
- `POST /resume/rename/:id/:userId` - Rename an existing resume (requires authentication)
- `POST /resume/clone/:id/:userId` - Clone an existing resume (requires authentication)
- `DELETE /resume/delete-resume/:id/:userId` - Delete a resume (requires authentication)

---

## Project Structure

```bash
src/
├── controllers/
│   ├── auth.ts          # OAuth authentication controllers (Google & GitHub)
│   ├── resume.ts        # Resume CRUD operations controllers
│   └── pdf.ts           # PDF generation controller using Puppeteer
├── routes/
│   ├── auth.ts          # Authentication routes with middleware
│   └── resume.ts        # Resume/PDF routes with rate limiting
├── models/
│   ├── User.ts          # User model with OAuth provider support
│   └── Resume.ts        # Resume data model with CRUD operations
├── db/
│   ├── db.ts            # MySQL2 connection setup
│   ├── knex.ts          # Knex configuration
│   └── migrations/      # Database migrations
├── middlewares/
│   └── auth.ts          # Authentication, CSRF, and rate limiting middleware
├── types/
│   ├── interface.user.ts        # User type definitions
│   ├── interface.resume.ts      # Resume data type definitions
│   └── types.controller-type.ts # Controller type definitions
├── utils/
│   └── helper.ts         # Utility functions (ID generation, HTML formatting)
└── index.ts              # Main application entry point with Express setup
```

---

## Database Schema

### Users Table
- `id` (VARCHAR) - Primary key
- `google_id` (VARCHAR) - Google OAuth ID (unique)
- `github_id` (VARCHAR) - GitHub OAuth ID (unique)
- `email` (VARCHAR) - User email (unique)
- `name` (VARCHAR) - User display name
- `avatar` (TEXT) - User avatar URL
- `created_at` (TIMESTAMP) - Account creation time
- `updated_at` (TIMESTAMP) - Last update time

### user_resume_data Table
- `id` (VARCHAR) - Primary key
- `user_id` (VARCHAR) - Foreign key to users.id
- `resume_name` (VARCHAR) - Display name for the resume
- `resume_slug_name` (VARCHAR) - URL-friendly slug for the resume
- `resume_data` (TEXT/JSON) - Resume content in JSON format
- `template` (VARCHAR) - Resume template identifier
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- `deleted_at` (TIMESTAMP) - Soft delete timestamp (nullable)

---

## Troubleshooting

- **CORS Errors:** Ensure `FRONTEND_URL` in `.env` matches your frontend URL and requests include `credentials: 'include'`.
- **Database Connection Errors:** Verify MySQL is running, credentials are correct, and the database exists.
- **OAuth Errors:** Check credentials and redirect URIs in your provider consoles and `.env` file.

---

## License

Polyform Noncommercial License