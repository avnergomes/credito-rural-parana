import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatMonthYear } from '../utils/format';

export default function ForecastChart({
  historicalData,
  forecastData,
  title,
  serie = 'total',
  modelo = 'xgboost',
}) {
  const chartData = useMemo(() => {
    const result = [];

    // Add historical data
    if (historicalData && Array.isArray(historicalData)) {
      historicalData.forEach(item => {
        result.push({
          periodo: item.mes ? `${item.ano}-${String(item.mes).padStart(2, '0')}` : String(item.ano),
          ano: item.ano,
          mes: item.mes,
          historico: item.valor || 0,
          tipo: 'historico',
        });
      });
    }

    // Add forecast data
    if (forecastData && forecastData[serie] && forecastData[serie][modelo]) {
      const forecast = forecastData[serie][modelo];

      if (Array.isArray(forecast.predictions)) {
        forecast.predictions.forEach(item => {
          result.push({
            periodo: item.mes ? `${item.ano}-${String(item.mes).padStart(2, '0')}` : String(item.ano),
            ano: item.ano,
            mes: item.mes,
            previsao: item.valor || item.predicted,
            upper95: item.upper_95 || item.valor * 1.1,
            lower95: item.lower_95 || item.valor * 0.9,
            upper80: item.upper_80 || item.valor * 1.05,
            lower80: item.lower_80 || item.valor * 0.95,
            tipo: 'previsao',
          });
        });
      }
    }

    // Sort by period
    result.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return (a.mes || 0) - (b.mes || 0);
    });

    return result;
  }, [historicalData, forecastData, serie, modelo]);

  // Find the transition point
  const transitionIndex = useMemo(() => {
    return chartData.findIndex(d => d.tipo === 'previsao');
  }, [chartData]);

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

    const data = payload[0]?.payload;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-dark-200 p-3">
        <p className="font-medium text-dark-800 mb-2">{formatLabel(label)}</p>
        {data.historico !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-primary-600" />
            <span className="text-dark-600">Historico:</span>
            <span className="font-medium">{formatCurrency(data.historico, true)}</span>
          </div>
        )}
        {data.previsao !== undefined && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-secondary-600" />
              <span className="text-dark-600">Previsao:</span>
              <span className="font-medium">{formatCurrency(data.previsao, true)}</span>
            </div>
            {data.lower95 !== undefined && data.upper95 !== undefined && (
              <div className="text-xs text-dark-500 mt-1">
                IC 95%: {formatCurrency(data.lower95, true)} - {formatCurrency(data.upper95, true)}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="h-80 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          Dados de previsao nao disponiveis
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="periodo"
              tickFormatter={formatLabel}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm text-dark-600">{value}</span>}
            />

            {/* Confidence interval 95% */}
            <Area
              type="monotone"
              dataKey="upper95"
              stroke="none"
              fill="#22c55e"
              fillOpacity={0.1}
              name="IC 95%"
            />
            <Area
              type="monotone"
              dataKey="lower95"
              stroke="none"
              fill="white"
              fillOpacity={1}
            />

            {/* Confidence interval 80% */}
            <Area
              type="monotone"
              dataKey="upper80"
              stroke="none"
              fill="#22c55e"
              fillOpacity={0.2}
              name="IC 80%"
            />
            <Area
              type="monotone"
              dataKey="lower80"
              stroke="none"
              fill="white"
              fillOpacity={1}
            />

            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="historico"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 5 }}
              name="Historico"
            />

            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="previsao"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#22c55e' }}
              activeDot={{ r: 5 }}
              name="Previsao"
            />

            {/* Vertical line at transition point */}
            {transitionIndex > 0 && chartData[transitionIndex] && (
              <ReferenceLine
                x={chartData[transitionIndex].periodo}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{
                  value: 'Inicio Previsao',
                  position: 'top',
                  fill: '#64748b',
                  fontSize: 10,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
