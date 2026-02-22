import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import * as d3 from 'd3';
import { formatCurrency, formatNumber } from '../utils/format';
import { useGeoJSON } from '../hooks/useData';
import 'leaflet/dist/leaflet.css';

// Color scale
const COLOR_SCALE = [
  '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1',
  '#6baed6', '#4292c6', '#2171b5', '#084594'
];

function MapLegend({ scale, metric }) {
  if (!scale) return null;

  const domain = scale.domain();
  const range = scale.range();

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
      <div className="text-xs font-medium text-dark-700 mb-2">
        {metric === 'valor' ? 'Valor (R$)' :
         metric === 'contratos' ? 'Contratos' :
         metric === 'area' ? 'Area (ha)' : 'Valor'}
      </div>
      <div className="flex flex-col gap-1">
        {range.map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-4 h-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-dark-600">
              {formatCurrency(domain[i], true)}
            </span>
          </div>
        ))}
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
  const { geoJSON, loading: geoLoading } = useGeoJSON();
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
      color: isSelected ? '#2563eb' : '#94a3b8',
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
      click: () => {
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
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="h-96 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          GeoJSON nao disponivel
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
            <option value="area">Area</option>
          </select>
        </div>
      </div>

      <div className="relative h-96 rounded-lg overflow-hidden">
        <MapContainer
          ref={mapRef}
          center={[-24.5, -51.5]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
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
                Area: {formatNumber(hoveredFeature.area)} ha
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
