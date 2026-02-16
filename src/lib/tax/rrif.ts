/**
 * RRIF (Registered Retirement Income Fund) Module
 *
 * Handles mandatory RRIF minimum withdrawals after RRSP → RRIF conversion.
 * RRSP must convert to RRIF by December 31 of the year turning 71.
 *
 * Minimum withdrawal rates are CRA-prescribed, based on age at start of year.
 * Minimum = prior December 31 balance × rate for current age.
 */

// ─── CRA Prescribed Minimum Withdrawal Rates ─────────────────────────────────
// Based on age at January 1 of the withdrawal year
// Source: CRA RRIF minimum withdrawal table
const RRIF_MINIMUM_RATES: Record<number, number> = {
  55: 0.0286,
  56: 0.0294,
  57: 0.0303,
  58: 0.0313,
  59: 0.0323,
  60: 0.0333,
  61: 0.0345,
  62: 0.0356,
  63: 0.0370,
  64: 0.0385,
  65: 0.0400,
  66: 0.0417,
  67: 0.0435,
  68: 0.0455,
  69: 0.0476,
  70: 0.0500,
  71: 0.0528,
  72: 0.0540,
  73: 0.0553,
  74: 0.0567,
  75: 0.0582,
  76: 0.0598,
  77: 0.0617,
  78: 0.0636,
  79: 0.0658,
  80: 0.0682,
  81: 0.0708,
  82: 0.0738,
  83: 0.0771,
  84: 0.0808,
  85: 0.0851,
  86: 0.0899,
  87: 0.0955,
  88: 0.1021,
  89: 0.1099,
  90: 0.1192,
  91: 0.1306,
  92: 0.1449,
  93: 0.1634,
  94: 0.1879,
  // 95+ = 20%
};

const RRIF_MAX_RATE_AGE = 95;
const RRIF_MAX_RATE = 0.20;
const RRIF_CONVERSION_AGE = 71; // Must convert by end of year turning 71

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RRIFYearResult {
  minimum: number;           // CRA-mandated minimum withdrawal
  withdrawal: number;        // Actual withdrawal (>= minimum)
  balanceAfterWithdrawal: number;
  balanceAfterGrowth: number;
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Get the CRA-prescribed RRIF minimum withdrawal rate for a given age.
 * Ages below 55 return 0 (no RRIF expected). Ages 95+ return 20%.
 */
export function getRRIFMinimumRate(age: number): number {
  if (age < 55) return 0;
  if (age >= RRIF_MAX_RATE_AGE) return RRIF_MAX_RATE;
  return RRIF_MINIMUM_RATES[age] ?? 0;
}

/**
 * Calculate the RRIF minimum withdrawal for a year.
 * @param balance The RRIF balance at the start of the year (prior Dec 31 value)
 * @param age The annuitant's age at January 1 of the year
 */
export function calculateRRIFMinimum(balance: number, age: number): number {
  if (balance <= 0) return 0;
  const rate = getRRIFMinimumRate(age);
  return balance * rate;
}

/**
 * Whether the RRSP must be converted to RRIF this year.
 * Conversion is mandatory by December 31 of the year turning 71.
 */
export function mustConvertToRRIF(age: number): boolean {
  return age >= RRIF_CONVERSION_AGE;
}

/**
 * Calculate a full RRIF year: minimum, withdrawal, and updated balances.
 *
 * Processing order:
 * 1. Calculate minimum based on start-of-year balance and age
 * 2. Determine actual withdrawal (max of minimum and any extra)
 * 3. Balance after withdrawal
 * 4. Apply investment return on remaining balance
 *
 * @param balance Start-of-year RRIF balance
 * @param age Age at January 1
 * @param returnRate Annual investment return rate (e.g., 0.05 for 5%)
 * @param extraWithdrawal Additional withdrawal above minimum (default 0)
 */
export function calculateRRIFYear(
  balance: number,
  age: number,
  returnRate: number,
  extraWithdrawal: number = 0,
): RRIFYearResult {
  if (balance <= 0) {
    return {
      minimum: 0,
      withdrawal: 0,
      balanceAfterWithdrawal: 0,
      balanceAfterGrowth: 0,
    };
  }

  const minimum = calculateRRIFMinimum(balance, age);
  const totalWithdrawal = Math.min(balance, minimum + Math.max(0, extraWithdrawal));
  const balanceAfterWithdrawal = Math.max(0, balance - totalWithdrawal);
  const balanceAfterGrowth = balanceAfterWithdrawal * (1 + returnRate);

  return {
    minimum,
    withdrawal: totalWithdrawal,
    balanceAfterWithdrawal,
    balanceAfterGrowth,
  };
}
