/**
 * MonteCarloResults Component
 *
 * Displays Monte Carlo simulation results with confidence intervals,
 * probability distributions, and risk metrics.
 */

import { memo, useMemo } from 'react';
import type { MonteCarloResults as MCResults, PercentileData } from '../lib/monteCarlo';
import { formatCurrency, formatPercent } from '../lib/formatters';

interface MonteCarloResultsProps {
  results: MCResults | null;
  isLoading?: boolean;
  onRunSimulation?: () => void;
}

const PercentileBar = memo(function PercentileBar({
  data,
  label,
  format = 'currency',
  colorScheme = 'blue',
}: {
  data: PercentileData;
  label: string;
  format?: 'currency' | 'percent';
  colorScheme?: 'blue' | 'green' | 'red';
}) {
  const colors = {
    blue: { light: '#10b98120', dark: '#10b981', gradient: '#10b98160' },
    green: { light: '#05966920', dark: '#059669', gradient: '#05966960' },
    red: { light: '#f8717120', dark: '#f87171', gradient: '#f8717160' },
  };
  const color = colors[colorScheme];

  const formatValue = (v: number) => format === 'currency' ? formatCurrency(v) : formatPercent(v, 1);

  // Calculate positions as percentages of the range
  const range = data.max - data.min;
  const getPosition = (value: number) => range > 0 ? ((value - data.min) / range) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span className="text-sm font-bold" style={{ color: color.dark }}>
          {formatValue(data.p50)} <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(median)</span>
        </span>
      </div>

      {/* Visualization bar */}
      <div className="relative h-8 rounded-lg" style={{ background: 'var(--bg-base)' }}>
        {/* P10-P90 range */}
        <div
          className="absolute h-full rounded-lg transition-all"
          style={{
            left: `${getPosition(data.p10)}%`,
            width: `${getPosition(data.p90) - getPosition(data.p10)}%`,
            background: color.light,
          }}
        />

        {/* P25-P75 range (darker) */}
        <div
          className="absolute h-full rounded-md transition-all"
          style={{
            left: `${getPosition(data.p25)}%`,
            width: `${getPosition(data.p75) - getPosition(data.p25)}%`,
            background: color.gradient,
            opacity: 0.6,
          }}
        />

        {/* Median marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 transition-all"
          style={{
            left: `${getPosition(data.p50)}%`,
            background: color.dark,
          }}
        />

        {/* Mean marker (different style) */}
        <div
          className="absolute top-1 bottom-1 w-0.5 transition-all"
          style={{
            left: `${getPosition(data.mean)}%`,
            background: 'var(--text-muted)',
            opacity: 0.5,
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{formatValue(data.p10)}</span>
        <span className="opacity-70">10th — 90th percentile</span>
        <span>{formatValue(data.p90)}</span>
      </div>
    </div>
  );
});

const ProbabilityGauge = memo(function ProbabilityGauge({
  probability,
  label,
  isPositive = true,
}: {
  probability: number;
  label: string;
  isPositive?: boolean;
}) {
  const color = isPositive
    ? probability >= 70 ? '#059669' : probability >= 50 ? '#d4a017' : '#f87171'
    : probability <= 30 ? '#059669' : probability <= 50 ? '#d4a017' : '#f87171';

  return (
    <div className="text-center">
      <div
        className="relative w-20 h-20 mx-auto mb-2"
        style={{
          background: `conic-gradient(${color} ${probability * 3.6}deg, var(--bg-base) 0deg)`,
          borderRadius: '50%',
        }}
      >
        <div
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <span className="text-lg font-bold" style={{ color }}>
            {probability.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
});

const YearlyDistributionChart = memo(function YearlyDistributionChart({
  data,
}: {
  data: MCResults['yearlyBalanceDistribution'];
}) {
  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.p90));
  const minValue = Math.min(...data.map(d => d.p10));
  const range = maxValue - minValue;

  const getY = (value: number) => 100 - ((value - minValue) / range) * 80;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Projected Balance Over Time
      </h4>
      <div className="relative h-32 rounded-lg p-4" style={{ background: 'var(--bg-base)' }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {/* P10-P90 area */}
          <path
            d={`
              M ${data.map((d, i) => `${(i / (data.length - 1)) * 100},${getY(d.p90)}`).join(' L ')}
              L ${data.map((_d, i) => `${((data.length - 1 - i) / (data.length - 1)) * 100},${getY(data[data.length - 1 - i].p10)}`).join(' L ')}
              Z
            `}
            fill="#10b98120"
          />

          {/* P25-P75 area */}
          <path
            d={`
              M ${data.map((d, i) => `${(i / (data.length - 1)) * 100},${getY(d.p75)}`).join(' L ')}
              L ${data.map((_d, i) => `${((data.length - 1 - i) / (data.length - 1)) * 100},${getY(data[data.length - 1 - i].p25)}`).join(' L ')}
              Z
            `}
            fill="#10b98140"
          />

          {/* Median line */}
          <path
            d={`M ${data.map((d, i) => `${(i / (data.length - 1)) * 100},${getY(d.p50)}`).join(' L ')}`}
            stroke="#10b981"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{formatCurrency(maxValue, true)}</span>
          <span>{formatCurrency(minValue, true)}</span>
        </div>
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between text-xs px-4" style={{ color: 'var(--text-muted)' }}>
        {data.map((d, i) => (
          <span key={i}>Year {d.year}</span>
        ))}
      </div>
    </div>
  );
});

export const MonteCarloResultsComponent = memo(function MonteCarloResultsComponent({
  results,
  isLoading,
  onRunSimulation,
}: MonteCarloResultsProps) {
  // Histogram data for final balance distribution
  const histogramData = useMemo(() => {
    if (!results) return [];

    const balances = results.simulations.map(s => s.finalCorporateBalance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const bucketCount = 20;
    const bucketSize = (max - min) / bucketCount;

    const buckets: Array<{ min: number; max: number; count: number }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = bucketMin + bucketSize;
      const count = balances.filter(b => b >= bucketMin && b < bucketMax).length;
      buckets.push({ min: bucketMin, max: bucketMax, count });
    }

    return buckets;
  }, [results]);

  const maxBucketCount = Math.max(...histogramData.map(b => b.count), 1);

  if (!results && !isLoading) {
    return (
      <div
        className="p-6 rounded-xl text-center"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="text-4xl mb-3">🎲</div>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Monte Carlo Simulation
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Run 1,000+ simulations to understand the range of possible outcomes.
        </p>
        {onRunSimulation && (
          <button
            onClick={onRunSimulation}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md"
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
            }}
          >
            Run Simulation
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="p-6 rounded-xl text-center"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Running simulations...
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Analyzing thousands of possible scenarios
        </p>
      </div>
    );
  }

  if (!results) return null;

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span>🎲</span>
              Monte Carlo Analysis
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {results.config.numSimulations.toLocaleString()} simulations • {results.executionTimeMs.toFixed(0)}ms
            </p>
          </div>

          {/* Probability gauges */}
          <div className="flex items-center gap-6">
            <ProbabilityGauge
              probability={results.probabilityOfMeetingGoal}
              label="Growth likelihood"
              isPositive={true}
            />
            <ProbabilityGauge
              probability={results.probabilityOfLoss}
              label="Loss likelihood"
              isPositive={false}
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Key metrics with confidence intervals */}
        <div className="grid gap-4 md:grid-cols-2">
          <PercentileBar
            data={results.finalCorporateBalance}
            label="Final Corporate Balance"
            format="currency"
            colorScheme="blue"
          />
          <PercentileBar
            data={results.totalTax}
            label="Total Tax Paid"
            format="currency"
            colorScheme="red"
          />
          <PercentileBar
            data={results.totalAfterTaxIncome}
            label="Total After-Tax Income"
            format="currency"
            colorScheme="green"
          />
          <PercentileBar
            data={results.integratedTaxRate}
            label="Integrated Tax Rate"
            format="percent"
            colorScheme="red"
          />
        </div>

        {/* Year-by-year projection */}
        <YearlyDistributionChart data={results.yearlyBalanceDistribution} />

        {/* Histogram */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Final Balance Distribution
          </h4>
          <div className="flex items-end h-24 gap-0.5 rounded-lg p-2" style={{ background: 'var(--bg-base)' }}>
            {histogramData.map((bucket, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${(bucket.count / maxBucketCount) * 100}%`,
                  background: '#10b981',
                  border: '1px solid rgba(110, 231, 183, 0.2)',
                  minHeight: bucket.count > 0 ? '2px' : '0',
                }}
                title={`${formatCurrency(bucket.min)} - ${formatCurrency(bucket.max)}: ${bucket.count} simulations`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{formatCurrency(results.finalCorporateBalance.min)}</span>
            <span>{formatCurrency(results.finalCorporateBalance.max)}</span>
          </div>
        </div>

        {/* Key insights */}
        <div
          className="p-4 rounded-lg text-sm"
          style={{
            background: 'var(--bg-base)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="flex items-start gap-2">
            <span>💡</span>
            <div className="space-y-1">
              <p>
                <strong>Most likely outcome:</strong> Your corporate balance will end between{' '}
                <span style={{ color: 'var(--accent-primary)' }}>
                  {formatCurrency(results.finalCorporateBalance.p25)}
                </span>{' '}
                and{' '}
                <span style={{ color: 'var(--accent-primary)' }}>
                  {formatCurrency(results.finalCorporateBalance.p75)}
                </span>{' '}
                (50% confidence).
              </p>
              <p>
                <strong>Risk:</strong> There's a{' '}
                <span style={{ color: results.probabilityOfLoss > 30 ? '#f87171' : '#059669' }}>
                  {results.probabilityOfLoss.toFixed(1)}%
                </span>{' '}
                chance your balance falls below the starting value.
              </p>
            </div>
          </div>
        </div>

        {/* Run again button */}
        {onRunSimulation && (
          <div className="flex justify-center">
            <button
              onClick={onRunSimulation}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Run Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default MonteCarloResultsComponent;
