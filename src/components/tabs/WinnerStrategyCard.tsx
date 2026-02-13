import { memo } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { formatCurrency } from '../../lib/formatters';

interface WinnerStrategyCardProps {
  comparison: ComparisonResult;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#3b82f6',
  'dividends-only': '#10b981',
  'dynamic': '#f59e0b',
};

export const WinnerStrategyCard = memo(function WinnerStrategyCard({
  comparison,
}: WinnerStrategyCardProps) {
  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);
  if (!winner) return null;

  const others = comparison.strategies.filter(s => s.id !== winner.id);
  const color = STRATEGY_COLORS[winner.id] || '#6b7280';

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}33`,
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
      <div className="space-y-2">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Why this strategy wins:
        </h4>
        <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>
            Lowest total tax: {formatCurrency(winner.summary.totalTax)}
            {' '}(vs{' '}
            {others.map((s, idx) => (
              <span key={s.id}>
                {formatCurrency(s.summary.totalTax)}
                {idx < others.length - 1 ? ' & ' : ''}
              </span>
            ))}
            )
          </li>
          <li>
            Best wealth accumulation: {formatCurrency(winner.summary.finalCorporateBalance + (winner.summary.totalRRSPContributions || 0))}
            {' '}total assets
          </li>
          <li>
            Optimal balance of tax efficiency + flexibility
          </li>
        </ul>
      </div>
    </div>
  );
});
