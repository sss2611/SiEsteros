// src/features/themes/ThemeSelector.jsx
import { THEMES } from './useTheme.js';

export default function ThemeSelector({ theme, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1" role="group" aria-label="Paleta de colores">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-pressed={theme === t.id}
          className={`min-h-12 rounded-md px-3 text-sm font-semibold ${
            theme === t.id
              ? 'bg-cyan-400 text-slate-950'
              : 'text-slate-200 hover:bg-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}