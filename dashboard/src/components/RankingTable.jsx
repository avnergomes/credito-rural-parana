import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { formatCurrency, formatNumber, formatArea } from '../utils/format';

export default function RankingTable({
  data,
  title,
  columns = ['rank', 'name', 'valor', 'contratos', 'area'],
  nameKey = 'municipio',
  limit = 50,
  onRowClick,
  selectedRow,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('valor');
  const [sortDir, setSortDir] = useState('desc');

  const columnConfig = {
    rank: { label: '#', width: 'w-12', align: 'text-center' },
    name: { label: 'Nome', width: 'flex-1', align: 'text-left' },
    valor: { label: 'Valor (R$)', width: 'w-32', align: 'text-right' },
    contratos: { label: 'Contratos', width: 'w-24', align: 'text-right' },
    area: { label: 'Area (ha)', width: 'w-28', align: 'text-right' },
    variacao: { label: 'Var %', width: 'w-20', align: 'text-right' },
  };

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    let result = [...data];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => {
        const name = item[nameKey] || item.nome || item.produto || '';
        return name.toLowerCase().includes(searchLower);
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortKey] || 0;
      const bVal = b[sortKey] || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Apply limit
    return result.slice(0, limit);
  }, [data, search, sortKey, sortDir, nameKey, limit]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    if (!filteredData.length) return;

    const headers = columns.map(col => columnConfig[col]?.label || col);
    const rows = filteredData.map((item, index) => {
      return columns.map(col => {
        if (col === 'rank') return index + 1;
        if (col === 'name') return item[nameKey] || item.nome || item.produto || '';
        if (col === 'valor') return item.valor || 0;
        if (col === 'contratos') return item.contratos || 0;
        if (col === 'area') return item.area || 0;
        if (col === 'variacao') return item.variacao || 0;
        return item[col] || '';
      });
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (col, value, item, index) => {
    if (col === 'rank') return index + 1;
    if (col === 'name') return item[nameKey] || item.nome || item.produto || '-';
    if (col === 'valor') return formatCurrency(value, true);
    if (col === 'contratos') return formatNumber(value);
    if (col === 'area') return formatArea(value, true);
    if (col === 'variacao') {
      const isPositive = value >= 0;
      return (
        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
          {isPositive ? '+' : ''}{value?.toFixed(1)}%
        </span>
      );
    }
    return value;
  };

  return (
    <div className="chart-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-dark-800">{title}</h3>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-2 text-sm text-dark-600 hover:text-dark-800
                       bg-dark-100 hover:bg-dark-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-200">
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => col !== 'rank' && col !== 'name' && handleSort(col)}
                  className={`
                    py-3 px-2 text-xs font-medium text-dark-500 uppercase tracking-wider
                    ${columnConfig[col]?.width} ${columnConfig[col]?.align}
                    ${col !== 'rank' && col !== 'name' ? 'cursor-pointer hover:text-dark-700' : ''}
                  `}
                >
                  <div className="flex items-center justify-end gap-1">
                    {columnConfig[col]?.label || col}
                    {sortKey === col && (
                      sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-dark-400">
                  Nenhum resultado encontrado
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => {
                const itemName = item[nameKey] || item.nome || item.produto || '';
                const isSelected = selectedRow && itemName === selectedRow;
                return (
                  <tr
                    key={index}
                    onClick={() => onRowClick && onRowClick(itemName)}
                    className={`
                      border-b border-dark-100 transition-colors
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-primary-50 hover:bg-primary-100' : 'hover:bg-dark-50'}
                    `}
                  >
                    {columns.map(col => (
                      <td
                        key={col}
                        className={`py-3 px-2 text-sm ${columnConfig[col]?.align} ${isSelected ? 'font-medium' : ''}`}
                      >
                        {formatValue(col, item[col], item, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <div className="mt-4 text-xs text-dark-500 text-right">
          Exibindo {filteredData.length} de {data?.length || 0} registros
        </div>
      )}
    </div>
  );
}
