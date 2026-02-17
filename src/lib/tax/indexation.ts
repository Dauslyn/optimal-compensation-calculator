/**
 * Tax Year Indexation Module
 *
 * This module provides inflation-adjusted tax values for multi-year projections.
 * It stores known CRA values for 2026, and projects future years
 * using a user-specified inflation rate.
 *
 * Sources:
 * - CRA: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html
 * - CPP: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html
 * - EI: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
 */

import type { TaxBracket } from '../types';
import type { ProvinceCode } from './provinces';
import { DEFAULT_PROVINCE } from './provinces';
import { getProvincialTaxData } from './provincialRates';

/**
 * Complete tax year data structure
 */
export interface TaxYearData {
  year: number;
  federal: {
    brackets: TaxBracket[];
    basicPersonalAmount: number;
  };
  provincial: {
    // Ontario-specific for now
    brackets: TaxBracket[];
    basicPersonalAmount: number;
    surtax: {
      firstThreshold: number;
      firstRate: number;
      secondThreshold: number;
      secondRate: number;
    };
    healthPremium: {
      brackets: Array<{
        threshold: number;
        base: number;
        rate: number;
        maxPremium: number;
      }>;
    };
  };
  cpp: {
    rate: number;
    ympe: number; // Year's Maximum Pensionable Earnings
    basicExemption: number;
    maxContribution: number;
  };
  cpp2: {
    rate: number;
    firstCeiling: number; // Same as YMPE
    secondCeiling: number; // YAMPE - Year's Additional Maximum Pensionable Earnings
    maxContribution: number;
  };
  ei: {
    rate: number;
    maxInsurableEarnings: number;
    maxContribution: number;
    employerMultiplier: number;
  };
  dividend: {
    eligible: {
      grossUp: number;
      federalCredit: number;
      provincialCredit: number;
    };
    nonEligible: {
      grossUp: number;
      federalCredit: number;
      provincialCredit: number;
    };
  };
  corporate: {
    smallBusiness: number;
    general: number;
  };
  rrsp: {
    contributionRate: number;
    dollarLimit: number;
  };
  tfsa: {
    annualLimit: number;
  };
  rdtoh: {
    refundRate: number;
  };
}

/**
 * Known tax year data for 2026
 * These are official CRA values - do not modify unless CRA publishes updates
 */
export const KNOWN_TAX_YEARS: Record<number, TaxYearData> = {
  2026: {
    year: 2026,
    federal: {
      // 2026: Full year at 14% lowest bracket
      brackets: [
        { threshold: 0, rate: 0.14 },
        { threshold: 58523, rate: 0.205 },
        { threshold: 117045, rate: 0.26 },
        { threshold: 181440, rate: 0.29 },
        { threshold: 258482, rate: 0.33 },
      ],
      basicPersonalAmount: 16452,
    },
    provincial: {
      // Ontario 2026 (indexed at 1.9%; $150K/$220K NOT indexed — legislatively fixed)
      brackets: [
        { threshold: 0, rate: 0.0505 },
        { threshold: 53891, rate: 0.0915 },
        { threshold: 107785, rate: 0.1116 },
        { threshold: 150000, rate: 0.1216 },
        { threshold: 220000, rate: 0.1316 },
      ],
      basicPersonalAmount: 12989,
      surtax: {
        firstThreshold: 5818,
        firstRate: 0.20,
        secondThreshold: 7446,
        secondRate: 0.36,
      },
      // NOTE: Health premium data here is a legacy default fallback.
      // For actual calculations, getTaxYearData() overwrites the provincial
      // section with province-specific data from provincialRates.ts.
      healthPremium: {
        // Ontario Health Premium thresholds are NOT indexed
        brackets: [
          { threshold: 0, base: 0, rate: 0, maxPremium: 0 },
          { threshold: 20000, base: 0, rate: 0.06, maxPremium: 300 },
          { threshold: 25000, base: 300, rate: 0.06, maxPremium: 450 },
          { threshold: 36000, base: 450, rate: 0.25, maxPremium: 600 },
          { threshold: 38500, base: 600, rate: 0.25, maxPremium: 750 },
          { threshold: 48000, base: 750, rate: 0.25, maxPremium: 900 },
          { threshold: 72000, base: 900, rate: 0.25, maxPremium: 900 },
          { threshold: 200600, base: 900, rate: 0, maxPremium: 900 },
        ],
      },
    },
    cpp: {
      rate: 0.0595,
      ympe: 74600,
      basicExemption: 3500,
      maxContribution: 4230.45,
    },
    cpp2: {
      rate: 0.04,
      firstCeiling: 74600,
      secondCeiling: 85000,
      maxContribution: 416.00,
    },
    ei: {
      rate: 0.0163,
      maxInsurableEarnings: 68900,
      maxContribution: 1123.07,
      employerMultiplier: 1.4,
    },
    dividend: {
      eligible: {
        grossUp: 0.38,
        federalCredit: 0.150198,
        provincialCredit: 0.10,
      },
      nonEligible: {
        grossUp: 0.15,
        federalCredit: 0.090301,
        provincialCredit: 0.029863,
      },
    },
    corporate: {
      smallBusiness: 0.122,
      general: 0.265,
    },
    rrsp: {
      contributionRate: 0.18,
      dollarLimit: 33810,
    },
    tfsa: {
      annualLimit: 7000, // Stays at $7,000 (indexed amount $7,185 rounds down)
    },
    rdtoh: {
      refundRate: 0.3833,
    },
  },
};

/**
 * Historical CRA indexation factors
 * Used for projecting future years and as default inflation rate
 */
export const CRA_INDEXATION_FACTORS: Record<number, number> = {
  2024: 0.047, // 4.7%
  2025: 0.027, // 2.7%
  2026: 0.020, // 2.0%
};

/**
 * Get the current tax year based on system date
 */
export function getCurrentTaxYear(): number {
  return new Date().getFullYear();
}

/**
 * Get the most recent known tax year
 */
export function getLatestKnownYear(): number {
  return Math.max(...Object.keys(KNOWN_TAX_YEARS).map(Number));
}

/**
 * Get the default inflation rate based on most recent CRA indexation factor
 */
export function getDefaultInflationRate(): number {
  const knownYears = Object.keys(CRA_INDEXATION_FACTORS)
    .map(Number)
    .sort((a, b) => b - a);
  return CRA_INDEXATION_FACTORS[knownYears[0]] || 0.02;
}

/**
 * Round a number to the nearest dollar (for bracket thresholds)
 */
function roundToNearestDollar(value: number): number {
  return Math.round(value);
}

/**
 * Round TFSA limit to nearest $500 (CRA rule)
 */
function roundTFSALimit(value: number): number {
  return Math.floor(value / 500) * 500;
}

/**
 * Project tax brackets forward by applying inflation
 */
function projectBrackets(brackets: TaxBracket[], inflationRate: number, years: number): TaxBracket[] {
  const factor = Math.pow(1 + inflationRate, years);
  return brackets.map(bracket => ({
    threshold: bracket.threshold === 0 ? 0 : roundToNearestDollar(bracket.threshold * factor),
    rate: bracket.rate, // Rates don't change with inflation
  }));
}

/**
 * Project a full tax year forward by applying inflation
 */
function projectTaxYear(baseYear: TaxYearData, yearsForward: number, inflationRate: number): TaxYearData {
  const factor = Math.pow(1 + inflationRate, yearsForward);

  return {
    year: baseYear.year + yearsForward,
    federal: {
      brackets: projectBrackets(baseYear.federal.brackets, inflationRate, yearsForward),
      basicPersonalAmount: roundToNearestDollar(baseYear.federal.basicPersonalAmount * factor),
    },
    provincial: {
      brackets: projectBrackets(baseYear.provincial.brackets, inflationRate, yearsForward),
      basicPersonalAmount: roundToNearestDollar(baseYear.provincial.basicPersonalAmount * factor),
      surtax: {
        firstThreshold: roundToNearestDollar(baseYear.provincial.surtax.firstThreshold * factor),
        firstRate: baseYear.provincial.surtax.firstRate,
        secondThreshold: roundToNearestDollar(baseYear.provincial.surtax.secondThreshold * factor),
        secondRate: baseYear.provincial.surtax.secondRate,
      },
      // Health premium thresholds are NOT indexed in Ontario
      healthPremium: baseYear.provincial.healthPremium,
    },
    cpp: {
      rate: baseYear.cpp.rate,
      ympe: roundToNearestDollar(baseYear.cpp.ympe * factor),
      basicExemption: baseYear.cpp.basicExemption, // Not indexed
      maxContribution: roundToNearestDollar(
        (baseYear.cpp.ympe * factor - baseYear.cpp.basicExemption) * baseYear.cpp.rate * 100
      ) / 100,
    },
    cpp2: {
      rate: baseYear.cpp2.rate,
      firstCeiling: roundToNearestDollar(baseYear.cpp2.firstCeiling * factor),
      // YAMPE is 14% above YMPE
      secondCeiling: roundToNearestDollar(baseYear.cpp2.firstCeiling * factor * 1.14),
      maxContribution: roundToNearestDollar(
        (baseYear.cpp2.firstCeiling * factor * 0.14) * baseYear.cpp2.rate * 100
      ) / 100,
    },
    ei: {
      rate: baseYear.ei.rate, // EI rate changes are policy decisions, not indexed
      maxInsurableEarnings: roundToNearestDollar(baseYear.ei.maxInsurableEarnings * factor),
      maxContribution: roundToNearestDollar(
        baseYear.ei.maxInsurableEarnings * factor * baseYear.ei.rate * 100
      ) / 100,
      employerMultiplier: baseYear.ei.employerMultiplier,
    },
    dividend: baseYear.dividend, // Dividend rates don't change with inflation
    corporate: baseYear.corporate, // Corporate rates don't change with inflation
    rrsp: {
      contributionRate: baseYear.rrsp.contributionRate,
      dollarLimit: roundToNearestDollar(baseYear.rrsp.dollarLimit * factor),
    },
    tfsa: {
      annualLimit: roundTFSALimit(baseYear.tfsa.annualLimit * factor),
    },
    rdtoh: baseYear.rdtoh,
  };
}

/**
 * Get tax year data for a specific year and province
 * Uses known values if available, otherwise projects from the most recent known year
 */
export function getTaxYearData(
  year: number,
  inflationRate: number = getDefaultInflationRate(),
  province: ProvinceCode = DEFAULT_PROVINCE
): TaxYearData {
  // Get the base federal/CPP/EI data
  let baseTaxData: TaxYearData;

  // If we have known values, use them
  if (KNOWN_TAX_YEARS[year]) {
    baseTaxData = { ...KNOWN_TAX_YEARS[year] };
  } else {
    // Find the closest known year to project from
    const knownYears = Object.keys(KNOWN_TAX_YEARS).map(Number).sort((a, b) => b - a);

    // If year is before our earliest known year, use earliest
    if (year < knownYears[knownYears.length - 1]) {
      const earliestYear = knownYears[knownYears.length - 1];
      const yearsBack = earliestYear - year;
      baseTaxData = projectTaxYear(KNOWN_TAX_YEARS[earliestYear], -yearsBack, inflationRate);
    } else {
      // Project forward from most recent known year
      const latestYear = knownYears[0];
      const yearsForward = year - latestYear;
      baseTaxData = projectTaxYear(KNOWN_TAX_YEARS[latestYear], yearsForward, inflationRate);
    }
  }

  // Get province-specific data
  const provincialData = getProvincialTaxData(province, year, inflationRate);
  // Note: PROVINCES[province] has flags for QPP, QPIP, etc. - future enhancement

  // Default surtax (no surtax for provinces without it)
  const defaultSurtax = {
    firstThreshold: Infinity,
    firstRate: 0,
    secondThreshold: Infinity,
    secondRate: 0,
  };

  // Default health premium (no premium for provinces without it)
  const defaultHealthPremium = {
    brackets: [
      { threshold: 0, base: 0, rate: 0, maxPremium: 0 },
    ],
  };

  // Build the combined tax year data with province-specific values
  return {
    ...baseTaxData,
    provincial: {
      brackets: provincialData.brackets,
      basicPersonalAmount: provincialData.basicPersonalAmount,
      surtax: provincialData.surtax || defaultSurtax,
      healthPremium: provincialData.healthPremium || defaultHealthPremium,
    },
    dividend: {
      eligible: {
        grossUp: 0.38,
        federalCredit: 0.150198,
        provincialCredit: provincialData.dividendTaxCredits.eligible,
      },
      nonEligible: {
        grossUp: 0.15,
        federalCredit: 0.090301,
        provincialCredit: provincialData.dividendTaxCredits.nonEligible,
      },
    },
    corporate: {
      // Combined federal + provincial rate
      smallBusiness: 0.09 + provincialData.corporateSmallBusinessRate, // 9% federal + provincial
      general: 0.15 + provincialData.corporateGeneralRate, // 15% federal + provincial
    },
  };
}

/**
 * Apply inflation to a spending amount
 */
export function inflateAmount(baseAmount: number, years: number, inflationRate: number): number {
  return baseAmount * Math.pow(1 + inflationRate, years);
}

/**
 * Get the starting year for projections (current year)
 */
export function getStartingYear(): number {
  const currentYear = getCurrentTaxYear();
  // Use current year if we have data, otherwise use latest known
  if (KNOWN_TAX_YEARS[currentYear]) {
    return currentYear;
  }
  return getLatestKnownYear();
}
