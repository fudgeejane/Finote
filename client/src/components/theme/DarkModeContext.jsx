import { createContext, useContext, useEffect, useState } from 'react';

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  // Lazy initializer: runs once, before the first render.
  // Saved choice first, then system preference. Prevents a wrong-theme flash.
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Save the choice and tell the browser (scrollbars, form controls)
  useEffect(() => {
    try {
      localStorage.setItem('darkMode', String(darkMode));
    } catch {}
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

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