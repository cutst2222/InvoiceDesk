import { useTheme } from '../hooks/useTheme.js';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-50 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow"
      aria-label="Toggle dark mode"
    >
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}

export default ThemeToggle;
