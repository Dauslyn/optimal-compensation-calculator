import { useRef, useMemo, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import type { ProjectionSummary, UserInputs } from '../lib/types';
import { ReportTemplate } from './ReportTemplate';
import { StrategyComparison } from './StrategyComparison';
import { IPPAnalysis } from './IPPAnalysis';
import { EmailCapture } from './EmailCapture';
import { RRSP_ANNUAL_LIMIT } from '../lib/tax';
import { getProvincialTaxData } from '../lib/tax/provincialRates';
import { runStrategyComparison, type ComparisonResult } from '../lib/strategyComparison';

interface SummaryProps {
  summary: ProjectionSummary;
  inputs: UserInputs;
  comparison: ComparisonResult | null;
  onCompare: (result: ComparisonResult) => void;
}

export function Summary({ summary, inputs, comparison, onCompare }: SummaryProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [clientName, setClientName] = useState('');
  const [isComparing, setIsComparing] = useState(false);

  const handleCompare = async () => {
    setIsComparing(true);
    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 50));
    const result = runStrategyComparison(inputs);
    onCompare(result);
    setIsComparing(false);
  };

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

  // Combined federal (9%) + provincial small business corporate tax rate
  const combinedSmallBusinessRate = useMemo(() => {
    const provincialData = getProvincialTaxData(inputs.province, inputs.startingYear);
    return 0.09 + provincialData.corporateSmallBusinessRate;
  }, [inputs.province, inputs.startingYear]);

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
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name (optional)"
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              width: '180px',
            }}
            title="Optional: Add a client name for the PDF report header"
          />
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
        <ReportTemplate ref={componentRef} summary={summary} inputs={inputs} clientName={clientName || undefined} comparison={comparison} />
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
        <div className="text-sm font-semibold mb-4">Average Effective Tax Rates ({summary.yearlyResults.length}-Year)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Avg Integrated Rate
            </div>
            <div className="text-2xl font-bold" style={{ color: '#818cf8' }}>
              {formatPercent(summary.effectiveCompensationRate)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Corp + personal tax
            </div>
          </div>

          <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Avg Investment Tax
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
              Avg Combined Rate
            </div>
            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
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

      {/* Family Breakdown (when spouse is enabled) */}
      {summary.spouse && (
        <div
          className="p-5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-sm font-semibold mb-4">Family Breakdown</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-label">Primary Salary</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.totalSalary - summary.spouse.totalSalary)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spouse Salary</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.spouse.totalSalary)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Primary Dividends</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.totalDividends - summary.spouse.totalDividends)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spouse Dividends</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.spouse.totalDividends)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Primary Personal Tax</div>
              <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.totalPersonalTax - summary.spouse.totalPersonalTax)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spouse Personal Tax</div>
              <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.spouse.totalPersonalTax)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spouse After-Tax</div>
              <div className="stat-value positive" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.spouse.totalAfterTaxIncome)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spouse RRSP Room</div>
              <div className="stat-value accent" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.spouse.totalRRSPRoomGenerated)}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* IPP Projection Impact (when IPP is integrated into the engine) */}
      {summary.ipp && (
        <div
          className="p-5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-sm font-semibold mb-4">IPP Impact ({summary.yearlyResults.length}-Year Projection)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-label">Total IPP Contributions</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.ipp.totalContributions)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Corp Tax Savings</div>
              <div className="stat-value positive" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.ipp.totalCorporateTaxSavings)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">RRSP Room Reduced (PA)</div>
              <div className="stat-value negative" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.ipp.totalPensionAdjustments)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Projected Annual Pension</div>
              <div className="stat-value accent" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(summary.ipp.projectedAnnualPensionAtEnd)}
              </div>
            </div>
          </div>
          {summary.ipp.totalAdminCosts > 0 && (
            <div className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              Total admin/actuarial costs: {formatCurrency(summary.ipp.totalAdminCosts)} (included as corporate deduction)
            </div>
          )}
          {summary.spouse?.ipp && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Spouse IPP</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="stat-card">
                  <div className="stat-label">Spouse IPP Contributions</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                    {formatCurrency(summary.spouse.ipp.totalContributions)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Spouse Admin Costs</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                    {formatCurrency(summary.spouse.ipp.totalAdminCosts)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Spouse PA (RRSP Reduced)</div>
                  <div className="stat-value negative" style={{ fontSize: '1.1rem' }}>
                    {formatCurrency(summary.spouse.ipp.totalPensionAdjustments)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IPP Point-in-Time Comparison (standalone analysis widget) */}
      {inputs.considerIPP && typeof inputs.ippMemberAge === 'number' && typeof inputs.ippYearsOfService === 'number' && (
        <IPPAnalysis
          memberAge={inputs.ippMemberAge}
          yearsOfService={inputs.ippYearsOfService}
          currentSalary={summary.totalSalary / summary.yearlyResults.length}
          corporateTaxRate={combinedSmallBusinessRate}
          rrspLimit={RRSP_ANNUAL_LIMIT}
          year={inputs.startingYear}
        />
      )}

      {/* Strategy Comparison */}
      <div className="pt-2">
        {!comparison ? (
          <button
            onClick={handleCompare}
            disabled={isComparing}
            className="w-full py-4 rounded-xl text-sm font-semibold transition-all hover:shadow-lg"
            style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, #3b82f6, #8b5cf6))',
              color: 'white',
              opacity: isComparing ? 0.7 : 1,
            }}
          >
            {isComparing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Comparing strategies...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare All 3 Strategies
              </span>
            )}
          </button>
        ) : (
          <div className="animate-slide-up">
            <StrategyComparison comparison={comparison} />
          </div>
        )}
      </div>

      {/* Email Capture */}
      <EmailCapture source="calculator-results" />
    </div>
  );
}
