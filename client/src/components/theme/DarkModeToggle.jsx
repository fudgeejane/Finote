
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../theme/DarkModeContext';
import Styling from './Styling';

export default function DarkModeToggle({ compact = false }) {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const styles = Styling();

  if (compact) {
    return (
      <div
        role="group"
        aria-label="Appearance"
        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 ${styles.primaryBg} ${styles.border}`}
      >
        <button
          type="button"
          aria-label="Light mode"
          aria-pressed={!darkMode}
          title="Light mode"
          onClick={() => {
            if (darkMode) toggleDarkMode();
          }}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${
            !darkMode
              ? `${styles.sidebarActiveBg} text-amber-500`
              : `${styles.sidebarMutedText} ${styles.secondaryBgHover}`
          }`}
        >
          <Sun size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Dark mode"
          aria-pressed={darkMode}
          title="Dark mode"
          onClick={() => {
            if (!darkMode) toggleDarkMode();
          }}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${
            darkMode
              ? `${styles.sidebarActiveBg} ${styles.sidebarAccentText}`
              : `${styles.sidebarMutedText} ${styles.secondaryBgHover}`
          }`}
        >
          <Moon size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  const label = darkMode
    ? 'Switch to light mode'
    : 'Switch to dark mode';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={darkMode}
      aria-label={label}
      title={label}
      onClick={toggleDarkMode}
      className={`
        group relative inline-flex shrink-0 cursor-pointer items-center rounded-full border p-1
        transition-all duration-300 ease-in-out
        hover:shadow-md
        active:scale-95
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        focus-visible:ring-offset-2
        ${compact ? 'h-6 w-11' : 'h-8 w-16'}
        ${styles.primaryBg}
        ${styles.border}
      `}
    >
      {/* Background icons */}
      <span className={`absolute inset-0 flex items-center justify-between ${compact ? 'px-[5px]' : 'px-[9px]'}`}>
        <Sun
          size={compact ? 10 : 14}
          strokeWidth={2}
          className={`transition-all duration-300 ${
            darkMode
              ? 'scale-75 opacity-40'
              : 'scale-100 opacity-70'
          } ${styles.yellowText}`}
        />

        <Moon
          size={compact ? 10 : 14}
          strokeWidth={2}
          className={`transition-all duration-300 ${
            darkMode
              ? 'scale-100 opacity-70'
              : 'scale-75 opacity-40'
          } ${styles.blueText}`}
        />
      </span>

      {/* Animated knob */}
      <span
        className={`
          relative z-10 flex items-center justify-center rounded-full border shadow-sm
          transition-all duration-500
          ease-[cubic-bezier(0.34,1.56,0.64,1)]
          group-hover:shadow-md
          ${compact ? 'h-4 w-4' : 'h-6 w-6'}
          ${styles.secondaryBg}
          ${styles.border}
          ${darkMode ? (compact ? 'translate-x-[19px]' : 'translate-x-[30px]') : 'translate-x-0'}
        `}
      >
        {darkMode ? (
          <Moon
            size={compact ? 9 : 13}
            strokeWidth={2.2}
            className="text-blue-500 transition-transform duration-300"
          />
        ) : (
          <Sun
            size={compact ? 9 : 13}
            strokeWidth={2.2}
            className="text-amber-500 transition-transform duration-300"
          />
        )}
      </span>
    </button>
  );
}
