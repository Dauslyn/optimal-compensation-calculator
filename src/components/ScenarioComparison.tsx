/**
 * ScenarioComparison Component
 *
 * Shows a detailed comparison table of multiple scenarios,
 * highlighting the winner for each metric.
 */

import { memo, useMemo } from 'react';
import type { Scenario } from '../lib/scenarios';
import { compareScenarios, type ScenarioComparison as ComparisonData } from '../lib/scenarios';
import { formatCurrency, formatPercent } from '../lib/formatters';

interface ScenarioComparisonProps {
  scenarios: Scenario[];
}

interface MetricRowProps {
  label: string;
  values: Array<{
    value: number;
    formatted: string;
    isWinner: boolean;
    color: string;
  }>;
  winnerType?: 'min' | 'max';
  description?: string;
}

const MetricRow = memo(function MetricRow({ label, values, description }: MetricRowProps) {
  return (
    <tr className="border-b border-[var(--border-subtle)] last:border-0">
      <td className="py-3 pr-4">
        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        {description && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </div>
        )}
      </td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-4 text-center">
          <span
            className={`text-sm font-semibold ${v.isWinner ? 'relative' : ''}`}
            style={{
              color: v.isWinner ? v.color : 'var(--text-secondary)',
            }}
          >
            {v.formatted}
            {v.isWinner && (
              <span
                className="absolute -top-1 -right-4 text-xs"
                title="Best in this category"
              >
                ✓
              </span>
            )}
          </span>
        </td>
      ))}
    </tr>
  );
});

export const ScenarioComparison = memo(function ScenarioComparison({
  scenarios,
}: ScenarioComparisonProps) {
  const { comparisons, winner } = useMemo(
    () => compareScenarios(scenarios),
    [scenarios]
  );

  // Create a map for quick lookup
  const comparisonMap = useMemo(() => {
    const map = new Map<string, ComparisonData>();
    comparisons.forEach((c) => map.set(c.scenarioId, c));
    return map;
  }, [comparisons]);

  const scenariosWithResults = scenarios.filter((s) => s.results !== null);

  if (scenariosWithResults.length < 2) {
    return (
      <div
        className="p-6 rounded-xl text-center"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="text-4xl mb-3">📊</div>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Comparison Coming Soon
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Calculate at least 2 scenarios to see a detailed comparison.
        </p>
      </div>
    );
  }

  // Helper to build metric values
  const buildMetricValues = (
    getValue: (c: ComparisonData) => number,
    format: (v: number) => string,
    isLowerBetter: boolean
  ) => {
    const values = scenariosWithResults.map((s) => {
      const comp = comparisonMap.get(s.id);
      return comp ? getValue(comp) : 0;
    });

    const best = isLowerBetter ? Math.min(...values) : Math.max(...values);

    return scenariosWithResults.map((s, i) => ({
      value: values[i],
      formatted: format(values[i]),
      isWinner: values[i] === best && comparisons.length > 1,
      color: s.color,
    }));
  };

  return (
    <div
      className="rounded-xl overflow-hidden animate-fade-in"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Scenario Comparison
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {scenariosWithResults.length} scenarios • {scenarios[0]?.inputs.planningHorizon || 5} year projection
            </p>
          </div>
          {winner.bestOverall && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full animate-scale-in"
              style={{
                background: 'var(--accent-primary-glow)',
                color: 'var(--accent-primary)',
              }}
            >
              <span>🏆</span>
              <span className="text-sm font-semibold">
                {scenarios.find((s) => s.id === winner.bestOverall)?.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              <th
                className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Metric
              </th>
              {scenariosWithResults.map((s) => (
                <th
                  key={s.id}
                  className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wider min-w-[120px]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Tax Metrics */}
            <tr>
              <td
                colSpan={scenariosWithResults.length + 1}
                className="py-2 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}
              >
                Tax Analysis
              </td>
            </tr>
            <MetricRow
              label="Total Tax Paid"
              description="Sum of all taxes over projection period"
              values={buildMetricValues(
                (c) => c.totalTaxPaid,
                (v) => formatCurrency(v),
                true
              )}
            />
            <MetricRow
              label="Effective Tax Rate"
              description="Total tax ÷ total income"
              values={buildMetricValues(
                (c) => c.averageTaxRate,
                (v) => formatPercent(v, 1),
                true
              )}
            />

            {/* Income Metrics */}
            <tr>
              <td
                colSpan={scenariosWithResults.length + 1}
                className="py-2 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}
              >
                Income & Compensation
              </td>
            </tr>
            <MetricRow
              label="Total After-Tax Income"
              description="Net amount received over projection"
              values={buildMetricValues(
                (c) => c.totalAfterTaxIncome,
                (v) => formatCurrency(v),
                false
              )}
            />
            <MetricRow
              label="Total Salary"
              description="Sum of salary payments"
              values={buildMetricValues(
                (c) => c.totalSalary,
                (v) => formatCurrency(v),
                false
              )}
            />
            <MetricRow
              label="Total Dividends"
              description="Sum of dividend payments"
              values={buildMetricValues(
                (c) => c.totalDividends,
                (v) => formatCurrency(v),
                false
              )}
            />

            {/* Corporate Metrics */}
            <tr>
              <td
                colSpan={scenariosWithResults.length + 1}
                className="py-2 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}
              >
                Corporate Position
              </td>
            </tr>
            <MetricRow
              label="Final Corporate Balance"
              description="Investments remaining at end of projection"
              values={buildMetricValues(
                (c) => c.finalCorporateBalance,
                (v) => formatCurrency(v),
                false
              )}
            />
          </tbody>
        </table>
      </div>

      {/* Footer with insight */}
      {winner.lowestTax && winner.highestBalance && winner.lowestTax !== winner.highestBalance && (
        <div
          className="p-4 text-sm"
          style={{
            background: 'var(--bg-base)',
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            💡 Trade-off insight:
          </span>{' '}
          <span style={{ color: scenarios.find(s => s.id === winner.lowestTax)?.color }}>
            {scenarios.find((s) => s.id === winner.lowestTax)?.name}
          </span>
          {' '}minimizes taxes, while{' '}
          <span style={{ color: scenarios.find(s => s.id === winner.highestBalance)?.color }}>
            {scenarios.find((s) => s.id === winner.highestBalance)?.name}
          </span>
          {' '}maximizes your final corporate balance.
        </div>
      )}
    </div>
  );
});

export default ScenarioComparison;
