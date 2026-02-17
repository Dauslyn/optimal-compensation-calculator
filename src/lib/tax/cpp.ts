/**
 * CPP Benefit Projection Module
 *
 * Projects Canada Pension Plan retirement benefits based on earnings history.
 * Implements the three-part benefit structure:
 *   1. Base CPP: 25% of Average Monthly Pensionable Earnings (AMPE)
 *   2. Enhanced CPP (first additional): 8.33% of AMPE, proportional to enhanced years / 40
 *   3. CPP2 (second additional): 33.33% on YAMPE band, proportional to CPP2 years / 40
 *
 * Data sourced from DR Pensions / CRA, verified against published maximums.
 */

// ─── Historical YMPE Table (1966–2026) ───────────────────────────────────────
// Each entry: { ympe, basicExemption, contributionRate }
// YAMPE only exists from 2024+
interface CPPYearData {
  ympe: number;
  basicExemption: number;
  contributionRate: number;
  yampe?: number;       // CPP2 ceiling (2024+)
  cpp2Rate?: number;    // CPP2 contribution rate (2024+)
}

const HISTORICAL_CPP_DATA: Record<number, CPPYearData> = {
  1966: { ympe: 5000, basicExemption: 600, contributionRate: 0.018 },
  1967: { ympe: 5000, basicExemption: 600, contributionRate: 0.018 },
  1968: { ympe: 5100, basicExemption: 600, contributionRate: 0.018 },
  1969: { ympe: 5200, basicExemption: 600, contributionRate: 0.018 },
  1970: { ympe: 5300, basicExemption: 600, contributionRate: 0.018 },
  1971: { ympe: 5400, basicExemption: 600, contributionRate: 0.018 },
  1972: { ympe: 5500, basicExemption: 600, contributionRate: 0.018 },
  1973: { ympe: 5900, basicExemption: 600, contributionRate: 0.018 },
  1974: { ympe: 6600, basicExemption: 700, contributionRate: 0.018 },
  1975: { ympe: 7400, basicExemption: 700, contributionRate: 0.018 },
  1976: { ympe: 8300, basicExemption: 800, contributionRate: 0.018 },
  1977: { ympe: 9300, basicExemption: 900, contributionRate: 0.018 },
  1978: { ympe: 10400, basicExemption: 1000, contributionRate: 0.018 },
  1979: { ympe: 11700, basicExemption: 1100, contributionRate: 0.018 },
  1980: { ympe: 13100, basicExemption: 1300, contributionRate: 0.018 },
  1981: { ympe: 14700, basicExemption: 1400, contributionRate: 0.018 },
  1982: { ympe: 16500, basicExemption: 1600, contributionRate: 0.018 },
  1983: { ympe: 18500, basicExemption: 1800, contributionRate: 0.018 },
  1984: { ympe: 20800, basicExemption: 2000, contributionRate: 0.018 },
  1985: { ympe: 23400, basicExemption: 2300, contributionRate: 0.018 },
  1986: { ympe: 25800, basicExemption: 2500, contributionRate: 0.019 },
  1987: { ympe: 25900, basicExemption: 2500, contributionRate: 0.019 },
  1988: { ympe: 26500, basicExemption: 2600, contributionRate: 0.021 },
  1989: { ympe: 27700, basicExemption: 2700, contributionRate: 0.023 },
  1990: { ympe: 28900, basicExemption: 2800, contributionRate: 0.023 },
  1991: { ympe: 30500, basicExemption: 3000, contributionRate: 0.024 },
  1992: { ympe: 32200, basicExemption: 3200, contributionRate: 0.026 },
  1993: { ympe: 33400, basicExemption: 3300, contributionRate: 0.0275 },
  1994: { ympe: 34400, basicExemption: 3400, contributionRate: 0.029 },
  1995: { ympe: 34900, basicExemption: 3400, contributionRate: 0.0305 },
  1996: { ympe: 35400, basicExemption: 3500, contributionRate: 0.032 },
  1997: { ympe: 35800, basicExemption: 3500, contributionRate: 0.036 },
  1998: { ympe: 36900, basicExemption: 3500, contributionRate: 0.0385 },
  1999: { ympe: 37400, basicExemption: 3500, contributionRate: 0.0395 },
  2000: { ympe: 37600, basicExemption: 3500, contributionRate: 0.0395 },
  2001: { ympe: 38300, basicExemption: 3500, contributionRate: 0.043 },
  2002: { ympe: 39100, basicExemption: 3500, contributionRate: 0.047 },
  2003: { ympe: 39900, basicExemption: 3500, contributionRate: 0.0495 },
  2004: { ympe: 40500, basicExemption: 3500, contributionRate: 0.0495 },
  2005: { ympe: 41100, basicExemption: 3500, contributionRate: 0.0495 },
  2006: { ympe: 42100, basicExemption: 3500, contributionRate: 0.0495 },
  2007: { ympe: 43700, basicExemption: 3500, contributionRate: 0.0495 },
  2008: { ympe: 44900, basicExemption: 3500, contributionRate: 0.0495 },
  2009: { ympe: 46300, basicExemption: 3500, contributionRate: 0.0495 },
  2010: { ympe: 47200, basicExemption: 3500, contributionRate: 0.0495 },
  2011: { ympe: 48300, basicExemption: 3500, contributionRate: 0.0495 },
  2012: { ympe: 50100, basicExemption: 3500, contributionRate: 0.0495 },
  2013: { ympe: 51100, basicExemption: 3500, contributionRate: 0.0495 },
  2014: { ympe: 52500, basicExemption: 3500, contributionRate: 0.0495 },
  2015: { ympe: 53600, basicExemption: 3500, contributionRate: 0.0495 },
  2016: { ympe: 54900, basicExemption: 3500, contributionRate: 0.0495 },
  2017: { ympe: 55300, basicExemption: 3500, contributionRate: 0.0495 },
  2018: { ympe: 55900, basicExemption: 3500, contributionRate: 0.0495 },
  2019: { ympe: 57400, basicExemption: 3500, contributionRate: 0.0510 },
  2020: { ympe: 58700, basicExemption: 3500, contributionRate: 0.0525 },
  2021: { ympe: 61600, basicExemption: 3500, contributionRate: 0.0545 },
  2022: { ympe: 64900, basicExemption: 3500, contributionRate: 0.0570 },
  2023: { ympe: 66600, basicExemption: 3500, contributionRate: 0.0595 },
  2024: { ympe: 68500, basicExemption: 3500, contributionRate: 0.0595, yampe: 73200, cpp2Rate: 0.04 },
  2025: { ympe: 71300, basicExemption: 3500, contributionRate: 0.0595, yampe: 81200, cpp2Rate: 0.04 },
  2026: { ympe: 74600, basicExemption: 3500, contributionRate: 0.0595, yampe: 85000, cpp2Rate: 0.04 },
};

// Enhanced CPP phase-in: fraction of full enhancement credited per year
const ENHANCED_CPP_PHASE_IN: Record<number, number> = {
  2019: 0.15,
  2020: 0.30,
  2021: 0.50,
  2022: 0.75,
  2023: 1.00,
};

// Early/late adjustment factors (applied to absolute months from age 65)
const EARLY_REDUCTION_PER_MONTH = 0.006;  // 0.6% reduction per month before 65
const LATE_INCREASE_PER_MONTH = 0.007;    // 0.7% increase per month after 65

const MIN_CPP_START_AGE = 60;
const MAX_CPP_START_AGE = 70;
const NORMAL_CPP_AGE = 65;
const GENERAL_DROPOUT_FRACTION = 0.17; // Remove bottom 17% of earning months

// ─── Public Functions ─────────────────────────────────────────────────────────

export interface CPPBenefitResult {
  baseCPP: number;          // Annual base CPP (after early/late adjustment)
  enhancedCPP: number;      // Annual enhanced CPP (first additional component)
  cpp2Benefit: number;      // Annual CPP2 benefit (second additional component)
  totalAnnualBenefit: number;
  monthlyBenefit: number;
  ampe: number;             // Average Monthly Pensionable Earnings (for base)
  contributoryMonths: number;
  droppedMonths: number;
}

export interface CPPProjectionInputs {
  birthYear: number;
  salaryStartAge: number;
  averageHistoricalSalary: number;
  projectedSalaries: number[];  // One per projection year, starting from currentAge
  currentAge: number;
  cppStartAge: number;
  inflationRate: number;
}

/**
 * Look up historical CPP data for a given year.
 * Returns undefined for years before 1966.
 */
export function getHistoricalCPPData(year: number): CPPYearData | undefined {
  return HISTORICAL_CPP_DATA[year];
}

/**
 * Get YMPE for any year. Uses historical data through 2026,
 * then projects forward using the inflation rate.
 */
export function getYMPE(year: number, inflationRate: number): number {
  if (year <= 2026) {
    const data = HISTORICAL_CPP_DATA[year];
    if (data) return data.ympe;
    // Before 1966, no CPP
    return 0;
  }
  // Project from 2026 base
  const base2026 = HISTORICAL_CPP_DATA[2026].ympe;
  const yearsForward = year - 2026;
  return Math.round(base2026 * Math.pow(1 + inflationRate, yearsForward));
}

/**
 * Get YAMPE (CPP2 ceiling) for any year.
 * Only exists from 2024+.
 */
export function getYAMPE(year: number, inflationRate: number): number {
  if (year < 2024) return 0;
  if (year <= 2026) {
    return HISTORICAL_CPP_DATA[year].yampe!;
  }
  const base2026 = HISTORICAL_CPP_DATA[2026].yampe!;
  const yearsForward = year - 2026;
  return Math.round(base2026 * Math.pow(1 + inflationRate, yearsForward));
}

/**
 * Get the basic exemption for a year.
 */
function getBasicExemption(year: number): number {
  if (year <= 2026) {
    const data = HISTORICAL_CPP_DATA[year];
    return data ? data.basicExemption : 0;
  }
  // Basic exemption has been $3,500 since 1998 — CRA hasn't indexed it
  return 3500;
}

/**
 * Build the contributory earnings history.
 *
 * Pre-projection years: uses averageHistoricalSalary (capped at that year's YMPE).
 * Projection years: uses projectedSalaries[] (capped at that year's YMPE).
 *
 * The contributory period starts at age 18 (or 1966, whichever is later)
 * and ends at cppStartAge - 1 (or death/age 70, whichever is earlier).
 */
export function buildContributoryEarnings(
  birthYear: number,
  salaryStartAge: number,
  averageHistoricalSalary: number,
  projectedSalaries: number[],
  currentAge: number,
  cppStartAge: number,
  inflationRate: number,
): { earnings: number[]; months: number[]; years: number[] } {
  const startAge = Math.max(18, 1966 - birthYear);
  const endAge = Math.min(cppStartAge - 1, 70);
  const projectionStartYear = birthYear + currentAge;

  const earnings: number[] = [];
  const months: number[] = [];
  const years: number[] = [];

  for (let age = startAge; age <= endAge; age++) {
    const calendarYear = birthYear + age;
    if (calendarYear < 1966) continue;

    const ympe = getYMPE(calendarYear, inflationRate);
    const basicExemption = getBasicExemption(calendarYear);

    let salary: number;
    if (calendarYear < projectionStartYear) {
      // Historical: use average salary (or 0 if before they started working)
      salary = age >= salaryStartAge ? averageHistoricalSalary : 0;
    } else {
      // Projection period: use projected salaries
      const projIdx = calendarYear - projectionStartYear;
      salary = projIdx < projectedSalaries.length ? projectedSalaries[projIdx] : 0;
    }

    // Pensionable earnings: salary capped at YMPE, minus basic exemption
    const pensionableEarnings = Math.max(0, Math.min(salary, ympe) - basicExemption);
    earnings.push(pensionableEarnings);
    months.push(12); // Full year
    years.push(calendarYear);
  }

  return { earnings, months, years };
}

/**
 * Apply the general dropout provision.
 * Removes the bottom 17% of lowest-earning months (by monthly earnings).
 * Returns the remaining months' earnings.
 */
export function applyGeneralDropout(
  monthlyEarnings: number[],
): { keptEarnings: number[]; droppedCount: number } {
  const totalMonths = monthlyEarnings.length;
  const dropCount = Math.floor(totalMonths * GENERAL_DROPOUT_FRACTION);

  // Sort ascending — drop the lowest
  const sorted = [...monthlyEarnings].sort((a, b) => a - b);
  const keptEarnings = sorted.slice(dropCount);

  return { keptEarnings, droppedCount: dropCount };
}

/**
 * Calculate the base CPP benefit (25% replacement rate).
 * @param ampe Average Monthly Pensionable Earnings after dropout
 * @returns Annual base CPP at age 65 (before early/late adjustment)
 */
export function calculateBaseCPP(ampe: number): number {
  return ampe * 0.25 * 12;
}

/**
 * Calculate the enhanced CPP component (first additional).
 * 8.33% replacement, proportional to enhanced contributory years / 40.
 * Enhanced contributions began in 2019 with a phase-in schedule.
 */
export function calculateEnhancedCPP(
  contributoryYears: number[],
  monthlyEarnings: number[],
): number {
  if (contributoryYears.length === 0) return 0;

  let enhancedMonths = 0;

  for (const year of contributoryYears) {
    if (year < 2019) continue;
    const phaseIn = year <= 2023 ? (ENHANCED_CPP_PHASE_IN[year] ?? 1.0) : 1.0;
    enhancedMonths += 12 * phaseIn;
  }

  if (enhancedMonths === 0) return 0;

  // Proportional: enhancedMonths / (40 * 12)
  const proportion = Math.min(enhancedMonths / (40 * 12), 1.0);

  // Use the AMPE from all months (same earnings base)
  const totalEarnings = monthlyEarnings.reduce((s, e) => s + e, 0);
  const ampe = monthlyEarnings.length > 0 ? totalEarnings / monthlyEarnings.length : 0;

  // 8.33% of AMPE
  return ampe * 0.0833 * 12 * proportion;
}

/**
 * Calculate CPP2 benefit (second additional component).
 * 33.33% on earnings between YMPE and YAMPE, proportional to cpp2 years / 40.
 */
export function calculateCPP2Benefit(
  contributoryYears: number[],
  salaryByYear: Map<number, number>,
  inflationRate: number,
): number {
  if (contributoryYears.length === 0) return 0;

  let cpp2Months = 0;
  let totalYAMPEBandEarnings = 0;
  let cpp2YearCount = 0;

  for (const year of contributoryYears) {
    if (year < 2024) continue;

    const ympe = getYMPE(year, inflationRate);
    const yampe = getYAMPE(year, inflationRate);
    const salary = salaryByYear.get(year) ?? 0;

    if (salary > ympe && yampe > ympe) {
      const bandEarnings = Math.min(salary, yampe) - ympe;
      totalYAMPEBandEarnings += bandEarnings;
      cpp2Months += 12;
      cpp2YearCount++;
    }
  }

  if (cpp2Months === 0) return 0;

  const proportion = Math.min(cpp2Months / (40 * 12), 1.0);
  const avgMonthlyBandEarnings = totalYAMPEBandEarnings / cpp2YearCount / 12;

  // 33.33% replacement on the YAMPE band
  return avgMonthlyBandEarnings * 0.3333 * 12 * proportion;
}

/**
 * Apply early/late start adjustment to the base CPP benefit.
 * - Before 65: -0.6% per month (age 60 = 64% of age-65 benefit)
 * - After 65: +0.7% per month (age 70 = 142% of age-65 benefit)
 */
export function applyEarlyLateAdjustment(
  annualBenefitAt65: number,
  startAge: number,
): number {
  const clampedAge = Math.max(MIN_CPP_START_AGE, Math.min(MAX_CPP_START_AGE, startAge));
  const monthsFromNormal = (clampedAge - NORMAL_CPP_AGE) * 12;

  let factor: number;
  if (monthsFromNormal < 0) {
    // Early: -0.6% per month before 65
    const monthsEarly = Math.abs(monthsFromNormal);
    factor = 1 - monthsEarly * EARLY_REDUCTION_PER_MONTH;
  } else if (monthsFromNormal > 0) {
    // Late: +0.7% per month after 65
    factor = 1 + monthsFromNormal * LATE_INCREASE_PER_MONTH;
  } else {
    factor = 1;
  }

  return annualBenefitAt65 * factor;
}

/**
 * Project the full CPP retirement benefit.
 * Top-level function that orchestrates all sub-calculations.
 */
export function projectCPPBenefit(inputs: CPPProjectionInputs): CPPBenefitResult {
  const {
    birthYear, salaryStartAge, averageHistoricalSalary,
    projectedSalaries, currentAge, cppStartAge, inflationRate,
  } = inputs;

  // Build full earnings history
  const { earnings, years } = buildContributoryEarnings(
    birthYear, salaryStartAge, averageHistoricalSalary,
    projectedSalaries, currentAge, cppStartAge, inflationRate,
  );

  if (earnings.length === 0) {
    return {
      baseCPP: 0, enhancedCPP: 0, cpp2Benefit: 0,
      totalAnnualBenefit: 0, monthlyBenefit: 0,
      ampe: 0, contributoryMonths: 0, droppedMonths: 0,
    };
  }

  // Convert annual earnings to monthly for dropout calculation
  const monthlyEarnings = earnings.map(e => e / 12);

  // Apply general dropout
  const { keptEarnings, droppedCount } = applyGeneralDropout(monthlyEarnings);

  // AMPE = average of kept monthly earnings
  const ampe = keptEarnings.length > 0
    ? keptEarnings.reduce((s, e) => s + e, 0) / keptEarnings.length
    : 0;

  // Base CPP at age 65
  const baseCPPAt65 = calculateBaseCPP(ampe);

  // Apply early/late adjustment to base
  const baseCPP = applyEarlyLateAdjustment(baseCPPAt65, cppStartAge);

  // Enhanced CPP (first additional)
  const enhancedCPP = calculateEnhancedCPP(years, keptEarnings);

  // CPP2 benefit (second additional)
  const salaryByYear = new Map<number, number>();
  const projectionStartYear = birthYear + currentAge;
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const age = year - birthYear;
    let salary: number;
    if (year < projectionStartYear) {
      salary = age >= salaryStartAge ? averageHistoricalSalary : 0;
    } else {
      const projIdx = year - projectionStartYear;
      salary = projIdx < projectedSalaries.length ? projectedSalaries[projIdx] : 0;
    }
    salaryByYear.set(year, salary);
  }
  const cpp2Benefit = calculateCPP2Benefit(years, salaryByYear, inflationRate);

  const totalAnnualBenefit = baseCPP + enhancedCPP + cpp2Benefit;

  return {
    baseCPP,
    enhancedCPP,
    cpp2Benefit,
    totalAnnualBenefit,
    monthlyBenefit: totalAnnualBenefit / 12,
    ampe,
    contributoryMonths: keptEarnings.length,
    droppedMonths: droppedCount,
  };
}
