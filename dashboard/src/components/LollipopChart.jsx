import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { formatCurrency, formatNumber } from '../utils/format';

export default function LollipopChart({
  data,
  title,
  valueKey = 'valor',
  labelKey = 'produto',
  limit = 15,
  color = '#2563eb',
  formatType = 'currency', // 'currency', 'number', or 'area'
  onClick,
  selectedValue,
}) {
  // Determine format function based on valueKey or explicit formatType
  const formatValue = useMemo(() => {
    if (formatType === 'number' || valueKey === 'contratos') {
      return (v) => formatNumber(v);
    }
    if (formatType === 'area' || valueKey === 'area') {
      return (v) => `${formatNumber(v)} ha`;
    }
    return (v) => formatCurrency(v, true);
  }, [formatType, valueKey]);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data
      .filter(d => d[valueKey] > 0)
      .sort((a, b) => b[valueKey] - a[valueKey])
      .slice(0, limit)
      .map(d => ({
        label: d[labelKey] || 'N/D',
        value: d[valueKey],
        ...d,
      }));
  }, [data, valueKey, labelKey, limit]);

  useEffect(() => {
    if (!chartData.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 90, bottom: 20, left: 180 };
    const width = svgRef.current.clientWidth || 500;
    const height = Math.max(300, chartData.length * 32);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.value) * 1.1])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(chartData.map(d => d.label))
      .range([0, innerHeight])
      .padding(0.3);

    const tooltip = d3.select(tooltipRef.current);

    // Lines
    g.selectAll('.lollipop-line')
      .data(chartData)
      .join('line')
      .attr('class', 'lollipop-line')
      .attr('x1', 0)
      .attr('x2', d => xScale(d.value))
      .attr('y1', d => yScale(d.label) + yScale.bandwidth() / 2)
      .attr('y2', d => yScale(d.label) + yScale.bandwidth() / 2)
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Circles
    g.selectAll('.lollipop-circle')
      .data(chartData)
      .join('circle')
      .attr('class', 'lollipop-circle')
      .attr('cx', d => xScale(d.value))
      .attr('cy', d => yScale(d.label) + yScale.bandwidth() / 2)
      .attr('r', d => selectedValue === d.label ? 8 : 6)
      .attr('fill', d => selectedValue === d.label ? d3.color(color).darker(0.3) : color)
      .attr('stroke', d => selectedValue === d.label ? '#1e293b' : 'none')
      .attr('stroke-width', 2)
      .style('cursor', onClick ? 'pointer' : 'default')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 8);
        tooltip
          .style('opacity', 1)
          .html(`
            <div class="font-medium">${d.label}</div>
            <div class="text-sm mt-1">${formatValue(d.value)}</div>
            ${d.valor && valueKey !== 'valor' ? `<div class="text-xs text-dark-500">${formatCurrency(d.valor, true)}</div>` : ''}
            ${d.contratos && valueKey !== 'contratos' ? `<div class="text-xs text-dark-500">${d.contratos.toLocaleString('pt-BR')} contratos</div>` : ''}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('r', selectedValue === d.label ? 8 : 6);
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d) {
        if (onClick) onClick(d.label);
      });

    // Y axis (labels)
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .select('.domain').remove();

    g.selectAll('.tick text')
      .attr('font-size', '11px')
      .attr('fill', '#475569')
      .each(function() {
        const text = d3.select(this);
        const label = text.text();
        if (label.length > 25) {
          text.text(label.slice(0, 22) + '...');
        }
      });

    // Value labels
    g.selectAll('.value-label')
      .data(chartData)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.value) + 12)
      .attr('y', d => yScale(d.label) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .text(d => formatValue(d.value));

  }, [chartData, color, formatValue, onClick, selectedValue]);

  if (!chartData.length) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="h-64 flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg">
          Sem dados disponiveis
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
      <div className="relative overflow-x-auto">
        <svg ref={svgRef} className="w-full" style={{ minHeight: `${chartData.length * 32 + 40}px` }} />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-white rounded-lg shadow-lg border border-dark-200 p-3 opacity-0 transition-opacity z-50"
          style={{ position: 'fixed' }}
        />
      </div>
    </div>
  );
}
