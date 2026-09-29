'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '@/lib/domain/theme';

interface ThemeContextValue {
  theme: ThemeId;
  loaded: boolean;
  saving: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveTheme: (theme: ThemeId) => Promise<boolean>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readTheme(response: Response): Promise<ThemeId> {
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Session expirée. Reconnectez-vous à l’administration.'
        : 'Impossible de synchroniser le thème. Réessayez.'
    );
  }
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('theme' in data) ||
    !isThemeId(data.theme)
  ) {
    throw new Error('Le serveur a renvoyé un thème invalide.');
  }
  return data.theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const savingRef = useRef(false);
  const invalidateReads = useCallback(() => ++requestVersion.current, []);

  const reportError = useCallback((cause: unknown) => {
    console.error('Theme synchronization failed:', cause);
    setError(
      cause instanceof Error && cause.name !== 'TimeoutError'
        ? cause.message
        : 'Impossible de synchroniser le thème. Vérifiez la connexion.'
    );
  }, []);

  const refresh = useCallback(async () => {
    if (savingRef.current) return;
    const version = invalidateReads();
    try {
      const nextTheme = await readTheme(
        await fetch('/api/theme', {
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        })
      );
      if (version !== requestVersion.current) return;
      setTheme(nextTheme);
      setLoaded(true);
      setError('');
    } catch (cause) {
      if (version === requestVersion.current) reportError(cause);
    }
  }, [invalidateReads, reportError]);

  const saveTheme = useCallback(
    async (nextTheme: ThemeId) => {
      if (savingRef.current) return false;
      savingRef.current = true;
      invalidateReads();
      setSaving(true);
      setError('');
      try {
        const savedTheme = await readTheme(
          await fetch('/api/theme', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: nextTheme }),
            signal: AbortSignal.timeout(10_000),
          })
        );
        setTheme(savedTheme);
        setLoaded(true);
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [invalidateReads, reportError]
  );

  useEffect(() => {
    void refresh();
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(syncWhenVisible, 60_000);
    window.addEventListener('focus', syncWhenVisible);
    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => {
      invalidateReads();
      clearInterval(timer);
      window.removeEventListener('focus', syncWhenVisible);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [invalidateReads, refresh]);

  useEffect(() => {
    document.documentElement.dataset.appTheme = theme;
    document.documentElement.dataset.theme =
      theme === 'halloween' ? 'dark' : 'light';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute(
      'content',
      theme === 'halloween' ? '#18121e' : '#ffffff'
    );
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, loaded, saving, error, refresh, saveTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme requires ThemeProvider');
  return context;
}
