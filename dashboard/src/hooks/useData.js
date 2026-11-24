import { useState, useEffect, useCallback } from 'react';
import { buildCube } from '../data/cube';
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

async function getJson(url, signal, onBytes) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Falha ao carregar ${url.split('/').pop()} (HTTP ${res.status})`);
  return readJsonWithProgress(res, onBytes);
}

/**
 * Carrega o cubo de microdados: série estadual (aggregated.json), dicionários,
 * uma tabela fato por ano (em paralelo) e o recorte de perfil.
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
    const bytes = {};
    const track = (name) => (b) => {
      bytes[name] = b;
      if (!signal.aborted) setProgress(Object.values(bytes).reduce((s, v) => s + v, 0));
    };

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        const base = `${BASE_URL}data/`;
        const [serie, dims, perfil] = await Promise.all([
          getJson(`${base}aggregated.json`, signal, track('serie')),
          getJson(`${base}cubo/dims.json`, signal, track('dims')),
          getJson(`${base}cubo/perfil.json`, signal, track('perfil')),
        ]);
        const fatos = await Promise.all(dims.anos.map(async (ano) => ({
          ano,
          cols: await getJson(`${base}cubo/fato_${ano}.json`, signal, track(ano)),
        })));

        let forecasts = null;
        try {
          const forecastsRes = await fetch(`${base}forecasts.json`, { signal });
          if (forecastsRes.ok) forecasts = await forecastsRes.json();
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('Previsões indisponíveis:', e);
        }

        if (!signal.aborted) {
          setData({ ...serie, cube: buildCube(dims, fatos), perfil, forecasts });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Erro ao carregar dados:', err);
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [attempt]);

  return { data, loading, error, progress, retry };
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
