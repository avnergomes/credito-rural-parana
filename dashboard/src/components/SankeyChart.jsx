import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { formatCurrency } from '../utils/format';

const COLORS = {
  // Programas
  'PRONAF': '#8b5cf6',
  'PRONAMP': '#06b6d4',
  'DEMAIS': '#f97316',
  // Finalidades
  'CUSTEIO': '#2563eb',
  'INVESTIMENTO': '#16a34a',
  'COMERCIALIZACAO': '#f59e0b',
  // Default
  'default': '#94a3b8',
};

const PROGRAMAS = ['PRONAF', 'PRONAMP', 'DEMAIS'];
const FINALIDADES = ['CUSTEIO', 'INVESTIMENTO', 'COMERCIALIZACAO', 'INDUSTRIALIZACAO'];

const truncateLabel = (label, maxLength = 22) => {
  if (!label) return '';
  // Don't truncate programas or finalidades - they're short
  if (PROGRAMAS.includes(label) || FINALIDADES.includes(label)) return label;
  return label.length > maxLength ? label.slice(0, maxLength - 1) + '…' : label;
};

export default function SankeyChart({ data, title, filterNote, onNodeClick }) {
  // Create a lookup map for full labels (Nivo transforms nodes internally)
  const labelMap = useMemo(() => {
    if (!data?.nodes) return {};
    const map = {};
    data.nodes.forEach(node => {
      map[node.id] = node.label;
    });
    return map;
  }, [data]);

  const sankeyData = useMemo(() => {
    if (!data?.nodes?.length || !data?.links?.length) {
      return null;
    }

    // Add colors to nodes
    const nodes = data.nodes.map(node => ({
      ...node,
      nodeColor: COLORS[node.label] || COLORS.default,
    }));

    // Filter out zero-value links
    const links = data.links.filter(link => link.value > 0);

    return { nodes, links };
  }, [data]);

  if (!sankeyData) {
    return (
      <div className="chart-container">
        <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center text-dark-400 bg-dark-50 rounded-lg" style={{ height: '480px' }}>
          Dados insuficientes para o grafico Sankey
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-800">{title}</h3>
        {filterNote && (
          <span className="text-xs text-dark-500 bg-dark-100 px-2 py-1 rounded">
            {filterNote}
          </span>
        )}
      </div>

      <div style={{ height: '480px' }}>
        <ResponsiveSankey
          data={sankeyData}
          margin={{ top: 20, right: 200, bottom: 20, left: 100 }}
          align="justify"
          colors={(node) => node.nodeColor || COLORS.default}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={20}
          nodeSpacing={24}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={16}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
          label={(node) => truncateLabel(node.label, 26)}
          onClick={(node) => {
            if (onNodeClick && node.id) {
              // Determine the type based on node structure or label
              const label = node.label || node.id;
              const type = node.type ||
                (COLORS[label] && ['PRONAF', 'PRONAMP', 'DEMAIS'].includes(label) ? 'programa' :
                 ['CUSTEIO', 'INVESTIMENTO', 'COMERCIALIZACAO'].includes(label) ? 'finalidade' : 'produto');
              onNodeClick(type, label);
            }
          }}
          tooltip={({ node }) => {
            const fullLabel = labelMap[node.id] || node.label;
            const nodeType = PROGRAMAS.includes(fullLabel) ? 'Programa' :
                            FINALIDADES.includes(fullLabel) ? 'Finalidade' : 'Produto';
            return (
              <div className="bg-white rounded-lg shadow-lg border border-dark-200 p-3 max-w-sm">
                <div className="text-xs text-dark-500 mb-1">{nodeType}</div>
                <div className="font-medium text-dark-800 break-words">{fullLabel}</div>
                <div className="text-sm text-dark-600 mt-1">
                  {formatCurrency(node.value, true)}
                </div>
                <div className="text-xs text-dark-400 mt-2">Clique para filtrar</div>
              </div>
            );
          }}
          linkTooltip={({ link }) => {
            const sourceLabel = labelMap[link.source.id] || link.source.label;
            const targetLabel = labelMap[link.target.id] || link.target.label;
            return (
              <div className="bg-white rounded-lg shadow-lg border border-dark-200 p-3 max-w-sm">
                <div className="font-medium text-dark-800 mb-1 break-words">
                  {sourceLabel}
                </div>
                <div className="text-dark-500 text-sm">↓</div>
                <div className="font-medium text-dark-800 mt-1 break-words">
                  {targetLabel}
                </div>
                <div className="text-sm text-dark-600 mt-2 pt-2 border-t border-dark-100">
                  {formatCurrency(link.value, true)}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
