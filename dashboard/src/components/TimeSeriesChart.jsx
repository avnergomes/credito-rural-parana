// ATLAS-A11Y-HEX-SWEPT
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush
} from 'recharts';
import { formatCurrency, formatNumber } from '../utils/format';
import { ATLAS_CATEGORICAL } from '../utils/chart-palette';

// Okabe-Ito (chart-palette.js): matizes bem separados entre as faixas
// empilhadas, seguros para daltonismo.
const COLORS = {
  custeio: ATLAS_CATEGORICAL[0],         // azul #0072B2
  investimento: ATLAS_CATEGORICAL[3],    // laranja #E69F00
  comercializacao: ATLAS_CATEGORICAL[2], // verde-azulado #009E73
  total: ATLAS_CATEGORICAL[7],           // atlas ink
};

export default function TimeSeriesChart({
  data,
  title,
  tipo = 'todos',
  stacked = true,
  showBrush = true,
  onAnoClick,
  selectedAno,
  granularidade = 'anual'
}) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    // Group by year or year/month based on granularidade
    const grouped = {};

    data.forEach(item => {
      // Se granularidade é anual, agrupa só por ano
      const key = granularidade === 'mensal' && item.mes
        ? `${item.ano}-${String(item.mes).padStart(2, '0')}`
        : String(item.ano);

      if (!grouped[key]) {
        grouped[key] = {
          periodo: key,
          ano: item.ano,
          mes: granularidade === 'mensal' ? item.mes : null,
          custeio: 0,
          investimento: 0,
          comercializacao: 0,
          total: 0,
        };
      }

      const finalidade = (item.finalidade || '').toLowerCase();
      const valor = item.valor || 0;

      if (finalidade.includes('custeio')) {
        grouped[key].custeio += valor;
      } else if (finalidade.includes('investimento')) {
        grouped[key].investimento += valor;
      } else if (finalidade.includes('comercializa')) {
        grouped[key].comercializacao += valor;
      }

      grouped[key].total += valor;
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return (a.mes || 0) - (b.mes || 0);
    });
  }, [data, granularidade]);

  const formatLabel = (value) => {
    if (typeof value === 'string' && value.includes('-')) {
      const [ano, mes] = value.split('-');
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${months[parseInt(mes) - 1]}/${ano.slice(2)}`;
    }
    return value;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-dark-200 p-3">
        <p className="font-medium text-dark-800 mb-2">{formatLabel(label)}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-dark-600">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value, true)}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleClick = (data) => {
    if (onAnoClick && data?.activePayload?.[0]?.payload?.ano) {
      onAnoClick(data.activePayload[0].payload.ano);
    }
  };

  if (!chartData.length) {
    return (
      <div className="chart-container">
        <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          Nenhum dado disponível
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onClick={handleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="periodo"
              tickFormatter={formatLabel}
              tick={{ fontSize: 11, fill: '#6e6453' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#6e6453' }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm text-dark-600">{value}</span>}
            />

            {(tipo === 'todos' || tipo === 'custeio') && (
              <Area
                type="monotone"
                dataKey="custeio"
                name="Custeio"
                stackId={stacked ? '1' : undefined}
                stroke={COLORS.custeio}
                fill={COLORS.custeio}
                fillOpacity={0.6}
              />
            )}

            {(tipo === 'todos' || tipo === 'investimento') && (
              <Area
                type="monotone"
                dataKey="investimento"
                name="Investimento"
                stackId={stacked ? '1' : undefined}
                stroke={COLORS.investimento}
                fill={COLORS.investimento}
                fillOpacity={0.6}
              />
            )}

            {(tipo === 'todos' || tipo === 'comercializacao') && (
              <Area
                type="monotone"
                dataKey="comercializacao"
                name="Comercialização"
                stackId={stacked ? '1' : undefined}
                stroke={COLORS.comercializacao}
                fill={COLORS.comercializacao}
                fillOpacity={0.6}
              />
            )}

            {showBrush && chartData.length > 12 && (
              <Brush
                dataKey="periodo"
                height={30}
                stroke="#918058"
                tickFormatter={formatLabel}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
