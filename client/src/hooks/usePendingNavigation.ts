import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { beginPending } from './pending-navigation';

const TOAST_ID = 'pending-navigation';
export const PENDING_TIMEOUT_MS = 15000;

/**
 * Navigates immediately, but tells the user it is happening: `pendingKey` names the control
 * that was clicked and a loading toast is shown. The toast is dismissed when the calling page
 * unmounts (the new page has appeared). A timeout clears the state if the route never arrives.
 */
export function usePendingNavigation() {
  const navigate = useNavigate();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      toast.dismiss(TOAST_ID);
    },
    [],
  );

  const go = useCallback(
    (key: string, to: string, message: string, beforeNavigate?: () => void) => {
      const { started, next } = beginPending(pendingRef.current, key);
      if (!started) return;
      pendingRef.current = next;
      setPendingKey(next);
      toast.loading(message, { id: TOAST_ID });
      beforeNavigate?.();
      timerRef.current = setTimeout(() => {
        pendingRef.current = null;
        setPendingKey(null);
        toast.dismiss(TOAST_ID);
      }, PENDING_TIMEOUT_MS);
      navigate(to);
    },
    [navigate],
  );

  return { pendingKey, go };
}
