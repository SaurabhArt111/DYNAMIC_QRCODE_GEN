import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const storageKey = 'dv_theme';
const defaultTheme = 'linen';

export const themes = [
  { id: 'linen', label: 'Linen' },
  { id: 'harbor', label: 'Harbor' },
  { id: 'grove', label: 'Grove' },
  { id: 'dark', label: 'Dark' }
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, themes }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
