import { useState, useEffect, useMemo } from 'react';

const BASE_URL = import.meta.env.BASE_URL || '/credito-rural-parana/';

/**
 * Hook to load all dashboard data
 */
export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load aggregated data (main data file)
        const aggregatedRes = await fetch(`${BASE_URL}data/aggregated.json`);
        if (!aggregatedRes.ok) throw new Error('Falha ao carregar dados agregados');
        const aggregated = await aggregatedRes.json();

        // Load forecasts (optional, may not exist yet)
        let forecasts = null;
        try {
          const forecastsRes = await fetch(`${BASE_URL}data/forecasts.json`);
          if (forecastsRes.ok) {
            forecasts = await forecastsRes.json();
          }
        } catch (e) {
          console.warn('Forecasts not available:', e);
        }

        setData({
          ...aggregated,
          forecasts,
        });
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error };
}

/**
 * Hook to apply filters to the data
 */
export function useFilteredData(data, filters) {
  return useMemo(() => {
    if (!data) return null;

    const { anoMin, anoMax, finalidades, programas, produtos, municipios, granularidade } = filters;

    // Helper to filter by year range
    const filterByYear = (items, yearField = 'ano') => {
      if (!items || !Array.isArray(items)) return items;
      return items.filter(item => {
        const ano = item[yearField];
        if (anoMin && ano < anoMin) return false;
        if (anoMax && ano > anoMax) return false;
        return true;
      });
    };

    // Helper to filter by finalidade
    const filterByFinalidade = (items) => {
      if (!items || !Array.isArray(items) || !finalidades?.length) return items;
      return items.filter(item =>
        finalidades.includes(item.finalidade)
      );
    };

    // Helper to filter by programa
    const filterByPrograma = (items) => {
      if (!items || !Array.isArray(items) || !programas?.length) return items;
      return items.filter(item =>
        programas.includes(item.programa)
      );
    };

    // Helper to filter by produto
    const filterByProduto = (items) => {
      if (!items || !Array.isArray(items) || !produtos?.length) return items;
      return items.filter(item =>
        produtos.includes(item.produto)
      );
    };

    // Helper to filter by municipio
    const filterByMunicipio = (items) => {
      if (!items || !Array.isArray(items) || !municipios?.length) return items;
      return items.filter(item =>
        municipios.includes(item.municipio) || municipios.includes(item.codMunic)
      );
    };

    // Apply all filters
    const applyFilters = (items, yearField = 'ano') => {
      let result = filterByYear(items, yearField);
      result = filterByFinalidade(result);
      result = filterByPrograma(result);
      result = filterByProduto(result);
      result = filterByMunicipio(result);
      return result;
    };

    // Build filtered result
    const result = {
      metadata: data.metadata,
      byAno: filterByYear(data.byAno),
      byMes: granularidade === 'mensal' ? filterByYear(data.byMes) : null,
      byFinalidade: applyFilters(data.byFinalidade),
      byPrograma: applyFilters(data.byPrograma),
      byProduto: applyFilters(data.byProduto),
      byMunicipio: applyFilters(data.byMunicipio),
      byGenero: data.byGenero, // No filter needed
      byTipoPessoa: data.byTipoPessoa, // No filter needed
      byFaixaValor: data.byFaixaValor, // No filter needed
      byFonteRecursos: data.byFonteRecursos,
      byInstituicao: data.byInstituicao,
      sankey: data.sankey,
      treemap: data.treemap,
      bump: data.bump,
      timeseries: granularidade === 'mensal' ? filterByYear(data.byMes) : filterByYear(data.byAno),
      forecasts: data.forecasts,
    };

    return result;
  }, [data, filters]);
}

/**
 * Hook to calculate aggregated totals
 */
export function useAggregations(data, filters) {
  return useMemo(() => {
    if (!data) return null;

    const { anoMin, anoMax } = filters;

    // Filter time series by year range
    const timeseries = data.byAno?.filter(item => {
      if (anoMin && item.ano < anoMin) return false;
      if (anoMax && item.ano > anoMax) return false;
      return true;
    }) || [];

    // Calculate totals
    const totals = timeseries.reduce((acc, item) => ({
      valor: (acc.valor || 0) + (item.valor || 0),
      contratos: (acc.contratos || 0) + (item.contratos || 0),
      area: (acc.area || 0) + (item.area || 0),
    }), {});

    // Calculate YoY change
    const currentYear = anoMax || new Date().getFullYear();
    const prevYear = currentYear - 1;

    const currentYearData = timeseries.find(item => item.ano === currentYear);
    const prevYearData = timeseries.find(item => item.ano === prevYear);

    let yoyChange = null;
    if (currentYearData?.valor && prevYearData?.valor) {
      yoyChange = ((currentYearData.valor - prevYearData.valor) / prevYearData.valor) * 100;
    }

    // Average value per contract
    const valorMedio = totals.contratos > 0 ? totals.valor / totals.contratos : 0;

    return {
      totals: {
        ...totals,
        valorMedio,
        yoyChange,
      },
    };
  }, [data, filters]);
}

/**
 * Hook to load detailed data (lazy loading)
 */
export function useDetailedData() {
  const [detailedData, setDetailedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDetailedData = async () => {
    if (detailedData) return; // Already loaded

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${BASE_URL}data/detailed.json`);
      if (!res.ok) throw new Error('Falha ao carregar dados detalhados');

      const data = await res.json();
      setDetailedData(data);
    } catch (err) {
      console.error('Error loading detailed data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { detailedData, loading, error, loadDetailedData };
}

/**
 * Hook to load GeoJSON for map
 */
export function useGeoJSON() {
  const [geoJSON, setGeoJSON] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadGeoJSON() {
      try {
        const res = await fetch(`${BASE_URL}data/municipios.geojson`);
        if (!res.ok) throw new Error('Falha ao carregar GeoJSON');

        const data = await res.json();
        setGeoJSON(data);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadGeoJSON();
  }, []);

  return { geoJSON, loading, error };
}
