import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 to-primary-50/30 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-dark-600 font-medium">Carregando dados...</p>
        <p className="text-dark-400 text-sm mt-1">Aguarde um momento</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="chart-container">
      <div className="animate-shimmer h-6 w-48 rounded mb-4" />
      <div className="animate-shimmer h-64 rounded" />
    </div>
  );
}

export function LoadingKpis() {
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
