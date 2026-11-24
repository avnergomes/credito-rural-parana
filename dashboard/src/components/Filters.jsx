import { useState, useMemo } from 'react';
import { Filter, ChevronDown, RotateCcw } from 'lucide-react';
import MultiSelect from './MultiSelect';
import { DIMENSIONS, options } from '../data/cube';

const GROUPS = [
  { title: 'O que foi financiado', dims: ['finalidade', 'atividade', 'produto', 'variedade'] },
  { title: 'Como foi financiado', dims: ['grupo', 'programa', 'subprograma', 'fonte'] },
  { title: 'Onde e para quem', dims: ['municipio', 'porte'] },
];

const PERIODOS = [
  { id: 'ano', label: 'Ano todo', meses: null },
  { id: 's1', label: '1º semestre', meses: [1, 2, 3, 4, 5, 6] },
  { id: 's2', label: '2º semestre', meses: [7, 8, 9, 10, 11, 12] },
];

const GRANULARIDADES = [
  { id: 'anual', label: 'Anual' },
  { id: 'semestral', label: 'Semestral' },
  { id: 'mensal', label: 'Mensal' },
];

const selectCls = `w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-dark-50 border border-dark-200 rounded-lg
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`;

function Segmented({ items, value, onChange, label }) {
  return (
    <div className="flex-1 min-w-[200px] max-w-[300px]">
      <span className="block text-xs text-dark-500 mb-1">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            aria-pressed={value === it.id}
            onClick={() => onChange(it.id)}
            className={`flex-1 px-2 py-2 min-h-[44px] text-sm rounded-lg transition-colors ${
              value === it.id ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Filters({ cube, filters, onChange, granularidade, onGranularidade, onReset }) {
  const [collapsed, setCollapsed] = useState(false);
  const set = (patch) => onChange({ ...filters, ...patch });

  const years = useMemo(
    () => Array.from({ length: cube.anoMax - cube.anoMin + 1 }, (_, i) => cube.anoMin + i),
    [cube],
  );

  const periodo = PERIODOS.find((p) => JSON.stringify(p.meses) === JSON.stringify(filters.meses))?.id ?? 'ano';
  const activeCount = Object.keys(DIMENSIONS).reduce((s, d) => s + (filters[d].length ? 1 : 0), 0) + (filters.meses ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow-card p-4 mb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expandir filtros' : 'Recolher filtros'}
          aria-expanded={!collapsed}
          className="flex items-center gap-2 flex-1 text-left min-h-[44px]"
        >
          <Filter className="w-4 h-4 text-dark-500" />
          <span className="text-sm font-medium text-dark-700">Filtros combináveis</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary-600 text-white rounded-full leading-none">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-dark-400 ml-auto transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 px-3 min-h-[44px] text-xs text-dark-600 hover:text-primary-700"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Limpar tudo
        </button>
      </div>

      {!collapsed && (
        <div className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[110px] max-w-[150px]">
              <label className="block text-xs text-dark-500 mb-1" htmlFor="f-ano-min">Ano inicial</label>
              <select id="f-ano-min" className={selectCls} value={filters.anoMin ?? cube.anoMin}
                onChange={(e) => set({ anoMin: Math.min(Number(e.target.value), filters.anoMax ?? cube.anoMax) })}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[110px] max-w-[150px]">
              <label className="block text-xs text-dark-500 mb-1" htmlFor="f-ano-max">Ano final</label>
              <select id="f-ano-max" className={selectCls} value={filters.anoMax ?? cube.anoMax}
                onChange={(e) => set({ anoMax: Math.max(Number(e.target.value), filters.anoMin ?? cube.anoMin) })}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Segmented label="Meses considerados" items={PERIODOS} value={periodo}
              onChange={(id) => set({ meses: PERIODOS.find((p) => p.id === id).meses })} />
            <Segmented label="Granularidade da série" items={GRANULARIDADES} value={granularidade} onChange={onGranularidade} />
          </div>

          {GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2">{g.title}</legend>
              <div className="flex flex-wrap gap-4">
                {g.dims.map((d) => (
                  <MultiSelect key={d} label={DIMENSIONS[d].label} getOptions={() => options(cube, filters, d)}
                    selected={filters[d]} onChange={(v) => set({ [d]: v })} />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}
