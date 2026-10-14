import { useEffect, useRef, useState } from 'react';
import { fetchMaintenanceStatus } from './api';
import { useMaintenanceStore } from './store';
import { effectiveStatus, pollIntervalMs } from './timing';

/**
 * Polls the status endpoint. Mount it once, at the app root.
 * A failed or malformed poll never changes the state: only an explicit answer from the server does.
 */
export function useMaintenancePolling(): void {
  const forced = useMaintenanceStore((s) => s.forcedActive);
  const pollNowRef = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (stopped) return;
      const { snapshot, offsetMs, forcedActive } = useMaintenanceStore.getState();
      const serverNow = Date.now() + offsetMs;
      const status = effectiveStatus(snapshot, forcedActive, serverNow);
      timer = setTimeout(() => {
        if (document.hidden) schedule(); // paused while the tab is hidden; the visibility handler catches up
        else void poll();
      }, pollIntervalMs(status, snapshot, serverNow));
    };

    const poll = async () => {
      clearTimeout(timer);
      try {
        const snapshot = await fetchMaintenanceStatus();
        if (stopped) return;
        if (snapshot) useMaintenanceStore.getState().setSnapshot(snapshot, Date.now());
        else useMaintenanceStore.getState().markChecked();
      } catch {
        if (!stopped) useMaintenanceStore.getState().markChecked();
      }
      schedule();
    };

    const onVisible = () => {
      if (!document.hidden) void poll();
    };

    pollNowRef.current = () => void poll();
    document.addEventListener('visibilitychange', onVisible);
    void poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // A request got the maintenance 503: find out the end time and message right away.
  useEffect(() => {
    if (forced) pollNowRef.current();
  }, [forced]);
}

/** The current state plus a clock that ticks once a second while maintenance is scheduled or active. */
export function useMaintenance() {
  const snapshot = useMaintenanceStore((s) => s.snapshot);
  const offsetMs = useMaintenanceStore((s) => s.offsetMs);
  const forced = useMaintenanceStore((s) => s.forcedActive);
  const [now, setNow] = useState(() => Date.now());

  const live = forced || (snapshot !== null && snapshot.status !== 'off');
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const serverNow = now + offsetMs;
  return {
    status: effectiveStatus(snapshot, forced, serverNow),
    startsAt: snapshot?.startsAt ?? null,
    endsAt: snapshot?.endsAt ?? null,
    message: snapshot?.message ?? '',
    serverNow,
  };
}

/** Calls `onEnd` once when maintenance stops being active. */
export function useOnMaintenanceEnd(onEnd: () => void): void {
  const { status } = useMaintenance();
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const previous = useRef(status);

  useEffect(() => {
    if (previous.current === 'active' && status !== 'active') onEndRef.current();
    previous.current = status;
  }, [status]);
}
