// ATLAS-A11Y-HEX-SWEPT
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import * as d3 from 'd3';
import { formatCurrency, formatNumber } from '../utils/format';
import { useGeoJSON } from '../hooks/useData';
import 'leaflet/dist/leaflet.css';

// Dispositivos sem hover (celular/tablet): o tap abre um popup com os
// valores em vez de aplicar o filtro direto, e o arraste de um dedo fica
// com a pagina (nao com o mapa).
const IS_TOUCH = typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: none)').matches;

// Monta o conteudo do popup (toque) com nome, valores e botao "Filtrar
// painel". Construido via DOM (textContent) para evitar injecao de HTML.
function buildPopupContent(name, itemData, onFilter) {
  const root = document.createElement('div');
  root.style.cssText = 'font:13px/1.5 "IBM Plex Sans",system-ui,sans-serif;color:#1e293b;min-width:150px';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;margin-bottom:4px';
  title.textContent = name || '';
  root.appendChild(title);

  const addRow = (label, value) => {
    const row = document.createElement('div');
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('span');
    v.textContent = ` ${value}`;
    row.appendChild(l);
    row.appendChild(v);
    root.appendChild(row);
  };

  if (itemData) {
    if (itemData.valor !== undefined) addRow('Valor:', formatCurrency(itemData.valor, true));
    if (itemData.contratos !== undefined) addRow('Contratos:', formatNumber(itemData.contratos));
    if (itemData.area !== undefined) addRow('Área:', `${formatNumber(itemData.area)} ha`);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Filtrar painel';
    btn.style.cssText = 'margin-top:8px;padding:6px 12px;border:0;border-radius:6px;background:#0072B2;color:#fff;font-size:12px;font-weight:600;cursor:pointer';
    btn.onclick = onFilter;
    root.appendChild(btn);
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#64748b';
    empty.textContent = 'Sem dados para os filtros atuais';
    root.appendChild(empty);
  }

  return root;
}

// Color scale
const COLOR_SCALE = [
  '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1',
  '#6baed6', '#4292c6', '#2171b5', '#084594'
];

function MapLegend({ scale, metric }) {
  if (!scale) return null;

  const range = scale.range();

  // Formatador por métrica (antes tudo era exibido como R$)
  const formatValue = (v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '-';
    if (metric === 'contratos') return formatNumber(v, true);
    if (metric === 'area') return `${formatNumber(v, true)} ha`;
    return formatCurrency(v, true);
  };

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
      <div className="text-xs font-medium text-dark-700 mb-2">
        {metric === 'valor' ? 'Valor (R$)' :
         metric === 'contratos' ? 'Contratos' :
         metric === 'area' ? 'Área (ha)' : 'Valor'}
      </div>
      <div className="flex flex-col gap-1">
        {range.map((color, i) => {
          // invertExtent devolve o intervalo real de cada cor do quantize
          const [v0, v1] = scale.invertExtent(color);
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-4 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-dark-600">
                {formatValue(v0)} – {formatValue(v1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

export default function MapChart({
  data,
  title,
  metric = 'valor',
  onMetricChange,
  onMunicipioClick,
  selectedMunicipio,
}) {
  const { geoJSON, loading: geoLoading, retry: retryGeo } = useGeoJSON();
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [localMetric, setLocalMetric] = useState(metric);
  const mapRef = useRef(null);

  const activeMetric = onMetricChange ? metric : localMetric;

  // Create lookup from data
  const dataLookup = useMemo(() => {
    if (!data || !Array.isArray(data)) return {};

    const lookup = {};
    data.forEach(item => {
      // Support multiple code field names
      const code = item.codIbge || item.codMunic || item.cod_ibge;
      const name = item.name || item.municipio;
      if (code) {
        const code6 = String(code).slice(0, 6);
        const code7 = String(code);
        lookup[code6] = item;
        lookup[code7] = item;
      }
      if (name) {
        lookup[name.toUpperCase()] = item;
      }
    });
    return lookup;
  }, [data]);

  // Create color scale
  const colorScale = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const values = data.map(d => d[activeMetric] || 0).filter(v => v > 0);
    if (values.length === 0) return null;

    const quantiles = d3.scaleQuantize()
      .domain([d3.min(values), d3.max(values)])
      .range(COLOR_SCALE);

    return quantiles;
  }, [data, activeMetric]);

  // Style function for GeoJSON features
  const getStyle = (feature) => {
    const code = feature.properties?.CodIbge || feature.properties?.CD_MUN || feature.properties?.cod_ibge || feature.properties?.codarea;
    const name = feature.properties?.Municipio || feature.properties?.NM_MUN || feature.properties?.nome;
    const code6 = String(code).slice(0, 6);

    const itemData = dataLookup[code6] || dataLookup[code] || (name ? dataLookup[name.toUpperCase()] : null);
    const value = itemData?.[activeMetric] || 0;

    const isSelected = selectedMunicipio &&
      (itemData?.municipio === selectedMunicipio || code === selectedMunicipio);

    return {
      fillColor: value > 0 && colorScale ? colorScale(value) : '#f1f5f9',
      weight: isSelected ? 2 : 0.5,
      opacity: 1,
      color: isSelected ? '#2563eb' : '#918058',
      fillOpacity: isSelected ? 0.9 : 0.7,
    };
  };

  // Event handlers for features
  const onEachFeature = (feature, layer) => {
    const code = feature.properties?.CodIbge || feature.properties?.CD_MUN || feature.properties?.cod_ibge || feature.properties?.codarea;
    const code6 = String(code).slice(0, 6);
    const name = feature.properties?.Municipio || feature.properties?.NM_MUN || feature.properties?.nome || feature.properties?.name;

    const itemData = dataLookup[code6] || dataLookup[code];

    layer.on({
      mouseover: (e) => {
        setHoveredFeature({
          name,
          ...itemData,
        });
        e.target.setStyle({
          weight: 2,
          color: '#2563eb',
          fillOpacity: 0.9,
        });
      },
      mouseout: (e) => {
        setHoveredFeature(null);
        e.target.setStyle(getStyle(feature));
      },
      click: (e) => {
        if (IS_TOUCH) {
          // Em touch nao existe mouseover: o tap mostra os valores num
          // popup e o filtro so aplica pelo botao explicito.
          const content = buildPopupContent(name, itemData, () => {
            if (onMunicipioClick && itemData) {
              onMunicipioClick(itemData.municipio || name);
            }
            e.target.closePopup();
          });
          e.target.bindPopup(content, { maxWidth: 220 }).openPopup(e.latlng);
          return;
        }
        if (onMunicipioClick && itemData) {
          onMunicipioClick(itemData.municipio || name);
        }
      },
    });
  };

  if (geoLoading) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="h-96 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          Carregando mapa...
        </div>
      </div>
    );
  }

  if (!geoJSON) {
    // Falha ao baixar a malha municipal (CDN externa pode estar bloqueada):
    // erro localizado dentro da caixa do mapa, com refetch sem recarregar.
    return (
      <div className="chart-container">
        <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-dark-500 bg-dark-50 rounded-lg px-6 text-center">
          <p>Não foi possível carregar o mapa. Verifique sua conexão e tente novamente.</p>
          <button
            type="button"
            onClick={retryGeo}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-800">{title}</h3>

        <div className="flex items-center gap-2">
          <label className="text-xs text-dark-500">Colorir por:</label>
          <select
            value={activeMetric}
            onChange={(e) => {
              if (onMetricChange) {
                onMetricChange(e.target.value);
              } else {
                setLocalMetric(e.target.value);
              }
            }}
            className="text-xs px-2 py-1 bg-dark-50 border border-dark-200 rounded cursor-pointer"
          >
            <option value="valor">Valor</option>
            <option value="contratos">Contratos</option>
            <option value="area">Área</option>
          </select>
        </div>
      </div>

      <div className="relative h-96 rounded-lg overflow-hidden">
        <MapContainer
          ref={mapRef}
          center={[-24.5, -51.5]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          dragging={!IS_TOUCH}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />

          {geoJSON && (
            <GeoJSON
              data={geoJSON}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}

          <MapController center={[-24.5, -51.5]} zoom={7} />
        </MapContainer>

        <MapLegend scale={colorScale} metric={activeMetric} />

        {/* Tooltip */}
        {hoveredFeature && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-xs">
            <div className="font-medium text-dark-800">{hoveredFeature.name}</div>
            {hoveredFeature.valor !== undefined && (
              <div className="text-sm text-dark-600 mt-1">
                Valor: {formatCurrency(hoveredFeature.valor, true)}
              </div>
            )}
            {hoveredFeature.contratos !== undefined && (
              <div className="text-sm text-dark-600">
                Contratos: {formatNumber(hoveredFeature.contratos)}
              </div>
            )}
            {hoveredFeature.area !== undefined && (
              <div className="text-sm text-dark-600">
                Área: {formatNumber(hoveredFeature.area)} ha
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
