'use client';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { useTheme, type Theme } from './theme-provider';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Device', icon: MonitorSmartphone },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-soft p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-card text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact icon-only toggle for the app rail / mobile sheet: cycles
 *  light → dark → system. */
export function ThemeQuickToggle({ className = '' }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'system' ? MonitorSmartphone : resolvedTheme === 'dark' ? Moon : Sun;
  const label = theme === 'system' ? 'Device theme' : resolvedTheme === 'dark' ? 'Dark theme' : 'Light theme';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Switch theme.`}
      title={label}
      className={`touch-target inline-flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold text-muted transition hover:bg-surface-soft hover:text-fg ${className}`}
    >
      <Icon size={18} />
      <span>Theme</span>
    </button>
  );
}
