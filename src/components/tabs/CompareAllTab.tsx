import { memo } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { StrategyComparison } from '../StrategyComparison';
import { ComparisonCharts } from '../charts/ComparisonCharts';

interface CompareAllTabProps {
  comparison: ComparisonResult;
}

export const CompareAllTab = memo(function CompareAllTab({
  comparison,
}: CompareAllTabProps) {
  return (
    <div className="space-y-6">
      <StrategyComparison comparison={comparison} />

      <div>
        <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
          Visual Comparison
        </h3>
        <ComparisonCharts comparison={comparison} />
      </div>
    </div>
  );
});
