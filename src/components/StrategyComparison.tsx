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
  'salary-at-ympe': '#10b981',   // Emerald
  'dividends-only': '#d4a017',   // Gold
  'dynamic': '#6ee7b7',          // Bright Emerald
};

function StrategyCard({ strategy, isWinner, winnerId, lifetimeWinner }: {
  strategy: StrategyResult;
  isWinner: boolean;
  winnerId: string;
  lifetimeWinner?: ComparisonResult['lifetimeWinner'];
}) {
  const color = STRATEGY_COLORS[strategy.id] || '#6b7280';
  const s = strategy.summary;

  return (
    <div
      className="relative rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: isWinner
          ? `1px solid ${color}40`
          : '1px solid var(--border-subtle)',
        boxShadow: isWinner ? `0 0 30px ${color}15, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
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
        {strategy.isCurrentSetup && (
          <span
            className="ml-2 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc' }}
          >
            Your current setup
          </span>
        )}
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
          label="Integrated Rate"
          value={formatPercent(s.effectiveCompensationRate)}
        />
        <MetricRow
          label="Avg Annual Comp"
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

      {/* Current setup callout */}
      {strategy.isCurrentSetup && lifetimeWinner && (
        <div
          className="text-xs mt-2 p-2 rounded"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
        >
          vs. recommended strategy: see how your current setup compares above
        </div>
      )}
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
  const { strategies, winner, lifetimeWinner } = comparison;

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

      {/* Strategy Cards — 3 or 4 columns depending on whether a current-setup strategy is present */}
      <div className={`grid grid-cols-1 gap-4 ${strategies.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {strategies.map(strategy => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isWinner={strategy.id === winner.bestOverall}
            winnerId={winner.bestOverall}
            lifetimeWinner={lifetimeWinner}
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
