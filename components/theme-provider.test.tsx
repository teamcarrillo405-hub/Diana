// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme-provider';

function Harness() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
  });

  it('respects system dark preference when no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any);
    render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('respects system light preference when no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any);
    render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads stored "dark" from localStorage', () => {
    localStorage.setItem('diana_theme', 'dark');
    render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads stored "light" from localStorage', () => {
    localStorage.setItem('diana_theme', 'light');
    render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme("dark") toggles class and persists', () => {
    const { getByText } = render(<ThemeProvider><Harness /></ThemeProvider>);
    act(() => { getByText('dark').click(); });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('diana_theme')).toBe('dark');
  });

  it('setTheme("light") toggles class and persists', () => {
    const { getByText } = render(<ThemeProvider><Harness /></ThemeProvider>);
    act(() => { getByText('dark').click(); });
    act(() => { getByText('light').click(); });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('diana_theme')).toBe('light');
  });
});
