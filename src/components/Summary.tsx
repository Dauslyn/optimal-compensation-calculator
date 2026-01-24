import type { ProjectionSummary } from '../lib/types';

interface SummaryProps {
  summary: ProjectionSummary;
}

export function Summary({ summary }: SummaryProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (decimal: number): string => {
    return `${(decimal * 100).toFixed(1)}%`;
  };

  const salaryPercent = summary.totalCompensation > 0
    ? (summary.totalSalary / summary.totalCompensation) * 100
    : 0;
  const dividendPercent = 100 - salaryPercent;

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Results Summary</h2>
        <span className="badge badge-success">{summary.yearlyResults.length} Year Projection</span>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Compensation</div>
          <div className="stat-value">{formatCurrency(summary.totalCompensation)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Effective Tax Rate</div>
          <div className={`stat-value ${summary.effectiveTaxRate > 0.35 ? 'negative' : 'positive'}`}>
            {formatPercent(summary.effectiveTaxRate)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Avg Annual Income</div>
          <div className="stat-value">{formatCurrency(summary.averageAnnualIncome)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Final Corp Balance</div>
          <div className={`stat-value ${summary.finalCorporateBalance > 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(summary.finalCorporateBalance)}
          </div>
        </div>
      </div>

      {/* Compensation Mix Bar */}
      <div
        className="p-5 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Compensation Mix</span>
          <div className="flex items-center gap-5 text-xs">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: '#6366f1' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Salary</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: '#34d399' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Dividends</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="h-3 rounded-full overflow-hidden flex"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${salaryPercent}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)'
            }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${dividendPercent}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
            }}
          />
        </div>

        <div className="flex justify-between mt-4">
          <div>
            <div className="text-lg font-bold" style={{ color: '#818cf8' }}>
              {formatCurrency(summary.totalSalary)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {salaryPercent.toFixed(0)}% Salary
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold" style={{ color: '#34d399' }}>
              {formatCurrency(summary.totalDividends)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {dividendPercent.toFixed(0)}% Dividends
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Personal Tax</div>
          <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalPersonalTax)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Corporate Tax</div>
          <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalCorporateTax)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RRSP Room Generated</div>
          <div className="stat-value accent" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalRRSPRoomGenerated)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Taxes Paid</div>
          <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalTax)}
          </div>
        </div>
      </div>
    </div>
  );
}
