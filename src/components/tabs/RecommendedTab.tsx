import { memo } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { WinnerStrategyCard } from './WinnerStrategyCard';
import { AfterTaxWealthTable } from '../charts/AfterTaxWealthTable';
import { ActionPlanTable } from '../charts/ActionPlanTable';
import { Chart } from '../Chart';
import { BalanceDepletionChart } from '../charts/LifetimeCharts';
import { formatCurrency, formatPercent } from '../../lib/formatters';

interface RecommendedTabProps {
  comparison: ComparisonResult;
  monteCarloSuccessRate?: number;
}

export const RecommendedTab = memo(function RecommendedTab({
  comparison,
  monteCarloSuccessRate,
}: RecommendedTabProps) {
  // NOTE: Winner is re-resolved here even though WinnerStrategyCard resolves it again internally.
  // This is intentional — RecommendedTab needs `winner` for Zone 1 stats, and passing it as a prop
  // to WinnerStrategyCard would change its public interface (it's also used standalone elsewhere).
  const lifetimeWinnerId = comparison.lifetimeWinner?.byObjective;
  const winner = comparison.strategies.find(
    s => s.id === (lifetimeWinnerId ?? comparison.winner.bestOverall)
  );
  if (!winner) return null;

  const hasLifetime = comparison.yearlyData[0]?.years.some(y => y.phase === 'retirement');

  const retirementYears = winner.summary.yearlyResults.filter(y => y.phase === 'retirement').length;

  return (
    <div className="space-y-6">
      {/* Zone 1 — The Answer */}
      {winner.summary.lifetime && (
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid rgba(110,231,183,0.3)',
            boxShadow: '0 0 20px rgba(110,231,183,0.08)',
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Recommended strategy
          </p>
          <p className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {winner.label} is your optimal strategy
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Annual retirement income</div>
              <div className="text-xl font-bold" style={{ color: '#6ee7b7' }}>
                {formatCurrency(
                  winner.summary.lifetime.totalLifetimeSpending /
                  Math.max(1, retirementYears)
                )}/yr
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Estate value</div>
              <div className="text-xl font-bold" style={{ color: '#6ee7b7' }}>
                {formatCurrency(winner.summary.lifetime.estateValue)}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Lifetime effective tax rate</div>
              <div className="text-xl font-bold" style={{ color: '#6ee7b7' }}>
                {formatPercent(winner.summary.lifetime.lifetimeEffectiveRate)}
              </div>
            </div>
          </div>
        </div>
      )}

      <AfterTaxWealthTable comparison={comparison} />

      {hasLifetime && (
        <BalanceDepletionChart comparison={comparison} />
      )}

      {/* Zone 3 — Accumulation Phase Details */}
      <div>
        <h4
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Accumulation Phase Details
        </h4>
        <div className="space-y-6">
          <WinnerStrategyCard comparison={comparison} monteCarloSuccessRate={monteCarloSuccessRate} />
          <ActionPlanTable yearlyResults={winner.summary.yearlyResults} />

          <div>
            <h4 className="font-semibold text-base mb-3" style={{ color: 'var(--text-primary)' }}>
              Corporate Balance Projection
            </h4>
            <Chart results={winner.summary.yearlyResults} />
          </div>
        </div>
      </div>
    </div>
  );
});
