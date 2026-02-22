import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { formatCurrency, formatPercent } from '../utils/format';

const GENDER_COLORS = { 'Masculino': '#3b82f6', 'Feminino': '#ec4899' };
const PERSON_COLORS = { 'Pessoa Fisica': '#22c55e', 'Pessoa Juridica': '#f59e0b' };

export default function DistributionCharts({ genero, tipoPessoa }) {
  const generoData = genero ? [
    { name: 'Masculino', value: genero.masculino || 0 },
    { name: 'Feminino', value: genero.feminino || 0 },
  ].filter(d => d.value > 0) : [];

  const tipoPessoaData = tipoPessoa ? [
    { name: 'Pessoa Fisica', value: tipoPessoa.pf || 0 },
    { name: 'Pessoa Juridica', value: tipoPessoa.pj || 0 },
  ].filter(d => d.value > 0) : [];

  const hasGenero = generoData.length > 0;
  const hasTipoPessoa = tipoPessoaData.length > 0;

  if (!hasGenero && !hasTipoPessoa) {
    return null;
  }

  const renderBarChart = (data, colors) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const dataWithPercent = data.map(d => ({
      ...d,
      percent: ((d.value / total) * 100).toFixed(1)
    }));

    return (
      <div style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dataWithPercent}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 90, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
              width={85}
            />
            <Tooltip
              formatter={(value, name, props) => [
                `${formatCurrency(value, true)} (${props.payload.percent}%)`,
                'Valor'
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              barSize={32}
            >
              {dataWithPercent.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[entry.name] || '#94a3b8'}
                />
              ))}
              <LabelList
                dataKey="percent"
                position="right"
                formatter={(v) => `${v}%`}
                style={{ fontSize: 12, fill: '#64748b' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const title = hasGenero && hasTipoPessoa
    ? 'Distribuicao por Genero e Tipo de Pessoa'
    : hasGenero
      ? 'Distribuicao por Genero'
      : 'Distribuicao por Tipo de Pessoa';

  return (
    <div className="chart-container h-full">
      <h3 className="text-lg font-semibold text-dark-800 mb-4">{title}</h3>

      {hasGenero && hasTipoPessoa ? (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-dark-500 mb-2">Por Genero</h4>
            {renderBarChart(generoData, GENDER_COLORS)}
          </div>
          <div>
            <h4 className="text-sm font-medium text-dark-500 mb-2">Por Tipo de Pessoa</h4>
            {renderBarChart(tipoPessoaData, PERSON_COLORS)}
          </div>
        </div>
      ) : (
        <div>
          {hasGenero && renderBarChart(generoData, GENDER_COLORS)}
          {hasTipoPessoa && renderBarChart(tipoPessoaData, PERSON_COLORS)}
        </div>
      )}
    </div>
  );
}
