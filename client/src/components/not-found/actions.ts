import Cookies from 'js-cookie';

export interface NotFoundAction {
  label: string;
  to: string;
}

/** Same signed-in check as ProtectedRoute. */
export const isSignedIn = () => !!Cookies.get('user.id') && !!Cookies.get('user.email');

/** A signed-in visitor goes back to their work; a signed-out one goes home or signs in. */
export function notFoundActions(signedIn: boolean): { primary: NotFoundAction; secondary: NotFoundAction } {
  return signedIn
    ? {
        primary: { label: 'Go to dashboard', to: '/dashboard' },
        secondary: { label: 'Back to home', to: '/' },
      }
    : {
        primary: { label: 'Back to home', to: '/' },
        secondary: { label: 'Sign in', to: '/login' },
      };
}
