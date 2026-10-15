import express, { Request, Response, NextFunction, RequestHandler } from "express";
import cors from "cors";
import pdfRouter from "./routes/resume";
import authRouter from "./routes/auth";
import clRouter from "./routes/cover-letter";
import atsRouter from "./routes/ats";
import publicResumeRouter from './routes/public-resume';
import { config as configDotenv } from "dotenv";
import session from 'express-session';
import passport from 'passport';
import { testConnection } from './db/db';
import cookieParser from 'cookie-parser';
import { csrfProtection } from './middlewares/auth';
import { createMaintenanceStore } from './utils/maintenanceStore';
import { createMaintenanceControlRouter, createMaintenanceStatusRouter } from './routes/maintenance';
import { maintenanceGate } from './middlewares/maintenance';
import { createAdminRouter } from './routes/admin';
import { AdminService } from './services/adminService';
import { KnexAdminStore } from './models/KnexAdminStore';
import { isAdminRequest, lenientSession } from './middlewares/adminAuth';

configDotenv();

const app = express();
const port = process.env.PORT || 8080;
const maintenanceStore = createMaintenanceStore();
const adminService = new AdminService(new KnexAdminStore());

interface ErrorWithCode extends Error {
  code?: string;
}

// The print page Chrome opens for share-link PDFs may live at PRINT_BASE_URL; its API calls need CORS too.
const printOrigin = process.env.PRINT_BASE_URL ? new URL(process.env.PRINT_BASE_URL).origin : undefined;
app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:3000", ...(printOrigin ? [printOrigin] : [])],
  credentials: true,
  exposedHeaders: ['X-Maintenance', 'Retry-After'], // so the client can recognise the maintenance 503
}));
app.use(express.json());
// Public maintenance status first: it stays ahead of the session so polling never touches the database.
app.use('/maintenance', createMaintenanceStatusRouter(maintenanceStore));
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));
// app.use(cookieParser());

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // HTTPS in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // SameSite=None requires Secure; browsers reject the cookie otherwise.
    // Without HTTPS in dev, fall back to Lax so the session cookie is actually set.
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true
  }
}));

app.set('trust proxy', 1); // Trust first proxy for secure cookies in production

// Passport middleware
app.use(passport.initialize());
// A failed user lookup (database down) counts as "not signed in", so the gate below can still answer 503.
app.use(lenientSession(passport.session() as RequestHandler));

// Maintenance gate: admins pass, everyone else gets 503. It sits after the session (to see who is asking)
// and before the CSRF check (so clients see the 503, not a CSRF 403).
app.use(maintenanceGate(maintenanceStore, { isAdmin: isAdminRequest }));
// PUT /maintenance checks its own credentials (emergency token, or admin session + CSRF), so it sits
// before the global CSRF check.
app.use('/maintenance', createMaintenanceControlRouter(maintenanceStore, { isAdmin: isAdminRequest, csrf: csrfProtection }));

// Public share links: GET only, no sign-in. After the maintenance gate (they pause with the rest of the site)
// and before the CSRF check (nothing here changes state).
app.use('/public/resume', publicResumeRouter);

app.use(csrfProtection);

app.use((req, res, next) => {
  const token = req.csrfToken(); // New token each time
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    signed: true
  });
  next();
});

app.use('/', authRouter);
app.use('/resume', pdfRouter);
app.use('/cover-letter', clRouter);
app.use('/ats', atsRouter);
app.use('/admin', createAdminRouter(adminService));

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const error = err as ErrorWithCode;
  console.error('Error in middleware:', error);
  if (error.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ error: 'Invalid CSRF token', details: error.message });
  } else {
    next(error);
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    await testConnection();

    maintenanceStore.start();
    app.listen(port, () => {
      console.log(`Server is running and listening to port: ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();