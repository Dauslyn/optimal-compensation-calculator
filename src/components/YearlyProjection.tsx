import type { YearlyResult } from '../lib/types';

interface YearlyProjectionProps {
  results: YearlyResult[];
}

export function YearlyProjection({ results }: YearlyProjectionProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format with + prefix for positive additions
  const formatAddition = (amount: number): string => {
    if (amount === 0) return '—';
    const formatted = formatCurrency(amount);
    return amount > 0 ? `+${formatted}` : formatted;
  };

  const TableSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <div className="mt-6 first:mt-0">
      <div className="mb-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}
        >
          {title}
        </h3>
        {description && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{description}</p>
        )}
      </div>
      <div
        className="overflow-x-auto rounded-xl"
        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className="glass-card p-6">
      <h2 className="font-semibold text-lg mb-6">Year-by-Year Projection</h2>

      {/* Income Flow & Contributions - Shows how target becomes total required */}
      <TableSection
        title="Income Flow & Contributions"
        description="How your target after-tax income builds up to total required income, including contributions"
      >
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Target Income</th>
              <th>+ TFSA</th>
              <th>+ RRSP</th>
              <th>+ Debt</th>
              <th>= Required</th>
              <th>After-Tax</th>
              <th>RRSP Room</th>
            </tr>
          </thead>
          <tbody>
            {results.map((year) => {
              return (
                <tr key={year.year}>
                  <td>Year {year.year}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{formatCurrency(year.afterTaxIncome)}</td>
                  <td style={{ color: '#a3e635' }}>{year.tfsaContribution > 0 ? `+${formatCurrency(year.tfsaContribution)}` : '—'}</td>
                  <td style={{ color: '#6ee7b7' }}>{year.rrspContribution > 0 ? `+${formatCurrency(year.rrspContribution)}` : '—'}</td>
                  <td style={{ color: '#d4a017' }}>{year.debtPaydown > 0 ? `+${formatCurrency(year.debtPaydown)}` : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(year.afterTaxIncome + year.tfsaContribution + year.rrspContribution + year.debtPaydown)}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{formatCurrency(year.afterTaxIncome)}</td>
                  <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.rrspRoomGenerated)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableSection>

      {/* Compensation Table */}
      <TableSection title="Compensation Breakdown">
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Salary</th>
              <th>Capital Div</th>
              <th>Eligible Div</th>
              <th>Non-Elig Div</th>
              <th>Personal Tax</th>
              <th>Payroll</th>
              <th>After-Tax</th>
            </tr>
          </thead>
          <tbody>
            {results.map((year) => (
              <tr key={year.year}>
                <td>Year {year.year}</td>
                <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.salary)}</td>
                <td style={{ color: '#a3e635' }}>{formatCurrency(year.dividends.capitalDividends)}</td>
                <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.dividends.eligibleDividends)}</td>
                <td style={{ color: '#d4a017' }}>{formatCurrency(year.dividends.nonEligibleDividends)}</td>
                <td style={{ color: '#fb7185' }}>{formatCurrency(year.personalTax)}</td>
                <td style={{ color: '#fb7185' }}>{formatCurrency(year.cpp + year.cpp2 + year.ei + year.qpip)}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(year.afterTaxIncome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      {/* Spouse Compensation (only when spouse data exists) */}
      {results.some(r => r.spouse) && (
        <TableSection
          title="Spouse Compensation Breakdown"
          description="Spouse draws from same corporate accounts after primary shareholder"
        >
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Salary</th>
                <th>Capital Div</th>
                <th>Eligible Div</th>
                <th>Non-Elig Div</th>
                <th>Personal Tax</th>
                <th>Payroll</th>
                <th>After-Tax</th>
              </tr>
            </thead>
            <tbody>
              {results.map((year) => year.spouse ? (
                <tr key={year.year}>
                  <td>Year {year.year}</td>
                  <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.spouse.salary)}</td>
                  <td style={{ color: '#a3e635' }}>{formatCurrency(year.spouse.dividends.capitalDividends)}</td>
                  <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.spouse.dividends.eligibleDividends)}</td>
                  <td style={{ color: '#d4a017' }}>{formatCurrency(year.spouse.dividends.nonEligibleDividends)}</td>
                  <td style={{ color: '#fb7185' }}>{formatCurrency(year.spouse.personalTax)}</td>
                  <td style={{ color: '#fb7185' }}>{formatCurrency(year.spouse.cpp + year.spouse.cpp2 + year.spouse.ei + year.spouse.qpip)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(year.spouse.afterTaxIncome)}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </TableSection>
      )}

      {/* IPP Contributions (only when IPP data exists) */}
      {results.some(r => r.ipp) && (
        <TableSection
          title="IPP Contributions"
          description="Individual Pension Plan — corporate deductions, pension adjustments, and projected pension"
        >
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Age</th>
                <th>IPP Contribution</th>
                <th>Admin Costs</th>
                <th>Total Deductible</th>
                <th>Pension Adj (PA)</th>
                <th>Corp Tax Savings</th>
                <th>Projected Pension</th>
              </tr>
            </thead>
            <tbody>
              {results.map((year) => year.ipp ? (
                <tr key={year.year}>
                  <td>Year {year.year}</td>
                  <td>{year.ipp.memberAge}</td>
                  <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.ipp.contribution)}</td>
                  <td>{formatCurrency(year.ipp.adminCosts)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(year.ipp.totalDeductible)}</td>
                  <td style={{ color: '#fb7185' }}>{formatCurrency(year.ipp.pensionAdjustment)}</td>
                  <td style={{ color: '#a3e635' }}>{formatCurrency(year.ipp.corporateTaxSavings)}</td>
                  <td style={{ color: '#d4a017' }}>{formatCurrency(year.ipp.projectedAnnualPension)}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </TableSection>
      )}

      {/* Spouse IPP Contributions (only when spouse IPP data exists) */}
      {results.some(r => r.spouse?.ipp) && (
        <TableSection
          title="Spouse IPP Contributions"
          description="Spouse's Individual Pension Plan — draws from same corporate account"
        >
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Age</th>
                <th>IPP Contribution</th>
                <th>Admin Costs</th>
                <th>Total Deductible</th>
                <th>Pension Adj (PA)</th>
                <th>Corp Tax Savings</th>
                <th>Projected Pension</th>
              </tr>
            </thead>
            <tbody>
              {results.map((year) => year.spouse?.ipp ? (
                <tr key={year.year}>
                  <td>Year {year.year}</td>
                  <td>{year.spouse.ipp.memberAge}</td>
                  <td style={{ color: '#6ee7b7' }}>{formatCurrency(year.spouse.ipp.contribution)}</td>
                  <td>{formatCurrency(year.spouse.ipp.adminCosts)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(year.spouse.ipp.totalDeductible)}</td>
                  <td style={{ color: '#fb7185' }}>{formatCurrency(year.spouse.ipp.pensionAdjustment)}</td>
                  <td style={{ color: '#a3e635' }}>{formatCurrency(year.spouse.ipp.corporateTaxSavings)}</td>
                  <td style={{ color: '#d4a017' }}>{formatCurrency(year.spouse.ipp.projectedAnnualPension)}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </TableSection>
      )}

      {/* Notional Accounts with Flow View */}
      <TableSection
        title="Notional Account Activity"
        description="Shows additions from investment activity, utilization for dividends, and ending balances"
      >
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>CDA Added</th>
              <th>CDA Used</th>
              <th>CDA Balance</th>
              <th>GRIP Added</th>
              <th>GRIP Used</th>
              <th>GRIP Balance</th>
            </tr>
          </thead>
          <tbody>
            {results.map((year) => (
              <tr key={year.year}>
                <td>Year {year.year}</td>
                <td style={{ color: '#a3e635' }}>{formatAddition(year.investmentReturns.CDAIncrease)}</td>
                <td style={{ color: '#fb7185' }}>{year.dividends.capitalDividends > 0 ? `-${formatCurrency(year.dividends.capitalDividends)}` : '—'}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(year.notionalAccounts.CDA)}</td>
                <td style={{ color: '#6ee7b7' }}>{formatAddition(year.investmentReturns.GRIPIncrease)}</td>
                <td style={{ color: '#fb7185' }}>{year.dividends.eligibleDividends > 0 ? `-${formatCurrency(year.dividends.eligibleDividends)}` : '—'}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(year.notionalAccounts.GRIP)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      {/* RDTOH Accounts */}
      <TableSection
        title="RDTOH (Refundable Dividend Tax)"
        description="Tax refunded when dividends are paid - shows additions from investment tax and refunds on dividend payments"
      >
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>eRDTOH Added</th>
              <th>eRDTOH Balance</th>
              <th>nRDTOH Added</th>
              <th>nRDTOH Balance</th>
              <th>Total RDTOH</th>
            </tr>
          </thead>
          <tbody>
            {results.map((year) => (
              <tr key={year.year}>
                <td>Year {year.year}</td>
                <td style={{ color: '#6ee7b7' }}>{formatAddition(year.investmentReturns.eRDTOHIncrease)}</td>
                <td style={{ fontWeight: 500 }}>{formatCurrency(year.notionalAccounts.eRDTOH)}</td>
                <td style={{ color: '#d4a017' }}>{formatAddition(year.investmentReturns.nRDTOHIncrease)}</td>
                <td style={{ fontWeight: 500 }}>{formatCurrency(year.notionalAccounts.nRDTOH)}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(year.notionalAccounts.eRDTOH + year.notionalAccounts.nRDTOH)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      {/* Corporate Investment Balance */}
      <TableSection
        title="Corporate Investment Account"
        description="Shows investment returns, compensation paid (gross), and ending balance"
      >
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Investment Return</th>
              <th>CDN Dividends</th>
              <th>Foreign Income</th>
              <th>Capital Gains</th>
              <th>Compensation Paid</th>
              <th>Ending Balance</th>
            </tr>
          </thead>
          <tbody>
            {results.map((year) => {
              const totalWithdrawals = year.salary + year.dividends.grossDividends;
              return (
                <tr key={year.year}>
                  <td>Year {year.year}</td>
                  <td style={{ color: '#a3e635' }}>{formatAddition(year.investmentReturns.totalReturn)}</td>
                  <td>{formatCurrency(year.investmentReturns.canadianDividends)}</td>
                  <td>{formatCurrency(year.investmentReturns.foreignIncome)}</td>
                  <td>{formatCurrency(year.investmentReturns.realizedCapitalGain)}</td>
                  <td style={{ color: '#fb7185' }}>{totalWithdrawals > 0 ? `-${formatCurrency(totalWithdrawals)}` : '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(year.notionalAccounts.corporateInvestments)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableSection>

      {/* Tax Detail */}
      <TableSection title="Tax Breakdown Detail">
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Personal Tax</th>
              <th>CPP</th>
              <th>CPP2</th>
              <th>EI</th>
              <th>Prov. Surtax</th>
              <th>Health Prem.</th>
              <th>Corp Tax</th>
              <th>Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {results.map((year) => (
              <tr key={year.year}>
                <td>Year {year.year}</td>
                <td>{formatCurrency(year.personalTax)}</td>
                <td>{formatCurrency(year.cpp)}</td>
                <td>{formatCurrency(year.cpp2)}</td>
                <td>{formatCurrency(year.ei)}</td>
                <td>{formatCurrency(year.provincialSurtax)}</td>
                <td>{formatCurrency(year.healthPremium)}</td>
                <td>{formatCurrency(year.corporateTax)}</td>
                <td style={{ fontWeight: 600, color: '#fb7185' }}>{formatCurrency(year.totalTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>
    </div>
  );
}
