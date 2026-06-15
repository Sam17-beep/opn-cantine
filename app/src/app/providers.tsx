'use client';

import { useEffect } from 'react';
import { ChakraProvider, createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const system = createSystem(defaultConfig, defineConfig({
  conditions: {
    // Scope dark mode to [data-theme=dark] attribute only.
    // Since we set data-theme="light" on <html> and never change it,
    // dark mode styles will never apply.
    dark: '[data-theme=dark] &',
  },
}));

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <ChakraProvider value={system}>
      {children}
    </ChakraProvider>
  );
}
