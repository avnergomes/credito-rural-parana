import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const MAX_LIST = 300;

/**
 * Seleção múltipla com busca. `getOptions()` -> [{ value, valor }] ordenadas por valor
 * (peso da opção no recorte atual); só é chamada com a lista aberta, pois custa um group-by.
 */
export default function MultiSelect({ label, getOptions, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => (open ? getOptions() : []), [open, selected, getOptions]);
  const sel = useMemo(() => new Set(selected), [selected]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;
    // Selecionados sempre visíveis, mesmo sem valor no recorte.
    const missing = selected.filter((v) => !base.some((o) => o.value === v)).map((v) => ({ value: v, valor: 0 }));
    return [...missing, ...base].slice(0, MAX_LIST);
  }, [options, query, selected]);

  const toggle = (v) => onChange(sel.has(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const summary = selected.length === 0 ? 'Todos' : selected.length === 1 ? selected[0] : `${selected.length} selecionados`;

  return (
    <div className="relative flex-1 min-w-[160px] max-w-[240px]" ref={ref}>
      <label className="block text-xs text-dark-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className={`w-full min-h-[44px] px-3 py-2 text-sm text-left flex items-center gap-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-primary-500
          ${selected.length ? 'bg-primary-50 border-primary-300 text-primary-800' : 'bg-dark-50 border-dark-200 text-dark-700'}`}
      >
        <span className="truncate flex-1">{summary}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={listId} className="absolute z-50 mt-1 w-[min(22rem,90vw)] bg-white border border-dark-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-dark-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-dark-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}...`}
              className="flex-1 text-base sm:text-sm outline-none"
              aria-label={`Buscar ${label}`}
            />
            {selected.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-xs text-primary-700 hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {visible.length === 0 && <li className="px-3 py-2 text-sm text-dark-400">Nenhuma opção no recorte atual</li>}
            {visible.map((o) => (
              <li key={o.value}>
                <label className="flex items-center gap-2 px-3 py-2 min-h-[40px] text-sm cursor-pointer hover:bg-dark-50">
                  <input type="checkbox" checked={sel.has(o.value)} onChange={() => toggle(o.value)} className="accent-primary-600" />
                  <span className="flex-1 truncate" title={o.value}>{o.value}</span>
                  <span className="text-xs text-dark-400 tabular-nums">{o.valor ? formatCurrency(o.valor, true) : '–'}</span>
                </label>
              </li>
            ))}
          </ul>
          {options.length > MAX_LIST && !query && (
            <p className="px-3 py-2 text-xs text-dark-400 border-t border-dark-100">
              Mostrando as {MAX_LIST} maiores; use a busca para as demais.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
