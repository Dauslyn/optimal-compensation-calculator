// src/components/charts/LifetimeCharts.tsx
import { memo } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ComparisonResult } from '../../lib/strategyComparison';
import type { ProjectionSummary } from '../../lib/types';
import type { MonteCarloResult } from '../../lib/monteCarlo';
import { formatCurrency, formatPercent } from '../../lib/formatters';

// ── Shared helpers ──────────────────────────────────────────────────────────

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#10b981',
  'dividends-only': '#d4a017',
  'dynamic': '#6ee7b7',
};

const INCOME_COLORS = {
  cpp:        '#10b981',
  oas:        '#6ee7b7',
  rrif:       '#d4a017',
  corporate:  '#f87171',
  tfsa:       '#a3e635',
  ipp:        '#2dd4bf',
};

const axisProps = {
  stroke: 'rgba(255,255,255,0.4)',
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const legendProps = {
  iconType: 'line' as const,
  iconSize: 12,
  wrapperStyle: { fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,17,13,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(110,231,183,0.1)',
      borderRadius: '14px',
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '13px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
            {typeof entry.value === 'number' && entry.value > 0 && entry.value < 1
              ? formatPercent(entry.value)
              : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── 1. RetirementIncomeChart ────────────────────────────────────────────────

interface RetirementIncomeChartProps {
  comparison: ComparisonResult;
  strategyId: string;
}

export const RetirementIncomeChart = memo(function RetirementIncomeChart({
  comparison,
  strategyId,
}: RetirementIncomeChartProps) {
  const strategyData = comparison.yearlyData.find(d => d.strategyId === strategyId)
    ?? comparison.yearlyData[0];
  const strategy = comparison.strategies.find(s => s.id === strategyId)
    ?? comparison.strategies[0];

  const retirementYears = strategyData.years.filter(y => y.phase === 'retirement');

  if (retirementYears.length === 0) {
    return (
      <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
        No retirement years in this projection
      </div>
    );
  }

  const data = retirementYears.map(y => ({
    year: y.calendarYear ?? y.year,
    CPP:       y.retirement?.cppIncome          ?? 0,
    OAS:       y.retirement?.oasNet             ?? 0,
    RRIF:      y.retirement?.rrifWithdrawal     ?? 0,
    Corporate: y.retirement?.corporateDividends ?? 0,
    TFSA:      y.retirement?.tfsaWithdrawal     ?? 0,
    IPP:       y.retirement?.ippPension         ?? 0,
  }));

  const hasIPP = data.some(d => d.IPP > 0);

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Retirement Income by Source — {strategy.label}
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Stacked annual retirement income across all sources
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
          <Area type="monotone" dataKey="CPP"       stackId="a" fill={INCOME_COLORS.cpp}       stroke={INCOME_COLORS.cpp}       fillOpacity={0.7} />
          <Area type="monotone" dataKey="OAS"       stackId="a" fill={INCOME_COLORS.oas}       stroke={INCOME_COLORS.oas}       fillOpacity={0.7} />
          <Area type="monotone" dataKey="RRIF"      stackId="a" fill={INCOME_COLORS.rrif}      stroke={INCOME_COLORS.rrif}      fillOpacity={0.7} />
          <Area type="monotone" dataKey="Corporate" stackId="a" fill={INCOME_COLORS.corporate} stroke={INCOME_COLORS.corporate} fillOpacity={0.7} />
          <Area type="monotone" dataKey="TFSA"      stackId="a" fill={INCOME_COLORS.tfsa}      stroke={INCOME_COLORS.tfsa}      fillOpacity={0.7} />
          {hasIPP && (
            <Area type="monotone" dataKey="IPP" stackId="a" fill={INCOME_COLORS.ipp} stroke={INCOME_COLORS.ipp} fillOpacity={0.7} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// ── 2. BalanceDepletionChart ────────────────────────────────────────────────

interface BalanceDepletionChartProps {
  comparison: ComparisonResult;
}

export const BalanceDepletionChart = memo(function BalanceDepletionChart({
  comparison,
}: BalanceDepletionChartProps) {
  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);

  const primaryYears = comparison.yearlyData[0]?.years ?? [];
  const firstRetirementYear = primaryYears.find(y => y.phase === 'retirement');
  const firstEstateYear = primaryYears.find(y => y.phase === 'estate');

  const maxYears = Math.max(...comparison.yearlyData.map(d => d.years.length));

  const data = Array.from({ length: maxYears }, (_, idx) => {
    const refYear = primaryYears[idx];
    const dp: Record<string, any> = {
      year: refYear?.calendarYear ?? refYear?.year ?? `Y${idx + 1}`,
    };
    comparison.yearlyData.forEach(sd => {
      const s = comparison.strategies.find(st => st.id === sd.strategyId);
      const y = sd.years[idx];
      if (s && y) {
        const bal = y.balances;
        const totalAssets = bal
          ? (bal.rrspBalance + bal.tfsaBalance + Math.max(0, bal.corporateBalance) + (bal.ippFundBalance ?? 0))
          : y.notionalAccounts.corporateInvestments;
        const netWorth = Math.max(0, totalAssets - (y.outstandingDebt ?? 0));
        dp[s.label] = netWorth;
      }
    });
    return dp;
  });

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Net Worth Over Lifetime
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Total assets minus outstanding debt (RRSP + TFSA + Corporate + IPP)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Legend {...legendProps} />
          {firstRetirementYear && (
            <ReferenceLine
              x={firstRetirementYear.calendarYear ?? firstRetirementYear.year}
              stroke="rgba(16,185,129,0.4)"
              strokeDasharray="4 4"
              label={{ value: 'Retirement', fill: 'rgba(16,185,129,0.7)', fontSize: 10, position: 'top' }}
            />
          )}
          {firstEstateYear && (
            <ReferenceLine
              x={firstEstateYear.calendarYear ?? firstEstateYear.year}
              stroke="rgba(248,113,113,0.4)"
              strokeDasharray="4 4"
              label={{ value: 'Estate', fill: 'rgba(248,113,113,0.7)', fontSize: 10, position: 'top' }}
            />
          )}
          {comparison.strategies.map(s => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.label}
              stroke={STRATEGY_COLORS[s.id] ?? '#6b7280'}
              strokeWidth={s.id === winner?.id ? 3 : 2}
              dot={{ fill: STRATEGY_COLORS[s.id] ?? '#6b7280', r: 2, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// ── 3. LifetimeOverviewStats ────────────────────────────────────────────────

interface LifetimeOverviewStatsProps {
  summary: ProjectionSummary;
}

export const LifetimeOverviewStats = memo(function LifetimeOverviewStats({
  summary,
}: LifetimeOverviewStatsProps) {
  const lt = summary.lifetime;

  if (!lt) {
    return (
      <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
        No lifetime data available
      </div>
    );
  }

  const stats = [
    { label: 'Total Lifetime Spending (nominal)', value: formatCurrency(lt.totalLifetimeSpending), positive: true },
    { label: 'Lifetime Effective Tax Rate', value: formatPercent(lt.lifetimeEffectiveRate), positive: false },
    { label: 'Peak Corporate Balance', value: `${formatCurrency(lt.peakCorporateBalance)} (yr ${lt.peakYear})`, positive: true },
    { label: 'Net Estate Value', value: formatCurrency(lt.estateValue), positive: true },
    { label: 'CPP Benefits Received', value: formatCurrency(lt.cppTotalReceived), positive: true },
    { label: 'OAS Benefits Received', value: formatCurrency(lt.oasTotalReceived), positive: true },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Lifetime Overview
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-value ${stat.positive ? 'positive' : ''}`} style={{ fontSize: '1.05rem' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div>Accumulation: {lt.totalAccumulationYears} yr{lt.totalAccumulationYears !== 1 ? 's' : ''}</div>
        <div>Retirement: {lt.totalRetirementYears} yr{lt.totalRetirementYears !== 1 ? 's' : ''}</div>
        <div>RRIF Withdrawn: {formatCurrency(lt.rrifTotalWithdrawn)}</div>
        <div>TFSA Withdrawn: {formatCurrency(lt.tfsaTotalWithdrawn)}</div>
      </div>
      {(lt.spouseCPPTotalReceived > 0 || lt.spouseOASTotalReceived > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>Spouse CPP: {formatCurrency(lt.spouseCPPTotalReceived)}</div>
          <div>Spouse OAS: {formatCurrency(lt.spouseOASTotalReceived)}</div>
        </div>
      )}
    </div>
  );
});

// ── 4. MonteCarloChart ───────────────────────────────────────────────────────

interface MonteCarloChartProps {
  result: MonteCarloResult;
  years: number[];
}

export const MonteCarloChart = memo(function MonteCarloChart({
  result,
  years,
}: MonteCarloChartProps) {
  const data = years.map((year, i) => ({
    year,
    p10: result.percentiles.p10[i],
    p25: result.percentiles.p25[i],
    p50: result.percentiles.p50[i],
    p75: result.percentiles.p75[i],
    p90: result.percentiles.p90[i],
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Monte Carlo — Wealth Projection
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}
        >
          {(result.successRate * 100).toFixed(0)}% success rate
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {result.simulationCount} simulations · shaded bands show 10th–90th and 25th–75th percentiles
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
          <Tooltip content={<CustomTooltip />} />
          {/* Outer band: p10-p90 */}
          <Area type="monotone" dataKey="p90" stroke="none" fill="#10b981" fillOpacity={0.12} legendType="none" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="#10b981" fillOpacity={0} legendType="none" />
          {/* Inner band: p25-p75 */}
          <Area type="monotone" dataKey="p75" stroke="none" fill="#10b981" fillOpacity={0.20} legendType="none" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="#10b981" fillOpacity={0} legendType="none" />
          {/* Median line */}
          <Line type="monotone" dataKey="p50" stroke="#6ee7b7" strokeWidth={2} dot={false} name="Median" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span><span style={{ color: '#6ee7b7' }}>—</span> Median</span>
        <span><span style={{ opacity: 0.4 }}>■</span> 25th–75th %ile</span>
        <span><span style={{ opacity: 0.2 }}>■</span> 10th–90th %ile</span>
        <span>Median estate: {formatCompact(result.medianEstate)}</span>
      </div>
    </div>
  );
});
