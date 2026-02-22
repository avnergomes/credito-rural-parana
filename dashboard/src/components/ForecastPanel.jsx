import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import ForecastChart from './ForecastChart';
import { formatCurrency, formatPercent } from '../utils/format';

const SERIES_OPTIONS = [
  { value: 'total', label: 'Total Parana' },
  { value: 'custeio', label: 'Custeio' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'comercializacao', label: 'Comercializacao' },
];

const MODEL_OPTIONS = [
  { value: 'xgboost', label: 'XGBoost' },
  { value: 'lightgbm', label: 'LightGBM' },
  { value: 'randomforest', label: 'Random Forest' },
];

export default function ForecastPanel({ historicalData, forecastData }) {
  const [serie, setSerie] = useState('total');
  const [modelo, setModelo] = useState('xgboost');

  // Extract forecast metrics
  const metrics = useMemo(() => {
    if (!forecastData || !forecastData[serie] || !forecastData[serie][modelo]) {
      return null;
    }

    const forecast = forecastData[serie][modelo];
    const predictions = forecast.predictions || [];

    if (predictions.length === 0) return null;

    const lastPrediction = predictions[predictions.length - 1];
    const firstPrediction = predictions[0];

    // Calculate trend
    const trend = predictions.length > 1
      ? ((lastPrediction.valor - firstPrediction.valor) / firstPrediction.valor) * 100
      : 0;

    return {
      mape: forecast.mape || forecast.metrics?.mape,
      rmse: forecast.rmse || forecast.metrics?.rmse,
      r2: forecast.r2 || forecast.metrics?.r2,
      trend,
      nextMonth: firstPrediction?.valor,
      lastMonth: lastPrediction?.valor,
      horizon: predictions.length,
    };
  }, [forecastData, serie, modelo]);

  const getTrendIcon = (trend) => {
    if (trend > 2) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < -2) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-dark-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="chart-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-dark-800">
            Projecoes de Credito Rural
          </h3>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-dark-500 mb-1">Serie</label>
              <select
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                className="px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SERIES_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-dark-500 mb-1">Modelo</label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {MODEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="text-xs text-dark-500 mb-1">Proximo Mes</div>
            <div className="text-lg font-semibold text-primary-600">
              {formatCurrency(metrics.nextMonth, true)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="text-xs text-dark-500 mb-1">Tendencia ({metrics.horizon} meses)</div>
            <div className="flex items-center gap-2">
              {getTrendIcon(metrics.trend)}
              <span className={`text-lg font-semibold ${
                metrics.trend > 2 ? 'text-green-600' :
                metrics.trend < -2 ? 'text-red-600' : 'text-dark-600'
              }`}>
                {formatPercent(metrics.trend, 1)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="text-xs text-dark-500 mb-1">MAPE</div>
            <div className="text-lg font-semibold text-dark-700">
              {metrics.mape ? formatPercent(metrics.mape, 2) : 'N/D'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="text-xs text-dark-500 mb-1">R²</div>
            <div className="text-lg font-semibold text-dark-700">
              {metrics.r2 ? metrics.r2.toFixed(3) : 'N/D'}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <ForecastChart
        historicalData={historicalData}
        forecastData={forecastData}
        title={`Projecao: ${SERIES_OPTIONS.find(s => s.value === serie)?.label} - ${MODEL_OPTIONS.find(m => m.value === modelo)?.label}`}
        serie={serie}
        modelo={modelo}
      />

      {/* Methodology note */}
      <div className="chart-container">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-dark-600">
            <p className="font-medium text-dark-800 mb-2">Metodologia das Projecoes</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>XGBoost:</strong> Gradient boosting com features temporais e sazonais</li>
              <li>• <strong>LightGBM:</strong> Gradient boosting otimizado para grandes volumes</li>
              <li>• <strong>Random Forest:</strong> Ensemble de arvores de decisao</li>
            </ul>
            <p className="mt-2 text-xs text-dark-500">
              Features: lags (1,2,3,6,12 meses), medias moveis, componentes sazonais.
              Intervalos de confianca calculados via bootstrap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
