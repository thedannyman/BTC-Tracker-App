import { useCallback, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'btc-tracker.theme';

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (isTheme(storedTheme)) return storedTheme;

  return getSystemTheme();
};

const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
};

const withTransition = (callback: () => void) => {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  callback();
  window.setTimeout(() => root.classList.remove('theme-transition'), 240);
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (isTheme(storedTheme)) return;
      setTheme(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const isDark = theme === 'dark';

  const label = useMemo(
    () => (isDark ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'),
    [isDark],
  );

  const toggleTheme = useCallback(() => {
    withTransition(() => {
      setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      style={{
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem 0.75rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden="true">{isDark ? '🌙' : '☀️'}</span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
};

export default ThemeToggle;
