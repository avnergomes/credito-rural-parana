import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Filters from './components/Filters';
import ActiveFilters from './components/ActiveFilters';
import KpiCards from './components/KpiCards';
import Tabs from './components/Tabs';
import Loading from './components/Loading';
import TimeSeriesChart from './components/TimeSeriesChart';
import { useData, useFilteredData, useAggregations } from './hooks/useData';

const TABS = [
  { id: 'visao-geral', label: 'Visao Geral', icon: 'LayoutDashboard' },
  { id: 'programas', label: 'Programas', icon: 'PieChart' },
  { id: 'municipios', label: 'Municipios', icon: 'MapPin' },
  { id: 'produtos', label: 'Produtos', icon: 'Package' },
  { id: 'mapa', label: 'Mapa', icon: 'Globe' },
  { id: 'previsoes', label: 'Previsoes', icon: 'TrendingUp' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [filters, setFilters] = useState({
    anoMin: null,
    anoMax: null,
    finalidade: null,
    programa: null,
    produto: null,
    municipio: null,
    granularidade: 'anual',
    compatibilizarVBP: false,
  });

  // Interactive filters (click on charts)
  const [interactiveFilters, setInteractiveFilters] = useState({
    finalidade: null,
    programa: null,
    produto: null,
    municipio: null,
    ano: null,
  });

  // Handlers for interactive filters
  const handleFilterClick = useCallback((key, value) => {
    setInteractiveFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  }, []);

  const handleRemoveInteractiveFilter = useCallback((key) => {
    setInteractiveFilters(prev => ({
      ...prev,
      [key]: null,
    }));
  }, []);

  const clearInteractiveFilters = useCallback(() => {
    setInteractiveFilters({
      finalidade: null,
      programa: null,
      produto: null,
      municipio: null,
      ano: null,
    });
  }, []);

  const hasInteractiveFilters = useMemo(() => {
    return Object.values(interactiveFilters).some(v => v !== null);
  }, [interactiveFilters]);

  // Load data
  const { data, loading, error } = useData();

  // Apply filters
  const filteredData = useFilteredData(data, filters);

  // Calculate aggregations
  const aggregations = useAggregations(data, filters);

  // Set initial filter values when data loads
  useEffect(() => {
    if (data?.metadata) {
      setFilters(prev => ({
        ...prev,
        anoMin: prev.anoMin || data.metadata.anoMin,
        anoMax: prev.anoMax || data.metadata.anoMax,
      }));
    }
  }, [data?.metadata]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <p className="text-red-500 text-lg mb-2">Erro ao carregar dados</p>
          <p className="text-dark-500 text-sm">{error}</p>
          <p className="text-dark-400 text-xs mt-4">
            Verifique se os arquivos de dados estao disponiveis em /data/
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 to-primary-50/30">
      <Header metadata={data?.metadata} />

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Filters
          filters={filters}
          onChange={setFilters}
          metadata={data?.metadata}
          finalidades={data?.filters?.finalidades}
          programas={data?.filters?.programas}
        />

        {/* Interactive Filters */}
        <ActiveFilters
          filters={interactiveFilters}
          onRemove={handleRemoveInteractiveFilter}
          onClear={clearInteractiveFilters}
        />

        {/* KPI Cards */}
        <KpiCards totals={aggregations?.totals} />

        {/* Tabs */}
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {/* Visao Geral */}
          {activeTab === 'visao-geral' && (
            <div className="space-y-6">
              <TimeSeriesChart
                data={filteredData?.timeseries}
                title="Evolucao do Credito Rural no Parana"
                tipo="todos"
                stacked={true}
                showBrush={true}
                onAnoClick={(ano) => handleFilterClick('ano', ano)}
                selectedAno={interactiveFilters.ano}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Placeholder for SankeyChart */}
                <div className="chart-container">
                  <h3>Fluxo: Programa &rarr; Finalidade &rarr; Produto</h3>
                  <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                    SankeyChart - Em desenvolvimento
                  </div>
                </div>

                {/* Placeholder for TreemapChart */}
                <div className="chart-container">
                  <h3>Composicao por Programa e Finalidade</h3>
                  <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                    TreemapChart - Em desenvolvimento
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Placeholder for Distribution Charts */}
                <div className="chart-container">
                  <h3>Distribuicao por Genero e Tipo de Pessoa</h3>
                  <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                    DistributionCharts - Em desenvolvimento
                  </div>
                </div>

                {/* Placeholder for LollipopChart */}
                <div className="chart-container">
                  <h3>Top 15 Produtos por Valor</h3>
                  <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                    LollipopChart - Em desenvolvimento
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Programas */}
          {activeTab === 'programas' && (
            <div className="space-y-6">
              <div className="chart-container">
                <h3>Valor por Programa</h3>
                <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                  BarChart - Em desenvolvimento
                </div>
              </div>
            </div>
          )}

          {/* Municipios */}
          {activeTab === 'municipios' && (
            <div className="space-y-6">
              <div className="chart-container">
                <h3>Ranking de Municipios</h3>
                <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                  BumpChart + RankingTable - Em desenvolvimento
                </div>
              </div>
            </div>
          )}

          {/* Produtos */}
          {activeTab === 'produtos' && (
            <div className="space-y-6">
              <div className="chart-container">
                <h3>Ranking de Produtos</h3>
                <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                  ProductTable - Em desenvolvimento
                </div>
              </div>
            </div>
          )}

          {/* Mapa */}
          {activeTab === 'mapa' && (
            <div className="space-y-6">
              <div className="chart-container">
                <h3>Mapa do Credito Rural por Municipio</h3>
                <div className="h-96 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                  MapChart (Leaflet) - Em desenvolvimento
                </div>
              </div>
            </div>
          )}

          {/* Previsoes */}
          {activeTab === 'previsoes' && (
            <div className="space-y-6">
              <div className="chart-container">
                <h3>Projecoes de Credito Rural</h3>
                <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                  ForecastChart - Em desenvolvimento
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
