import { memo } from 'react';
import type { YearlyResult } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';

interface ActionPlanTableProps {
  yearlyResults: YearlyResult[];
}

export const ActionPlanTable = memo(function ActionPlanTable({
  yearlyResults,
}: ActionPlanTableProps) {
  const firstRetirementIdx = yearlyResults.findIndex(y => y.phase === 'retirement');

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
        Your Action Plan
      </h4>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Year</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Salary / CPP</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Dividends / OAS</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Total Comp / RRIF</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>After-Tax</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Corp Balance</th>
            </tr>
          </thead>
          <tbody>
            {yearlyResults.map((year, idx) => {
              const isRetirement = year.phase === 'retirement' || year.phase === 'estate';
              const isFirstRetirement = idx === firstRetirementIdx;

              return (
                <>
                  {isFirstRetirement && (
                    <tr key={`break-${year.year}`}>
                      <td
                        colSpan={6}
                        className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider"
                        style={{
                          color: 'var(--text-muted)',
                          background: 'rgba(110,231,183,0.06)',
                          borderTop: '2px solid rgba(110,231,183,0.3)',
                          borderBottom: '1px solid rgba(110,231,183,0.15)',
                        }}
                      >
                        — Retirement —
                      </td>
                    </tr>
                  )}
                  <tr
                    key={year.year}
                    style={{
                      borderBottom: idx < yearlyResults.length - 1
                        ? '1px solid var(--border-subtle)'
                        : undefined,
                      background: isRetirement ? 'rgba(110,231,183,0.03)' : undefined,
                    }}
                  >
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {year.calendarYear ?? year.year}
                    </td>
                    <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                      {isRetirement
                        ? formatCurrency(year.retirement?.cppIncome ?? 0)
                        : formatCurrency(year.salary)}
                    </td>
                    <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                      {isRetirement
                        ? formatCurrency(year.retirement?.oasNet ?? 0)
                        : formatCurrency(year.dividends.grossDividends)}
                    </td>
                    <td className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {isRetirement
                        ? formatCurrency(year.retirement?.rrifWithdrawal ?? 0)
                        : formatCurrency(year.salary + year.dividends.grossDividends)}
                    </td>
                    <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(year.afterTaxIncome)}
                    </td>
                    <td className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(year.notionalAccounts?.corporateInvestments ?? 0, true)}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
