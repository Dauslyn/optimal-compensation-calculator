import { memo } from 'react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import { formatCurrency } from '../../lib/formatters';

interface AfterTaxWealthTableProps {
  comparison: ComparisonResult;
}

export const AfterTaxWealthTable = memo(function AfterTaxWealthTable({
  comparison,
}: AfterTaxWealthTableProps) {
  const { strategies } = comparison;

  const bestAtLower = strategies.reduce((best, s) =>
    s.trueAfterTaxWealth.atLowerRate > best.trueAfterTaxWealth.atLowerRate ? s : best
  );
  const bestAtCurrent = strategies.reduce((best, s) =>
    s.trueAfterTaxWealth.atCurrentRate > best.trueAfterTaxWealth.atCurrentRate ? s : best
  );
  const bestAtTop = strategies.reduce((best, s) =>
    s.trueAfterTaxWealth.atTopRate > best.trueAfterTaxWealth.atTopRate ? s : best
  );

  const assumptions = strategies[0].trueAfterTaxWealth.assumptions;

  const scenarios = [
    {
      label: `Retire at lower rate (${Math.round(assumptions.lowerRRSPWithdrawalRate * 100)}%)`,
      key: 'atLowerRate' as const,
      bestId: bestAtLower.id,
    },
    {
      label: `Retire at current rate (${Math.round(assumptions.currentRRSPWithdrawalRate * 100)}%)`,
      key: 'atCurrentRate' as const,
      bestId: bestAtCurrent.id,
    },
    {
      label: `Retire at top rate (${Math.round(assumptions.topRRSPWithdrawalRate * 100)}%)`,
      key: 'atTopRate' as const,
      bestId: bestAtTop.id,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
          After-Tax Wealth Reality Check
        </h4>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          If you liquidated everything at end of planning horizon:
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                Scenario
              </th>
              {strategies.map(strategy => (
                <th key={strategy.id} className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                  {strategy.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario, idx) => (
              <tr
                key={scenario.key}
                style={{
                  borderBottom: idx < scenarios.length - 1
                    ? '1px solid var(--border-subtle)'
                    : undefined,
                }}
              >
                <td className="py-3 px-3" style={{ color: 'var(--text-primary)' }}>
                  {scenario.label}
                </td>
                {strategies.map(strategy => (
                  <td
                    key={strategy.id}
                    className="text-right py-3 px-3 font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatCurrency(strategy.trueAfterTaxWealth[scenario.key])}
                    {strategy.id === scenario.bestId && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--accent-success, #10b981)' }}>
                        Best
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        <strong>Best = highest after-tax wealth in this scenario.</strong>{' '}
        Lower retirement rates are more realistic if you reduce income in retirement.
        Assumes RRSP withdrawals at shown rates and{' '}
        {Math.round(assumptions.corpLiquidationRate * 100)}% tax on corporate liquidation.
      </p>
    </div>
  );
});
