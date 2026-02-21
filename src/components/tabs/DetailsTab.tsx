import { memo, useState, useEffect } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import type { UserInputs } from '../../lib/types';
import { YearlyProjection } from '../YearlyProjection';
import { DetailedCharts } from '../charts/DetailedCharts';
import { RetirementIncomeChart, LifetimeOverviewStats, MonteCarloChart } from '../charts/LifetimeCharts';
import type { MonteCarloResult } from '../../lib/monteCarlo';

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
  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall)
    || comparison.strategies[0];
  const hasLifetime = comparison.yearlyData[0]?.years.some(y => y.phase === 'retirement');

  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);

  useEffect(() => {
    if (!hasLifetime) {
      setMonteCarloResult(null);
      return;
    }
    let cancelled = false;
    const worker = new Worker(
      new URL('../../workers/monteCarlo.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event: MessageEvent<MonteCarloResult | null>) => {
      if (cancelled) return;
      setMonteCarloResult(event.data);
    };
    worker.onerror = () => {
      if (cancelled) return;
      setMonteCarloResult(null);
    };
    worker.postMessage({ inputs, options: { simulationCount: 500 } });
    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [hasLifetime, inputs]);

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

      {/* Lifetime Analysis */}
      {hasLifetime && (
        <div>
          <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
            Lifetime Analysis
          </h3>
          <div className="space-y-4">
            <LifetimeOverviewStats summary={winner.summary} />
            <RetirementIncomeChart comparison={comparison} strategyId={selectedStrategy} />
            {monteCarloResult && (
              <MonteCarloChart
                result={monteCarloResult}
                years={comparison.yearlyData[0]?.years.map(y => y.calendarYear ?? y.year) ?? []}
              />
            )}
            {!monteCarloResult && hasLifetime && (
              <div className="glass-card p-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Running Monte Carlo simulation…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
