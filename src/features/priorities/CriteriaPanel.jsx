// src/features/priorities/CriteriaPanel.jsx
// Panel interactivo con 4 sliders para ponderar criterios de priorización en vivo.

export default function CriteriaPanel({ weights, onChangeWeights, onReset, onClose }) {
  const fields = [
    { key: 'riesgoVida',    label: 'Riesgo de vida',    color: 'accent-red-500'    },
    { key: 'vulnerabilidad', label: 'Vulnerabilidad',   color: 'accent-orange-500' },
    { key: 'personas',      label: 'Personas en riesgo', color: 'accent-yellow-500' },
    { key: 'tiempo',        label: 'Tiempo de espera',   color: 'accent-sky-500'    },
  ];

  return (
    <div className="border-b border-slate-700 bg-slate-950/95 p-3 text-xs shadow-lg animate-slide-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-200 uppercase tracking-wider text-[11px]">
          <span>⚖️</span>
          <span>Ponderación de Criterios</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline"
          >
            Restablecer (100%)
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mb-2.5">
        Ajustá los pesos relativos para reordenar las prioridades en tiempo real:
      </p>

      <div className="space-y-2">
        {fields.map(({ key, label, color }) => {
          const val = weights[key] ?? 100;
          return (
            <div key={key}>
              <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-0.5">
                <span>{label}</span>
                <span className="font-mono text-sky-400 font-bold">{val}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={val}
                onChange={(e) =>
                  onChangeWeights({ ...weights, [key]: Number(e.target.value) })
                }
                className={`w-full h-1.5 rounded-lg bg-slate-800 cursor-pointer ${color}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
