/**
 * Email to Accountant Button
 *
 * Generates a mailto: link with pre-filled subject and body
 * containing key summary numbers and the share URL.
 */

import type { UserInputs, ProjectionSummary } from '../lib/types';
import type { ComparisonResult } from '../lib/strategyComparison';
import { PROVINCES } from '../lib/tax/provinces';
import { generateShareUrl } from '../lib/shareLink';
import { formatCurrency, formatPercentage } from '../lib/utils';

interface EmailAccountantButtonProps {
  inputs: UserInputs | null;
  summary: ProjectionSummary | null;
  comparison?: ComparisonResult | null;
  disabled?: boolean;
}

function buildMailtoUrl(inputs: UserInputs, summary: ProjectionSummary, comparison?: ComparisonResult | null): string {
  const provinceName = PROVINCES[inputs.province].name;
  const year = inputs.startingYear;
  const shareUrl = generateShareUrl(inputs);

  const subject = `Optimal Compensation Plan — ${year} - ${provinceName}`;

  const salaryPct = summary.totalCompensation > 0
    ? ((summary.totalSalary / summary.totalCompensation) * 100).toFixed(0)
    : '0';
  const divPct = summary.totalCompensation > 0
    ? (((summary.totalDividends) / summary.totalCompensation) * 100).toFixed(0)
    : '0';

  const strategyLabel = inputs.salaryStrategy === 'dynamic'
    ? 'Dynamic (Optimized)'
    : inputs.salaryStrategy === 'fixed'
      ? `Fixed Salary (${formatCurrency(inputs.fixedSalaryAmount || 0)})`
      : 'Dividends Only';

  const body = [
    'Hi,',
    '',
    `I've run an optimal compensation analysis for my CCPC using the Optimal Compensation Calculator. Here are the key results for your review:`,
    '',
    `SUMMARY (${inputs.planningHorizon}-Year Projection, ${provinceName})`,
    '---',
    `Strategy: ${strategyLabel}`,
    `Compensation Mix: ${salaryPct}% salary / ${divPct}% dividends`,
    `Avg Annual After-Tax Income: ${formatCurrency(summary.averageAnnualIncome)}`,
    `Combined Effective Tax Rate: ${formatPercentage(summary.effectiveTaxRate)}`,
    `Final Corporate Balance: ${formatCurrency(summary.finalCorporateBalance)}`,
    `RRSP Room Generated: ${formatCurrency(summary.totalRRSPRoomGenerated)}`,
    `Total RDTOH Refunds: ${formatCurrency(summary.totalRdtohRefund)}`,
    '',
    'KEY INPUTS',
    '---',
    `Annual Corporate Net Income: ${formatCurrency(inputs.annualCorporateRetainedEarnings)}`,
    `Required After-Tax Income: ${formatCurrency(inputs.requiredIncome)}/yr`,
    `Corporate Investment Balance: ${formatCurrency(inputs.corporateInvestmentBalance)}`,
    `Expected Return: ${formatPercentage(inputs.investmentReturnRate)} | Inflation: ${formatPercentage(inputs.expectedInflationRate)}`,
    ...(comparison ? [
      '',
      'STRATEGY COMPARISON',
      '---',
      ...comparison.strategies.map(s => {
        const tag = s.id === comparison.winner.bestOverall ? ' <-- RECOMMENDED' : '';
        return `${s.label}: Tax ${formatCurrency(s.summary.totalTax)} | Rate ${formatPercentage(s.summary.effectiveTaxRate)} | Balance ${formatCurrency(s.summary.finalCorporateBalance)}${tag}`;
      }),
      '',
      `Recommendation: ${comparison.strategies.find(s => s.id === comparison.winner.bestOverall)?.label || 'Dynamic Optimizer'} strategy`,
    ] : []),
    '',
    `VIEW FULL INTERACTIVE RESULTS:`,
    shareUrl,
    '',
    `The link above opens the calculator with all my inputs pre-filled. You can export a detailed PDF report from within the calculator.`,
    ...(summary.ipp ? [
      '',
      'IPP (INDIVIDUAL PENSION PLAN)',
      '---',
      `Total IPP Contributions: ${formatCurrency(summary.ipp.totalContributions)}`,
      `Corporate Tax Savings: ${formatCurrency(summary.ipp.totalCorporateTaxSavings)}`,
      `Total Admin Costs: ${formatCurrency(summary.ipp.totalAdminCosts)}`,
      `RRSP Room Reduced (PA): ${formatCurrency(summary.ipp.totalPensionAdjustments)}`,
      `Projected Annual Pension: ${formatCurrency(summary.ipp.projectedAnnualPensionAtEnd)}`,
    ] : []),
    ...(inputs.hasSpouse && summary.spouse ? [
      '',
      'SPOUSE COMPENSATION',
      '---',
      `Spouse Required Income: ${formatCurrency(inputs.spouseRequiredIncome || 0)}/yr`,
      `Spouse Strategy: ${inputs.spouseSalaryStrategy === 'dynamic' ? 'Dynamic (Optimized)' : inputs.spouseSalaryStrategy === 'fixed' ? `Fixed Salary (${formatCurrency(inputs.spouseFixedSalaryAmount || 0)})` : 'Dividends Only'}`,
      `Spouse Total Salary: ${formatCurrency(summary.spouse.totalSalary)}`,
      `Spouse Total After-Tax: ${formatCurrency(summary.spouse.totalAfterTaxIncome)}`,
      `Spouse Personal Tax: ${formatCurrency(summary.spouse.totalPersonalTax)}`,
    ] : []),
    '',
    'Please let me know if you have any questions or would like to discuss the recommended strategy.',
    '',
    'Best regards',
  ].join('\n');

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function EmailAccountantButton({ inputs, summary, comparison, disabled = false }: EmailAccountantButtonProps) {
  const isDisabled = disabled || !inputs || !summary;

  const handleClick = () => {
    if (!inputs || !summary) return;
    const mailtoUrl = buildMailtoUrl(inputs, summary, comparison);
    window.location.href = mailtoUrl;
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        color: isDisabled ? 'var(--text-dim)' : 'var(--text-secondary)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
      }}
      title={isDisabled ? 'Calculate results first' : 'Email results to your accountant'}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <span className="text-sm font-medium">Email Accountant</span>
    </button>
  );
}
