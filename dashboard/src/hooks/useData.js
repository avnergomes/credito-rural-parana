import { useState, useEffect, useMemo, useCallback } from 'react';
import { feature } from 'topojson-client';

const BASE_URL = import.meta.env.BASE_URL || '/credito-rural-parana/';
// Malha municipal reduzida self-hosted (mesmas propriedades e object key
// 'municipalities'); o CDN do jsdelivr fica como fallback para redes que
// bloqueiem o dominio self-hosted.
const TOPO_URL = 'https://datageoparana.github.io/assets/parana-municipalities.min.topojson';
const TOPO_URL_FALLBACK = 'https://cdn.jsdelivr.net/gh/datageoparana/datageoparana.github.io@main/assets/parana-municipalities.topojson';

/**
 * Busca o TopoJSON municipal tentando primeiro a malha self-hosted e, em
 * qualquer falha (rede ou status != ok), o fallback no CDN antes de propagar
 * o erro. Aborto (AbortController) propaga sem acionar o fallback.
 * Retorna uma Response com status ok; caso contrario lanca o mesmo erro
 * 'Falha ao carregar GeoJSON' usado no restante do fluxo.
 */
async function fetchTopo(signal) {
  try {
    const res = await fetch(TOPO_URL, { signal });
    if (res.ok) return res;
    // Primary respondeu com status de erro: cai para o fallback abaixo.
  } catch (err) {
    // Aborto deve propagar, nao acionar o fallback.
    if (err.name === 'AbortError') throw err;
    // Outras falhas de rede: tenta o fallback abaixo.
  }
  const fallbackRes = await fetch(TOPO_URL_FALLBACK, { signal });
  if (!fallbackRes.ok) throw new Error('Falha ao carregar GeoJSON');
  return fallbackRes;
}

/**
 * Reads a fetch Response streaming the body, reporting progress in bytes.
 * Falls back to res.json() when ReadableStream is not supported.
 */
async function readJsonWithProgress(res, onProgress) {
  if (!res.body || typeof res.body.getReader !== 'function') {
    return res.json();
  }
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  let lastReported = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    // Throttle updates to every ~512 KB to avoid excessive re-renders
    if (onProgress && received - lastReported > 512 * 1024) {
      lastReported = received;
      onProgress(received);
    }
  }
  if (onProgress) onProgress(received);
  const text = await new Blob(chunks).text();
  return JSON.parse(text);
}

/**
 * Hook to load all dashboard data
 */
export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        const aggregatedRes = await fetch(`${BASE_URL}data/aggregated.json`, { signal });
        if (!aggregatedRes.ok) throw new Error('Falha ao carregar dados agregados');
        const aggregated = await readJsonWithProgress(aggregatedRes, (bytes) => {
          if (!signal.aborted) setProgress(bytes);
        });

        let forecasts = null;
        try {
          const forecastsRes = await fetch(`${BASE_URL}data/forecasts.json`, { signal });
          if (forecastsRes.ok) {
            forecasts = await forecastsRes.json();
          }
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('Forecasts not available:', e);
        }

        if (!signal.aborted) {
          setData({ ...aggregated, forecasts });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error loading data:', err);
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [attempt]);

  return { data, loading, error, progress, retry };
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
  const [attempt, setAttempt] = useState(0);

  // Refaz o fetch do TopoJSON sem recarregar a pagina (CDN pode falhar
  // em redes que bloqueiam cdn.jsdelivr.net).
  const retry = useCallback(() => setAttempt(a => a + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadGeoJSON() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchTopo(signal);
        const topo = await res.json();
        const data = feature(topo, topo.objects.municipalities);
        if (!signal.aborted) {
          setGeoJSON(data);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error loading GeoJSON:', err);
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }
    loadGeoJSON();
    return () => controller.abort();
  }, [attempt]);

  return { geoJSON, loading, error, retry };
}
