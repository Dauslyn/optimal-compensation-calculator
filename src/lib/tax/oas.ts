/**
 * OAS (Old Age Security) Module
 *
 * Projects OAS retirement benefits including:
 * - Age-based maximum benefit (65-74 vs 75+ supplement)
 * - Deferral bonus (0.6%/month after 65, max 36% at age 70)
 * - Clawback (recovery tax) with iterative solver for circular dependency
 *
 * 2025 base values from CRA, projected forward with inflation.
 */

// ─── Constants (2025 base) ────────────────────────────────────────────────────

const OAS_BASE_YEAR = 2025;
const OAS_MAX_MONTHLY_65_74 = 727.67;   // Max monthly OAS (age 65-74), Q1 2025
const OAS_MAX_MONTHLY_75_PLUS = 800.44; // Max monthly OAS (age 75+), 10% supplement
const OAS_CLAWBACK_THRESHOLD_2025 = 93454;
const OAS_CLAWBACK_RATE = 0.15;  // 15 cents per dollar over threshold

// Deferral: 0.6% per month after 65 (max 36% at 70, i.e., 60 months)
const OAS_DEFERRAL_BONUS_PER_MONTH = 0.006;
const OAS_MAX_DEFERRAL_MONTHS = 60; // 5 years × 12

const OAS_MIN_START_AGE = 65;
const OAS_MAX_START_AGE = 70;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OASResult {
  grossOAS: number;     // Annual OAS before clawback
  clawback: number;     // Annual recovery tax
  netOAS: number;       // Annual OAS after clawback
}

export interface OASInputs {
  calendarYear: number;
  age: number;
  oasStartAge: number;
  oasEligible: boolean;
  baseIncomeBeforeOAS: number;  // Taxable income excluding OAS (for clawback calc)
  inflationRate: number;
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Get the maximum annual OAS benefit for a given year, age, and start age.
 * Includes deferral bonus and age 75+ supplement.
 * Projected from 2025 base using inflation.
 */
export function getMaxOASBenefit(
  calendarYear: number,
  age: number,
  startAge: number,
  inflationRate: number,
): number {
  if (age < startAge) return 0;

  const clampedStart = Math.max(OAS_MIN_START_AGE, Math.min(OAS_MAX_START_AGE, startAge));

  // Base monthly amount (projected from 2025)
  const yearsFromBase = calendarYear - OAS_BASE_YEAR;
  const inflationFactor = Math.pow(1 + inflationRate, yearsFromBase);

  const baseMonthly = age >= 75
    ? OAS_MAX_MONTHLY_75_PLUS * inflationFactor
    : OAS_MAX_MONTHLY_65_74 * inflationFactor;

  // Deferral bonus: 0.6% per month deferred past 65
  const deferralMonths = Math.min(
    (clampedStart - OAS_MIN_START_AGE) * 12,
    OAS_MAX_DEFERRAL_MONTHS,
  );
  const deferralFactor = 1 + deferralMonths * OAS_DEFERRAL_BONUS_PER_MONTH;

  return baseMonthly * deferralFactor * 12;
}

/**
 * Get the OAS clawback threshold for a given calendar year.
 * Projected from 2025 base using inflation.
 */
export function getClawbackThreshold(
  calendarYear: number,
  inflationRate: number,
): number {
  const yearsFromBase = calendarYear - OAS_BASE_YEAR;
  return OAS_CLAWBACK_THRESHOLD_2025 * Math.pow(1 + inflationRate, yearsFromBase);
}

/**
 * Solve OAS with clawback using iterative approach.
 *
 * The circular dependency: OAS is taxable income, which affects the
 * clawback, which affects the OAS amount. We iterate to convergence.
 *
 * @param baseIncome Taxable income BEFORE OAS
 * @param maxOAS Maximum annual OAS (from getMaxOASBenefit)
 * @param threshold Clawback threshold for the year
 * @returns { grossOAS, clawback, netOAS }
 */
export function solveOASWithClawback(
  baseIncome: number,
  maxOAS: number,
  threshold: number,
): OASResult {
  if (maxOAS <= 0) {
    return { grossOAS: 0, clawback: 0, netOAS: 0 };
  }

  // If base income alone exceeds full clawback point, OAS is fully clawed back
  // Full clawback = threshold + maxOAS / 0.15
  const fullClawbackIncome = threshold + maxOAS / OAS_CLAWBACK_RATE;
  if (baseIncome >= fullClawbackIncome) {
    return { grossOAS: maxOAS, clawback: maxOAS, netOAS: 0 };
  }

  // If base income is below threshold, no clawback (no circular dependency)
  if (baseIncome + maxOAS <= threshold) {
    return { grossOAS: maxOAS, clawback: 0, netOAS: maxOAS };
  }

  // Iterative solver (converges in 3-5 iterations)
  let netOAS = maxOAS;
  for (let i = 0; i < 10; i++) {
    const totalIncome = baseIncome + netOAS;
    const excessIncome = Math.max(0, totalIncome - threshold);
    const clawback = Math.min(maxOAS, excessIncome * OAS_CLAWBACK_RATE);
    const newNetOAS = maxOAS - clawback;

    if (Math.abs(newNetOAS - netOAS) < 0.01) {
      netOAS = newNetOAS;
      break;
    }
    netOAS = newNetOAS;
  }

  const clawback = maxOAS - netOAS;
  return { grossOAS: maxOAS, clawback, netOAS };
}

/**
 * Calculate OAS for a retirement year.
 * Top-level function combining all OAS logic.
 */
export function calculateOAS(inputs: OASInputs): OASResult {
  const { calendarYear, age, oasStartAge, oasEligible, baseIncomeBeforeOAS, inflationRate } = inputs;

  if (!oasEligible || age < oasStartAge) {
    return { grossOAS: 0, clawback: 0, netOAS: 0 };
  }

  const maxOAS = getMaxOASBenefit(calendarYear, age, oasStartAge, inflationRate);
  const threshold = getClawbackThreshold(calendarYear, inflationRate);

  return solveOASWithClawback(baseIncomeBeforeOAS, maxOAS, threshold);
}
