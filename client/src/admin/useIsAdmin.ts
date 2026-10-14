import { useEffect, useState } from 'react';
import client from '@/api/axiosInstance';
import { isSignedIn } from '@/components/not-found/actions';

// Asked once and remembered, so moving between pages does not repeat the request.
let known: boolean | null = null;
let pending: Promise<boolean> | null = null;

const ask = (): Promise<boolean> => {
  if (!pending) {
    pending = client
      .get('/auth/role', { timeout: 8000 })
      .then((response) => {
        known = response.data?.role === 'admin' || response.data?.role === 'super_admin';
        return known;
      })
      .catch(() => false) // signed out, maintenance, or offline: no link, and ask again next time
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

/** Forget the answer (on sign-out) so the next person is asked again. */
export const forgetAdminAccess = () => {
  known = null;
};

/** Whether to show admin-only links. Display only: the server enforces every admin route. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(known === true);

  useEffect(() => {
    if (known !== null) {
      setIsAdmin(known);
      return;
    }
    if (!isSignedIn()) return;
    let cancelled = false;
    void ask().then((value) => {
      if (!cancelled) setIsAdmin(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
