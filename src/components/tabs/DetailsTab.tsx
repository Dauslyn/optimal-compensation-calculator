import { memo, useState } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import type { UserInputs } from '../../lib/types';
import { YearlyProjection } from '../YearlyProjection';
import { DetailedCharts } from '../charts/DetailedCharts';

interface DetailsTabProps {
  comparison: ComparisonResult;
  inputs: UserInputs;
}

export const DetailsTab = memo(function DetailsTab({
  comparison,
  inputs,
}: DetailsTabProps) {
  const [selectedStrategy, setSelectedStrategy] = useState(comparison.winner.bestOverall);

  const strategy = comparison.strategies.find(s => s.id === selectedStrategy)
    || comparison.strategies[0];

  const showIPP = inputs.considerIPP || inputs.spouseConsiderIPP;

  return (
    <div className="space-y-6">
      {/* Strategy selector for yearly table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Full Year-by-Year Breakdown
          </h3>
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {comparison.strategies.map(s => (
              <option key={s.id} value={s.id}>
                {s.label} {s.id === comparison.winner.bestOverall ? '(Recommended)' : ''}
              </option>
            ))}
          </select>
        </div>
        <YearlyProjection results={strategy.summary.yearlyResults} />
      </div>

      {/* Detailed Charts */}
      <div>
        <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
          Detailed Analysis
        </h3>
        <DetailedCharts comparison={comparison} showIPP={showIPP} />
      </div>
    </div>
  );
});
