/**
 * StrategyComparison Component (v2.1.0)
 *
 * Renders a side-by-side comparison of 3 preset strategies after
 * runStrategyComparison() has been called. Shows:
 * - 3 strategy columns with key metrics
 * - Winner badge on the best-overall strategy
 * - Diff indicators showing how each strategy compares
 * - Trade-off insight footer
 */

import { memo } from 'react';
import type { ComparisonResult, StrategyResult } from '../lib/strategyComparison';
import { formatCurrency, formatPercent, formatDifference } from '../lib/formatters';

interface StrategyComparisonProps {
  comparison: ComparisonResult;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#3b82f6',   // Blue
  'dividends-only': '#10b981',   // Emerald
  'dynamic': '#f59e0b',          // Amber
};

function StrategyCard({ strategy, isWinner, winnerId }: {
  strategy: StrategyResult;
  isWinner: boolean;
  winnerId: string;
}) {
  const color = STRATEGY_COLORS[strategy.id] || '#6b7280';
  const s = strategy.summary;

  return (
    <div
      className="relative rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: isWinner
          ? `2px solid ${color}`
          : '1px solid var(--border-subtle)',
        boxShadow: isWinner ? `0 0 20px ${color}33` : undefined,
      }}
    >
      {/* Winner badge */}
      {isWinner && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: color }}
        >
          RECOMMENDED
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-4 pt-1">
        <div
          className="inline-block w-3 h-3 rounded-full mr-2"
          style={{ background: color }}
        />
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {strategy.label}
        </span>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {strategy.description}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <MetricRow
          label="Total Tax"
          value={formatCurrency(s.totalTax)}
          diff={strategy.id !== winnerId ? strategy.diff.taxSavings : null}
          diffInvert={true}
        />
        <MetricRow
          label="Effective Rate"
          value={formatPercent(s.effectiveTaxRate)}
        />
        <MetricRow
          label="Avg Annual Income"
          value={formatCurrency(s.averageAnnualIncome)}
        />
        <MetricRow
          label="Final Corp Balance"
          value={formatCurrency(s.finalCorporateBalance)}
          diff={strategy.id !== winnerId ? strategy.diff.balanceDifference : null}
        />
        <MetricRow
          label="RRSP Room Generated"
          value={formatCurrency(s.totalRRSPRoomGenerated)}
          diff={strategy.id !== winnerId ? strategy.diff.rrspRoomDifference : null}
        />
        <MetricRow
          label="Compensation Mix"
          value={s.totalCompensation > 0
            ? `${Math.round((s.totalSalary / s.totalCompensation) * 100)}% sal / ${Math.round((s.totalDividends / s.totalCompensation) * 100)}% div`
            : '0% / 100%'
          }
        />
      </div>
    </div>
  );
}

function MetricRow({ label, value, diff, diffInvert }: {
  label: string;
  value: string;
  diff?: number | null;
  diffInvert?: boolean;
}) {
  const diffDisplay = diff != null && diff !== 0 ? formatDifference(diff, diffInvert) : null;

  return (
    <div
      className="flex items-center justify-between py-2 border-b"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
        {diffDisplay && (
          <div
            className="text-xs"
            style={{
              color: diffDisplay.color === 'positive' ? 'var(--accent-success, #10b981)'
                : diffDisplay.color === 'negative' ? 'var(--accent-danger, #ef4444)'
                : 'var(--text-muted)',
            }}
          >
            {diffDisplay.text}
          </div>
        )}
      </div>
    </div>
  );
}

export const StrategyComparison = memo(function StrategyComparison({
  comparison,
}: StrategyComparisonProps) {
  const { strategies, winner } = comparison;

  // Find winner and losers for insight
  const bestOverall = strategies.find(s => s.id === winner.bestOverall);
  const lowestTaxStrat = strategies.find(s => s.id === winner.lowestTax);
  const highestBalanceStrat = strategies.find(s => s.id === winner.highestBalance);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Strategy Comparison
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Same inputs, 3 compensation strategies — here's what changes
          </p>
        </div>
        {bestOverall && (
          <span
            className="px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{
              background: `${STRATEGY_COLORS[bestOverall.id]}20`,
              color: STRATEGY_COLORS[bestOverall.id],
            }}
          >
            Best: {bestOverall.label}
          </span>
        )}
      </div>

      {/* 3-Column Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map(strategy => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isWinner={strategy.id === winner.bestOverall}
            winnerId={winner.bestOverall}
          />
        ))}
      </div>

      {/* Trade-off Insight */}
      {lowestTaxStrat && highestBalanceStrat && lowestTaxStrat.id !== highestBalanceStrat.id && (
        <div
          className="p-4 rounded-lg text-sm"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="font-medium">Trade-off: </span>
          <span style={{ color: STRATEGY_COLORS[lowestTaxStrat.id] }}>
            {lowestTaxStrat.label}
          </span>
          {' '}pays the least tax ({formatCurrency(lowestTaxStrat.summary.totalTax)}), while{' '}
          <span style={{ color: STRATEGY_COLORS[highestBalanceStrat.id] }}>
            {highestBalanceStrat.label}
          </span>
          {' '}leaves the most in corporate investments ({formatCurrency(highestBalanceStrat.summary.finalCorporateBalance)}).
        </div>
      )}
    </div>
  );
});
