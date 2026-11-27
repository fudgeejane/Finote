import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const DarkModeContext = createContext();
const THEME_STORAGE_KEY = 'finote-theme';

function getInitialDarkMode() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const transitionTimer = useRef(null);

  // Persist the selection and set native controls and scrollbars to match.
  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Keep the current session usable when storage is unavailable.
    }
  }, [darkMode]);

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);

  const toggleDarkMode = useCallback(() => {
    const root = document.documentElement;
    root.classList.add('theme-changing');
    window.requestAnimationFrame(() => setDarkMode((prev) => !prev));
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => root.classList.remove('theme-changing'), 360);
  }, []);

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used inside <DarkModeProvider>');
  }
  return context;
}
