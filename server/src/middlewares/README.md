# Authentication Middleware

A comprehensive authentication middleware system for Express.js with support for multiple social login providers.

## Features

- ✅ **Multi-provider social login support** (Google, GitHub, Facebook, Twitter)
- ✅ **Role-based access control**
- ✅ **Resource ownership validation**
- ✅ **Rate limiting for authentication attempts**
- ✅ **Optional authentication**
- ✅ **Guest-only routes**
- ✅ **TypeScript support**
- ✅ **Flexible error handling**

## Available Middleware

### 1. `isAuthenticated`
Checks if user is authenticated. Redirects to login or returns JSON error.

```typescript
router.get('/profile', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});
```

### 2. `isGuest`
Ensures user is NOT authenticated. Redirects if already logged in.

```typescript
router.get('/login', isGuest, (req, res) => {
  res.json({ message: 'Login page' });
});
```

### 3. `hasRole(roles: string[])`
Checks if user has specific role(s).

```typescript
router.get('/admin', hasRole(['admin']), (req, res) => {
  res.json({ message: 'Admin dashboard' });
});

// Multiple roles
router.get('/moderator', hasRole(['admin', 'moderator']), (req, res) => {
  res.json({ message: 'Moderator access' });
});
```

### 4. `isOwner(resourceIdParam: string)`
Validates that user owns the resource.

```typescript
router.get('/resume/:resumeId', isAuthenticated, isOwner('resumeId'), (req, res) => {
  res.json({ message: 'User owns this resume' });
});
```

### 5. `optionalAuth`
Sets `req.user` if authenticated, but doesn't require authentication.

```typescript
router.get('/public-data', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ message: 'Authenticated user', user: req.user });
  } else {
    res.json({ message: 'Guest user' });
  }
});
```

### 6. `authRateLimit(maxAttempts, windowMs)`
Rate limits authentication attempts.

```typescript
router.post('/login', authRateLimit(5, 15 * 60 * 1000), (req, res) => {
  // Login logic here
});
```

### 7. `validateSocialLogin(providers: SocialProvider[])`
Validates that user has completed social login with specified providers.

```typescript
// Single provider
router.get('/dashboard', validateSocialLogin(['google']), (req, res) => {
  res.json({ message: 'Google login required' });
});

// Multiple providers
router.get('/dashboard', validateSocialLogin(['google', 'github']), (req, res) => {
  res.json({ message: 'Social login validated' });
});
```

## Social Login Providers

Supported providers:
- `google` - Google OAuth
- `github` - GitHub OAuth
- `facebook` - Facebook OAuth
- `twitter` - Twitter OAuth

## Error Codes

All middleware return consistent error codes:

- `AUTH_REQUIRED` - Authentication required
- `ALREADY_AUTHENTICATED` - User already authenticated
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `ACCESS_DENIED` - Access denied to resource
- `MISSING_RESOURCE_ID` - Resource ID parameter missing
- `SOCIAL_LOGIN_REQUIRED` - Social login required
- `RATE_LIMIT_EXCEEDED` - Too many authentication attempts
- `INTERNAL_ERROR` - Internal server error

## Usage Examples

### Basic Authentication
```typescript
import { isAuthenticated } from '../middlewares/auth';

router.get('/protected', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});
```

### Role-Based Access
```typescript
import { hasRole } from '../middlewares/auth';

router.get('/admin', hasRole(['admin']), (req, res) => {
  res.json({ message: 'Admin access' });
});
```

### Resource Ownership
```typescript
import { isAuthenticated, isOwner } from '../middlewares/auth';

router.put('/resume/:resumeId', 
  isAuthenticated, 
  isOwner('resumeId'), 
  (req, res) => {
    res.json({ message: 'Resume updated' });
  }
);
```

### Social Login Validation
```typescript
import { validateSocialLogin } from '../middlewares/auth';

router.get('/dashboard', validateSocialLogin(['google']), (req, res) => {
  res.json({ message: 'Google login validated' });
});
```

### Multiple Middleware
```typescript
import { 
  isAuthenticated, 
  validateSocialLogin, 
  hasRole 
} from '../middlewares/auth';

router.post('/admin/resume', 
  isAuthenticated,
  validateSocialLogin(['google']),
  hasRole(['admin']),
  (req, res) => {
    res.json({ message: 'Admin resume creation' });
  }
);
```

## Extending for New Providers

To add a new social login provider:

1. **Update the SocialProvider type:**
```typescript
type SocialProvider = 'google' | 'github' | 'facebook' | 'twitter' | 'linkedin';
```

2. **Add provider ID field to User model:**
```typescript
interface User {
  id: string;
  google_id?: string;
  github_id?: string;
  linkedin_id?: string;
  // ... other fields
}
```

3. **Use in validation:**
```typescript
router.get('/dashboard', validateSocialLogin(['linkedin']), (req, res) => {
  res.json({ message: 'LinkedIn login validated' });
});
```

## TypeScript Support

The middleware includes full TypeScript support with proper type definitions:

```typescript
// Extends Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

## Error Handling

All middleware includes comprehensive error handling:

- **Database errors** - Logged and handled gracefully
- **Authentication errors** - Consistent JSON responses
- **Rate limiting** - Configurable limits with retry information
- **Validation errors** - Clear error messages with codes

## Best Practices

1. **Always use HTTPS in production**
2. **Implement proper session management**
3. **Use environment variables for secrets**
4. **Log authentication attempts**
5. **Implement proper error handling**
6. **Use rate limiting for auth endpoints**
7. **Validate social login completion**
8. **Check resource ownership before operations** 