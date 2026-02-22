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

        const aggregatedRes = await fetch(`${BASE_URL}data/aggregated.json`);
        if (!aggregatedRes.ok) throw new Error('Falha ao carregar dados agregados');
        const aggregated = await aggregatedRes.json();

        let forecasts = null;
        try {
          const forecastsRes = await fetch(`${BASE_URL}data/forecasts.json`);
          if (forecastsRes.ok) {
            forecasts = await forecastsRes.json();
          }
        } catch (e) {
          console.warn('Forecasts not available:', e);
        }

        setData({ ...aggregated, forecasts });
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
 * Filter data by year/month range
 */
function filterByPeriod(items, anoMin, anoMax, mesMin, mesMax) {
  if (!items || !Array.isArray(items)) return items;
  return items.filter(item => {
    const ano = item.ano;
    const mes = item.mes || 1;
    if (anoMin && ano < anoMin) return false;
    if (anoMax && ano > anoMax) return false;
    // For same year, check months
    if (anoMin && ano === anoMin && mesMin && mes < mesMin) return false;
    if (anoMax && ano === anoMax && mesMax && mes > mesMax) return false;
    return true;
  });
}

/**
 * Aggregate filtered data by a key
 */
function aggregateByKey(items, key, includeRank = false) {
  if (!items || items.length === 0) return [];

  const grouped = {};
  items.forEach(item => {
    const k = item[key];
    if (!grouped[k]) {
      grouped[k] = { [key]: k, valor: 0, contratos: 0, area: 0 };
      if (item.codIbge) grouped[k].codIbge = item.codIbge;
    }
    grouped[k].valor += item.valor || 0;
    grouped[k].contratos += item.contratos || 0;
    grouped[k].area += item.area || 0;
  });

  const result = Object.values(grouped).sort((a, b) => b.valor - a.valor);

  if (includeRank) {
    result.forEach((item, i) => item.rank = i + 1);
  }

  return result;
}

/**
 * Hook to apply filters and reaggregate data
 */
export function useFilteredData(data, filters) {
  return useMemo(() => {
    if (!data) return null;

    const { anoMin, anoMax, mesMin, mesMax, finalidade, programa, produto, municipio, ano, granularidade } = filters;

    // Effective year range (interactive ano filter narrows the range)
    const effectiveAnoMin = ano || anoMin;
    const effectiveAnoMax = ano || anoMax;

    // Filter granular data by period
    let filteredFinalidade = filterByPeriod(data.byFinalidade, effectiveAnoMin, effectiveAnoMax, mesMin, mesMax);
    let filteredPrograma = filterByPeriod(data.byPrograma, effectiveAnoMin, effectiveAnoMax, mesMin, mesMax);
    let filteredProduto = filterByPeriod(data.byProduto, effectiveAnoMin, effectiveAnoMax, mesMin, mesMax);
    let filteredMunicipio = filterByPeriod(data.byMunicipio, effectiveAnoMin, effectiveAnoMax, mesMin, mesMax);
    let filteredAno = filterByPeriod(data.byAno, effectiveAnoMin, effectiveAnoMax);
    let filteredMes = filterByPeriod(data.byMes, effectiveAnoMin, effectiveAnoMax, mesMin, mesMax);

    // Apply finalidade filter
    if (finalidade) {
      filteredFinalidade = filteredFinalidade.filter(d => d.finalidade === finalidade);
      filteredPrograma = filteredPrograma.filter(d => d.finalidade === finalidade);
      filteredProduto = filteredProduto.filter(d => d.finalidade === finalidade);
    }

    // Apply programa filter
    if (programa) {
      filteredFinalidade = filteredFinalidade.filter(d => d.programa === programa);
      filteredPrograma = filteredPrograma.filter(d => d.programa === programa);
      // Note: byProduto doesn't have programa field in source data
      filteredMunicipio = filteredMunicipio.filter(d => d.programa === programa);
    }

    // Apply produto filter
    if (produto) {
      filteredProduto = filteredProduto.filter(d => d.produto === produto);
      // Also filter finalidade/programa data if they have produto
      filteredFinalidade = filteredFinalidade.filter(d => !d.produto || d.produto === produto);
      filteredPrograma = filteredPrograma.filter(d => !d.produto || d.produto === produto);
    }

    // Apply municipio filter
    if (municipio) {
      filteredMunicipio = filteredMunicipio.filter(d => d.name === municipio || d.municipio === municipio);
    }

    // Reaggregate totals from filtered data
    const finalidadeTotals = aggregateByKey(filteredFinalidade, 'finalidade');
    const programaTotals = aggregateByKey(filteredPrograma, 'programa');
    const produtoTotals = aggregateByKey(filteredProduto, 'produto', true).slice(0, 50);
    const municipioTotals = aggregateByKey(filteredMunicipio, 'name', true);

    // Time series for charts
    let timeSeriesData = granularidade === 'mensal' ? filteredMes : filteredAno;
    // Apply filters to time series too
    if (finalidade) {
      timeSeriesData = timeSeriesData.filter(d => !d.finalidade || d.finalidade === finalidade);
    }

    // Filter bump data by year range
    let filteredBump = data.bump?.filter(d => {
      if (effectiveAnoMin && d.ano < effectiveAnoMin) return false;
      if (effectiveAnoMax && d.ano > effectiveAnoMax) return false;
      return true;
    }) || [];
    // Apply programa filter to bump
    if (programa) {
      filteredBump = filteredBump.filter(d => d.programa === programa);
    } else {
      // When no programa filter, aggregate values across programas and recalculate rankings
      const bumpByYearMunicipio = {};
      filteredBump.forEach(d => {
        const key = `${d.ano}_${d.id}`;
        if (!bumpByYearMunicipio[key]) {
          bumpByYearMunicipio[key] = { id: d.id, ano: d.ano, valor: 0 };
        }
        bumpByYearMunicipio[key].valor += d.valor || 0;
      });
      // Group by year and recalculate rankings
      const byYear = {};
      Object.values(bumpByYearMunicipio).forEach(d => {
        if (!byYear[d.ano]) byYear[d.ano] = [];
        byYear[d.ano].push(d);
      });
      // Sort each year and assign ranks
      filteredBump = [];
      Object.entries(byYear).forEach(([ano, items]) => {
        items.sort((a, b) => b.valor - a.valor);
        items.slice(0, 20).forEach((item, index) => {
          filteredBump.push({ ...item, rank: index + 1 });
        });
      });
    }
    // Apply municipio filter to bump
    if (municipio) {
      filteredBump = filteredBump.filter(d => d.name === municipio || d.municipio === municipio || d.id === municipio);
    }

    // Filter genero by period
    const filteredGenero = data.byGenero?.byAnoMes
      ? {
          ...data.byGenero,
          byAnoMes: filterByPeriod(data.byGenero.byAnoMes, effectiveAnoMin, effectiveAnoMax, mesMin, mesMax),
        }
      : data.byGenero;

    // Reaggregate genero totals
    let generoTotals = data.byGenero?.totals;
    if (filteredGenero?.byAnoMes?.length > 0) {
      const masc = filteredGenero.byAnoMes.filter(d => d.genero === 'masculino').reduce((s, d) => s + d.valor, 0);
      const fem = filteredGenero.byAnoMes.filter(d => d.genero === 'feminino').reduce((s, d) => s + d.valor, 0);
      generoTotals = { masculino: masc, feminino: fem };
    }

    // Build filtered Sankey data
    // Sankey structure: Programa (prog_*) -> Finalidade (fin_*) -> Produto (prod_*)
    let sankeyData = data.sankey;
    if (sankeyData && (programa || finalidade || produto)) {
      const nodes = sankeyData.nodes || [];
      const links = sankeyData.links || [];

      // Create lookup maps
      const nodeById = {};
      nodes.forEach(n => { nodeById[n.id] = n; });

      // Get node type from ID prefix
      const getNodeType = (nodeId) => {
        if (!nodeId) return null;
        if (nodeId.startsWith('prog_')) return 'programa';
        if (nodeId.startsWith('fin_')) return 'finalidade';
        if (nodeId.startsWith('prod_')) return 'produto';
        return null;
      };

      // First pass: identify which finalidades are connected to the selected programa
      const allowedFinalidades = new Set();
      if (programa) {
        links.forEach(link => {
          const sourceNode = nodeById[link.source];
          if (sourceNode && sourceNode.label === programa && getNodeType(link.target) === 'finalidade') {
            allowedFinalidades.add(link.target);
          }
        });
      }

      // Filter links
      const filteredLinks = links.filter(link => {
        if (link.value <= 0) return false;

        const sourceType = getNodeType(link.source);
        const targetType = getNodeType(link.target);
        const sourceNode = nodeById[link.source];
        const targetNode = nodeById[link.target];

        if (!sourceNode || !targetNode) return false;

        // Filter by programa
        if (programa) {
          // Programa -> Finalidade: source must be the selected programa
          if (sourceType === 'programa') {
            if (sourceNode.label !== programa) return false;
          }
          // Finalidade -> Produto: source finalidade must be connected to selected programa
          if (sourceType === 'finalidade' && targetType === 'produto') {
            if (!allowedFinalidades.has(link.source)) return false;
          }
        }

        // Filter by finalidade
        if (finalidade) {
          if (sourceType === 'finalidade' && sourceNode.label !== finalidade) return false;
          if (targetType === 'finalidade' && targetNode.label !== finalidade) return false;
        }

        // Filter by produto
        if (produto) {
          if (targetType === 'produto' && targetNode.label !== produto) return false;
        }

        return true;
      });

      // Collect used nodes
      const nodeSet = new Set();
      filteredLinks.forEach(link => {
        nodeSet.add(link.source);
        nodeSet.add(link.target);
      });

      const usedNodes = nodes.filter(n => nodeSet.has(n.id));

      if (filteredLinks.length > 0) {
        sankeyData = { nodes: usedNodes, links: filteredLinks };
      }
    }

    return {
      metadata: data.metadata,
      filters: data.filters,
      // Filtered granular data
      byFinalidade: filteredFinalidade,
      byPrograma: filteredPrograma,
      byProduto: filteredProduto,
      byMunicipio: filteredMunicipio,
      byAno: filteredAno,
      byMes: filteredMes,
      // Reaggregated totals
      finalidadeTotals,
      programaTotals,
      produtoTotals,
      municipioTotals,
      // Other
      byGenero: generoTotals,
      timeseries: timeSeriesData,
      bump: filteredBump,
      sankey: sankeyData,
      forecasts: data.forecasts,
    };
  }, [data, filters]);
}

/**
 * Hook to calculate KPI totals from filtered data
 */
export function useAggregations(filteredData, filters) {
  return useMemo(() => {
    if (!filteredData) return null;

    const { anoMin, anoMax, programa, finalidade } = filters;

    // Use byFinalidade data which is already filtered by programa/finalidade
    const sourceData = filteredData.byFinalidade || [];

    // Calculate totals from filtered finalidade data
    const totals = sourceData.reduce((acc, item) => ({
      valor: (acc.valor || 0) + (item.valor || 0),
      contratos: (acc.contratos || 0) + (item.contratos || 0),
      area: (acc.area || 0) + (item.area || 0),
    }), {});

    // For area, use municipio totals if no programa/finalidade filter
    if (!programa && !finalidade && filteredData.municipioTotals?.length > 0) {
      totals.area = filteredData.municipioTotals.reduce((sum, m) => sum + (m.area || 0), 0);
    }

    // YoY change - aggregate by year first
    const byYear = {};
    sourceData.forEach(item => {
      if (!byYear[item.ano]) byYear[item.ano] = { valor: 0 };
      byYear[item.ano].valor += item.valor || 0;
    });

    const currentYear = anoMax || new Date().getFullYear();
    const prevYear = currentYear - 1;

    let yoyChange = null;
    if (byYear[currentYear]?.valor && byYear[prevYear]?.valor) {
      yoyChange = ((byYear[currentYear].valor - byYear[prevYear].valor) / byYear[prevYear].valor) * 100;
    }

    const valorMedio = totals.contratos > 0 ? totals.valor / totals.contratos : 0;

    return {
      totals: {
        ...totals,
        valorMedio,
        yoyChange,
      },
    };
  }, [filteredData, filters]);
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
