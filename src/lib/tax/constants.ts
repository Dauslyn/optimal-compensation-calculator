import type { TaxRates, TaxBracket } from '../types';

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
