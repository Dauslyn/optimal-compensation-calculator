import type { TaxRates, TaxBracket } from './types';

// Ontario 2025/2026 Tax Rates
// Note: These rates are used for projection purposes. Actual future rates may vary.
export const TAX_RATES: TaxRates = {
  federal: {
    brackets: [
      { threshold: 0, rate: 0.15 },
      { threshold: 53359, rate: 0.205 },
      { threshold: 106717, rate: 0.26 },
      { threshold: 165430, rate: 0.29 },
      { threshold: 235675, rate: 0.33 },
    ],
    basicPersonalAmount: 15000,
  },
  provincial: {
    brackets: [
      { threshold: 0, rate: 0.0505 },
      { threshold: 49231, rate: 0.0915 },
      { threshold: 98463, rate: 0.1116 },
      { threshold: 150000, rate: 0.1216 },
      { threshold: 220000, rate: 0.1316 },
    ],
    basicPersonalAmount: 11141,
  },
  corporate: {
    smallBusiness: 0.122, // 12.2% (9% federal + 3.2% Ontario)
    transition: 0.182, // 18.2% (15% federal + 3.2% Ontario)
    general: 0.265, // 26.5% (15% federal + 11.5% Ontario)
  },
  dividend: {
    eligible: {
      grossUp: 0.38, // 38% gross-up
      federalCredit: 0.150198, // 15.0198%
      provincialCredit: 0.10, // 10%
      effectiveRate: 0.3934, // 39.34% combined personal tax rate
    },
    nonEligible: {
      grossUp: 0.15, // 15% gross-up
      federalCredit: 0.090301, // 9.0301%
      provincialCredit: 0.029863, // 2.9863%
      effectiveRate: 0.4774, // 47.74% combined personal tax rate
    },
  },
  cpp: {
    rate: 0.0595, // 5.95% (employee portion)
    maximumPensionableEarnings: 68500, // YMPE for 2025
    basicExemption: 3500,
    maxContribution: 3867.50, // (68500 - 3500) * 0.0595
  },
  cpp2: {
    rate: 0.04, // 4% (employee portion) - second tier since 2024
    firstCeiling: 68500, // YMPE - first ceiling
    secondCeiling: 73200, // YAMPE - second ceiling for 2025
    maxContribution: 188, // (73200 - 68500) * 0.04
  },
  ei: {
    rate: 0.0164, // 1.64% for 2025
    maximumInsurableEarnings: 65700, // 2025 max insurable earnings
    maxContribution: 1077.48, // 65700 * 0.0164
    employerMultiplier: 1.4, // Employer pays 1.4x employee premium
  },
  ontarioSurtax: {
    // Ontario surtax on provincial tax payable
    firstThreshold: 5554,
    firstRate: 0.20, // 20% on provincial tax over $5,554
    secondThreshold: 7108,
    secondRate: 0.36, // Additional 36% on provincial tax over $7,108
  },
  ontarioHealthPremium: {
    // Ontario Health Premium brackets (based on taxable income)
    brackets: [
      { threshold: 0, base: 0, rate: 0, maxPremium: 0 },
      { threshold: 20000, base: 0, rate: 0.06, maxPremium: 300 },
      { threshold: 25000, base: 300, rate: 0.06, maxPremium: 450 },
      { threshold: 36000, base: 450, rate: 0.25, maxPremium: 600 },
      { threshold: 38500, base: 600, rate: 0.25, maxPremium: 750 },
      { threshold: 48000, base: 750, rate: 0.25, maxPremium: 900 },
      { threshold: 72000, base: 750, rate: 0.25, maxPremium: 900 },
      { threshold: 200000, base: 900, rate: 0, maxPremium: 900 },
    ],
  },
  rdtoh: {
    refundRate: 0.3833, // 38.33% refund rate
  },
};

// TFSA contribution limit (2026)
export const TFSA_ANNUAL_LIMIT = 7000;

// RRSP contribution rate
export const RRSP_CONTRIBUTION_RATE = 0.18; // 18% of previous year's earned income
export const RRSP_ANNUAL_LIMIT = 32490; // 2026 limit

// Small business deduction thresholds
export const SBD_THRESHOLD = 500000; // Small business limit
export const PASSIVE_INCOME_THRESHOLD = 50000; // Passive income threshold
export const PASSIVE_INCOME_GRIND_RATE = 5; // $1 reduction per $5 of passive income over threshold

/**
 * Calculate personal income tax on salary (simple version)
 * Includes federal, provincial, Ontario surtax, and health premium
 */
export function calculateSalaryTax(salary: number, rrspDeduction: number = 0): number {
  const breakdown = calculateSalaryTaxDetailed(salary, rrspDeduction);
  return breakdown.totalTax;
}

/**
 * Calculate personal income tax on salary with detailed breakdown
 * @param salary - Gross salary amount
 * @param rrspDeduction - RRSP contribution to deduct from taxable income
 * @returns Detailed tax breakdown
 */
export function calculateSalaryTaxDetailed(salary: number, rrspDeduction: number = 0): {
  federalTax: number;
  provincialTax: number;
  ontarioSurtax: number;
  ontarioHealthPremium: number;
  totalTax: number;
  taxableIncome: number;
} {
  if (salary <= 0) {
    return {
      federalTax: 0,
      provincialTax: 0,
      ontarioSurtax: 0,
      ontarioHealthPremium: 0,
      totalTax: 0,
      taxableIncome: 0,
    };
  }

  // Taxable income = salary minus RRSP deduction
  const taxableIncome = Math.max(0, salary - rrspDeduction);

  // Federal tax
  const federalTax = calculateTaxByBrackets(
    Math.max(0, taxableIncome - TAX_RATES.federal.basicPersonalAmount),
    TAX_RATES.federal.brackets
  );

  // Provincial tax (before surtax)
  const provincialTax = calculateTaxByBrackets(
    Math.max(0, taxableIncome - TAX_RATES.provincial.basicPersonalAmount),
    TAX_RATES.provincial.brackets
  );

  // Ontario surtax (on provincial tax payable)
  const ontarioSurtax = calculateOntarioSurtax(provincialTax);

  // Ontario Health Premium (based on taxable income)
  const ontarioHealthPremium = calculateOntarioHealthPremium(taxableIncome);

  const totalTax = federalTax + provincialTax + ontarioSurtax + ontarioHealthPremium;

  return {
    federalTax,
    provincialTax,
    ontarioSurtax,
    ontarioHealthPremium,
    totalTax,
    taxableIncome,
  };
}

/**
 * UNIFIED Personal Tax Calculation
 * Combines salary and dividend income on one return, applies:
 * - Basic personal amounts (federal and provincial)
 * - Graduated tax brackets on combined taxable income
 * - Dividend gross-up and tax credits
 * - Ontario surtax on total provincial tax
 * - Ontario health premium on total taxable income
 * 
 * @param salary - Gross employment income
 * @param eligibleDividends - Eligible dividends received (before gross-up)
 * @param nonEligibleDividends - Non-eligible dividends received (before gross-up)
 * @param rrspDeduction - RRSP contribution to deduct
 * @returns Detailed tax breakdown
 */
export function calculateCombinedPersonalTax(
  salary: number,
  eligibleDividends: number = 0,
  nonEligibleDividends: number = 0,
  rrspDeduction: number = 0
): {
  federalTax: number;
  provincialTax: number;
  ontarioSurtax: number;
  ontarioHealthPremium: number;
  dividendTaxCredits: number;
  totalTax: number;
  taxableIncome: number;
  grossedUpIncome: number;
} {
  // Step 1: Calculate grossed-up dividend amounts
  const eligibleGrossUp = eligibleDividends * (1 + TAX_RATES.dividend.eligible.grossUp);
  const nonEligibleGrossUp = nonEligibleDividends * (1 + TAX_RATES.dividend.nonEligible.grossUp);

  // Step 2: Calculate total taxable income (salary + grossed-up dividends - RRSP)
  const grossedUpIncome = salary + eligibleGrossUp + nonEligibleGrossUp;
  const taxableIncome = Math.max(0, grossedUpIncome - rrspDeduction);

  if (taxableIncome <= 0) {
    return {
      federalTax: 0,
      provincialTax: 0,
      ontarioSurtax: 0,
      ontarioHealthPremium: 0,
      dividendTaxCredits: 0,
      totalTax: 0,
      taxableIncome: 0,
      grossedUpIncome: 0,
    };
  }

  // Step 3: Calculate federal tax on combined income (minus BPA)
  const federalTaxableIncome = Math.max(0, taxableIncome - TAX_RATES.federal.basicPersonalAmount);
  const federalTaxBeforeCredits = calculateTaxByBrackets(federalTaxableIncome, TAX_RATES.federal.brackets);

  // Step 4: Calculate provincial tax on combined income (minus BPA)
  const provincialTaxableIncome = Math.max(0, taxableIncome - TAX_RATES.provincial.basicPersonalAmount);
  const provincialTaxBeforeCredits = calculateTaxByBrackets(provincialTaxableIncome, TAX_RATES.provincial.brackets);

  // Step 5: Calculate dividend tax credits
  // Federal DTC: based on grossed-up dividend amount
  const federalEligibleDTC = eligibleGrossUp * TAX_RATES.dividend.eligible.federalCredit;
  const federalNonEligibleDTC = nonEligibleGrossUp * TAX_RATES.dividend.nonEligible.federalCredit;
  const totalFederalDTC = federalEligibleDTC + federalNonEligibleDTC;

  // Provincial DTC: based on grossed-up dividend amount  
  const provincialEligibleDTC = eligibleGrossUp * TAX_RATES.dividend.eligible.provincialCredit;
  const provincialNonEligibleDTC = nonEligibleGrossUp * TAX_RATES.dividend.nonEligible.provincialCredit;
  const totalProvincialDTC = provincialEligibleDTC + provincialNonEligibleDTC;

  const dividendTaxCredits = totalFederalDTC + totalProvincialDTC;

  // Step 6: Calculate net federal and provincial tax (after credits)
  // Credits can reduce tax to zero but not below
  const federalTax = Math.max(0, federalTaxBeforeCredits - totalFederalDTC);
  const provincialTaxBeforeSurtax = Math.max(0, provincialTaxBeforeCredits - totalProvincialDTC);

  // Step 7: Ontario surtax on provincial tax payable (AFTER credits)
  const ontarioSurtax = calculateOntarioSurtax(provincialTaxBeforeSurtax);

  // Step 8: Ontario Health Premium (based on actual taxable income, not grossed-up)
  // OHP is based on net income, which for our purposes is salary + actual dividends (not grossed up)
  const actualIncome = salary + eligibleDividends + nonEligibleDividends - rrspDeduction;
  const ontarioHealthPremium = calculateOntarioHealthPremium(Math.max(0, actualIncome));

  // Total provincial tax includes surtax
  const provincialTax = provincialTaxBeforeSurtax + ontarioSurtax;

  // Step 9: Total personal tax
  const totalTax = federalTax + provincialTax + ontarioHealthPremium;

  return {
    federalTax,
    provincialTax,
    ontarioSurtax,
    ontarioHealthPremium,
    dividendTaxCredits,
    totalTax,
    taxableIncome,
    grossedUpIncome,
  };
}

/**
 * Calculate tax on eligible dividends ONLY (standalone - for backwards compatibility)
 * Note: Use calculateCombinedPersonalTax for accurate calculations with mixed income
 */
export function calculateEligibleDividendTax(dividends: number): number {
  if (dividends <= 0) return 0;
  const result = calculateCombinedPersonalTax(0, dividends, 0, 0);
  return result.totalTax;
}

/**
 * Calculate tax on non-eligible dividends ONLY (standalone - for backwards compatibility)
 * Note: Use calculateCombinedPersonalTax for accurate calculations with mixed income
 */
export function calculateNonEligibleDividendTax(dividends: number): number {
  if (dividends <= 0) return 0;
  const result = calculateCombinedPersonalTax(0, 0, dividends, 0);
  return result.totalTax;
}

/**
 * Calculate CPP contributions on salary (base CPP - first tier)
 */
export function calculateCPP(salary: number): number {
  if (salary <= TAX_RATES.cpp.basicExemption) return 0;

  const pensionableEarnings = Math.min(
    salary - TAX_RATES.cpp.basicExemption,
    TAX_RATES.cpp.maximumPensionableEarnings - TAX_RATES.cpp.basicExemption
  );

  return pensionableEarnings * TAX_RATES.cpp.rate;
}

/**
 * Calculate CPP2 contributions on salary (second tier - since 2024)
 * Applies to earnings between YMPE ($68,500) and YAMPE ($73,200)
 */
export function calculateCPP2(salary: number): number {
  if (salary <= TAX_RATES.cpp2.firstCeiling) return 0;

  const cpp2Earnings = Math.min(
    salary - TAX_RATES.cpp2.firstCeiling,
    TAX_RATES.cpp2.secondCeiling - TAX_RATES.cpp2.firstCeiling
  );

  return cpp2Earnings * TAX_RATES.cpp2.rate;
}

/**
 * Calculate total CPP contributions (CPP + CPP2)
 */
export function calculateTotalCPP(salary: number): { cpp: number; cpp2: number; total: number } {
  const cpp = calculateCPP(salary);
  const cpp2 = calculateCPP2(salary);
  return { cpp, cpp2, total: cpp + cpp2 };
}

/**
 * Calculate EI premiums on salary
 */
export function calculateEI(salary: number): number {
  if (salary <= 0) return 0;

  const insurableEarnings = Math.min(salary, TAX_RATES.ei.maximumInsurableEarnings);

  return insurableEarnings * TAX_RATES.ei.rate;
}

/**
 * Calculate Ontario surtax on provincial tax payable
 * 20% on provincial tax over $5,554
 * 36% on provincial tax over $7,108
 */
export function calculateOntarioSurtax(provincialTax: number): number {
  if (provincialTax <= TAX_RATES.ontarioSurtax.firstThreshold) return 0;

  let surtax = 0;

  // 20% on amount over first threshold
  if (provincialTax > TAX_RATES.ontarioSurtax.firstThreshold) {
    surtax += (provincialTax - TAX_RATES.ontarioSurtax.firstThreshold) * TAX_RATES.ontarioSurtax.firstRate;
  }

  // Additional 36% on amount over second threshold (this is IN ADDITION to the 20%)
  if (provincialTax > TAX_RATES.ontarioSurtax.secondThreshold) {
    surtax += (provincialTax - TAX_RATES.ontarioSurtax.secondThreshold) * TAX_RATES.ontarioSurtax.secondRate;
  }

  return surtax;
}

/**
 * Calculate Ontario Health Premium based on taxable income
 * Graduated premium from $0 to $900 depending on income
 */
export function calculateOntarioHealthPremium(taxableIncome: number): number {
  const brackets = TAX_RATES.ontarioHealthPremium.brackets;

  // Find the applicable bracket
  let applicableBracket = brackets[0];
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].threshold) {
      applicableBracket = brackets[i];
      break;
    }
  }

  // Income under $20,000 pays no premium
  if (taxableIncome <= 20000) return 0;

  // Calculate premium based on bracket
  const premium = applicableBracket.base +
    (taxableIncome - applicableBracket.threshold) * applicableBracket.rate;

  // Cap at the maximum for this bracket
  return Math.min(premium, applicableBracket.maxPremium);
}

/**
 * Calculate corporate tax based on income level and passive income
 */
export function calculateCorporateTax(
  activeIncome: number,
  passiveIncome: number
): { tax: number; rate: number } {
  if (activeIncome <= 0) return { tax: 0, rate: 0 };

  // Calculate small business deduction limit based on passive income
  let sblLimit = SBD_THRESHOLD;
  if (passiveIncome > PASSIVE_INCOME_THRESHOLD) {
    const excess = passiveIncome - PASSIVE_INCOME_THRESHOLD;
    const reduction = excess * PASSIVE_INCOME_GRIND_RATE;
    sblLimit = Math.max(0, SBD_THRESHOLD - reduction);
  }

  // Calculate tax in each bracket
  const smallBusinessIncome = Math.min(activeIncome, sblLimit);
  const generalRateIncome = Math.max(0, activeIncome - sblLimit);

  const smallBusinessTax = smallBusinessIncome * TAX_RATES.corporate.smallBusiness;
  const generalRateTax = generalRateIncome * TAX_RATES.corporate.general;

  const totalTax = smallBusinessTax + generalRateTax;
  const effectiveRate = totalTax / activeIncome;

  return { tax: totalTax, rate: effectiveRate };
}

/**
 * Calculate RDTOH refund for dividend distributions
 */
export function calculateRDTOHRefund(
  dividendAmount: number,
  _rdtohType: 'eligible' | 'non-eligible'
): number {
  // RDTOH refund is $0.3833 per $1 of dividends paid, up to the balance
  return dividendAmount * TAX_RATES.rdtoh.refundRate;
}

/**
 * Helper function to calculate tax using bracket system
 */
function calculateTaxByBrackets(income: number, brackets: TaxBracket[]): number {
  let tax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const nextThreshold = i < brackets.length - 1 ? brackets[i + 1].threshold : Infinity;

    if (income <= bracket.threshold) {
      break;
    }

    const taxableInThisBracket = Math.min(income, nextThreshold) - bracket.threshold;
    tax += taxableInThisBracket * bracket.rate;

    if (income <= nextThreshold) {
      break;
    }
  }

  return tax;
}

/**
 * Calculate required gross salary to achieve a target after-tax amount
 */
export function calculateRequiredSalary(
  targetAfterTax: number,
  maxIterations: number = 10
): number {
  // Use iterative approach since CPP/EI create non-linear relationship
  let estimatedSalary = targetAfterTax * 1.5; // Initial guess

  for (let i = 0; i < maxIterations; i++) {
    const tax = calculateSalaryTax(estimatedSalary);
    const cpp = calculateCPP(estimatedSalary);
    const ei = calculateEI(estimatedSalary);
    const afterTax = estimatedSalary - tax - cpp - ei;

    const difference = targetAfterTax - afterTax;

    if (Math.abs(difference) < 1) {
      return estimatedSalary;
    }

    // Adjust estimate
    estimatedSalary += difference * 1.4;
  }

  return estimatedSalary;
}
