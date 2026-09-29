'use client';

import { useEffect } from 'react';
import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from '@chakra-ui/react';

const system = createSystem(
  defaultConfig,
  defineConfig({
    conditions: {
      // Only the selected app theme controls dark mode, never the OS preference.
      dark: '&:where([data-theme=dark], [data-theme=dark] *)',
    },
  })
);

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
