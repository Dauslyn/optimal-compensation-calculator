import { memo } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { buildRecommendationNarrative } from '../../lib/narrativeSynthesis';
import type { NarrativeInput } from '../../lib/narrativeSynthesis';

interface WinnerStrategyCardProps {
  comparison: ComparisonResult;
  monteCarloSuccessRate?: number;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#10b981',
  'dividends-only': '#d4a017',
  'dynamic': '#6ee7b7',
};

export const WinnerStrategyCard = memo(function WinnerStrategyCard({
  comparison,
  monteCarloSuccessRate,
}: WinnerStrategyCardProps) {
  const lifetimeWinnerId = comparison.lifetimeWinner?.byObjective;
  const winner = comparison.strategies.find(
    s => s.id === (lifetimeWinnerId ?? comparison.winner.bestOverall)
  );
  if (!winner) return null;

  const others = comparison.strategies.filter(s => s.id !== winner.id);
  const lowestTaxStrategy = comparison.strategies.find(s => s.id === comparison.winner.lowestTax);
  const color = STRATEGY_COLORS[winner.id] || '#6b7280';

  const lt = winner.summary.lifetime;
  const runner = others.length > 0
    ? others.reduce((best, s) =>
        (s.summary.lifetime?.estateValue ?? 0) > (best.summary.lifetime?.estateValue ?? 0) ? s : best
      , others[0])
    : null;

  const retirementYears = winner.summary.yearlyResults.filter(y => y.phase === 'retirement').length;

  const narrative = (lt && runner)
    ? buildRecommendationNarrative({
        winnerId: winner.id,
        winnerLabel: winner.label,
        runnerId: runner.id,
        runnerLabel: runner.label,
        lifetimeTaxDifference: lt.totalLifetimeTax - (runner.summary.lifetime?.totalLifetimeTax ?? lt.totalLifetimeTax),
        estateValueDifference: lt.estateValue - (runner.summary.lifetime?.estateValue ?? lt.estateValue),
        rrspRoomDifference: (winner.summary.totalRRSPRoomGenerated ?? 0) - (runner.summary.totalRRSPRoomGenerated ?? 0),
        annualRetirementIncome: retirementYears > 0
          ? lt.totalLifetimeSpending / retirementYears
          : lt.totalLifetimeSpending / 20,
        retirementSuccessRate: monteCarloSuccessRate ?? 0.85,
        objective: comparison.lifetimeWinner?.objective ?? 'balanced',
      } satisfies NarrativeInput)
    : null;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${color}40`,
        boxShadow: `0 0 30px ${color}15, inset 0 1px 0 rgba(255,255,255,0.04)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Badge */}
      <div className="text-center mb-4">
        <div
          className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white mb-3"
          style={{ background: color }}
        >
          RECOMMENDED
        </div>
        <div>
          <div
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ background: color }}
          />
          <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {winner.label}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {winner.description}
        </p>
      </div>

      {/* Why this wins */}
      <div className="mt-4 space-y-2">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Why this strategy wins:
        </h4>
        {narrative ? (
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {narrative}
          </p>
        ) : (
          <div className="text-sm space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
            <div>Total tax: {formatCurrency(winner.summary.totalTax)}</div>
            <div>Final corporate balance: {formatCurrency(winner.summary.finalCorporateBalance)}</div>
          </div>
        )}
      </div>
    </div>
  );
});
