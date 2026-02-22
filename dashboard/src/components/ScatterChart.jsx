import { useMemo, useState } from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatNumber } from '../utils/format';

const FINALIDADE_COLORS = {
  'CUSTEIO': '#2563eb',
  'INVESTIMENTO': '#16a34a',
  'COMERCIALIZACAO': '#f59e0b',
  'Outros': '#94a3b8',
};

export default function ScatterChart({
  creditoData,
  vbpData,
  title = 'VBP x Credito por Municipio',
  compatibilizarVBP = false,
}) {
  const [showTrendline, setShowTrendline] = useState(true);

  // Merge data by municipio
  const chartData = useMemo(() => {
    if (!creditoData || !Array.isArray(creditoData)) return [];

    // Create VBP lookup
    const vbpLookup = {};
    if (vbpData && Array.isArray(vbpData)) {
      vbpData.forEach(item => {
        const key = item.municipio || item.codMunic;
        if (key) {
          vbpLookup[key.toUpperCase()] = item.vbp || item.valor || 0;
        }
      });
    }

    // Merge with credito data
    const result = creditoData
      .filter(item => item.valor > 0)
      .map(item => {
        const municipio = item.municipio || '';
        const vbp = vbpLookup[municipio.toUpperCase()] || 0;

        return {
          municipio,
          credito: item.valor,
          vbp: vbp,
          area: item.area || 0,
          contratos: item.contratos || 0,
          finalidade: item.finalidade || 'Outros',
        };
      })
      .filter(d => d.vbp > 0); // Only include points with VBP data

    return result;
  }, [creditoData, vbpData]);

  // Calculate regression line
  const regression = useMemo(() => {
    if (chartData.length < 3) return null;

    const x = chartData.map(d => d.vbp);
    const y = chartData.map(d => d.credito);
    const n = x.length;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((total, yi) => total + Math.pow(yi - meanY, 2), 0);
    const ssResidual = y.reduce((total, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return total + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = 1 - ssResidual / ssTotal;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);

    return {
      slope,
      intercept,
      r2,
      points: [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ],
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-dark-200 p-3 max-w-xs">
        <div className="font-medium text-dark-800">{data.municipio}</div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-dark-500">VBP:</span>
            <span className="font-medium">{formatCurrency(data.vbp, true)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-dark-500">Credito:</span>
            <span className="font-medium">{formatCurrency(data.credito, true)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-dark-500">Area:</span>
            <span className="font-medium">{formatNumber(data.area)} ha</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-dark-500">Contratos:</span>
            <span className="font-medium">{formatNumber(data.contratos)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Group by finalidade for legend
  const groupedData = useMemo(() => {
    const groups = {};
    chartData.forEach(item => {
      const key = item.finalidade || 'Outros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="h-96 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          <div className="text-center">
            <p>Dados insuficientes para o grafico de dispersao</p>
            <p className="text-xs mt-2">
              Necessario dados de VBP para comparacao
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-800">{title}</h3>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTrendline}
              onChange={(e) => setShowTrendline(e.target.checked)}
              className="rounded border-dark-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-dark-600">Linha de tendencia</span>
          </label>

          {regression && (
            <div className="text-xs text-dark-500 bg-dark-50 px-2 py-1 rounded">
              R² = {regression.r2.toFixed(3)}
            </div>
          )}
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="vbp"
              name="VBP"
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{
                value: 'VBP (R$)',
                position: 'insideBottom',
                offset: -10,
                fontSize: 12,
                fill: '#475569',
              }}
            />
            <YAxis
              type="number"
              dataKey="credito"
              name="Credito"
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{
                value: 'Credito Rural (R$)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 12,
                fill: '#475569',
              }}
            />
            <ZAxis
              type="number"
              dataKey="area"
              range={[50, 400]}
              name="Area"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Render scatter for each finalidade group */}
            {Object.entries(groupedData).map(([finalidade, data]) => (
              <Scatter
                key={finalidade}
                name={finalidade}
                data={data}
                fill={FINALIDADE_COLORS[finalidade] || FINALIDADE_COLORS['Outros']}
                fillOpacity={0.7}
              />
            ))}

            {/* Trend line */}
            {showTrendline && regression && (
              <ReferenceLine
                segment={regression.points.map(p => ({ x: p.x, y: p.y }))}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
          </RechartsScatterChart>
        </ResponsiveContainer>
      </div>

      {compatibilizarVBP && (
        <div className="mt-4 text-xs text-dark-500 bg-primary-50 p-3 rounded-lg">
          <strong>Compatibilizacao VBP ativada:</strong> Produtos do credito rural foram
          agrupados conforme categorias do VBP Parana para permitir comparacao direta.
        </div>
      )}
    </div>
  );
}
