import { DollarSign, FileText, MapPin, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber, formatArea, formatPercent } from '../utils/format';

export default function KpiCards({ totals }) {
  if (!totals) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3 w-16 mb-2" />
                <div className="skeleton h-6 w-24" />
              </div>
            </div>
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
      label: 'Área Financiada',
      value: formatArea(totals.area, true),
      color: 'text-accent-600',
      bgColor: 'bg-accent-50',
    },
    {
      icon: Calculator,
      label: 'Valor Médio',
      value: formatCurrency(totals.valorMedio, true),
      color: 'text-earth-600',
      bgColor: 'bg-earth-50',
    },
    {
      icon: totals.yoyChange == null || totals.yoyChange >= 0 ? TrendingUp : TrendingDown,
      label: 'Variação Anual',
      value: totals.yoyChange !== null ? formatPercent(totals.yoyChange, 1) : 'N/D',
      color: totals.yoyChange == null ? 'text-dark-500' : totals.yoyChange >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: totals.yoyChange == null ? 'bg-dark-50' : totals.yoyChange >= 0 ? 'bg-green-50' : 'bg-red-50',
      title: 'Último ano do recorte contra o anterior, nos mesmos meses (o ano corrente ainda está incompleto).',
    },
    {
      icon: MapPin,
      label: 'Valor com município informado',
      value: totals.coberturaMunicipio != null ? formatPercent(totals.coberturaMunicipio * 100, 0) : 'N/D',
      color: 'text-dark-600',
      bgColor: 'bg-dark-50',
      title: 'O BCB não publica o município de parte das operações (sobretudo médio e grande produtor). '
        + 'Essas operações entram em todos os totais como "Não informado", mas ficam fora do mapa.',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          title={card.title}
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
