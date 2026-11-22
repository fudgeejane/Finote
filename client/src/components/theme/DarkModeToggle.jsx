
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../theme/DarkModeContext';
import Styling from './Styling';

export default function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const styles = Styling();

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
        group relative inline-flex h-8 w-16 shrink-0
        cursor-pointer items-center rounded-full
        border p-1
        transition-all duration-300 ease-in-out
        hover:shadow-md
        active:scale-95
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        focus-visible:ring-offset-2
        ${styles.primaryBg}
        ${styles.border}
      `}
    >
      {/* Background icons */}
      <span className="absolute inset-0 flex items-center justify-between px-[9px]">
        <Sun
          size={14}
          strokeWidth={2}
          className={`transition-all duration-300 ${
            darkMode
              ? 'scale-75 opacity-40'
              : 'scale-100 opacity-70'
          } ${styles.yellowText}`}
        />

        <Moon
          size={14}
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
          relative z-10 flex h-6 w-6
          items-center justify-center
          rounded-full border
          shadow-sm
          transition-all duration-500
          ease-[cubic-bezier(0.34,1.56,0.64,1)]
          group-hover:shadow-md
          ${styles.secondaryBg}
          ${styles.border}
          ${darkMode ? 'translate-x-[30px]' : 'translate-x-0'}
        `}
      >
        {darkMode ? (
          <Moon
            size={13}
            strokeWidth={2.2}
            className="text-blue-500 transition-transform duration-300"
          />
        ) : (
          <Sun
            size={13}
            strokeWidth={2.2}
            className="text-amber-500 transition-transform duration-300"
          />
        )}
      </span>
    </button>
  );
}
