/**
 * Provincial Tax Rates for All Canadian Provinces/Territories
 *
 * Tax brackets, dividend credits, corporate rates, and special taxes by province.
 * Data sourced from Canada Revenue Agency and provincial finance ministries.
 *
 * Note: 2025 and 2026 values are CRA-verified (T4032 payroll deduction tables).
 * Future years (2027+) are projected using province-specific indexation factors.
 */

import type { TaxBracket } from '../types';
import type { ProvinceCode } from './provinces';

/**
 * Province-specific indexation factors for projecting brackets beyond known years.
 *
 * Each province indexes their tax brackets using their own provincial CPI factor,
 * which differs from the federal indexation factor. These are the most recent
 * known factors (used for 2026 indexation) and serve as the best estimate
 * for future years.
 *
 * Special cases:
 * - Manitoba: FROZEN at 2024 levels (Budget 2025, Bulletin 125) — 0% indexation
 * - Ontario: $150K/$220K bracket thresholds are legislatively fixed (not indexed)
 * - Yukon: $500K bracket is fixed (matches SBD limit, not indexed)
 *
 * Sources: CRA T4032 payroll deduction tables, provincial finance ministry announcements.
 */
export const PROVINCIAL_INDEXATION_FACTORS: Record<ProvinceCode, number> = {
  AB: 0.020,  // 2.0% (Alberta Escalator)
  BC: 0.022,  // 2.2% (BC provincial CPI)
  MB: 0.000,  // FROZEN — Manitoba Budget 2025 froze brackets at 2024 levels
  NB: 0.020,  // 2.0% (NB provincial CPI)
  NL: 0.011,  // 1.1% (NL provincial CPI)
  NS: 0.016,  // 1.6% (NS provincial CPI)
  NT: 0.020,  // 2.0% (NT territorial CPI)
  NU: 0.020,  // 2.0% (NU territorial CPI)
  ON: 0.019,  // 1.9% (ON provincial CPI; $150K/$220K NOT indexed)
  PE: 0.018,  // 1.8% (PEI provincial CPI)
  QC: 0.0205, // 2.05% (QC provincial CPI)
  SK: 0.020,  // 2.0% (SK provincial CPI; BPA gets extra $500/year through 2028)
  YT: 0.020,  // 2.0% (mirrors federal; $500K bracket NOT indexed)
};

/**
 * Bracket thresholds that are legislatively fixed and should NOT be indexed.
 * Key: province code, Value: set of threshold values that stay constant.
 */
const NON_INDEXED_THRESHOLDS: Partial<Record<ProvinceCode, Set<number>>> = {
  ON: new Set([150000, 220000]),
  YT: new Set([500000]),
};

/**
 * Provincial tax data structure
 */
export interface ProvincialTaxData {
  brackets: TaxBracket[];
  basicPersonalAmount: number;
  dividendTaxCredits: {
    eligible: number; // % of grossed-up dividend
    nonEligible: number;
  };
  // Corporate small business rate (%)
  corporateSmallBusinessRate: number;
  // Corporate general rate (%)
  corporateGeneralRate: number;
  // Ontario-style surtax (if applicable)
  surtax?: {
    firstThreshold: number;
    firstRate: number;
    secondThreshold: number;
    secondRate: number;
  };
  // Health premium (if applicable) - Ontario-style graduated premium
  healthPremium?: {
    brackets: Array<{
      threshold: number;
      base: number;
      rate: number;
      maxPremium: number;
    }>;
  };
  // PEI surtax (different structure)
  peiSurtax?: {
    threshold: number;
    rate: number;
  };
}

/**
 * Provincial tax rates by province and year
 * Key format: `${province}_${year}` e.g., "ON_2025"
 */
export const PROVINCIAL_TAX_RATES: Record<string, ProvincialTaxData> = {
  // ===========================================
  // ALBERTA
  // ===========================================
  AB_2025: {
    brackets: [
      { threshold: 0, rate: 0.08 }, // New 8% bracket (Budget 2025, Bill 39)
      { threshold: 60000, rate: 0.10 },
      { threshold: 151234, rate: 0.12 },
      { threshold: 181481, rate: 0.13 },
      { threshold: 241974, rate: 0.14 },
      { threshold: 362961, rate: 0.15 },
    ],
    basicPersonalAmount: 22323,
    dividendTaxCredits: {
      eligible: 0.0812, // 8.12% of grossed-up
      nonEligible: 0.0218, // 2.18% of grossed-up
    },
    corporateSmallBusinessRate: 0.02, // 2%
    corporateGeneralRate: 0.08, // 8%
  },
  AB_2026: {
    brackets: [
      { threshold: 0, rate: 0.08 }, // 8% bracket indexed (2% Alberta Escalator)
      { threshold: 61200, rate: 0.10 },
      { threshold: 154259, rate: 0.12 },
      { threshold: 185111, rate: 0.13 },
      { threshold: 246813, rate: 0.14 },
      { threshold: 370220, rate: 0.15 },
    ],
    basicPersonalAmount: 22769,
    dividendTaxCredits: {
      eligible: 0.0812,
      nonEligible: 0.0218,
    },
    corporateSmallBusinessRate: 0.02,
    corporateGeneralRate: 0.08,
  },

  // ===========================================
  // BRITISH COLUMBIA
  // ===========================================
  BC_2025: {
    brackets: [
      { threshold: 0, rate: 0.0506 },
      { threshold: 49279, rate: 0.077 },
      { threshold: 98560, rate: 0.105 },
      { threshold: 113158, rate: 0.1229 },
      { threshold: 137407, rate: 0.147 },
      { threshold: 186306, rate: 0.168 },
      { threshold: 259829, rate: 0.205 },
    ],
    basicPersonalAmount: 12932,
    dividendTaxCredits: {
      eligible: 0.12, // 12% of grossed-up
      nonEligible: 0.0196, // 1.96% of grossed-up
    },
    corporateSmallBusinessRate: 0.02, // 2%
    corporateGeneralRate: 0.12, // 12%
  },
  BC_2026: {
    brackets: [
      { threshold: 0, rate: 0.0506 },
      { threshold: 50363, rate: 0.077 },
      { threshold: 100728, rate: 0.105 },
      { threshold: 115648, rate: 0.1229 },
      { threshold: 140430, rate: 0.147 },
      { threshold: 190405, rate: 0.168 },
      { threshold: 265545, rate: 0.205 },
    ],
    basicPersonalAmount: 13216,
    dividendTaxCredits: {
      eligible: 0.12,
      nonEligible: 0.0196,
    },
    corporateSmallBusinessRate: 0.02,
    corporateGeneralRate: 0.12,
  },

  // ===========================================
  // MANITOBA
  // ===========================================
  MB_2025: {
    brackets: [
      { threshold: 0, rate: 0.108 },
      { threshold: 47000, rate: 0.1275 },
      { threshold: 100000, rate: 0.174 },
    ],
    basicPersonalAmount: 15780,
    dividendTaxCredits: {
      eligible: 0.08, // 8% of grossed-up
      nonEligible: 0.007835, // 0.7835% of grossed-up
    },
    corporateSmallBusinessRate: 0.00, // 0% (eliminated)
    corporateGeneralRate: 0.12, // 12%
  },
  MB_2026: {
    // Manitoba FROZE brackets and BPA at 2024 levels (Budget 2025, Bulletin 125)
    brackets: [
      { threshold: 0, rate: 0.108 },
      { threshold: 47000, rate: 0.1275 },
      { threshold: 100000, rate: 0.174 },
    ],
    basicPersonalAmount: 15780,
    dividendTaxCredits: {
      eligible: 0.08,
      nonEligible: 0.007835,
    },
    corporateSmallBusinessRate: 0.00,
    corporateGeneralRate: 0.12,
  },

  // ===========================================
  // NEW BRUNSWICK
  // ===========================================
  NB_2025: {
    brackets: [
      { threshold: 0, rate: 0.094 },
      { threshold: 51306, rate: 0.14 },
      { threshold: 102614, rate: 0.16 },
      { threshold: 190060, rate: 0.195 },
    ],
    basicPersonalAmount: 13396,
    dividendTaxCredits: {
      eligible: 0.14, // 14% of grossed-up
      nonEligible: 0.0275, // 2.75% of grossed-up
    },
    corporateSmallBusinessRate: 0.025, // 2.5%
    corporateGeneralRate: 0.14, // 14%
  },
  NB_2026: {
    brackets: [
      { threshold: 0, rate: 0.094 },
      { threshold: 52333, rate: 0.14 },
      { threshold: 104666, rate: 0.16 },
      { threshold: 193861, rate: 0.195 },
    ],
    basicPersonalAmount: 13664,
    dividendTaxCredits: {
      eligible: 0.14,
      nonEligible: 0.0275,
    },
    corporateSmallBusinessRate: 0.025,
    corporateGeneralRate: 0.14,
  },

  // ===========================================
  // NEWFOUNDLAND AND LABRADOR
  // ===========================================
  NL_2025: {
    brackets: [
      { threshold: 0, rate: 0.087 },
      { threshold: 44192, rate: 0.145 },
      { threshold: 88382, rate: 0.158 },
      { threshold: 157792, rate: 0.178 },
      { threshold: 220910, rate: 0.198 },
      { threshold: 282214, rate: 0.208 },
      { threshold: 564429, rate: 0.213 },
      { threshold: 1128858, rate: 0.218 },
    ],
    basicPersonalAmount: 11067,
    dividendTaxCredits: {
      eligible: 0.063, // 6.3% of grossed-up
      nonEligible: 0.032, // 3.2% of grossed-up
    },
    corporateSmallBusinessRate: 0.03, // 3%
    corporateGeneralRate: 0.15, // 15%
  },
  NL_2026: {
    // Indexed at 1.1% (NL provincial CPI)
    brackets: [
      { threshold: 0, rate: 0.087 },
      { threshold: 44678, rate: 0.145 },
      { threshold: 89354, rate: 0.158 },
      { threshold: 159528, rate: 0.178 },
      { threshold: 223340, rate: 0.198 },
      { threshold: 285319, rate: 0.208 },
      { threshold: 570638, rate: 0.213 },
      { threshold: 1141275, rate: 0.218 },
    ],
    basicPersonalAmount: 11188,
    dividendTaxCredits: {
      eligible: 0.063,
      nonEligible: 0.032,
    },
    corporateSmallBusinessRate: 0.03,
    corporateGeneralRate: 0.15,
  },

  // ===========================================
  // NOVA SCOTIA
  // ===========================================
  NS_2025: {
    // NS reformed BPA in 2025: flat $11,744 for all (no more clawback)
    // Bracket indexation started 2025 at 3.1%
    brackets: [
      { threshold: 0, rate: 0.0879 },
      { threshold: 30507, rate: 0.1495 },
      { threshold: 61015, rate: 0.1667 },
      { threshold: 95883, rate: 0.175 },
      { threshold: 154650, rate: 0.21 },
    ],
    basicPersonalAmount: 11744,
    dividendTaxCredits: {
      eligible: 0.0885, // 8.85% of grossed-up
      nonEligible: 0.0299, // 2.99% of grossed-up
    },
    corporateSmallBusinessRate: 0.025, // 2.5%
    corporateGeneralRate: 0.14, // 14%
  },
  NS_2026: {
    // Indexed at 1.6% (NS provincial CPI)
    brackets: [
      { threshold: 0, rate: 0.0879 },
      { threshold: 30995, rate: 0.1495 },
      { threshold: 61991, rate: 0.1667 },
      { threshold: 97417, rate: 0.175 },
      { threshold: 157124, rate: 0.21 },
    ],
    basicPersonalAmount: 11932,
    dividendTaxCredits: {
      eligible: 0.0885,
      nonEligible: 0.0299,
    },
    corporateSmallBusinessRate: 0.025,
    corporateGeneralRate: 0.14,
  },

  // ===========================================
  // NORTHWEST TERRITORIES
  // ===========================================
  NT_2025: {
    brackets: [
      { threshold: 0, rate: 0.059 },
      { threshold: 51964, rate: 0.086 },
      { threshold: 103930, rate: 0.122 },
      { threshold: 168967, rate: 0.1405 },
    ],
    basicPersonalAmount: 17842,
    dividendTaxCredits: {
      eligible: 0.115, // 11.5% of grossed-up
      nonEligible: 0.06, // 6% of grossed-up
    },
    corporateSmallBusinessRate: 0.02, // 2%
    corporateGeneralRate: 0.115, // 11.5%
  },
  NT_2026: {
    brackets: [
      { threshold: 0, rate: 0.059 },
      { threshold: 53003, rate: 0.086 },
      { threshold: 106009, rate: 0.122 },
      { threshold: 172346, rate: 0.1405 },
    ],
    basicPersonalAmount: 18198,
    dividendTaxCredits: {
      eligible: 0.115,
      nonEligible: 0.06,
    },
    corporateSmallBusinessRate: 0.02,
    corporateGeneralRate: 0.115,
  },

  // ===========================================
  // NUNAVUT
  // ===========================================
  NU_2025: {
    brackets: [
      { threshold: 0, rate: 0.04 },
      { threshold: 54707, rate: 0.07 },
      { threshold: 109413, rate: 0.09 },
      { threshold: 177881, rate: 0.115 },
    ],
    basicPersonalAmount: 19274,
    dividendTaxCredits: {
      eligible: 0.0551, // 5.51% of grossed-up
      nonEligible: 0.0261, // 2.61% of grossed-up
    },
    corporateSmallBusinessRate: 0.03, // 3%
    corporateGeneralRate: 0.12, // 12%
  },
  NU_2026: {
    brackets: [
      { threshold: 0, rate: 0.04 },
      { threshold: 55801, rate: 0.07 },
      { threshold: 111602, rate: 0.09 },
      { threshold: 181439, rate: 0.115 },
    ],
    basicPersonalAmount: 19659,
    dividendTaxCredits: {
      eligible: 0.0551,
      nonEligible: 0.0261,
    },
    corporateSmallBusinessRate: 0.03,
    corporateGeneralRate: 0.12,
  },

  // ===========================================
  // ONTARIO
  // ===========================================
  ON_2025: {
    // Indexed at 2.8% for 2025; $150K and $220K brackets NOT indexed
    brackets: [
      { threshold: 0, rate: 0.0505 },
      { threshold: 52886, rate: 0.0915 },
      { threshold: 105775, rate: 0.1116 },
      { threshold: 150000, rate: 0.1216 },
      { threshold: 220000, rate: 0.1316 },
    ],
    basicPersonalAmount: 12747,
    dividendTaxCredits: {
      eligible: 0.10, // 10% of grossed-up
      nonEligible: 0.029863, // 2.9863% of grossed-up
    },
    corporateSmallBusinessRate: 0.032, // 3.2%
    corporateGeneralRate: 0.115, // 11.5%
    surtax: {
      firstThreshold: 5710,
      firstRate: 0.20,
      secondThreshold: 7307,
      secondRate: 0.36,
    },
    healthPremium: {
      brackets: [
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
  ON_2026: {
    // Indexed at 1.9% for 2026; $150K and $220K brackets NOT indexed (legislatively fixed)
    brackets: [
      { threshold: 0, rate: 0.0505 },
      { threshold: 53891, rate: 0.0915 },
      { threshold: 107785, rate: 0.1116 },
      { threshold: 150000, rate: 0.1216 },
      { threshold: 220000, rate: 0.1316 },
    ],
    basicPersonalAmount: 12989,
    dividendTaxCredits: {
      eligible: 0.10,
      nonEligible: 0.029863,
    },
    corporateSmallBusinessRate: 0.032,
    corporateGeneralRate: 0.115,
    surtax: {
      firstThreshold: 5818,
      firstRate: 0.20,
      secondThreshold: 7446,
      secondRate: 0.36,
    },
    healthPremium: {
      // Ontario Health Premium thresholds are NOT indexed
      brackets: [
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

  // ===========================================
  // PRINCE EDWARD ISLAND
  // ===========================================
  PE_2025: {
    // PEI reformed 2024: 5 brackets, no surtax, new rates
    brackets: [
      { threshold: 0, rate: 0.095 },
      { threshold: 33328, rate: 0.1347 },
      { threshold: 64656, rate: 0.166 },
      { threshold: 105000, rate: 0.1762 },
      { threshold: 140000, rate: 0.19 },
    ],
    basicPersonalAmount: 14250,
    dividendTaxCredits: {
      eligible: 0.105, // 10.5% of grossed-up
      nonEligible: 0.0128, // 1.28% of grossed-up
    },
    corporateSmallBusinessRate: 0.01, // 1%
    corporateGeneralRate: 0.16, // 16%
    // No surtax (eliminated starting 2024)
  },
  PE_2026: {
    brackets: [
      { threshold: 0, rate: 0.095 },
      { threshold: 33928, rate: 0.1347 },
      { threshold: 65820, rate: 0.166 },
      { threshold: 106890, rate: 0.1762 },
      { threshold: 142250, rate: 0.19 },
    ],
    basicPersonalAmount: 15000,
    dividendTaxCredits: {
      eligible: 0.105,
      nonEligible: 0.0128,
    },
    corporateSmallBusinessRate: 0.01,
    corporateGeneralRate: 0.16,
    // No surtax (eliminated starting 2024)
  },

  // ===========================================
  // QUEBEC
  // Note: Quebec has a separate tax system. Rates differ significantly.
  // ===========================================
  QC_2025: {
    brackets: [
      { threshold: 0, rate: 0.14 },
      { threshold: 53255, rate: 0.19 },
      { threshold: 106495, rate: 0.24 },
      { threshold: 129590, rate: 0.2575 },
    ],
    basicPersonalAmount: 18571,
    dividendTaxCredits: {
      eligible: 0.117, // 11.7% of grossed-up
      nonEligible: 0.0342, // 3.42% of grossed-up
    },
    corporateSmallBusinessRate: 0.032, // 3.2% (combined with federal deduction)
    corporateGeneralRate: 0.115, // 11.5%
    // Quebec Health Contribution is now integrated into brackets
    // (no separate premium structure as of 2019)
  },
  QC_2026: {
    // Indexed at 2.05% (Quebec provincial CPI)
    brackets: [
      { threshold: 0, rate: 0.14 },
      { threshold: 54345, rate: 0.19 },
      { threshold: 108680, rate: 0.24 },
      { threshold: 132245, rate: 0.2575 },
    ],
    basicPersonalAmount: 18952,
    dividendTaxCredits: {
      eligible: 0.117,
      nonEligible: 0.0342,
    },
    corporateSmallBusinessRate: 0.032,
    corporateGeneralRate: 0.115,
  },

  // ===========================================
  // SASKATCHEWAN
  // ===========================================
  SK_2025: {
    // BPA includes $500/year Affordability Act increase (through 2028)
    brackets: [
      { threshold: 0, rate: 0.105 },
      { threshold: 53463, rate: 0.125 },
      { threshold: 152750, rate: 0.145 },
    ],
    basicPersonalAmount: 19491,
    dividendTaxCredits: {
      eligible: 0.11, // 11% of grossed-up
      nonEligible: 0.02105, // 2.105% of grossed-up
    },
    corporateSmallBusinessRate: 0.01, // 1%
    corporateGeneralRate: 0.12, // 12%
  },
  SK_2026: {
    // BPA: indexed 2% + $500 Affordability Act = $20,381
    brackets: [
      { threshold: 0, rate: 0.105 },
      { threshold: 54532, rate: 0.125 },
      { threshold: 155805, rate: 0.145 },
    ],
    basicPersonalAmount: 20381,
    dividendTaxCredits: {
      eligible: 0.11,
      nonEligible: 0.02105,
    },
    corporateSmallBusinessRate: 0.01,
    corporateGeneralRate: 0.12,
  },

  // ===========================================
  // YUKON
  // ===========================================
  YT_2025: {
    // Yukon mirrors federal bracket thresholds + BPA
    brackets: [
      { threshold: 0, rate: 0.064 },
      { threshold: 57375, rate: 0.09 },
      { threshold: 114750, rate: 0.109 },
      { threshold: 177882, rate: 0.128 },
      { threshold: 500000, rate: 0.15 }, // Fixed at $500K (SBD limit), NOT indexed
    ],
    basicPersonalAmount: 16129,
    dividendTaxCredits: {
      eligible: 0.1212, // 12.12% of grossed-up (federal mirror)
      nonEligible: 0.0218, // 2.18% of grossed-up
    },
    corporateSmallBusinessRate: 0.00, // 0%
    corporateGeneralRate: 0.12, // 12%
  },
  YT_2026: {
    brackets: [
      { threshold: 0, rate: 0.064 },
      { threshold: 58523, rate: 0.09 },
      { threshold: 117045, rate: 0.109 },
      { threshold: 181440, rate: 0.128 },
      { threshold: 500000, rate: 0.15 }, // Fixed at $500K, NOT indexed
    ],
    basicPersonalAmount: 16452,
    dividendTaxCredits: {
      eligible: 0.1212,
      nonEligible: 0.0218,
    },
    corporateSmallBusinessRate: 0.00,
    corporateGeneralRate: 0.12,
  },
};

/**
 * Get provincial tax data for a specific province and year
 * Falls back to projecting from most recent known year if needed.
 *
 * Uses province-specific indexation factors for projections (2027+),
 * NOT the user's generic inflation rate. This ensures bracket thresholds
 * track each province's actual CPI-based indexation.
 */
export function getProvincialTaxData(
  province: ProvinceCode,
  year: number,
  _inflationRate: number = 0.02 // kept for backward compat; ignored for provincial projection
): ProvincialTaxData {
  const key = `${province}_${year}`;

  // Return known data if available
  if (PROVINCIAL_TAX_RATES[key]) {
    return PROVINCIAL_TAX_RATES[key];
  }

  // Find most recent known year for this province
  const knownYears = Object.keys(PROVINCIAL_TAX_RATES)
    .filter((k) => k.startsWith(`${province}_`))
    .map((k) => parseInt(k.split('_')[1]))
    .sort((a, b) => b - a);

  if (knownYears.length === 0) {
    throw new Error(`No tax data available for province: ${province}`);
  }

  const lastKnownYear = knownYears[0];
  const baseData = PROVINCIAL_TAX_RATES[`${province}_${lastKnownYear}`];
  const yearsToProject = year - lastKnownYear;

  if (yearsToProject <= 0) {
    // Requesting a year before our data - use earliest known
    const earliestYear = knownYears[knownYears.length - 1];
    return PROVINCIAL_TAX_RATES[`${province}_${earliestYear}`];
  }

  // Use province-specific indexation factor (not the user's inflation rate)
  const provincialFactor = PROVINCIAL_INDEXATION_FACTORS[province];

  // Project brackets forward using province-specific indexation
  return projectProvincialData(baseData, yearsToProject, provincialFactor, province);
}

/**
 * Project provincial tax data forward using province-specific indexation.
 *
 * Handles special cases:
 * - Non-indexed thresholds (ON $150K/$220K, YT $500K) stay fixed
 * - Manitoba frozen brackets (factor = 0, so no change)
 * - Saskatchewan BPA gets $500/year Affordability Act add-on (through 2028)
 */
function projectProvincialData(
  base: ProvincialTaxData,
  years: number,
  inflationRate: number,
  province?: ProvinceCode
): ProvincialTaxData {
  const factor = Math.pow(1 + inflationRate, years);
  const fixedThresholds = province ? NON_INDEXED_THRESHOLDS[province] : undefined;

  const projected: ProvincialTaxData = {
    brackets: base.brackets.map((b) => ({
      // Keep threshold at 0 for first bracket, keep fixed thresholds unchanged
      threshold: b.threshold === 0 ? 0
        : (fixedThresholds?.has(b.threshold) ? b.threshold
        : Math.round(b.threshold * factor)),
      rate: b.rate,
    })),
    basicPersonalAmount: Math.round(base.basicPersonalAmount * factor),
    dividendTaxCredits: { ...base.dividendTaxCredits },
    corporateSmallBusinessRate: base.corporateSmallBusinessRate,
    corporateGeneralRate: base.corporateGeneralRate,
  };

  // Saskatchewan Affordability Act: extra $500/year added to BPA through 2028.
  // Base year is 2026, which already includes the $500 add-on.
  // For 2027 (years=1) and 2028 (years=2), add $500/year on top of indexed amount.
  // Act expires after 2028, so no add-on for years >= 3 (i.e., 2029+).
  const SK_AFFORDABILITY_ACT_LAST_YEAR = 2028;
  const SK_BASE_YEAR = 2026;
  const maxAffordabilityYears = SK_AFFORDABILITY_ACT_LAST_YEAR - SK_BASE_YEAR; // 2
  if (province === 'SK' && years <= maxAffordabilityYears) {
    projected.basicPersonalAmount += 500 * years;
  }

  // Project surtax thresholds if applicable
  if (base.surtax) {
    projected.surtax = {
      firstThreshold: Math.round(base.surtax.firstThreshold * factor),
      firstRate: base.surtax.firstRate,
      secondThreshold: Math.round(base.surtax.secondThreshold * factor),
      secondRate: base.surtax.secondRate,
    };
  }

  // Health premium thresholds are NOT indexed (e.g., Ontario Health Premium)
  // Per CRA, these thresholds do not change with inflation
  if (base.healthPremium) {
    projected.healthPremium = base.healthPremium;
  }

  // Project PEI surtax if applicable
  if (base.peiSurtax) {
    projected.peiSurtax = {
      threshold: Math.round(base.peiSurtax.threshold * factor),
      rate: base.peiSurtax.rate,
    };
  }

  return projected;
}
