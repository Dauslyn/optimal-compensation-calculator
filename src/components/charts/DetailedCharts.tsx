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
import { formatCurrency, formatPercent } from '../../lib/formatters';

interface DetailedChartsProps {
  comparison: ComparisonResult;
  showIPP?: boolean;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#10b981',
  'dividends-only': '#d4a017',
  'dynamic': '#6ee7b7',
};

const TAX_COLORS = {
  personal: '#059669',
  corporate: '#d4a017',
  cpp: '#f87171',
  ei: '#a3e635',
  qpip: '#2dd4bf',
  health: '#6ee7b7',
};

const COMP_COLORS = {
  salary: '#059669',
  eligible: '#6ee7b7',
  nonEligible: '#d4a017',
  capital: '#a3e635',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'rgba(10, 17, 13, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(110, 231, 183, 0.1)',
        borderRadius: '14px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
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
            {typeof entry.value === 'number' && entry.value < 1
              ? formatPercent(entry.value)
              : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const DetailedCharts = memo(function DetailedCharts({
  comparison,
  showIPP = false,
}: DetailedChartsProps) {
  const formatCompact = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatPct = (value: number): string => `${(value * 100).toFixed(0)}%`;

  const axisProps = {
    stroke: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    tickLine: false as const,
    axisLine: false as const,
  };

  const legendProps = {
    iconType: 'circle' as const,
    iconSize: 8,
    wrapperStyle: { fontSize: '11px', paddingTop: '16px', color: 'rgba(255,255,255,0.7)' },
  };

  // 1. Tax Breakdown Stacked Bar
  const taxBreakdownData = comparison.strategies.map(strategy => {
    const years = strategy.summary.yearlyResults;
    return {
      name: strategy.label,
      'Personal Tax': years.reduce((sum, y) => sum + y.personalTax, 0),
      'Corporate Tax': years.reduce((sum, y) => sum + y.corporateTax, 0),
      'CPP/QPP': years.reduce((sum, y) => sum + y.cpp + y.cpp2, 0),
      'EI': years.reduce((sum, y) => sum + y.ei, 0),
      'QPIP': years.reduce((sum, y) => sum + y.qpip, 0),
      'Health Premium': years.reduce((sum, y) => sum + y.healthPremium, 0),
    };
  });

  // 2. Compensation Mix Stacked Bar
  const compMixData = comparison.strategies.map(strategy => {
    const years = strategy.summary.yearlyResults;
    return {
      name: strategy.label,
      'Salary': years.reduce((sum, y) => sum + y.salary, 0),
      'Eligible Div': years.reduce((sum, y) => sum + y.dividends.eligibleDividends, 0),
      'Non-Elig Div': years.reduce((sum, y) => sum + y.dividends.nonEligibleDividends, 0),
      'Capital Div': years.reduce((sum, y) => sum + y.dividends.capitalDividends, 0),
    };
  });

  // 3. RRSP Room Grouped Bar
  const rrspData = comparison.strategies.map(strategy => ({
    name: strategy.label,
    'RRSP Room': strategy.summary.totalRRSPRoomGenerated,
    fill: STRATEGY_COLORS[strategy.id] || '#6b7280',
  }));

  // 4. IPP Contributions Line Chart (conditional)
  const maxYears = Math.max(...comparison.yearlyData.map(s => s.years.length));
  const ippData = showIPP
    ? Array.from({ length: maxYears }, (_, idx) => {
        const dataPoint: Record<string, any> = {
          year: comparison.yearlyData[0]?.years[idx]?.year
            ? `${comparison.yearlyData[0].years[idx].year}`
            : `Y${idx + 1}`,
        };
        comparison.yearlyData.forEach(strategyYearly => {
          const strategy = comparison.strategies.find(s => s.id === strategyYearly.strategyId);
          if (strategy && strategyYearly.years[idx]?.ipp) {
            dataPoint[strategy.label] = strategyYearly.years[idx].ipp!.contribution;
          }
        });
        return dataPoint;
      })
    : [];

  // 5. Effective Tax Rate Line Chart
  const effectiveRateData = Array.from({ length: maxYears }, (_, idx) => {
    const dataPoint: Record<string, any> = {
      year: comparison.yearlyData[0]?.years[idx]?.year
        ? `${comparison.yearlyData[0].years[idx].year}`
        : `Y${idx + 1}`,
    };
    comparison.yearlyData.forEach(strategyYearly => {
      const strategy = comparison.strategies.find(s => s.id === strategyYearly.strategyId);
      if (strategy && strategyYearly.years[idx]) {
        dataPoint[strategy.label] = strategyYearly.years[idx].effectiveIntegratedRate;
      }
    });
    return dataPoint;
  });

  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);

  return (
    <div className="space-y-6">
      {/* Tax Breakdown by Strategy */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Tax Breakdown by Strategy
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={taxBreakdownData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend {...legendProps} />
            <Bar dataKey="Personal Tax" stackId="a" fill={TAX_COLORS.personal} />
            <Bar dataKey="Corporate Tax" stackId="a" fill={TAX_COLORS.corporate} />
            <Bar dataKey="CPP/QPP" stackId="a" fill={TAX_COLORS.cpp} />
            <Bar dataKey="EI" stackId="a" fill={TAX_COLORS.ei} />
            <Bar dataKey="QPIP" stackId="a" fill={TAX_COLORS.qpip} />
            <Bar dataKey="Health Premium" stackId="a" fill={TAX_COLORS.health} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compensation Mix by Strategy */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Compensation Mix by Strategy
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={compMixData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend {...legendProps} />
            <Bar dataKey="Salary" stackId="a" fill={COMP_COLORS.salary} />
            <Bar dataKey="Eligible Div" stackId="a" fill={COMP_COLORS.eligible} />
            <Bar dataKey="Non-Elig Div" stackId="a" fill={COMP_COLORS.nonEligible} />
            <Bar dataKey="Capital Div" stackId="a" fill={COMP_COLORS.capital} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RRSP Room Generated */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Total RRSP Room Generated
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rrspData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="RRSP Room" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* IPP Contributions (conditional) */}
      {showIPP && ippData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
            IPP Contributions Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ippData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: 'rgba(255,255,255,0.7)' }} />
              {comparison.strategies.map(strategy => (
                <Line
                  key={strategy.id}
                  type="monotone"
                  dataKey={strategy.label}
                  stroke={STRATEGY_COLORS[strategy.id]}
                  strokeWidth={2}
                  dot={{ fill: STRATEGY_COLORS[strategy.id], r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Effective Tax Rate Over Time */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Effective Integrated Tax Rate Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={effectiveRateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatPct} {...axisProps} width={50} domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: 'rgba(255,255,255,0.7)' }} />
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
