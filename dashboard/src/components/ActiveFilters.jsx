import { X, Trash2 } from 'lucide-react';

const FILTER_LABELS = {
  finalidade: 'Finalidade',
  programa: 'Programa',
  produto: 'Produto',
  municipio: 'Municipio',
  ano: 'Ano',
};

export default function ActiveFilters({ filters, onRemove, onClear }) {
  // Get active filters (non-null values)
  const activeFilters = Object.entries(filters).filter(
    ([_, value]) => value !== null && value !== undefined
  );

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-dark-500">Filtros ativos:</span>

      {activeFilters.map(([key, value]) => (
        <button
          key={key}
          onClick={() => onRemove(key)}
          className="active-filter-badge group"
        >
          <span className="text-primary-400">{FILTER_LABELS[key] || key}:</span>
          <span>{String(value)}</span>
          <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                     bg-red-50 text-red-700 rounded-full border border-red-200
                     hover:bg-red-100 hover:border-red-300
                     transition-all duration-200 ease-in-out"
        >
          <Trash2 className="w-3 h-3" />
          Limpar todos
        </button>
      )}
    </div>
  );
}
