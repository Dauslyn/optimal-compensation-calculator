import { memo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { formatCurrency } from '../../lib/formatters';

interface ComparisonChartsProps {
  comparison: ComparisonResult;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#3b82f6',
  'dividends-only': '#10b981',
  'dynamic': '#f59e0b',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'rgba(22, 22, 30, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
            fontSize: '13px',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ComparisonCharts = memo(function ComparisonCharts({
  comparison,
}: ComparisonChartsProps) {
  const formatCompact = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);

  // Total Tax Bar Chart Data
  const taxData = comparison.strategies.map(s => ({
    name: s.label,
    value: s.summary.totalTax,
    fill: STRATEGY_COLORS[s.id] || '#6b7280',
  }));

  // Corporate Balance Line Chart Data
  const maxYears = Math.max(...comparison.yearlyData.map(s => s.years.length));
  const balanceData = Array.from({ length: maxYears }, (_, idx) => {
    const dataPoint: Record<string, any> = {
      year: comparison.yearlyData[0]?.years[idx]?.year
        ? `${comparison.yearlyData[0].years[idx].year}`
        : `Y${idx + 1}`,
    };
    comparison.yearlyData.forEach(strategyYearly => {
      const strategy = comparison.strategies.find(s => s.id === strategyYearly.strategyId);
      if (strategy && strategyYearly.years[idx]) {
        dataPoint[strategy.label] = strategyYearly.years[idx].notionalAccounts.corporateInvestments;
      }
    });
    return dataPoint;
  });

  // Cumulative Tax Line Chart Data
  const cumulativeTaxData = Array.from({ length: maxYears }, (_, idx) => {
    const dataPoint: Record<string, any> = {
      year: comparison.yearlyData[0]?.years[idx]?.year
        ? `${comparison.yearlyData[0].years[idx].year}`
        : `Y${idx + 1}`,
    };
    comparison.yearlyData.forEach(strategyYearly => {
      const strategy = comparison.strategies.find(s => s.id === strategyYearly.strategyId);
      if (strategy) {
        const cumulativeTax = strategyYearly.years
          .slice(0, idx + 1)
          .reduce((sum, year) => sum + year.totalTax, 0);
        dataPoint[strategy.label] = cumulativeTax;
      }
    });
    return dataPoint;
  });

  const axisProps = {
    stroke: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    tickLine: false as const,
    axisLine: false as const,
  };

  const legendProps = {
    iconType: 'line' as const,
    iconSize: 12,
    wrapperStyle: { fontSize: '11px', paddingTop: '16px', color: 'rgba(255,255,255,0.7)' },
  };

  return (
    <div className="space-y-6">
      {/* Total Tax Comparison */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Total Tax Comparison
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={taxData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Corporate Balance Over Time */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Corporate Balance Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={balanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend {...legendProps} />
            {comparison.strategies.map(strategy => (
              <Line
                key={strategy.id}
                type="monotone"
                dataKey={strategy.label}
                stroke={STRATEGY_COLORS[strategy.id]}
                strokeWidth={strategy.id === winner?.id ? 3 : 2}
                dot={{ fill: STRATEGY_COLORS[strategy.id], r: 3, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Tax Paid Over Time */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Cumulative Tax Paid Over Time
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Lower is better</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cumulativeTaxData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend {...legendProps} />
            {comparison.strategies.map(strategy => (
              <Line
                key={strategy.id}
                type="monotone"
                dataKey={strategy.label}
                stroke={STRATEGY_COLORS[strategy.id]}
                strokeWidth={strategy.id === winner?.id ? 3 : 2}
                dot={{ fill: STRATEGY_COLORS[strategy.id], r: 3, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
