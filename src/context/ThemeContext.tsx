import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { IDETheme } from '../types';
import { resolveTheme } from '../themes/themes';
import { useIDEStore } from '../store/useIDEStore';

interface ThemeContextValue {
  theme: IDETheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeId = useIDEStore((s) => s.settings.themeId);
  const customThemes = useIDEStore((s) => s.customThemes);

  const theme = useMemo(() => resolveTheme(themeId, customThemes), [themeId, customThemes]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.setProperty('--ide-bg-primary', theme.ui.bgPrimary);
    root.style.setProperty('--ide-bg-secondary', theme.ui.bgSecondary);
    root.style.setProperty('--ide-bg-elevated', theme.ui.bgElevated);
    root.style.setProperty('--ide-border', theme.ui.border);
    root.style.setProperty('--ide-text-primary', theme.ui.textPrimary);
    root.style.setProperty('--ide-text-secondary', theme.ui.textSecondary);
    root.style.setProperty('--ide-accent', theme.ui.accent);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme.ui.bgPrimary);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
};

export function useIDETheme(): IDETheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useIDETheme must be used inside ThemeProvider');
  }
  return ctx.theme;
}
