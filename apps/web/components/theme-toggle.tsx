'use client';

import { Moon, Sun } from 'lucide-react';

/** Light/dark switch. The choice is kept on this device; until then the phone's own setting is followed. */
export function ThemeToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const root = document.documentElement;
        const current = root.dataset.theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        try {
          localStorage.setItem('fpm-theme', next);
        } catch {
          /* private mode: the switch still works for this visit */
        }
      }}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-card transition hover:shadow-lift"
    >
      <Moon className="when-light size-5" />
      <Sun className="when-dark size-5" />
    </button>
  );
}
