/** Seleção pode ser valor único (legado) ou lista (filtros combináveis). */
export const isSelected = (sel, v) => (Array.isArray(sel) ? sel.includes(v) : sel != null && sel === v);
