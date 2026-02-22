import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { formatCurrency } from '../utils/format';

const COLORS = [
  '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#a855f7', '#0ea5e9', '#f43f5e', '#22c55e',
  '#eab308', '#3b82f6', '#10b981', '#f472b6', '#facc15',
];

export default function BumpChart({ data, title, limit = 20, onEntityClick, selectedEntity }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const { chartData, years, entities } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { chartData: [], years: [], entities: [] };
    }

    // Get unique years and sort
    const yearsSet = new Set(data.map(d => d.ano));
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    // Get unique entities (municipalities) with their total value
    const entityTotals = {};
    data.forEach(d => {
      const key = d.id || d.municipio || d.produto || d.name;
      if (!entityTotals[key]) {
        entityTotals[key] = 0;
      }
      entityTotals[key] += d.valor || 0;
    });

    // Get top N entities
    const topEntities = Object.entries(entityTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);

    // Build chart data with rankings per year
    const chartData = [];
    years.forEach(year => {
      const yearData = data.filter(d => d.ano === year);
      const sorted = yearData.sort((a, b) => (b.valor || 0) - (a.valor || 0));

      sorted.forEach((d, index) => {
        const name = d.id || d.municipio || d.produto || d.name;
        if (topEntities.includes(name)) {
          chartData.push({
            year,
            name,
            rank: index + 1,
            valor: d.valor || 0,
          });
        }
      });
    });

    return { chartData, years, entities: topEntities };
  }, [data, limit]);

  useEffect(() => {
    if (!chartData.length || !svgRef.current || !entities.length || !years.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 150, bottom: 30, left: 50 };
    const width = svgRef.current.clientWidth || 800;
    const height = Math.max(400, entities.length * 25);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);

    // Scales
    const xScale = d3.scalePoint()
      .domain(years)
      .range([0, innerWidth]);

    const maxRank = Math.max(1, Math.min(limit, entities.length));
    const yScale = d3.scaleLinear()
      .domain([1, maxRank])
      .range([0, innerHeight]);

    const colorScale = d3.scaleOrdinal()
      .domain(entities)
      .range(COLORS);

    // Draw lines for each entity
    entities.forEach((entity, entityIndex) => {
      const entityData = chartData
        .filter(d => d.name === entity)
        .sort((a, b) => a.year - b.year);

      if (entityData.length < 2) return;

      const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.rank))
        .curve(d3.curveMonotoneX);

      const isSelected = selectedEntity === entity;

      g.append('path')
        .datum(entityData)
        .attr('fill', 'none')
        .attr('stroke', colorScale(entity))
        .attr('stroke-width', isSelected ? 4 : 2.5)
        .attr('stroke-linecap', 'round')
        .attr('opacity', isSelected ? 1 : (selectedEntity ? 0.3 : 0.7))
        .attr('d', line);

      // Draw circles at each point (use index instead of name to avoid CSS selector issues)
      g.selectAll(`.point-entity-${entityIndex}`)
        .data(entityData)
        .join('circle')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.rank))
        .attr('r', isSelected ? 7 : 5)
        .attr('fill', colorScale(entity))
        .attr('stroke', isSelected ? '#1e293b' : 'white')
        .attr('stroke-width', isSelected ? 3 : 2)
        .attr('opacity', isSelected ? 1 : (selectedEntity ? 0.4 : 1))
        .style('cursor', onEntityClick ? 'pointer' : 'default')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 7);
          tooltip
            .style('opacity', 1)
            .html(`
              <div class="font-medium">${d.name}</div>
              <div class="text-sm">Ano: ${d.year}</div>
              <div class="text-sm">Ranking: ${d.rank}º</div>
              <div class="text-sm font-semibold mt-1">${formatCurrency(d.valor, true)}</div>
              ${onEntityClick ? '<div class="text-xs text-dark-400 mt-1">Clique para filtrar</div>' : ''}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', isSelected ? 7 : 5);
          tooltip.style('opacity', 0);
        })
        .on('click', function(event, d) {
          if (onEntityClick) onEntityClick(d.name);
        });
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight + 10})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
      .select('.domain').remove();

    // Y axis (rank labels)
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(Math.min(limit, entities.length)).tickFormat(d => `${d}º`))
      .select('.domain').remove();

    // Legend (right side with latest ranking)
    const latestYear = years[years.length - 1];
    const latestData = chartData
      .filter(d => d.year === latestYear)
      .sort((a, b) => a.rank - b.rank);

    g.selectAll('.legend-text')
      .data(latestData)
      .join('text')
      .attr('x', innerWidth + 10)
      .attr('y', d => yScale(d.rank))
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', d => colorScale(d.name))
      .text(d => d.name.length > 18 ? d.name.slice(0, 15) + '...' : d.name);

  }, [chartData, years, entities, onEntityClick, selectedEntity]);

  if (!chartData.length) {
    return (
      <div className="chart-container">
        <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
        <div className="h-96 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          Dados insuficientes para o bump chart
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
      <div className="relative overflow-x-auto">
        <svg ref={svgRef} className="w-full" style={{ minHeight: '400px' }} />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-white rounded-lg shadow-lg border border-dark-200 p-3 opacity-0 transition-opacity z-50"
          style={{ position: 'fixed' }}
        />
      </div>
    </div>
  );
}
