// ATLAS-A11Y-HEX-SWEPT
import { useState, useCallback, useMemo } from 'react';
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
import ExploreTable from './components/ExploreTable';
import { useData } from './hooks/useData';
import {
  EMPTY_FILTERS, DIMENSIONS, PERFIL_DIMS,
  totals, timeSeries, ranking, sankey, bump, groupBy, perfilBy,
} from './data/cube';
import { ATLAS_CATEGORICAL } from './utils/chart-palette';

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral', icon: 'LayoutDashboard' },
  { id: 'produtos', label: 'Produtos', icon: 'Package' },
  { id: 'programas', label: 'Programas e Fontes', icon: 'PieChart' },
  { id: 'municipios', label: 'Municípios', icon: 'MapPin' },
  { id: 'mapa', label: 'Mapa', icon: 'Globe' },
  { id: 'perfil', label: 'Perfil', icon: 'Users' },
  { id: 'explorar', label: 'Explorar', icon: 'Table2' },
  { id: 'previsoes', label: 'Previsões', icon: 'TrendingUp' },
];

function Note({ children }) {
  return (
    <div className="chart-container bg-amber-50 border border-amber-200 text-sm text-amber-800">{children}</div>
  );
}

/** Calcula só os dados da aba ativa. */
function useTabData(cube, perfil, filters, tab) {
  return useMemo(() => {
    if (!cube) return {};
    const r = (dim, key = 'name', f = filters) => ranking(cube, f, dim, key);
    switch (tab) {
      case 'visao-geral': {
        const treemap = groupBy(cube, filters, ['grupo', 'finalidade'], { keepSelf: true })
          .map(({ keys: [g, f], valor, contratos }) => ({ name: f, programa: g, finalidade: f, valor, contratos }));
        return { serie: timeSeries(cube, filters), sankey: sankey(cube, filters), treemap, produtos: r('produto', 'produto'), portes: r('porte') };
      }
      case 'produtos':
        return { produtos: r('produto', 'produto'), variedades: r('variedade'), atividades: r('atividade') };
      case 'programas':
        return { grupos: r('grupo'), programas: r('programa'), subprogramas: r('subprograma'), fontes: r('fonte'), finalidades: r('finalidade') };
      case 'municipios':
        return { municipios: r('municipio'), bump: bump(cube, filters) };
      case 'mapa':
        return { municipios: r('municipio').filter((m) => m.codIbge) };
      case 'perfil': {
        const sexo = perfilBy(cube, perfil, filters, 'sexo');
        const get = (n) => sexo.find((s) => s.name === n)?.valor || 0;
        return { genero: { feminino: get('Feminino'), masculino: get('Masculino') }, tipos: perfilBy(cube, perfil, filters, 'tipo') };
      }
      default:
        return {};
    }
  }, [cube, perfil, filters, tab]);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [granularidade, setGranularidade] = useState('anual');
  const [mapMetric, setMapMetric] = useState('valor');

  const { data, loading, error, progress, retry } = useData();
  const cube = data?.cube;

  const toggle = useCallback((dim, value) => {
    if (!value || !DIMENSIONS[dim]) return;
    setFilters((f) => ({ ...f, [dim]: f[dim].includes(value) ? f[dim].filter((v) => v !== value) : [...f[dim], value] }));
  }, []);
  const remove = useCallback((dim, value) => setFilters((f) => ({ ...f, [dim]: f[dim].filter((v) => v !== value) })), []);
  const clearSelections = useCallback(
    () => setFilters((f) => ({ ...f, ...Object.fromEntries(Object.keys(DIMENSIONS).map((d) => [d, []])) })),
    [],
  );
  const resetAll = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const toggleAno = useCallback((ano) => setFilters((f) => (
    f.anoMin === ano && f.anoMax === ano
      ? { ...f, anoMin: null, anoMax: null }
      : { ...f, anoMin: ano, anoMax: ano }
  )), []);

  const kpis = useMemo(() => (cube ? totals(cube, filters) : null), [cube, filters]);
  const tab = useTabData(cube, data?.perfil, filters, activeTab);
  const perfilIgnorados = Object.keys(DIMENSIONS).filter((d) => !PERFIL_DIMS.includes(d) && filters[d].length);

  if (loading) return <Loading progress={progress} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <p className="text-red-500 text-lg mb-2">Erro ao carregar dados</p>
          <p className="text-dark-500 text-sm">{error}</p>
          <button type="button" onClick={retry}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const lolli = (rows, title, labelKey, dim, color, extra = {}) => (
    <LollipopChart data={rows} title={title} valueKey="valor" labelKey={labelKey} limit={15} color={color}
      onClick={(v) => toggle(dim, v)} selectedValue={filters[dim]} {...extra} />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 to-primary-50/30">
      <Header metadata={data?.metadata} />

      <main className="container mx-auto px-4 py-8">
        <Filters cube={cube} filters={filters} onChange={setFilters}
          granularidade={granularidade} onGranularidade={setGranularidade} onReset={resetAll} />
        <ActiveFilters filters={filters} onRemove={remove} onClear={clearSelections} />
        <KpiCards totals={kpis} />
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-6 space-y-6">
          {activeTab === 'visao-geral' && (
            <>
              <TimeSeriesChart data={tab.serie} title="Evolução do crédito rural no Paraná" tipo="todos" stacked
                showBrush granularidade={granularidade} onAnoClick={toggleAno}
                selectedAno={filters.anoMin != null && filters.anoMin === filters.anoMax ? filters.anoMin : null} />
              <SankeyChart data={tab.sankey} title="Fluxo: grupo de programa → finalidade → produto"
                onNodeClick={(type, value) => toggle(type, value)} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TreemapChart data={tab.treemap} title="Composição por grupo de programa e finalidade"
                  onProgramaClick={(v) => toggle('grupo', v)} onFinalidadeClick={(v) => toggle('finalidade', v)}
                  selectedPrograma={filters.grupo} selectedFinalidade={filters.finalidade} />
                {lolli(tab.portes, 'Valor por porte do produtor', 'name', 'porte', ATLAS_CATEGORICAL[1])}
              </div>
              {lolli(tab.produtos, 'Top 15 produtos por valor', 'produto', 'produto', ATLAS_CATEGORICAL[0])}
            </>
          )}

          {activeTab === 'produtos' && (
            <>
              <RankingTable data={tab.produtos} title="Ranking de produtos" columns={['rank', 'name', 'valor', 'contratos', 'area']}
                nameKey="produto" limit={300} onRowClick={(v) => toggle('produto', v)} selectedRow={filters.produto} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {lolli(tab.variedades, 'Variedades (refine pelo produto)', 'name', 'variedade', ATLAS_CATEGORICAL[3])}
                {lolli(tab.atividades, 'Atividade', 'name', 'atividade', ATLAS_CATEGORICAL[5])}
              </div>
            </>
          )}

          {activeTab === 'programas' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {lolli(tab.grupos, 'Grupo de programa', 'name', 'grupo', ATLAS_CATEGORICAL[4])}
                {lolli(tab.finalidades, 'Finalidade', 'name', 'finalidade', ATLAS_CATEGORICAL[0])}
              </div>
              {lolli(tab.programas, 'Programas', 'name', 'programa', ATLAS_CATEGORICAL[4])}
              {lolli(tab.subprogramas, 'Subprogramas', 'name', 'subprograma', ATLAS_CATEGORICAL[2], { limit: 20 })}
              {lolli(tab.fontes, 'Fontes de recursos', 'name', 'fonte', ATLAS_CATEGORICAL[3])}
            </>
          )}

          {activeTab === 'municipios' && (
            <>
              <Note>
                O BCB não publica o município de parte das operações, sobretudo de médio e grande produtor. Elas aparecem
                na linha &quot;Não informado&quot; e entram em todos os totais. No recorte atual,{' '}
                <strong>{kpis?.coberturaMunicipio != null ? Math.round(kpis.coberturaMunicipio * 100) : '–'}%</strong> do valor tem município.
              </Note>
              <BumpChart data={tab.bump} title="Ranking dos municípios ao longo dos anos" limit={20}
                onEntityClick={(v) => toggle('municipio', v)} selectedEntity={filters.municipio} />
              <RankingTable data={tab.municipios} title="Ranking de municípios" columns={['rank', 'name', 'valor', 'contratos', 'area']}
                nameKey="name" limit={400} onRowClick={(v) => toggle('municipio', v)} selectedRow={filters.municipio} />
            </>
          )}

          {activeTab === 'mapa' && (
            <MapChart data={tab.municipios} title="Mapa do Paraná (operações com município informado)" metric={mapMetric}
              onMetricChange={setMapMetric} onMunicipioClick={(v) => toggle('municipio', v)} selectedMunicipio={filters.municipio} />
          )}

          {activeTab === 'perfil' && (
            <>
              <Note>
                Perfil do mutuário principal de cada operação, em recorte estadual (sem município, para não expor
                células com poucos contratos). Responde a período, finalidade, programa e porte. As mesmas operações
                sem município publicado também vêm sem dados do mutuário e aparecem como &quot;Não informado&quot;.
                {perfilIgnorados.length > 0 && (
                  <> Filtros ignorados aqui: <strong>{perfilIgnorados.map((d) => DIMENSIONS[d].label).join(', ')}</strong>.</>
                )}
              </Note>
              <DistributionCharts genero={tab.genero} tipoPessoa={null} />
              <LollipopChart data={tab.tipos} title="Valor por tipo de beneficiário" valueKey="valor" labelKey="name" limit={15} color={ATLAS_CATEGORICAL[5]} />
            </>
          )}

          {activeTab === 'explorar' && <ExploreTable cube={cube} filters={filters} />}

          {activeTab === 'previsoes' && (
            data?.forecasts ? (
              <ForecastPanel historicalData={data.byMes} forecastData={data.forecasts} />
            ) : (
              <Note>Projeções indisponíveis no momento.</Note>
            )
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
