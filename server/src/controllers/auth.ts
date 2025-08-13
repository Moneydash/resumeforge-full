import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';
import { Controller } from "@/types/types.controller-type";
import { userModel } from '../models/User';
import { generateId } from '../utils/helper';
import { CreateUserData, User } from '@/types/interface.user';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Types for Google OAuth
interface GoogleProfile {
  id: string;
  displayName: string;
  emails: { value: string; verified: boolean }[];
  photos: { value: string }[];
  provider: string;
}

// Types for GitHub OAuth
interface GithubProfile {
  id: string;
  displayName: string;
  username: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
  provider: string;
}

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "/auth/google/callback",
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists by email
    let user = await userModel.findByEmail(profile?.emails ? profile?.emails[0]?.value : '');

    if (user) {
      // User exists - check if they need to be updated with Google ID
      if (!user.google_id) {
        // User exists but doesn't have Google ID - update them
        user = await userModel.update(user.id, { google_id: profile.id });
      }

      if (!user) {
        return done(new Error('Failed to update user'), false);
      }

      return done(null, user);
    } else {
      // Create new user
      const newUserData: CreateUserData = {
        id: generateId(),
        google_id: profile.id,
        email: profile?.emails ? profile?.emails[0]?.value : '',
        name: profile.displayName,
        avatar: profile?.photos ? profile?.photos[0]?.value : ''
      };

      user = await userModel.create(newUserData);
      return done(null, user);
    }
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return done(error, false);
  }
}));

// Configure GitHub OAuth Strategy
passport.use(new GithubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: "/auth/github/callback",
  passReqToCallback: true,
  scope: ['user:email']
}, async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    // Validate profile
    if (!profile || !profile.id) {
      console.error('GitHub OAuth - Invalid profile received');
      return done(new Error('Invalid profile received from GitHub'), false);
    }

    // Get email from profile
    const email = profile.emails?.[0]?.value;

    if (!email) {
      console.error('GitHub OAuth - No email provided');
      return done(new Error('Email is required for registration'), false);
    }

    // Check if user already exists by GitHub ID first
    let user = await userModel.findByGithubId(profile.id);

    if (user) {
      return done(null, user);
    }

    // Check if user exists by email
    user = await userModel.findByEmail(email);

    if (user) {
      // Link GitHub account to existing user
      try {
        const updatedUser = await userModel.update(user.id, {
          github_id: profile.id
        });

        if (!updatedUser) {
          console.error('Failed to update user with GitHub ID');
          return done(new Error('Failed to link GitHub account'), false);
        }

        return done(null, updatedUser);
      } catch (updateError) {
        console.error('Error updating user with GitHub ID:', updateError);
        return done(new Error('Failed to link GitHub account'), false);
      }
    }

    // Create new user
    const newUserData: CreateUserData = {
      id: generateId(),
      github_id: profile.id,
      email: email,
      name: profile.displayName || profile.username || 'GitHub User',
      avatar: profile.photos?.[0]?.value || ''
    };

    try {
      const newUser = await userModel.create(newUserData);
      return done(null, newUser);
    } catch (createError) {
      console.error('Error creating new user:', createError);
      return done(new Error('Failed to create user account'), false);
    }

  } catch (error) {
    console.error('Error in GitHub OAuth strategy:', error);
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Controller for initiating Google OAuth
const googleLogin: Controller = async (req, res) => {
  // Redirect to Google OAuth
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res);
};

// Controller for handling Google OAuth callback
const googleCallback = async (req: Request, res: Response, next: NextFunction) => {

  passport.authenticate('google', (err: any, user: User, info: any) => {
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name }, // add more fields if needed
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    if (err) {
      console.error('Google OAuth error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      return res.redirect('/login?error=oauth_error');
    }

    if (!user) {
      console.error('Google OAuth failed - no user returned');
      console.error('Info from passport:', info);
      return res.redirect('/login?error=oauth_failed');
    }

    // Log the user in
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.redirect('/login?error=login_failed');
      }

      // Send HTML that posts message to parent window and closes popup
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Success</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'LOGIN_SUCCESS',
                user: {
                  id: '${user.id}',
                  email: '${user.email}',
                  name: '${user.name}',
                  avatar: '${user.avatar || ''}',
                  token: '${token}'
                }
              }, 'http://localhost:5173');
              window.close();
            } else {
              window.location.href = '/dashboard';
            }
          </script>
          <p>Login successful! Closing window...</p>
        </body>
        </html>
      `;

      res.send(html);
    });
  })(req, res, next);
};

// Alternative callback with custom handling
const googleCallbackCustom = async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', (err: any, user: User, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication failed' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Login failed' });
    }

    // Log the user in
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }

      // Return user data or redirect
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        }
      });
    });
  })(req, res, next);
};

// Controller for initiating GitHub OAuth
const githubLogin: Controller = async (req, res) => {
  passport.authenticate('github', { scope: ['user:email'] })(req, res);
};

// Controller for handling GitHub OAuth callback
const githubCallback = async (req: Request, res: Response, next: NextFunction) => {

  passport.authenticate('github', (err: any, user: User, info: any) => {
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name }, // add more fields if needed
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    if (err) {
      console.error('GitHub OAuth error:', err);
      return res.redirect('/login?error=oauth_error&message=' + encodeURIComponent(err.message));
    }

    if (!user) {
      console.error('GitHub OAuth failed - no user returned');
      return res.redirect('/login?error=oauth_failed');
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.redirect('/login?error=login_failed');
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Success</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'LOGIN_SUCCESS',
                user: {
                  id: '${user.id}',
                  email: '${user.email}',
                  name: '${user.name}',
                  avatar: '${user.avatar || ''}',
                  token: '${token}'
                }
              }, 'http://localhost:5173');
              window.close();
            } else {
              window.location.href = '/dashboard';
            }
          </script>
          <p>Login successful! Closing window...</p>
        </body>
        </html>
      `;

      res.send(html);
    });
  })(req, res, next);
};

// Logout controller
const logout: Controller = async (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Export controllers
export {
  googleLogin,
  googleCallback,
  googleCallbackCustom,
  githubLogin,
  githubCallback,
  logout,
  isAuthenticated
};