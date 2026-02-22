import { Filter, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Filters({ filters, onChange, metadata, finalidades, programas }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const years = metadata
    ? Array.from(
        { length: metadata.anoMax - metadata.anoMin + 1 },
        (_, i) => metadata.anoMin + i
      )
    : [];

  const finalidadeOptions = finalidades || ['CUSTEIO', 'INVESTIMENTO', 'COMERCIALIZACAO'];
  const programaOptions = programas || ['PRONAF', 'PRONAMP', 'DEMAIS'];

  return (
    <div className="bg-white rounded-xl shadow-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-dark-500" />
        <span className="text-sm font-medium text-dark-700">Filtros</span>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {/* Ano Inicial */}
        <div className="flex-1 min-w-[120px] max-w-[160px]">
          <label className="block text-xs text-dark-500 mb-1">Ano Inicial</label>
          <select
            value={filters.anoMin || ''}
            onChange={(e) => handleChange('anoMin', parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Ano Final */}
        <div className="flex-1 min-w-[120px] max-w-[160px]">
          <label className="block text-xs text-dark-500 mb-1">Ano Final</label>
          <select
            value={filters.anoMax || ''}
            onChange={(e) => handleChange('anoMax', parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Finalidade */}
        <div className="flex-1 min-w-[140px] max-w-[180px]">
          <label className="block text-xs text-dark-500 mb-1">Finalidade</label>
          <select
            value={filters.finalidade || ''}
            onChange={(e) => handleChange('finalidade', e.target.value || null)}
            className="w-full px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            {finalidadeOptions.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Programa */}
        <div className="flex-1 min-w-[140px] max-w-[180px]">
          <label className="block text-xs text-dark-500 mb-1">Programa</label>
          <select
            value={filters.programa || ''}
            onChange={(e) => handleChange('programa', e.target.value || null)}
            className="w-full px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {programaOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Granularidade Toggle */}
        <div className="flex-1 min-w-[160px] max-w-[200px]">
          <label className="block text-xs text-dark-500 mb-1">Granularidade</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleChange('granularidade', 'anual')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                filters.granularidade === 'anual'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
              }`}
            >
              Anual
            </button>
            <button
              onClick={() => handleChange('granularidade', 'mensal')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                filters.granularidade === 'mensal'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
              }`}
            >
              Mensal
            </button>
          </div>
        </div>

        {/* Toggle Compatibilizar VBP */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleChange('compatibilizarVBP', !filters.compatibilizarVBP)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              filters.compatibilizarVBP
                ? 'bg-secondary-100 text-secondary-700'
                : 'bg-dark-100 text-dark-600'
            }`}
          >
            {filters.compatibilizarVBP ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
            VBP
          </button>
        </div>
      </div>
    </div>
  );
}
