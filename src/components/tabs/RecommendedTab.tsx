import { memo } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { WinnerStrategyCard } from './WinnerStrategyCard';
import { AfterTaxWealthTable } from '../charts/AfterTaxWealthTable';
import { ActionPlanTable } from '../charts/ActionPlanTable';
import { Chart } from '../Chart';

interface RecommendedTabProps {
  comparison: ComparisonResult;
}

export const RecommendedTab = memo(function RecommendedTab({
  comparison,
}: RecommendedTabProps) {
  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);
  if (!winner) return null;

  return (
    <div className="space-y-6">
      <WinnerStrategyCard comparison={comparison} />
      <AfterTaxWealthTable comparison={comparison} />
      <ActionPlanTable yearlyResults={winner.summary.yearlyResults} />

      <div>
        <h4 className="font-semibold text-base mb-3" style={{ color: 'var(--text-primary)' }}>
          Corporate Balance Projection
        </h4>
        <Chart results={winner.summary.yearlyResults} />
      </div>
    </div>
  );
});
