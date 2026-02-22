import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Filters from './components/Filters';
import ActiveFilters from './components/ActiveFilters';
import KpiCards from './components/KpiCards';
import Tabs from './components/Tabs';
import Loading from './components/Loading';
import TimeSeriesChart from './components/TimeSeriesChart';
import SankeyChart from './components/SankeyChart';
import TreemapChart from './components/TreemapChart';
import DistributionCharts from './components/DistributionCharts';
import LollipopChart from './components/LollipopChart';
import BumpChart from './components/BumpChart';
import RankingTable from './components/RankingTable';
import MapChart from './components/MapChart';
import ForecastPanel from './components/ForecastPanel';
import { useData, useFilteredData, useAggregations } from './hooks/useData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from './utils/format';

const TABS = [
  { id: 'visao-geral', label: 'Visao Geral', icon: 'LayoutDashboard' },
  { id: 'programas', label: 'Programas', icon: 'PieChart' },
  { id: 'municipios', label: 'Municipios', icon: 'MapPin' },
  { id: 'produtos', label: 'Produtos', icon: 'Package' },
  { id: 'mapa', label: 'Mapa', icon: 'Globe' },
  { id: 'previsoes', label: 'Previsoes', icon: 'TrendingUp' },
];

const FINALIDADE_COLORS = {
  'CUSTEIO': '#2563eb',
  'INVESTIMENTO': '#16a34a',
  'COMERCIALIZACAO': '#f59e0b',
  'INDUSTRIALIZACAO': '#8b5cf6',
};

const PROGRAMA_COLORS = {
  'PRONAF': '#8b5cf6',
  'PRONAMP': '#06b6d4',
  'DEMAIS': '#f97316',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [filters, setFilters] = useState({
    anoMin: null,
    anoMax: null,
    mesMin: null,
    mesMax: null,
    finalidade: null,
    programa: null,
    produto: null,
    municipio: null,
    granularidade: 'anual',
  });

  const [interactiveFilters, setInteractiveFilters] = useState({
    finalidade: null,
    programa: null,
    produto: null,
    municipio: null,
    ano: null,
  });

  const [mapMetric, setMapMetric] = useState('valor');

  const handleFilterClick = useCallback((key, value) => {
    setInteractiveFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  }, []);

  const handleRemoveInteractiveFilter = useCallback((key) => {
    setInteractiveFilters(prev => ({ ...prev, [key]: null }));
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

  // Combine dropdown filters with interactive filters
  const combinedFilters = useMemo(() => ({
    ...filters,
    // Interactive filters override dropdown filters
    finalidade: interactiveFilters.finalidade || filters.finalidade,
    programa: interactiveFilters.programa || filters.programa,
    produto: interactiveFilters.produto || filters.produto,
    municipio: interactiveFilters.municipio || filters.municipio,
    ano: interactiveFilters.ano,
  }), [filters, interactiveFilters]);

  // Load raw data
  const { data, loading, error } = useData();

  // Apply combined filters and get filtered/reaggregated data
  const filteredData = useFilteredData(data, combinedFilters);

  // Calculate KPI aggregations from filtered data
  const aggregations = useAggregations(filteredData, combinedFilters);

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

  // Build treemap data from filtered programa/finalidade
  const treemapData = useMemo(() => {
    if (!filteredData?.byFinalidade || !filteredData?.byPrograma) return [];

    // Cross-join programa totals with finalidade proportions
    const progTotals = filteredData.programaTotals || [];
    const finTotals = filteredData.finalidadeTotals || [];

    if (progTotals.length === 0 || finTotals.length === 0) return [];

    const totalValor = finTotals.reduce((s, f) => s + f.valor, 0);

    const result = [];
    progTotals.forEach(prog => {
      finTotals.forEach(fin => {
        const proportion = fin.valor / totalValor;
        result.push({
          programa: prog.programa,
          finalidade: fin.finalidade,
          valor: prog.valor * proportion,
          contratos: Math.round(prog.contratos * proportion),
        });
      });
    });

    return result;
  }, [filteredData]);

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

        {/* KPI Cards - uses filtered aggregations */}
        <KpiCards totals={aggregations?.totals} />

        {/* Tabs */}
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-6">
          {/* Visao Geral */}
          {activeTab === 'visao-geral' && (
            <div className="space-y-6">
              <TimeSeriesChart
                data={filteredData?.byFinalidade}
                title="Evolucao do Credito Rural no Parana"
                tipo="todos"
                stacked={true}
                showBrush={true}
                granularidade={filters.granularidade}
                onAnoClick={(ano) => handleFilterClick('ano', ano)}
                selectedAno={interactiveFilters.ano}
              />

              <SankeyChart
                data={filteredData?.sankey}
                title="Fluxo: Programa -> Finalidade -> Produto"
                filterNote={hasInteractiveFilters ? 'Filtros ativos' : null}
                onNodeClick={(type, value) => handleFilterClick(type, value)}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TreemapChart
                  data={treemapData}
                  title="Composicao por Programa e Finalidade"
                  onProgramaClick={(programa) => handleFilterClick('programa', programa)}
                  onFinalidadeClick={(finalidade) => handleFilterClick('finalidade', finalidade)}
                  selectedPrograma={interactiveFilters.programa}
                  selectedFinalidade={interactiveFilters.finalidade}
                />

                <DistributionCharts
                  genero={filteredData?.byGenero}
                  tipoPessoa={null}
                />
              </div>

              <LollipopChart
                data={filteredData?.produtoTotals}
                title="Top 15 Produtos por Valor"
                valueKey="valor"
                labelKey="produto"
                limit={15}
                color="#2563eb"
                onClick={(produto) => handleFilterClick('produto', produto)}
                selectedValue={interactiveFilters.produto}
              />
            </div>
          )}

          {/* Programas */}
          {activeTab === 'programas' && (
            <div className="space-y-6">
              {/* Valor por Programa */}
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-dark-800 mb-4">Valor por Programa</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredData?.programaTotals || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v, true)}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        dataKey="programa"
                        type="category"
                        tick={{ fontSize: 12, fill: '#475569' }}
                        width={90}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value, true), 'Valor']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar
                        dataKey="valor"
                        radius={[0, 4, 4, 0]}
                        onClick={(data) => handleFilterClick('programa', data.programa)}
                        cursor="pointer"
                      >
                        {(filteredData?.programaTotals || []).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PROGRAMA_COLORS[entry.programa] || '#94a3b8'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Valor por Finalidade */}
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-dark-800 mb-4">Valor por Finalidade</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredData?.finalidadeTotals || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v, true)}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        dataKey="finalidade"
                        type="category"
                        tick={{ fontSize: 12, fill: '#475569' }}
                        width={110}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value, true), 'Valor']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar
                        dataKey="valor"
                        radius={[0, 4, 4, 0]}
                        onClick={(data) => handleFilterClick('finalidade', data.finalidade)}
                        cursor="pointer"
                      >
                        {(filteredData?.finalidadeTotals || []).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={FINALIDADE_COLORS[entry.finalidade] || '#94a3b8'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LollipopChart
                  data={filteredData?.programaTotals}
                  title="Contratos por Programa"
                  valueKey="contratos"
                  labelKey="programa"
                  limit={10}
                  color="#8b5cf6"
                  onClick={(programa) => handleFilterClick('programa', programa)}
                  selectedValue={interactiveFilters.programa}
                />

                <LollipopChart
                  data={filteredData?.produtoTotals}
                  title="Top 10 Produtos por Contratos"
                  valueKey="contratos"
                  labelKey="produto"
                  limit={10}
                  color="#06b6d4"
                  onClick={(produto) => handleFilterClick('produto', produto)}
                  selectedValue={interactiveFilters.produto}
                />
              </div>
            </div>
          )}

          {/* Municipios */}
          {activeTab === 'municipios' && (
            <div className="space-y-6">
              {filteredData?.municipioTotals?.length > 0 ? (
                <>
                  <BumpChart
                    data={filteredData?.bump}
                    title="Ranking dos Municipios ao Longo dos Anos"
                    limit={20}
                    onEntityClick={(municipio) => handleFilterClick('municipio', municipio)}
                    selectedEntity={interactiveFilters.municipio}
                  />

                  <RankingTable
                    data={filteredData?.municipioTotals}
                    title="Ranking de Municipios"
                    columns={['rank', 'name', 'valor', 'contratos', 'area']}
                    nameKey="name"
                    limit={100}
                    onRowClick={(municipio) => handleFilterClick('municipio', municipio)}
                    selectedRow={interactiveFilters.municipio}
                  />
                </>
              ) : (
                <div className="chart-container bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="text-amber-500 text-xl">!</div>
                    <div>
                      <h4 className="font-medium text-amber-800">Dados municipais nao disponiveis</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Nenhum dado encontrado para o periodo selecionado.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Produtos */}
          {activeTab === 'produtos' && (
            <div className="space-y-6">
              <RankingTable
                data={filteredData?.produtoTotals}
                title="Ranking de Produtos"
                columns={['rank', 'name', 'valor', 'contratos']}
                nameKey="produto"
                limit={50}
                onRowClick={(produto) => handleFilterClick('produto', produto)}
                selectedRow={interactiveFilters.produto}
              />

              <LollipopChart
                data={filteredData?.produtoTotals}
                title="Top 20 Produtos por Valor"
                valueKey="valor"
                labelKey="produto"
                limit={20}
                color="#16a34a"
                onClick={(produto) => handleFilterClick('produto', produto)}
                selectedValue={interactiveFilters.produto}
              />
            </div>
          )}

          {/* Mapa */}
          {activeTab === 'mapa' && (
            <div className="space-y-6">
              <MapChart
                data={filteredData?.municipioTotals}
                title="Mapa do Parana"
                metric={mapMetric}
                onMetricChange={setMapMetric}
                onMunicipioClick={(municipio) => handleFilterClick('municipio', municipio)}
                selectedMunicipio={interactiveFilters.municipio}
              />
            </div>
          )}

          {/* Previsoes */}
          {activeTab === 'previsoes' && (
            <div className="space-y-6">
              {filteredData?.forecasts ? (
                <ForecastPanel
                  historicalData={filteredData?.byMes?.length > 0 ? filteredData.byMes : filteredData?.byAno}
                  forecastData={filteredData?.forecasts}
                />
              ) : (
                <div className="chart-container">
                  <h3 className="text-lg font-semibold text-dark-800 mb-4">
                    Projecoes de Credito Rural
                  </h3>
                  <div className="h-64 flex flex-col items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
                    <p className="mb-2">Dados de previsao nao disponiveis</p>
                    <p className="text-xs text-dark-400">
                      Execute o script generate_forecasts.py para gerar as projecoes
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
