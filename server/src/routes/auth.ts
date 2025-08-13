import express from 'express';
import {
  googleLogin,
  googleCallback,
  githubLogin,
  githubCallback,
  logout
} from '../controllers/auth';
import { isAuthenticated, isGuest, validateSocialLogin, optionalAuth } from '../middlewares/auth';
import { userModel } from '../models/User';

const authRouter = express.Router();

// Root route - redirect based on auth status
authRouter.get('/', optionalAuth, (req, res) => {
  if (req.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Login page route
authRouter.get('/login', isGuest, (req, res) => {
  res.json({
    message: 'Login page',
    providers: ['google', 'github'],
    loginUrls: {
      google: '/auth/google',
      github: '/auth/github'
    }
  });
});

// Test route to check authentication status
authRouter.get('/auth-status', optionalAuth, (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session
  });
});

// Database test route
authRouter.get('/db-test', async (req, res) => {
  try {
    // Test database connection by trying to find a user
    const users = await userModel.findAll(1, 0);
    res.json({
      success: true,
      message: 'Database connection working',
      userCount: users.length
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database connection failed'
    });
  }
});

// Google OAuth routes
authRouter.get('/auth/google', googleLogin);
authRouter.get('/auth/google/callback', googleCallback);

// GitHub OAuth routes
authRouter.get('/auth/github', githubLogin);
authRouter.get('/auth/github/callback', githubCallback);

authRouter.get('/csrf-token', (req, res) => {
  const token = req.csrfToken();
  console.log('Generated CSRF Token for client: ', token);
  res.json({ csrfToken: token });
});

// Logout route (works for both Google and GitHub)
authRouter.post('/logout', logout);

// Dashboard route (protected) - now accepts both Google and GitHub
authRouter.get('/dashboard', isAuthenticated, validateSocialLogin(['google', 'github']), (req, res) => {
  res.json({
    message: 'Welcome to dashboard',
    user: req.user
  });
});

// Protected route example
authRouter.get('/profile', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

export default authRouter;