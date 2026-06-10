'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}>({ theme: 'system', resolvedTheme: 'light', setTheme: () => {} });

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 'system' keeps following the OS; an explicit choice pins a class so the
// CSS media queries (guarded with :not(.light)) stop winning.
function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'light') root.classList.add('light');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('diana_theme');
    const initial: Theme = stored === 'dark' || stored === 'light' ? stored : 'system';
    setThemeState(initial);
    applyThemeClass(initial);
    setResolvedTheme(initial === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : initial);
  }, []);

  // While in system mode, track OS changes so resolvedTheme stays honest.
  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setResolvedTheme(media.matches ? 'dark' : 'light');
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (t === 'system') {
      localStorage.removeItem('diana_theme');
    } else {
      localStorage.setItem('diana_theme', t);
    }
    applyThemeClass(t);
    setResolvedTheme(t === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
