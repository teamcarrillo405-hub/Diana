// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme-provider';

function Harness() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('system')}>system</button>
    </div>
  );
}

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as any);
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'light');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('defaults to system with no stored value: no pinned class, resolved follows OS dark', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(getByTestId('theme').textContent).toBe('system');
    expect(getByTestId('resolved').textContent).toBe('dark');
    // system mode pins no class; the CSS media query renders dark
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('defaults to system with no stored value: resolved follows OS light', () => {
    mockMatchMedia(false);
    const { getByTestId } = render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(getByTestId('theme').textContent).toBe('system');
    expect(getByTestId('resolved').textContent).toBe('light');
  });

  it('reads stored "dark" from localStorage and pins the dark class', () => {
    mockMatchMedia(false);
    localStorage.setItem('diana_theme', 'dark');
    render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('reads stored "light" from localStorage and pins the light class', () => {
    mockMatchMedia(true);
    localStorage.setItem('diana_theme', 'light');
    render(<ThemeProvider><Harness /></ThemeProvider>);
    // explicit light wins even when the OS prefers dark
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme("dark") pins class and persists', () => {
    mockMatchMedia(false);
    const { getByText } = render(<ThemeProvider><Harness /></ThemeProvider>);
    act(() => { getByText('dark').click(); });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('diana_theme')).toBe('dark');
  });

  it('setTheme("light") pins class and persists', () => {
    mockMatchMedia(false);
    const { getByText } = render(<ThemeProvider><Harness /></ThemeProvider>);
    act(() => { getByText('dark').click(); });
    act(() => { getByText('light').click(); });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(localStorage.getItem('diana_theme')).toBe('light');
  });

  it('setTheme("system") clears the stored value and pinned classes', () => {
    mockMatchMedia(true);
    localStorage.setItem('diana_theme', 'light');
    const { getByText, getByTestId } = render(<ThemeProvider><Harness /></ThemeProvider>);
    act(() => { getByText('system').click(); });
    expect(localStorage.getItem('diana_theme')).toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(getByTestId('resolved').textContent).toBe('dark');
  });
});
