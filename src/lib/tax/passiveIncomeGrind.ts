/**
 * Passive Income Grind (SBD Clawback) Module
 *
 * CCPCs with significant passive investment income face a reduction in their
 * small business deduction (SBD) limit. This "grind" reduces the $500,000
 * SBD limit by $5 for every $1 of adjusted aggregate investment income (AAII)
 * above $50,000, completely eliminating the SBD at $150,000 of passive income.
 *
 * Key formulas:
 * - AAII = Adjusted Aggregate Investment Income (mainly investment income)
 * - If AAII <= $50,000: Full $500,000 SBD available
 * - If AAII > $50,000: SBD reduced by 5 × (AAII - $50,000)
 * - If AAII >= $150,000: SBD = $0 (fully grinded out)
 *
 * This significantly impacts tax planning for CCPCs with large investment portfolios.
 */

/**
 * Constants for the passive income grind calculation
 */
export const PASSIVE_INCOME_CONSTANTS = {
  // Threshold below which no grind applies
  threshold: 50000,

  // Base small business deduction limit
  sbdLimit: 500000,

  // Grind rate: $5 reduction per $1 of excess passive income
  grindRate: 5,

  // Maximum passive income before SBD is completely eliminated
  // At $150,000: reduction = 5 × (150,000 - 50,000) = $500,000 = full SBD
  maxPassiveBeforeZeroSBD: 150000,
} as const;

/**
 * Calculate the reduced SBD limit based on passive investment income
 *
 * @param passiveIncome - Total adjusted aggregate investment income (AAII)
 * @param businessLimit - Associated corporation's total business limit (default $500,000)
 * @returns Reduced SBD limit after passive income grind
 */
export function calculateReducedSBDLimit(
  passiveIncome: number,
  businessLimit: number = PASSIVE_INCOME_CONSTANTS.sbdLimit
): number {
  // No reduction if below threshold
  if (passiveIncome <= PASSIVE_INCOME_CONSTANTS.threshold) {
    return businessLimit;
  }

  // Calculate the grind: $5 reduction for every $1 over threshold
  const excessPassiveIncome = passiveIncome - PASSIVE_INCOME_CONSTANTS.threshold;
  const sbdReduction = excessPassiveIncome * PASSIVE_INCOME_CONSTANTS.grindRate;

  // Reduced SBD cannot be negative
  return Math.max(0, businessLimit - sbdReduction);
}

/**
 * Calculate passive income from investment components
 *
 * AAII (Adjusted Aggregate Investment Income) typically includes:
 * - Interest income
 * - Foreign income
 * - Taxable capital gains (50% of capital gains)
 * - Rental income (less expenses)
 * - Royalties (passive)
 *
 * AAII excludes:
 * - Canadian dividends from connected corporations
 * - Active business income
 * - Income from lending money as part of a business
 *
 * @param interestIncome - Interest and fixed income
 * @param foreignIncome - Foreign dividends and income
 * @param taxableCapitalGains - 50% of realized capital gains
 * @param otherPassiveIncome - Other rental/passive income
 * @returns Total AAII
 */
export function calculateAAII(
  interestIncome: number,
  foreignIncome: number,
  taxableCapitalGains: number,
  otherPassiveIncome: number = 0
): number {
  return interestIncome + foreignIncome + taxableCapitalGains + otherPassiveIncome;
}

/**
 * Calculate the corporate tax rate to use based on SBD availability
 *
 * @param activeBusinessIncome - Income eligible for small business rate
 * @param reducedSBDLimit - SBD limit after passive income grind
 * @param smallBusinessRate - Provincial small business rate (varies by province)
 * @param generalRate - Provincial general rate (varies by province)
 * @returns Effective blended corporate tax rate
 */
export function calculateEffectiveCorporateRate(
  activeBusinessIncome: number,
  reducedSBDLimit: number,
  smallBusinessRate: number,
  generalRate: number
): { effectiveRate: number; sbdIncome: number; generalIncome: number } {
  // Income that qualifies for SBD
  const sbdIncome = Math.min(activeBusinessIncome, reducedSBDLimit);

  // Income taxed at general rate (exceeds SBD limit)
  const generalIncome = Math.max(0, activeBusinessIncome - reducedSBDLimit);

  // Calculate blended rate
  if (activeBusinessIncome <= 0) {
    return { effectiveRate: 0, sbdIncome: 0, generalIncome: 0 };
  }

  const effectiveRate =
    (sbdIncome * smallBusinessRate + generalIncome * generalRate) / activeBusinessIncome;

  return { effectiveRate, sbdIncome, generalIncome };
}

/**
 * Full passive income grind calculation with all details
 */
export interface PassiveIncomeGrindResult {
  // Input summary
  totalPassiveIncome: number;

  // Grind calculation
  excessPassiveIncome: number;    // Amount over $50,000 threshold
  sbdReduction: number;           // Dollar reduction in SBD limit
  reducedSBDLimit: number;        // New SBD limit after grind

  // Status indicators
  isFullyGrounded: boolean;       // true if SBD = $0
  grindPercentage: number;        // 0-100% of SBD lost to grind

  // Tax impact estimate (for active business income at SBD level)
  additionalTaxFromGrind: number; // Estimated extra tax from losing SBD
}

/**
 * Calculate detailed passive income grind impact
 *
 * @param passiveIncome - Total AAII (adjusted aggregate investment income)
 * @param activeBusinessIncome - Active business income amount
 * @param smallBusinessRate - Combined federal + provincial small business rate (varies by province)
 * @param generalRate - Combined federal + provincial general rate (varies by province)
 * @returns Detailed grind calculation results
 */
export function calculatePassiveIncomeGrind(
  passiveIncome: number,
  activeBusinessIncome: number = 0,
  smallBusinessRate: number,
  generalRate: number
): PassiveIncomeGrindResult {
  const { threshold, sbdLimit, grindRate } = PASSIVE_INCOME_CONSTANTS;

  // Calculate excess passive income and grind
  const excessPassiveIncome = Math.max(0, passiveIncome - threshold);
  const sbdReduction = excessPassiveIncome * grindRate;
  const reducedSBDLimit = Math.max(0, sbdLimit - sbdReduction);

  // Calculate status
  const isFullyGrounded = reducedSBDLimit === 0;
  const grindPercentage = sbdLimit > 0 ? (sbdReduction / sbdLimit) * 100 : 0;

  // Estimate additional tax from losing SBD
  // Compare tax with full SBD vs reduced SBD
  const incomeAffected = Math.min(activeBusinessIncome, sbdReduction);
  const rateDifference = generalRate - smallBusinessRate;
  const additionalTaxFromGrind = incomeAffected * rateDifference;

  return {
    totalPassiveIncome: passiveIncome,
    excessPassiveIncome,
    sbdReduction,
    reducedSBDLimit,
    isFullyGrounded,
    grindPercentage: Math.min(100, grindPercentage),
    additionalTaxFromGrind: Math.max(0, additionalTaxFromGrind),
  };
}

/**
 * Quick check if passive income will trigger any SBD grind
 */
export function willTriggerGrind(passiveIncome: number): boolean {
  return passiveIncome > PASSIVE_INCOME_CONSTANTS.threshold;
}

/**
 * Calculate passive income headroom before grind starts
 */
export function calculatePassiveIncomeHeadroom(currentPassiveIncome: number): number {
  return Math.max(0, PASSIVE_INCOME_CONSTANTS.threshold - currentPassiveIncome);
}

/**
 * Calculate how much more passive income until SBD is fully eliminated
 */
export function calculatePassiveIncomeUntilFullGrind(currentPassiveIncome: number): number {
  return Math.max(0, PASSIVE_INCOME_CONSTANTS.maxPassiveBeforeZeroSBD - currentPassiveIncome);
}
