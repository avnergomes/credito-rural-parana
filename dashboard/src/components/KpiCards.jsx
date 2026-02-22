import { DollarSign, FileText, MapPin, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber, formatArea, formatPercent } from '../utils/format';

export default function KpiCards({ totals }) {
  if (!totals) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card p-4">
            <div className="animate-shimmer h-4 w-20 rounded mb-2" />
            <div className="animate-shimmer h-8 w-32 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: DollarSign,
      label: 'Valor Contratado',
      value: formatCurrency(totals.valor, true),
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      icon: FileText,
      label: 'Contratos',
      value: formatNumber(totals.contratos),
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50',
    },
    {
      icon: MapPin,
      label: 'Area Financiada',
      value: formatArea(totals.area, true),
      color: 'text-accent-600',
      bgColor: 'bg-accent-50',
    },
    {
      icon: Calculator,
      label: 'Valor Medio',
      value: formatCurrency(totals.valorMedio, true),
      color: 'text-earth-600',
      bgColor: 'bg-earth-50',
    },
    {
      icon: totals.yoyChange >= 0 ? TrendingUp : TrendingDown,
      label: 'Variacao Anual',
      value: totals.yoyChange !== null ? formatPercent(totals.yoyChange, 1) : 'N/D',
      color: totals.yoyChange >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: totals.yoyChange >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-card p-4 hover:shadow-soft transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-dark-500 truncate">{card.label}</p>
              <p className={`text-lg font-semibold ${card.color} truncate`}>
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
