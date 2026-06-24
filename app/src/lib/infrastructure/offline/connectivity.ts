'use client';

import { useEffect, useState } from 'react';

const PROBE_URL = '/api/health';
const PROBE_INTERVAL_ONLINE_MS = 10000;
const PROBE_INTERVAL_OFFLINE_MS = 4000;
const PROBE_TIMEOUT_MS = 2500;

async function probeServer(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(PROBE_URL, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(check, delay);
    };

    const check = async () => {
      const online = await probeServer();
      if (!cancelled) {
        setIsOnline(online);
        schedule(online ? PROBE_INTERVAL_ONLINE_MS : PROBE_INTERVAL_OFFLINE_MS);
      }
    };

    const handleBrowserOnline = () => check();
    const handleBrowserOffline = () => {
      if (!cancelled) setIsOnline(false);
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);

  return { isOnline };
}
