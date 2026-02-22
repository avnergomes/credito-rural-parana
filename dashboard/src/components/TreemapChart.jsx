import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { formatCurrency } from '../utils/format';

const COLORS = {
  'PRONAF': '#8b5cf6',
  'PRONAMP': '#06b6d4',
  'DEMAIS': '#f97316',
  'CUSTEIO': '#2563eb',
  'INVESTIMENTO': '#16a34a',
  'COMERCIALIZACAO': '#f59e0b',
};

export default function TreemapChart({ data, title, onProgramaClick, onFinalidadeClick, selectedPrograma, selectedFinalidade }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const hierarchyData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Build hierarchy: root > programa > finalidade
    const grouped = {};

    data.forEach(item => {
      const programa = item.programa || 'Outros';
      const finalidade = item.finalidade || 'Outros';
      const valor = item.valor || 0;

      if (!grouped[programa]) {
        grouped[programa] = {};
      }
      if (!grouped[programa][finalidade]) {
        grouped[programa][finalidade] = 0;
      }
      grouped[programa][finalidade] += valor;
    });

    const children = Object.entries(grouped).map(([programa, finalidades]) => ({
      name: programa,
      children: Object.entries(finalidades).map(([finalidade, value]) => ({
        name: finalidade,
        value,
        programa,
      })),
    }));

    return {
      name: 'Credito Rural',
      children,
    };
  }, [data]);

  useEffect(() => {
    if (!hierarchyData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = 400;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true)(root);

    const tooltip = d3.select(tooltipRef.current);

    // Create groups for each leaf
    const leaf = svg.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    leaf.append('rect')
      .attr('fill', d => {
        const color = COLORS[d.data.programa] || COLORS[d.data.name] || '#94a3b8';
        return d3.color(color).brighter(d.depth * 0.3);
      })
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('rx', 4)
      .attr('opacity', d => {
        const isSelected = (selectedPrograma && d.data.programa === selectedPrograma) ||
                          (selectedFinalidade && d.data.name === selectedFinalidade);
        return isSelected ? 1 : 0.85;
      })
      .attr('stroke', d => {
        const isSelected = (selectedPrograma && d.data.programa === selectedPrograma) ||
                          (selectedFinalidade && d.data.name === selectedFinalidade);
        return isSelected ? '#1e293b' : 'none';
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        tooltip
          .style('opacity', 1)
          .html(`
            <div class="font-medium">${d.data.programa || ''}</div>
            <div class="text-sm">${d.data.name}</div>
            <div class="text-sm font-semibold mt-1">${formatCurrency(d.value, true)}</div>
            <div class="text-xs text-dark-500 mt-1">Clique para filtrar</div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        const isSelected = (selectedPrograma && d.data.programa === selectedPrograma) ||
                          (selectedFinalidade && d.data.name === selectedFinalidade);
        d3.select(this).attr('opacity', isSelected ? 1 : 0.85);
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d) {
        // Click on finalidade (leaf) filters by finalidade, Shift+click filters by programa
        if (event.shiftKey && onProgramaClick && d.data.programa) {
          onProgramaClick(d.data.programa);
        } else if (onFinalidadeClick && d.data.name) {
          onFinalidadeClick(d.data.name);
        }
      });

    // Add labels
    leaf.append('text')
      .attr('x', 6)
      .attr('y', 18)
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(d => {
        const width = d.x1 - d.x0;
        if (width < 50) return '';
        return d.data.name.length > 15 ? d.data.name.slice(0, 12) + '...' : d.data.name;
      });

    // Add value labels
    leaf.append('text')
      .attr('x', 6)
      .attr('y', 32)
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '10px')
      .text(d => {
        const width = d.x1 - d.x0;
        if (width < 60) return '';
        return formatCurrency(d.value, true);
      });

  }, [hierarchyData, onProgramaClick, onFinalidadeClick, selectedPrograma, selectedFinalidade]);

  if (!hierarchyData) {
    return (
      <div className="chart-container h-full">
        <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg" style={{ height: '400px' }}>
          Dados insuficientes para o treemap
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container h-full">
      <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
      <div className="relative">
        <svg ref={svgRef} className="w-full" style={{ height: '400px' }} />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-white rounded-lg shadow-lg border border-dark-200 p-3 opacity-0 transition-opacity z-50"
          style={{ position: 'fixed' }}
        />
      </div>
    </div>
  );
}
