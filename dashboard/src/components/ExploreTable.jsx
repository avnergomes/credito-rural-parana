import { useState, useMemo } from 'react';
import { Download, Table2 } from 'lucide-react';
import { DIMENSIONS, groupBy } from '../data/cube';
import { formatCurrency, formatNumber, formatArea } from '../utils/format';

const TEMPO = { ano: 'Ano', semestre: 'Semestre', mes: 'Mês' };
const ALL = { ...TEMPO, ...Object.fromEntries(Object.entries(DIMENSIONS).map(([k, v]) => [k, v.label])) };
const SHOW = 200;

function csvCell(v) {
  let s = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`; // evita fórmula no Excel
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tabela dinâmica: agrupa o recorte filtrado pelas dimensões escolhidas, na ordem escolhida. */
export default function ExploreTable({ cube, filters }) {
  const [dims, setDims] = useState(['semestre', 'municipio', 'produto']);
  const [sortKey, setSortKey] = useState('valor');

  const rows = useMemo(() => {
    if (!dims.length) return [];
    const out = groupBy(cube, filters, dims, { keepSelf: true });
    return sortKey === 'valor' ? out : [...out].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [cube, filters, dims, sortKey]);

  const toggle = (d) => setDims((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const download = () => {
    const head = [...dims.map((d) => ALL[d]), 'Contratos', 'Valor (R$)', 'Área (ha)'];
    const body = rows.map((r) => [...r.keys, r.contratos, r.valor.toFixed(2).replace('.', ','), r.area.toFixed(1).replace('.', ',')]);
    // ';' e vírgula decimal: abre direto no Excel em pt-BR. BOM garante acentos.
    const csv = '﻿' + [head, ...body].map((l) => l.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `credito-rural-pr_${dims.join('-')}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="chart-container space-y-4">
      <div className="flex items-start gap-3">
        <Table2 className="w-5 h-5 text-primary-600 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-dark-800">Explorar e exportar</h3>
          <p className="text-sm text-dark-500">
            Escolha as dimensões (a ordem dos cliques define as colunas). A tabela respeita todos os filtros acima.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Dimensões da tabela">
        {Object.entries(ALL).map(([k, label]) => {
          const pos = dims.indexOf(k);
          return (
            <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={pos >= 0}
              className={`px-3 min-h-[40px] text-sm rounded-full border transition-colors ${
                pos >= 0 ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-dark-200 text-dark-600 hover:border-primary-400'
              }`}>
              {pos >= 0 && <span className="mr-1 font-bold">{pos + 1}.</span>}{label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-dark-600">
          {formatNumber(rows.length)} linhas{rows.length > SHOW ? ` (mostrando ${SHOW})` : ''}
        </span>
        <label className="flex items-center gap-2 text-dark-500">
          Ordenar por
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="px-2 min-h-[40px] bg-dark-50 border border-dark-200 rounded-lg">
            <option value="valor">Valor</option>
            <option value="contratos">Contratos</option>
            <option value="area">Área</option>
          </select>
        </label>
        <button type="button" onClick={download} disabled={!rows.length}
          className="ml-auto inline-flex items-center gap-2 px-4 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40">
          <Download className="w-4 h-4" /> Baixar CSV completo
        </button>
      </div>

      <div className="overflow-x-auto border border-dark-100 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-dark-600">
            <tr>
              {dims.map((d) => <th key={d} className="px-3 py-2 text-left font-medium whitespace-nowrap">{ALL[d]}</th>)}
              <th className="px-3 py-2 text-right font-medium">Contratos</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
              <th className="px-3 py-2 text-right font-medium">Área</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, SHOW).map((r) => (
              <tr key={r.rawKeys.join('|')} className="border-t border-dark-100">
                {r.keys.map((k, j) => <td key={j} className="px-3 py-1.5 text-dark-700 max-w-[18rem] truncate" title={k}>{k}</td>)}
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.contratos)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(r.valor, true)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatArea(r.area)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
