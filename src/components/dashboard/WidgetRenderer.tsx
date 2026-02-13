/**
 * WidgetRenderer (v2.3.0)
 *
 * Maps widgetType + strategyId to the actual chart/table component.
 * Extracts the right data slice from ComparisonResult based on strategy selection.
 * All chart/table components are reused from existing codebase — no new visualizations.
 */

import { memo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ComparisonResult, StrategyResult } from '../../lib/strategyComparison';
import type { UserInputs } from '../../lib/types';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { AfterTaxWealthTable } from '../charts/AfterTaxWealthTable';
import { ActionPlanTable } from '../charts/ActionPlanTable';
import { YearlyProjection } from '../YearlyProjection';

interface WidgetRendererProps {
  widgetType: string;
  strategyId: string;
  comparison: ComparisonResult;
  inputs: UserInputs;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#3b82f6',
  'dividends-only': '#10b981',
  'dynamic': '#f59e0b',
};

const TAX_COLORS = {
  personal: '#6366f1',
  corporate: '#f59e0b',
  cpp: '#ec4899',
  ei: '#8b5cf6',
  qpip: '#06b6d4',
  health: '#10b981',
};

const COMP_COLORS = {
  salary: '#6366f1',
  eligible: '#a78bfa',
  nonEligible: '#fbbf24',
  capital: '#34d399',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'rgba(22, 22, 30, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '13px' }}>
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

/** Extract strategy data from comparison result — exported for testing */
export function getStrategyData(
  comparison: ComparisonResult,
  strategyId: string
): { strategy: StrategyResult; yearlyData: typeof comparison.yearlyData[0] } {
  const strategy = comparison.strategies.find(s => s.id === strategyId) || comparison.strategies[0];
  const yearlyData = comparison.yearlyData.find(d => d.strategyId === strategyId) || comparison.yearlyData[0];
  return { strategy, yearlyData };
}

const axisProps = {
  stroke: 'rgba(255,255,255,0.4)',
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};

const formatCompact = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export const WidgetRenderer = memo(function WidgetRenderer({
  widgetType,
  strategyId,
  comparison,
  inputs: _inputs,
}: WidgetRendererProps) {
  const { strategy, yearlyData } = getStrategyData(comparison, strategyId);

  switch (widgetType) {
    case 'total-tax-comparison': {
      const data = comparison.strategies.map(s => ({
        name: s.label, value: s.summary.totalTax,
        fill: STRATEGY_COLORS[s.id] || '#6b7280',
      }));
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'corporate-balance-over-time': {
      const maxYears = Math.max(...comparison.yearlyData.map(s => s.years.length));
      const data = Array.from({ length: maxYears }, (_, idx) => {
        const dp: Record<string, any> = {
          year: comparison.yearlyData[0]?.years[idx]?.year ? `${comparison.yearlyData[0].years[idx].year}` : `Y${idx + 1}`,
        };
        comparison.yearlyData.forEach(sy => {
          const s = comparison.strategies.find(st => st.id === sy.strategyId);
          if (s && sy.years[idx]) dp[s.label] = sy.years[idx].notionalAccounts.corporateInvestments;
        });
        return dp;
      });
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
            {comparison.strategies.map(s => (
              <Line key={s.id} type="monotone" dataKey={s.label}
                stroke={STRATEGY_COLORS[s.id]} strokeWidth={s.id === strategyId ? 3 : 1.5}
                dot={{ fill: STRATEGY_COLORS[s.id], r: 2, strokeWidth: 0 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'cumulative-tax-paid': {
      const maxYears = Math.max(...comparison.yearlyData.map(s => s.years.length));
      const data = Array.from({ length: maxYears }, (_, idx) => {
        const dp: Record<string, any> = {
          year: comparison.yearlyData[0]?.years[idx]?.year ? `${comparison.yearlyData[0].years[idx].year}` : `Y${idx + 1}`,
        };
        comparison.yearlyData.forEach(sy => {
          const s = comparison.strategies.find(st => st.id === sy.strategyId);
          if (s) dp[s.label] = sy.years.slice(0, idx + 1).reduce((sum, y) => sum + y.totalTax, 0);
        });
        return dp;
      });
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
            {comparison.strategies.map(s => (
              <Line key={s.id} type="monotone" dataKey={s.label}
                stroke={STRATEGY_COLORS[s.id]} strokeWidth={s.id === strategyId ? 3 : 1.5}
                dot={{ fill: STRATEGY_COLORS[s.id], r: 2, strokeWidth: 0 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'tax-breakdown': {
      const data = [{
        name: strategy.label,
        'Personal Tax': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.personalTax, 0),
        'Corporate Tax': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.corporateTax, 0),
        'CPP/QPP': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.cpp + y.cpp2, 0),
        'EI': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.ei, 0),
        'QPIP': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.qpip, 0),
        'Health Premium': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.healthPremium, 0),
      }];
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
            <Bar dataKey="Personal Tax" stackId="a" fill={TAX_COLORS.personal} />
            <Bar dataKey="Corporate Tax" stackId="a" fill={TAX_COLORS.corporate} />
            <Bar dataKey="CPP/QPP" stackId="a" fill={TAX_COLORS.cpp} />
            <Bar dataKey="EI" stackId="a" fill={TAX_COLORS.ei} />
            <Bar dataKey="QPIP" stackId="a" fill={TAX_COLORS.qpip} />
            <Bar dataKey="Health Premium" stackId="a" fill={TAX_COLORS.health} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'compensation-mix': {
      const data = [{
        name: strategy.label,
        'Salary': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.salary, 0),
        'Eligible Div': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.dividends.eligibleDividends, 0),
        'Non-Elig Div': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.dividends.nonEligibleDividends, 0),
        'Capital Div': strategy.summary.yearlyResults.reduce((sum, y) => sum + y.dividends.capitalDividends, 0),
      }];
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
            <Bar dataKey="Salary" stackId="a" fill={COMP_COLORS.salary} />
            <Bar dataKey="Eligible Div" stackId="a" fill={COMP_COLORS.eligible} />
            <Bar dataKey="Non-Elig Div" stackId="a" fill={COMP_COLORS.nonEligible} />
            <Bar dataKey="Capital Div" stackId="a" fill={COMP_COLORS.capital} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'rrsp-room': {
      const data = [{
        name: strategy.label,
        'RRSP Room': strategy.summary.totalRRSPRoomGenerated,
        fill: STRATEGY_COLORS[strategy.id] || '#6b7280',
      }];
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="RRSP Room" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'effective-tax-rate': {
      const data = yearlyData.years.map(y => ({
        year: `${y.year}`,
        [strategy.label]: y.effectiveIntegratedRate,
      }));
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} {...axisProps} width={50} domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={strategy.label}
              stroke={STRATEGY_COLORS[strategy.id]} strokeWidth={2}
              dot={{ fill: STRATEGY_COLORS[strategy.id], r: 3, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'ipp-contributions': {
      if (!yearlyData.years.some(y => y.ipp)) {
        return <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>IPP not enabled for this strategy</div>;
      }
      const data = yearlyData.years.map(y => ({
        year: `${y.year}`,
        [strategy.label]: y.ipp?.contribution ?? 0,
      }));
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={strategy.label}
              stroke={STRATEGY_COLORS[strategy.id]} strokeWidth={2}
              dot={{ fill: STRATEGY_COLORS[strategy.id], r: 3, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'compensation-by-year': {
      const data = yearlyData.years.map(y => ({
        year: `Y${y.year}`,
        Salary: y.salary,
        'Capital Div': y.dividends.capitalDividends,
        'Eligible Div': y.dividends.eligibleDividends,
        'Non-Elig Div': y.dividends.nonEligibleDividends,
      }));
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis tickFormatter={formatCompact} {...axisProps} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
            <Bar dataKey="Salary" fill={COMP_COLORS.salary} stackId="a" />
            <Bar dataKey="Capital Div" fill={COMP_COLORS.capital} stackId="a" />
            <Bar dataKey="Eligible Div" fill={COMP_COLORS.eligible} stackId="a" />
            <Bar dataKey="Non-Elig Div" fill={COMP_COLORS.nonEligible} stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'after-tax-wealth':
      return <AfterTaxWealthTable comparison={comparison} />;

    case 'action-plan':
      return <ActionPlanTable yearlyResults={strategy.summary.yearlyResults} />;

    case 'yearly-projection':
      return <YearlyProjection results={strategy.summary.yearlyResults} />;

    case 'key-metrics': {
      const s = strategy.summary;
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <div className="stat-label">Total Compensation</div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCurrency(s.totalCompensation)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Annual Income</div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCurrency(s.averageAnnualIncome)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Final Corp Balance</div>
            <div className={`stat-value ${s.finalCorporateBalance > 0 ? 'positive' : 'negative'}`} style={{ fontSize: '1.1rem' }}>
              {formatCurrency(s.finalCorporateBalance)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Effective Tax Rate</div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatPercent(s.effectiveTaxRate)}</div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Unknown widget type: {widgetType}
        </div>
      );
  }
});
