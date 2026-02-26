/**
 * Tooltip Component
 *
 * Provides hover/click tooltips for explaining complex tax concepts.
 */

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Check if mobile on mount
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);

    const handleResize = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close tooltip when clicking outside (for mobile)
  useEffect(() => {
    if (!isVisible || !isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, isMobile]);

  const handleClick = () => {
    if (isMobile) {
      setIsVisible(!isVisible);
    }
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--bg-card-solid)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--bg-card-solid)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--bg-card-solid)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--bg-card-solid)] border-y-transparent border-l-transparent',
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => !isMobile && setIsVisible(true)}
      onMouseLeave={() => !isMobile && setIsVisible(false)}
      onClick={handleClick}
    >
      {children || (
        <svg
          className="w-4 h-4 cursor-help"
          style={{ color: 'var(--text-dim)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ width: 'max-content', maxWidth: '280px' }}
        >
          <div
            className="px-3 py-2 text-xs rounded-lg shadow-lg"
            style={{
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
            }}
          >
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
          />
        </div>
      )}
    </span>
  );
}

/**
 * Info label with built-in tooltip
 */
interface InfoLabelProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
}

export function InfoLabel({ label, tooltip, htmlFor }: InfoLabelProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {label}
      <Tooltip content={tooltip} />
    </label>
  );
}

import type { ProvinceCode } from '../lib/tax/provinces';
import { PROVINCES } from '../lib/tax/provinces';
import { getProvincialTaxData } from '../lib/tax/provincialRates';
import { getTaxYearData } from '../lib/tax/indexation';

/**
 * Get province-aware tooltips for common tax concepts
 */
export function getTaxTooltips(province: ProvinceCode, year: number) {
  const provinceName = PROVINCES[province].name;
  const provincialData = getProvincialTaxData(province, year);
  const yearData = getTaxYearData(year);
  const combinedSBRate = (0.09 + provincialData.corporateSmallBusinessRate) * 100;
  const combinedGenRate = (0.15 + provincialData.corporateGeneralRate) * 100;
  const ympe = yearData.cpp.ympe.toLocaleString('en-CA');
  const yampe = yearData.cpp2.secondCeiling.toLocaleString('en-CA');

  // Province-specific surtax tooltip
  let surtaxTooltip = '';
  if (provincialData.surtax) {
    const s = provincialData.surtax;
    surtaxTooltip = `Additional tax of ${(s.firstRate * 100).toFixed(0)}% on ${provinceName} tax over $${s.firstThreshold.toLocaleString('en-CA')} and ${(s.secondRate * 100).toFixed(0)}% on tax over $${s.secondThreshold.toLocaleString('en-CA')} (${year} indexed values).`;
  } else if (provincialData.peiSurtax) {
    const s = provincialData.peiSurtax;
    surtaxTooltip = `Additional tax of ${(s.rate * 100).toFixed(0)}% on ${provinceName} tax over $${s.threshold.toLocaleString('en-CA')}.`;
  }

  // Province-specific health premium tooltip
  let healthPremiumTooltip = '';
  if (provincialData.healthPremium) {
    const maxBracket = provincialData.healthPremium.brackets[provincialData.healthPremium.brackets.length - 1];
    healthPremiumTooltip = `Provincial health levy ranging from $0 to $${maxBracket.maxPremium.toLocaleString('en-CA')} based on taxable income. Not indexed to inflation.`;
  }

  return {
    cda: 'Capital Dividend Account - A notional account tracking the tax-free portion of capital gains. Capital dividends paid from the CDA are tax-free to shareholders.',
    erdtoh: 'Eligible Refundable Dividend Tax on Hand - Tracks refundable taxes paid on investment income from eligible dividends. Refunded when eligible dividends are paid.',
    nrdtoh: 'Non-Eligible Refundable Dividend Tax on Hand - Tracks refundable taxes paid on passive investment income. Refunded when non-eligible dividends are paid.',
    grip: 'General Rate Income Pool - Tracks income taxed at the general corporate rate. Allows payment of eligible dividends even from a CCPC.',
    eligibleDividend: 'Dividends paid from income taxed at the general corporate rate. Higher gross-up (38%) but also higher dividend tax credits, resulting in lower personal tax.',
    nonEligibleDividend: 'Dividends paid from income taxed at the small business rate. Lower gross-up (15%) and lower dividend tax credits, resulting in higher personal tax.',
    rdtohRefund: 'When dividends are paid, the corporation gets a refund of 38.33% of the dividend amount from RDTOH balances.',
    cpp: 'Canada Pension Plan - Mandatory payroll deduction on employment income. Both employee and employer contribute equally.',
    cpp2: `CPP2 (Enhanced CPP) - Additional CPP contributions on earnings between YMPE ($${ympe}) and YAMPE ($${yampe}) at 4% rate.`,
    ei: 'Employment Insurance - Payroll deduction for employment benefits. Employer pays 1.4x the employee contribution.',
    ympe: `Year's Maximum Pensionable Earnings - The income ceiling for base CPP contributions ($${ympe} for ${year}).`,
    yampe: `Year's Additional Maximum Pensionable Earnings - The ceiling for CPP2 contributions ($${yampe} for ${year}).`,
    surtax: surtaxTooltip,
    healthPremium: healthPremiumTooltip,
    smallBusinessRate: `Combined federal + provincial rate of ${combinedSBRate.toFixed(1)}% (${provinceName}) on active business income up to $500,000.`,
    generalCorporateRate: `Combined federal + provincial rate of ${combinedGenRate.toFixed(1)}% (${provinceName}) on income above the small business limit.`,
    passiveIncomeGrind: 'When passive income exceeds $50,000, the small business deduction is reduced by $5 for every $1 of passive income.',
    investmentReturnRate: 'Expected annual total return on corporate investments, combining dividend income, interest, and capital gains.',
    inflationRate: 'Expected annual inflation rate. Used to project future tax brackets, CPP/EI limits, and optionally your spending needs.',
  };
}

/**
 * Static tooltips for backward compatibility (uses generic descriptions)
 * @deprecated Use getTaxTooltips(province, year) for province-aware tooltips
 */
export const TAX_TOOLTIPS = {
  cda: 'Capital Dividend Account - A notional account tracking the tax-free portion of capital gains. Capital dividends paid from the CDA are tax-free to shareholders.',
  erdtoh: 'Eligible Refundable Dividend Tax on Hand - Tracks refundable taxes paid on investment income from eligible dividends. Refunded when eligible dividends are paid.',
  nrdtoh: 'Non-Eligible Refundable Dividend Tax on Hand - Tracks refundable taxes paid on passive investment income. Refunded when non-eligible dividends are paid.',
  grip: 'General Rate Income Pool - Tracks income taxed at the general corporate rate. Allows payment of eligible dividends even from a CCPC.',
  eligibleDividend: 'Dividends paid from income taxed at the general corporate rate. Higher gross-up (38%) but also higher dividend tax credits, resulting in lower personal tax.',
  nonEligibleDividend: 'Dividends paid from income taxed at the small business rate. Lower gross-up (15%) and lower dividend tax credits, resulting in higher personal tax.',
  rdtohRefund: 'When dividends are paid, the corporation gets a refund of 38.33% of the dividend amount from RDTOH balances.',
  cpp: 'Canada Pension Plan - Mandatory payroll deduction on employment income. Both employee and employer contribute equally.',
  cpp2: 'CPP2 (Enhanced CPP) - Additional CPP contributions on earnings between YMPE and YAMPE at 4% rate.',
  ei: 'Employment Insurance - Payroll deduction for employment benefits. Employer pays 1.4x the employee contribution.',
  ympe: "Year's Maximum Pensionable Earnings - The income ceiling for base CPP contributions.",
  yampe: "Year's Additional Maximum Pensionable Earnings - The ceiling for CPP2 contributions.",
  smallBusinessRate: 'Combined federal + provincial rate on active business income up to $500,000.',
  passiveIncomeGrind: 'When passive income exceeds $50,000, the small business deduction is reduced by $5 for every $1 of passive income.',
  investmentReturnRate: 'Expected annual total return on corporate investments, combining dividend income, interest, and capital gains.',
  inflationRate: 'Expected annual inflation rate. Used to project future tax brackets, CPP/EI limits, and optionally your spending needs.',
};

/**
 * Comprehensive input field tooltips for all calculator inputs.
 * Used in InputFormClean and the PDF report assumptions section.
 */
export const INPUT_TOOLTIPS = {
  // Basic Information
  province: 'Your province or territory of residence. Determines provincial tax rates, brackets, surtaxes, health premiums, and dividend tax credits applied to your compensation.',
  requiredIncome: 'The after-tax cash you need each year for personal living expenses. The calculator works backward from this target to determine optimal salary/dividend mix. Does not include RRSP/TFSA contributions or debt payments — those are added on top.',
  corporateInvestmentBalance: 'Total current value of investments held inside your corporation (e.g., brokerage account, GICs). This balance earns passive income and can be drawn down via dividends to fund your income needs.',
  annualCorporateRetainedEarnings: 'Your corporation\'s net income after business expenses, but before any owner compensation. Enter revenue minus overhead (rent, staff, equipment, etc.) — not your gross billings. Salary and dividends are deducted from this amount; the remainder is taxed at the small business rate and retained inside the corporation.',
  planningHorizon: 'Number of years to project. Longer horizons show compounding effects of tax deferral and notional account depletion. Most useful at 5-10 years for meaningful planning.',
  investmentReturnRate: 'Expected annual total return on corporate investments, combining dividend income, interest, and capital gains. A balanced portfolio typically returns 4-6%. The return is split by your portfolio composition below to determine the tax character of income.',

  // Inflation & Indexing
  startingYear: 'The first tax year for the projection. 2026 uses CRA-published bracket values. Later years are projected using your inflation rate.',
  inflationRate: 'Used for TWO purposes: (1) projecting tax brackets, CPP/EI limits, and contribution limits for years beyond published CRA values, and (2) optionally increasing your required income each year if "Inflate Spending Needs" is checked.',
  inflateSpendingNeeds: 'When enabled, your required after-tax income increases by the inflation rate each year. For example, $100,000 at 2% inflation becomes $102,000 in Year 2, $104,040 in Year 3, etc. Disable this if you want a fixed nominal income target.',

  // Portfolio Composition
  canadianEquity: 'Allocation to Canadian stocks or equity ETFs. Returns are split into eligible dividends (taxed favorably via gross-up/credit mechanism) and capital gains (50% taxable, with CDA credit).',
  usEquity: 'Allocation to US stocks or equity ETFs. Returns are treated as foreign income (fully taxable) and capital gains. No dividend tax credit available — higher tax cost than Canadian equities.',
  internationalEquity: 'Allocation to international (non-US) stocks or equity ETFs. Same tax treatment as US equity — foreign income and capital gains.',
  fixedIncome: 'Allocation to bonds, GICs, or fixed-income ETFs. Returns are 100% interest income — fully taxable at the highest corporate rate with no preferential treatment. Consider holding fixed income in registered accounts.',

  // Notional Accounts
  cdaBalance: 'Capital Dividend Account balance from your T2 Schedule 89. Tracks the tax-free portion of capital gains and life insurance proceeds. Capital dividends paid from CDA are completely tax-free to you as a shareholder.',
  gripBalance: 'General Rate Income Pool balance from your T2 Schedule 53. Tracks income taxed at the general corporate rate (not the small business rate). Enables payment of eligible dividends, which receive preferential personal tax treatment.',
  erdtohBalance: 'Eligible RDTOH balance from your T2 Schedule 3 (Part IV). Refundable tax on eligible dividends received from connected corporations. Refunded at 38.33% when eligible dividends are paid out.',
  nrdtohBalance: 'Non-Eligible RDTOH balance from your T2 Schedule 3 (Part I). Refundable tax on passive investment income. Refunded at 38.33% when non-eligible dividends are paid out. This is the key mechanism that reduces effective tax on passive income.',
  rrspRoom: 'Your available RRSP contribution room from your CRA My Account or Notice of Assessment. Created by earning salary (18% of prior year earned income, up to annual max). Salary generates RRSP room; dividends do not.',
  tfsaRoom: 'Your available TFSA contribution room from your CRA My Account. Accumulated since age 18 (or 2009) at $5,000-$7,000/year. Unlike RRSP, TFSA room is not affected by your compensation strategy.',

  // Compensation Strategy
  salaryStrategy: 'All strategies aim to meet your required after-tax income target. Dynamic: The calculator optimizes the salary vs dividend split each year to minimize total integrated tax. Fixed: You lock in a salary amount, and dividends automatically cover any remaining gap to hit your income target. Dividends Only: No salary is paid — all compensation comes as dividends (no RRSP room generated, no CPP contributions).',
  fixedSalaryAmount: 'The annual salary your corporation pays you. Any shortfall between your after-tax salary and your required income target is automatically funded with dividends. Common choices: just above CPP maximum ($74,600 in 2026) for full CPP, or higher to generate RRSP room.',
  maximizeTFSA: 'Contribute the annual TFSA limit from after-tax personal funds. TFSA contributions are not tax-deductible but all growth and withdrawals are permanently tax-free. Reduces your available after-tax cash.',
  contributeToRRSP: 'Use available RRSP room to make tax-deductible contributions. Reduces personal taxable income in the current year. Only available if you have RRSP room (generated by salary, not dividends).',

  // Debt Management
  includeDebt: 'Factor debt payments into your required cash flow. Debt payments are made from after-tax personal income, increasing the gross compensation needed from your corporation.',
  totalDebtAmount: 'Total outstanding debt balance (e.g., mortgage, student loans, LOC). Used to track remaining balance as you pay it down over the planning horizon.',
  annualDebtPayment: 'Annual amount allocated to debt paydown from after-tax personal funds. Added on top of your required income — the calculator ensures enough compensation to cover both living expenses and debt payments.',
  debtInterestRate: 'Annual interest rate on your outstanding debt. Used to calculate interest costs and remaining balance each year. Consider whether this debt is tax-deductible (e.g., investment loan) — this calculator treats all debt payments as personal expenses.',

  // IPP
  includeIPP: 'Compare Individual Pension Plan (IPP) contributions to RRSP. IPP allows higher tax-deductible contributions for older individuals (typically 40+). The corporation contributes directly, getting a corporate tax deduction. Requires an actuary ($2,000-3,000/year).',
  ippAge: 'Your current age. IPP contribution limits increase with age — the older you are, the larger the advantage over RRSP. IPP becomes most beneficial around age 45-50+.',
  ippYearsOfService: 'Years you have been employed by your corporation. Past service can be bought back when establishing an IPP, allowing a large initial contribution. More service years = larger IPP contributions.',
  ippMode: 'Select whether you are evaluating starting an IPP or already have one established.',
  ippBest3AvgSalary: 'Your 3 highest years of T4 employment income, averaged. Used to calculate your maximum pension entitlement. Leave blank to use your current required income as a proxy.',
  ippPastServiceYears: 'Years of employment by your corporation before the IPP was set up. Past service recognized at inception increases your pension entitlement.',
  ippExistingFundBalance: 'Current fair market value of your IPP investment fund. Found on your most recent investment statement.',
  ippLastValuationYear: 'The year of your most recent formal actuarial valuation report. CRA requires a valuation at least every 3 years.',
  ippLastValuationLiability: 'The actuarial liability (target funding amount) from your most recent valuation report. Your actuary calculates this.',
  ippLastValuationAnnualContribution: 'The recommended annual current service cost from your most recent valuation report.',

  // Spouse / Second Shareholder
  hasSpouse: 'Enable to include a spouse or second shareholder who draws salary and/or dividends from the same CCPC. The family\'s total tax is optimized across two sets of personal tax brackets sharing one set of corporate accounts (CDA, RDTOH, GRIP).',
  spouseRequiredIncome: 'The after-tax cash the spouse needs each year for personal expenses. Calculated independently using their own personal tax brackets and BPA. The calculator determines the optimal salary/dividend mix for the spouse after the primary shareholder\'s compensation is funded.',
  spouseSalaryStrategy: 'The spouse can have a different salary strategy from the primary shareholder. Dynamic optimizes automatically, Fixed uses a set salary amount, and Dividends Only pays no salary (generates no RRSP room for the spouse).',
  spouseFixedSalaryAmount: 'If using Fixed strategy for the spouse, this is the annual salary paid to the spouse from the corporation. Subject to its own CPP/EI contributions.',
  spouseRRSPRoom: 'The spouse\'s available RRSP contribution room. Only relevant if the spouse is being paid salary, which generates RRSP room (18% of earned income, up to the annual max).',
  spouseTFSARoom: 'The spouse\'s available TFSA contribution room. Independent of the primary shareholder — each person has their own cumulative TFSA limit.',

  // Spouse IPP
  spouseConsiderIPP: 'Enable Individual Pension Plan analysis for the spouse. Like the primary IPP, this provides a corporate tax deduction based on the spouse\'s salary (pensionable earnings). Both IPPs draw from the same corporate account.',
  spouseIPPAge: 'The spouse\'s current age for IPP actuarial calculations. IPP contribution limits increase with age — the older the member, the larger the allowed contribution.',
  spouseIPPYearsOfService: 'Years the spouse has been employed by the corporation. More years of service = larger IPP contributions and projected pension benefit.',

  // Lifetime Model
  currentAge: 'Your current age. Determines the accumulation phase length (from now to retirement) and total planning horizon.',
  retirementAge: 'The age you plan to stop working and start drawing down. At this age, the model switches from salary/dividend optimization to retirement income planning (CPP, OAS, RRIF, dividends).',
  planningEndAge: 'The age to project to. Typically 85-95 for longevity planning. The model runs accumulation, retirement drawdown, and estate calculation through this age.',
  retirementSpending: "Annual after-tax spending target in retirement, in today's dollars. The model inflates this each year by your inflation rate — so $70,000 today becomes ~$104,000 in year 20 at 2% inflation.",
  lifetimeObjective: 'How to determine the "best" strategy. Maximize Spending: highest lifetime after-tax income. Maximize Estate: largest after-tax value at death. Balanced: weighted 60% spending, 40% estate.',
  cppStartAge: 'When to start CPP benefits (60-70). Starting at 60 reduces benefits by 36%. Waiting to 70 increases by 42%. Age 65 is the standard start with no adjustment.',
  salaryStartAge: 'The age you first started earning employment income. Used to build CPP contributory earnings history for years before the projection starts.',
  averageHistoricalSalary: 'Your average employment income before the projection period. Used to estimate CPP contributions from prior working years.',
  oasEligible: 'Whether you qualify for Old Age Security. Requires 10+ years of Canadian residency after age 18. OAS is clawed back at higher incomes.',
  oasStartAge: 'When to start OAS benefits (65-70). Deferring past 65 increases benefits by 0.6% per month (max 36% at age 70).',
  actualRRSPBalance: 'Current market value of your RRSP/RRIF. Different from RRSP "room" — this is the actual balance that grows with investment returns and is drawn down in retirement.',
  actualTFSABalance: 'Current market value of your TFSA holdings. Different from TFSA "room" — this is the actual balance. TFSA withdrawals in retirement are tax-free.',

  // Spouse Lifetime
  spouseCurrentAge: 'The spouse\'s current age. May differ from primary — the model handles different retirement timing.',
  spouseRetirementAge: 'When the spouse plans to stop working. Can be different from the primary shareholder.',
  spouseCPPStartAge: 'When the spouse will start CPP benefits (60-70).',
  spouseOASEligible: 'Whether the spouse qualifies for Old Age Security.',
  spouseOASStartAge: 'When the spouse will start OAS benefits (65-70).',
  spouseActualRRSPBalance: 'Current market value of the spouse\'s RRSP/RRIF holdings.',
  spouseActualTFSABalance: 'Current market value of the spouse\'s TFSA holdings.',
};
