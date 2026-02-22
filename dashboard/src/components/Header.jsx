import { Landmark, Calendar, MapPin, FileText, DollarSign } from 'lucide-react';
import { formatNumber, formatCurrency } from '../utils/format';

export default function Header({ metadata }) {
  const stats = metadata ? [
    { icon: Calendar, label: 'Periodo', value: `${metadata.anoMin} - ${metadata.anoMax}` },
    { icon: MapPin, label: 'Municipios', value: formatNumber(metadata.totalMunicipios) },
    { icon: DollarSign, label: 'Total', value: formatCurrency(metadata.totalValor, true) },
    { icon: FileText, label: 'Contratos', value: formatNumber(metadata.totalContratos) },
  ] : [];

  return (
    <header className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600" />

      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Landmark className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white">
                Credito Rural Parana
              </h1>
              <p className="text-primary-100 text-sm md:text-base mt-1">
                Financiamento Agropecuario — BCB/SICOR
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 md:gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-white/15 backdrop-blur-sm rounded-lg"
              >
                <stat.icon className="w-4 h-4 text-primary-200" />
                <div className="text-white">
                  <span className="text-xs text-primary-200 block">{stat.label}</span>
                  <span className="font-semibold text-sm">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" className="w-full h-8 md:h-12" preserveAspectRatio="none">
          <path
            fill="white"
            fillOpacity="0.1"
            d="M0,32L48,37.3C96,43,192,53,288,53.3C384,53,480,43,576,37.3C672,32,768,32,864,37.3C960,43,1056,53,1152,53.3C1248,53,1344,43,1392,37.3L1440,32L1440,60L1392,60C1344,60,1248,60,1152,60C1056,60,960,60,864,60C768,60,672,60,576,60C480,60,384,60,288,60C192,60,96,60,48,60L0,60Z"
          />
          <path
            fill="rgb(248 250 252)"
            d="M0,48L48,45.3C96,43,192,37,288,37.3C384,37,480,43,576,48C672,53,768,59,864,58.7C960,59,1056,53,1152,48C1248,43,1344,37,1392,34.7L1440,32L1440,60L1392,60C1344,60,1248,60,1152,60C1056,60,960,60,864,60C768,60,672,60,576,60C480,60,384,60,288,60C192,60,96,60,48,60L0,60Z"
          />
        </svg>
      </div>
    </header>
  );
}
