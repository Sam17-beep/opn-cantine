'use client';

import { useEffect } from 'react';
import { ChakraProvider, createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { replayPendingSales } from '@/lib/infrastructure/offline/saleQueue';

const system = createSystem(defaultConfig, defineConfig({
  conditions: {
    // Scope dark mode to [data-theme=dark] attribute only.
    // Since we set data-theme="light" on <html> and never change it,
    // dark mode styles will never apply.
    dark: '[data-theme=dark] &',
  },
}));

const QUEUE_REPLAY_INTERVAL_MS = 20000;

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  // Drain any sales queued while offline: on mount (covers "WiFi was already back when
  // the kiosk was reloaded"), on the browser's online event, and on a periodic fallback
  // since the online event is known to be unreliable on some platforms.
  useEffect(() => {
    replayPendingSales();
    window.addEventListener('online', replayPendingSales);
    const interval = setInterval(replayPendingSales, QUEUE_REPLAY_INTERVAL_MS);
    return () => {
      window.removeEventListener('online', replayPendingSales);
      clearInterval(interval);
    };
  }, []);

  return (
    <ChakraProvider value={system}>
      {children}
    </ChakraProvider>
  );
}
