'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (t: ThemePreference) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'sow-theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** The print/PDF view must always render light, regardless of the user's theme. */
function isPrintRoute() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/print-sow');
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'system';
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  // Apply the resolved theme to <html> and persist the preference.
  useEffect(() => {
    const root = document.documentElement;
    // Never darken the print/PDF route.
    if (resolvedTheme === 'dark' && !isPrintRoute()) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, resolvedTheme]);

  // Follow the OS preference while in 'system' mode.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') setResolvedTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    setResolvedTheme(resolveTheme(next));
  };

  // Cycle: system → light → dark → system
  const toggleTheme = () => {
    const next: ThemePreference = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, isDark: resolvedTheme === 'dark', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
