/**
 * Tax Constants Module
 *
 * This module provides tax rates and constants for the current tax year.
 * It uses the indexation module as the source of truth for year-specific values.
 *
 * For multi-year projections, use getTaxYearData() from indexation.ts directly.
 * This module provides backward compatibility for single-year calculations.
 */

import type { TaxRates, TaxBracket } from '../types';
import { getTaxYearData, getStartingYear, type TaxYearData } from './indexation';

// Get current year's tax data
const currentYear = getStartingYear();
const currentYearData: TaxYearData = getTaxYearData(currentYear);

/**
 * TAX_RATES - Current year tax rates (backward compatible export)
 *
 * Note: For multi-year projections, use getTaxYearData(year, inflationRate)
 * from the indexation module instead.
 */
export const TAX_RATES: TaxRates = {
  federal: {
    brackets: currentYearData.federal.brackets,
    basicPersonalAmount: currentYearData.federal.basicPersonalAmount,
  },
  provincial: {
    brackets: currentYearData.provincial.brackets,
    basicPersonalAmount: currentYearData.provincial.basicPersonalAmount,
  },
  corporate: {
    smallBusiness: currentYearData.corporate.smallBusiness,
    transition: 0.182, // 18.2% (15% federal + 3.2% Ontario) - rarely used
    general: currentYearData.corporate.general,
  },
  dividend: {
    eligible: {
      grossUp: currentYearData.dividend.eligible.grossUp,
      federalCredit: currentYearData.dividend.eligible.federalCredit,
      provincialCredit: currentYearData.dividend.eligible.provincialCredit,
      // Calculate effective rate: top marginal rate on grossed-up amount minus credits
      // This is approximate and varies by income level
      effectiveRate: 0.3934,
    },
    nonEligible: {
      grossUp: currentYearData.dividend.nonEligible.grossUp,
      federalCredit: currentYearData.dividend.nonEligible.federalCredit,
      provincialCredit: currentYearData.dividend.nonEligible.provincialCredit,
      effectiveRate: 0.4774,
    },
  },
  cpp: {
    rate: currentYearData.cpp.rate,
    maximumPensionableEarnings: currentYearData.cpp.ympe,
    basicExemption: currentYearData.cpp.basicExemption,
    maxContribution: currentYearData.cpp.maxContribution,
  },
  cpp2: {
    rate: currentYearData.cpp2.rate,
    firstCeiling: currentYearData.cpp2.firstCeiling,
    secondCeiling: currentYearData.cpp2.secondCeiling,
    maxContribution: currentYearData.cpp2.maxContribution,
  },
  ei: {
    rate: currentYearData.ei.rate,
    maximumInsurableEarnings: currentYearData.ei.maxInsurableEarnings,
    maxContribution: currentYearData.ei.maxContribution,
    employerMultiplier: currentYearData.ei.employerMultiplier,
  },
  ontarioSurtax: {
    firstThreshold: currentYearData.provincial.surtax.firstThreshold,
    firstRate: currentYearData.provincial.surtax.firstRate,
    secondThreshold: currentYearData.provincial.surtax.secondThreshold,
    secondRate: currentYearData.provincial.surtax.secondRate,
  },
  ontarioHealthPremium: {
    brackets: currentYearData.provincial.healthPremium.brackets,
  },
  rdtoh: {
    refundRate: currentYearData.rdtoh.refundRate,
  },
};

// TFSA contribution limit (current year)
export const TFSA_ANNUAL_LIMIT = currentYearData.tfsa.annualLimit;

// RRSP contribution rate and limit
export const RRSP_CONTRIBUTION_RATE = currentYearData.rrsp.contributionRate;
export const RRSP_ANNUAL_LIMIT = currentYearData.rrsp.dollarLimit;

// Small business deduction thresholds (not indexed)
export const SBD_THRESHOLD = 500000;
export const PASSIVE_INCOME_THRESHOLD = 50000;
export const PASSIVE_INCOME_GRIND_RATE = 5;

/**
 * Helper function to calculate tax using bracket system
 */
export function calculateTaxByBrackets(income: number, brackets: TaxBracket[]): number {
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
 * Get tax rates for a specific year
 * Convenience function that converts TaxYearData to TaxRates format
 */
export function getTaxRatesForYear(year: number, inflationRate?: number): TaxRates {
  const yearData = getTaxYearData(year, inflationRate);

  return {
    federal: {
      brackets: yearData.federal.brackets,
      basicPersonalAmount: yearData.federal.basicPersonalAmount,
    },
    provincial: {
      brackets: yearData.provincial.brackets,
      basicPersonalAmount: yearData.provincial.basicPersonalAmount,
    },
    corporate: {
      smallBusiness: yearData.corporate.smallBusiness,
      transition: 0.182,
      general: yearData.corporate.general,
    },
    dividend: {
      eligible: {
        grossUp: yearData.dividend.eligible.grossUp,
        federalCredit: yearData.dividend.eligible.federalCredit,
        provincialCredit: yearData.dividend.eligible.provincialCredit,
        effectiveRate: 0.3934,
      },
      nonEligible: {
        grossUp: yearData.dividend.nonEligible.grossUp,
        federalCredit: yearData.dividend.nonEligible.federalCredit,
        provincialCredit: yearData.dividend.nonEligible.provincialCredit,
        effectiveRate: 0.4774,
      },
    },
    cpp: {
      rate: yearData.cpp.rate,
      maximumPensionableEarnings: yearData.cpp.ympe,
      basicExemption: yearData.cpp.basicExemption,
      maxContribution: yearData.cpp.maxContribution,
    },
    cpp2: {
      rate: yearData.cpp2.rate,
      firstCeiling: yearData.cpp2.firstCeiling,
      secondCeiling: yearData.cpp2.secondCeiling,
      maxContribution: yearData.cpp2.maxContribution,
    },
    ei: {
      rate: yearData.ei.rate,
      maximumInsurableEarnings: yearData.ei.maxInsurableEarnings,
      maxContribution: yearData.ei.maxContribution,
      employerMultiplier: yearData.ei.employerMultiplier,
    },
    ontarioSurtax: {
      firstThreshold: yearData.provincial.surtax.firstThreshold,
      firstRate: yearData.provincial.surtax.firstRate,
      secondThreshold: yearData.provincial.surtax.secondThreshold,
      secondRate: yearData.provincial.surtax.secondRate,
    },
    ontarioHealthPremium: {
      brackets: yearData.provincial.healthPremium.brackets,
    },
    rdtoh: {
      refundRate: yearData.rdtoh.refundRate,
    },
  };
}

/**
 * Get RRSP/TFSA limits for a specific year
 */
export function getContributionLimitsForYear(year: number, inflationRate?: number): {
  tfsaLimit: number;
  rrspLimit: number;
  rrspRate: number;
} {
  const yearData = getTaxYearData(year, inflationRate);
  return {
    tfsaLimit: yearData.tfsa.annualLimit,
    rrspLimit: yearData.rrsp.dollarLimit,
    rrspRate: yearData.rrsp.contributionRate,
  };
}
