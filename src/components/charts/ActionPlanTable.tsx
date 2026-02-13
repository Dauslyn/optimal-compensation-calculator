import { memo } from 'react';
import type { YearlyResult } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';

interface ActionPlanTableProps {
  yearlyResults: YearlyResult[];
}

export const ActionPlanTable = memo(function ActionPlanTable({
  yearlyResults,
}: ActionPlanTableProps) {
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
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Salary</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Dividends</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Total Comp</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>After-Tax</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Corp Balance</th>
            </tr>
          </thead>
          <tbody>
            {yearlyResults.map((year, idx) => (
              <tr
                key={year.year}
                style={{
                  borderBottom: idx < yearlyResults.length - 1
                    ? '1px solid var(--border-subtle)'
                    : undefined,
                }}
              >
                <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {year.year}
                </td>
                <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(year.salary)}
                </td>
                <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(year.dividends.grossDividends)}
                </td>
                <td className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(year.salary + year.dividends.grossDividends)}
                </td>
                <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(year.afterTaxIncome)}
                </td>
                <td className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(year.notionalAccounts.corporateInvestments, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
