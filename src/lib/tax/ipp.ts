/**
 * Individual Pension Plan (IPP) Calculations
 *
 * IPP is a defined benefit pension plan for business owners and key employees.
 * Contributions are tax-deductible for the corporation and provide tax-deferred
 * growth similar to RRSPs but with higher contribution limits.
 *
 * Key characteristics:
 * - Defined benefit based on 2% of pensionable earnings per year of service
 * - Higher contribution limits than RRSP (especially for older individuals)
 * - Corporation deducts contributions as business expense
 * - Member pays no personal tax until retirement withdrawals
 * - Actuarial costs must be considered (administration fees)
 *
 * CRA rules: T4040 RRSPs and Other Registered Plans for Retirement
 */

// IPP contribution limits by year (CRA prescribed amounts)
const IPP_LIMITS: Record<number, {
  maxPensionableBenefit: number;  // Maximum pension per year of service
  dbLimit: number;                 // Defined benefit limit (1/9 of money purchase limit)
}> = {
  2025: {
    maxPensionableBenefit: 3610.67,  // 2% of YMPE is approximately this
    dbLimit: 3610.67,
  },
  2026: {
    maxPensionableBenefit: 3725.00,  // Estimated based on indexation
    dbLimit: 3725.00,
  },
};

// Actuarial assumption: discount rate for calculating present value
const ACTUARIAL_DISCOUNT_RATE = 0.0525; // 5.25% typical assumption

// Normal retirement age for IPP calculations
const NORMAL_RETIREMENT_AGE = 65;

interface IPPContributionResult {
  currentServiceCost: number;       // Annual contribution for current year
  pastServiceCost: number;          // One-time contribution for past years (if any)
  totalAnnualContribution: number;  // Total deductible contribution
  projectedAnnualPension: number;   // Projected annual pension at retirement
  rrspRoomReduction: number;        // RRSP room reduced by PA (Pension Adjustment)
  effectiveTaxSavings: number;      // Corporate tax savings from deduction
  breakEvenAge: number;             // Age at which IPP beats RRSP
}

interface IPPMemberInfo {
  age: number;
  yearsOfService: number;           // Years employed by corporation
  currentSalary: number;            // Current pensionable earnings
  pastServiceEarnings?: number[];   // Historical earnings for past service
}

/**
 * Calculate maximum pension benefit per year of service
 */
function getMaxBenefitPerYear(year: number): number {
  const limits = IPP_LIMITS[year] ?? IPP_LIMITS[2026];
  return limits.maxPensionableBenefit;
}

/**
 * Calculate the annual pension benefit based on service and earnings
 *
 * Benefit formula: 2% × years of service × average best 3 years earnings
 * Subject to CRA maximum
 */
function calculateAnnualPension(
  yearsOfService: number,
  averageEarnings: number,
  year: number
): number {
  const maxPerYear = getMaxBenefitPerYear(year);

  // Standard defined benefit formula: 2% per year
  const benefitPerYear = averageEarnings * 0.02;

  // Cap at CRA maximum
  const cappedBenefitPerYear = Math.min(benefitPerYear, maxPerYear);

  return cappedBenefitPerYear * yearsOfService;
}

/**
 * Calculate present value factor for pension using actuarial methods
 *
 * This is a simplified version. Real IPP valuations use mortality tables
 * and more complex actuarial assumptions.
 */
function calculatePresentValueFactor(
  currentAge: number,
  retirementAge: number = NORMAL_RETIREMENT_AGE,
  discountRate: number = ACTUARIAL_DISCOUNT_RATE
): number {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  // Simplified: present value of 20-year annuity starting at retirement
  // Real calculation uses mortality tables (CPM2014 or similar)
  const annuityYears = 25; // Average life expectancy from age 65

  // Present value of annuity at retirement
  if (discountRate === 0) return annuityYears;
  const pvAnnuity = (1 - Math.pow(1 + discountRate, -annuityYears)) / discountRate;

  // Discount back to current age
  const pvFactor = pvAnnuity / Math.pow(1 + discountRate, yearsToRetirement);

  return pvFactor;
}

/**
 * Calculate IPP contribution for current service (one year)
 *
 * This is the annual contribution needed to fund one year of pension benefit.
 */
export function calculateCurrentServiceCost(
  memberInfo: IPPMemberInfo,
  year: number
): number {
  const { age, currentSalary } = memberInfo;

  // Calculate the annual pension benefit for one year of service
  const annualBenefitAccrual = calculateAnnualPension(1, currentSalary, year);

  // Calculate present value of that benefit
  const pvFactor = calculatePresentValueFactor(age);

  // Current service cost = present value of one year's accrued benefit
  return annualBenefitAccrual * pvFactor;
}

/**
 * Calculate IPP past service cost
 *
 * If member has years of employment before IPP was established,
 * a lump-sum contribution can be made for those years.
 */
export function calculatePastServiceCost(
  memberInfo: IPPMemberInfo,
  pastYears: number,
  averagePastEarnings: number,
  year: number
): number {
  if (pastYears <= 0) return 0;

  const { age } = memberInfo;

  // Calculate pension benefit for past service
  const pastBenefit = calculateAnnualPension(pastYears, averagePastEarnings, year);

  // Present value of past service benefit
  const pvFactor = calculatePresentValueFactor(age);

  return pastBenefit * pvFactor;
}

/**
 * Calculate Pension Adjustment (PA) for RRSP room reduction
 *
 * PA = (9 × annual pension accrual) - $600
 * This reduces RRSP contribution room
 */
export function calculatePensionAdjustment(
  currentSalary: number,
  year: number
): number {
  const annualBenefitAccrual = calculateAnnualPension(1, currentSalary, year);
  const pa = Math.max(0, (9 * annualBenefitAccrual) - 600);
  return pa;
}

/**
 * Calculate full IPP contribution analysis
 */
export function calculateIPPContribution(
  memberInfo: IPPMemberInfo,
  corporateTaxRate: number,
  year: number
): IPPContributionResult {
  const currentServiceCost = calculateCurrentServiceCost(memberInfo, year);

  // For simplicity, assume no past service unless explicitly provided
  const pastServiceCost = 0;

  const totalAnnualContribution = currentServiceCost + pastServiceCost;

  // Projected annual pension at retirement
  const projectedAnnualPension = calculateAnnualPension(
    memberInfo.yearsOfService + 1, // +1 for current year
    memberInfo.currentSalary,
    year
  );

  // RRSP room reduction (Pension Adjustment)
  const rrspRoomReduction = calculatePensionAdjustment(memberInfo.currentSalary, year);

  // Corporate tax savings
  const effectiveTaxSavings = totalAnnualContribution * corporateTaxRate;

  // Simplified break-even analysis
  // IPP generally better for ages 40+ due to higher contribution limits
  const breakEvenAge = memberInfo.currentSalary > 150000 ? 40 : 45;

  return {
    currentServiceCost,
    pastServiceCost,
    totalAnnualContribution,
    projectedAnnualPension,
    rrspRoomReduction,
    effectiveTaxSavings,
    breakEvenAge,
  };
}

/**
 * Compare IPP vs RRSP contribution limits
 *
 * IPP typically allows higher contributions for older individuals
 */
export function compareIPPvsRRSP(
  memberInfo: IPPMemberInfo,
  rrspLimit: number,
  year: number,
  corporateTaxRate: number = 0.122
): {
  ippContribution: number;
  rrspContribution: number;
  difference: number;
  ippAdvantage: boolean;
  notes: string[];
} {
  const ippResult = calculateIPPContribution(memberInfo, corporateTaxRate, year);
  const ippContribution = ippResult.totalAnnualContribution;

  const difference = ippContribution - rrspLimit;
  const ippAdvantage = difference > 0;

  const notes: string[] = [];

  if (memberInfo.age < 40) {
    notes.push('IPP typically not advantageous under age 40');
  } else if (memberInfo.age >= 50) {
    notes.push('IPP provides significantly higher contribution room at 50+');
  }

  if (memberInfo.currentSalary < 100000) {
    notes.push('IPP benefits increase with higher pensionable earnings');
  }

  if (ippAdvantage) {
    notes.push(`IPP allows $${difference.toFixed(0)} more in annual contributions`);
  } else {
    notes.push('RRSP may be simpler with similar contribution room at your age');
  }

  return {
    ippContribution,
    rrspContribution: rrspLimit,
    difference,
    ippAdvantage,
    notes,
  };
}

/**
 * Estimate annual IPP administration costs
 *
 * IPPs have ongoing costs for actuarial valuations and administration.
 */
export function estimateIPPAdminCosts(): {
  setup: number;
  annualActuarial: number;
  annualAdmin: number;
  triennialValuation: number;
} {
  return {
    setup: 0,              // No setup fee
    annualActuarial: 2500, // Flat annual fee (actuarial + trust administration combined)
    annualAdmin: 0,
    triennialValuation: 0, // No separate triennial review fee (included in flat rate)
  };
}

// Annuity factor at retirement age 65 using 1983 GAM with 3% post-retirement indexing
// This is a CRA-prescribed approximation for planning purposes
const ANNUITY_FACTOR_AT_65 = 12.5;
const PRESCRIBED_DISCOUNT_RATE = 0.075; // ITA Reg 8515

/**
 * Calculate projected annual pension at retirement.
 * Formula: min(2% × best3AvgSalary, DB_limit_at_retirement) × totalYearsOfService
 * Source: ITA Regulation 8504
 */
export function calculateProjectedPension(
  totalYearsOfService: number,
  best3AvgSalary: number,
  retirementYear: number,
): number {
  const limitEntry = IPP_LIMITS[retirementYear] ?? IPP_LIMITS[2026];
  const dbLimit = limitEntry.maxPensionableBenefit;
  const unitPension = Math.min(0.02 * best3AvgSalary, dbLimit);
  return unitPension * totalYearsOfService;
}

/**
 * Estimate the current actuarial target liability by rolling forward
 * from the last triennial valuation using the prescribed 7.5% discount rate.
 * Between-valuation estimate only — not a formal actuarial valuation.
 * Source: ITA Reg 8515; Projected Unit Credit method
 */
export function estimateCurrentTargetLiability(
  lastValuationLiability: number,
  lastValuationYear: number,
  annualCSC: number,
  currentYear: number,
): number {
  const yearsElapsed = Math.max(0, currentYear - lastValuationYear);
  // Liability grows at prescribed 7.5% (unwinding of discount)
  const liabilityGrown = lastValuationLiability * Math.pow(1 + PRESCRIBED_DISCOUNT_RATE, yearsElapsed);
  // Add CSC contributions accumulated at 7.5%
  const cscAccumulated =
    yearsElapsed > 0
      ? annualCSC * ((Math.pow(1 + PRESCRIBED_DISCOUNT_RATE, yearsElapsed) - 1) / PRESCRIBED_DISCOUNT_RATE)
      : 0;
  return liabilityGrown + cscAccumulated;
}

export interface FundingStatus {
  estimatedTargetLiability: number;
  currentFundFMV: number;
  gap: number;               // positive = deficiency (need more contributions)
  surplus: number;           // positive = surplus
  fundingRatio: number;      // fund / liability
  contributionHolidayTriggered: boolean; // fund > 1.25× liability (ITA s.147.2(2)(d))
  deficiencyLikely: boolean; // gap > 0
}

/**
 * Calculate current funding status of an existing IPP.
 */
export function calculateFundingStatus(
  currentFundFMV: number,
  estimatedTargetLiability: number,
): FundingStatus {
  const gap = Math.max(0, estimatedTargetLiability - currentFundFMV);
  const surplus = Math.max(0, currentFundFMV - estimatedTargetLiability);
  const fundingRatio = estimatedTargetLiability > 0 ? currentFundFMV / estimatedTargetLiability : 1;
  return {
    estimatedTargetLiability,
    currentFundFMV,
    gap,
    surplus,
    fundingRatio,
    contributionHolidayTriggered: currentFundFMV > estimatedTargetLiability * 1.25,
    deficiencyLikely: gap > 0,
  };
}

/**
 * Estimate terminal funding room available at retirement.
 * This is the additional deductible lump-sum the corporation can contribute
 * at pension commencement to bridge fund shortfall to annuity cost.
 */
export function estimateTerminalFunding(
  projectedFundAtRetirement: number,
  projectedAnnualPension: number,
): number {
  const annuityCost = projectedAnnualPension * ANNUITY_FACTOR_AT_65;
  return Math.max(0, annuityCost - projectedFundAtRetirement);
}

/**
 * Calculate effective IPP contribution after admin costs
 */
export function calculateNetIPPBenefit(
  memberInfo: IPPMemberInfo,
  corporateTaxRate: number,
  year: number
): {
  grossContribution: number;
  adminCosts: number;
  netContribution: number;
  taxSavings: number;
  netBenefit: number;
} {
  const ippResult = calculateIPPContribution(memberInfo, corporateTaxRate, year);
  const adminCosts = estimateIPPAdminCosts();

  const annualAdminCost = adminCosts.annualActuarial + adminCosts.annualAdmin +
    (adminCosts.triennialValuation / 3); // Amortized

  const grossContribution = ippResult.totalAnnualContribution;
  const netContribution = grossContribution - annualAdminCost;
  const taxSavings = (grossContribution + annualAdminCost) * corporateTaxRate;
  const netBenefit = netContribution + taxSavings;

  return {
    grossContribution,
    adminCosts: annualAdminCost,
    netContribution,
    taxSavings,
    netBenefit,
  };
}
