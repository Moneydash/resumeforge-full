import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import pdfRouter from "./routes/resume";
import authRouter from "./routes/auth";
import clRouter from "./routes/cover-letter";
import { config as configDotenv } from "dotenv";
import session from 'express-session';
import passport from 'passport';
import { testConnection } from './db/db';
import cookieParser from 'cookie-parser';
import { csrfProtection } from './middlewares/auth';

configDotenv();

const app = express();
const port = process.env.PORT || 8080;

interface ErrorWithCode extends Error {
  code?: string;
}

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));
// app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(csrfProtection);

app.use((req, res, next) => {
  const token = req.csrfToken(); // New token each time
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    signed: true
  });
  next();
});

app.use('/', authRouter);
app.use('/resume', pdfRouter);
app.use('/cover-letter', clRouter);

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

    app.listen(port, () => {
      console.log(`Server is running and listening to port: ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();