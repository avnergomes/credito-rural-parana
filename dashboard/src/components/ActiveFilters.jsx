import { X } from 'lucide-react';
import { DIMENSIONS } from '../data/cube';

/** Chips de todas as seleções ativas; cada um remove só aquele valor. */
export default function ActiveFilters({ filters, onRemove, onClear }) {
  const chips = Object.keys(DIMENSIONS).flatMap((d) => filters[d].map((v) => ({ d, v })));
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6" aria-label="Filtros ativos">
      {chips.map(({ d, v }) => (
        <button
          key={`${d}:${v}`}
          type="button"
          onClick={() => onRemove(d, v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs bg-primary-50 text-primary-800 border border-primary-200 rounded-full hover:bg-primary-100"
          aria-label={`Remover filtro ${DIMENSIONS[d].label}: ${v}`}
        >
          <span className="text-primary-500">{DIMENSIONS[d].label}:</span>
          <span className="max-w-[16rem] truncate">{v}</span>
          <X className="w-3 h-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onClear} className="text-xs text-dark-500 hover:text-primary-700 underline px-2 min-h-[36px]">
          Limpar seleções
        </button>
      )}
    </div>
  );
}
