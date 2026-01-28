import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import type { ProjectionSummary, UserInputs } from '../lib/types';
import { ReportTemplate } from './ReportTemplate';
import { IPPAnalysis } from './IPPAnalysis';
import { EmailCapture } from './EmailCapture';
import { RRSP_ANNUAL_LIMIT } from '../lib/tax';

interface SummaryProps {
  summary: ProjectionSummary;
  inputs: UserInputs;
}

export function Summary({ summary, inputs }: SummaryProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Optimal_Compensation_Report_${new Date().toISOString().split('T')[0]}`,
  });

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
        <div className="flex items-center gap-3">
          <span className="badge badge-success">{summary.yearlyResults.length} Year Projection</span>
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--accent-primary)] hover:text-white transition-all text-sm font-medium"
            title="Export detailed PDF report"
          >
            <Printer size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Hidden Report Template (only renders for print) */}
      <div style={{ display: 'none' }}>
        <ReportTemplate ref={componentRef} summary={summary} inputs={inputs} />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Compensation</div>
          <div className="stat-value">{formatCurrency(summary.totalCompensation)}</div>
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

        <div className="stat-card">
          <div className="stat-label">RRSP Room Generated</div>
          <div className="stat-value accent" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalRRSPRoomGenerated)}
          </div>
        </div>
      </div>

      {/* Effective Tax Rates by Source */}
      <div
        className="p-5 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="text-sm font-semibold mb-4">Effective Tax Rates by Income Source</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Tax on Compensation
            </div>
            <div className="text-2xl font-bold" style={{ color: '#818cf8' }}>
              {formatPercent(summary.effectiveCompensationRate)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Personal tax + payroll
            </div>
          </div>

          <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Tax on Corp Investments
            </div>
            <div className="text-2xl font-bold" style={{ color: '#fb923c' }}>
              {formatPercent(summary.effectivePassiveRate)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Net after RDTOH refund
            </div>
          </div>

          <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Combined Rate
            </div>
            <div className={`text-2xl font-bold ${summary.effectiveTaxRate > 0.40 ? '' : ''}`} style={{ color: '#ef4444' }}>
              {formatPercent(summary.effectiveTaxRate)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              All taxes / compensation
            </div>
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
          <div className="stat-label">Corp Tax (Active)</div>
          <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalCorporateTaxOnActive)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Corp Tax (Passive)</div>
          <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalCorporateTaxOnPassive)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RDTOH Refund</div>
          <div className="stat-value positive" style={{ fontSize: '1.25rem' }}>
            {formatCurrency(summary.totalRdtohRefund)}
          </div>
        </div>
      </div>

      {/* IPP Analysis (if enabled) */}
      {inputs.considerIPP && inputs.ippMemberAge && inputs.ippYearsOfService && (
        <IPPAnalysis
          memberAge={inputs.ippMemberAge}
          yearsOfService={inputs.ippYearsOfService}
          currentSalary={summary.totalSalary / summary.yearlyResults.length}
          corporateTaxRate={0.122} // Small business rate (Ontario default)
          rrspLimit={RRSP_ANNUAL_LIMIT}
          year={inputs.startingYear}
        />
      )}

      {/* Email Capture */}
      <EmailCapture source="calculator-results" />
    </div>
  );
}
