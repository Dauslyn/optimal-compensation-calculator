/**
 * Provincial Tax Rates for All Canadian Provinces/Territories
 *
 * Tax brackets, dividend credits, corporate rates, and special taxes by province.
 * Data sourced from Canada Revenue Agency and provincial finance ministries.
 *
 * Note: 2025 values are official CRA indexed amounts.
 */

import type { TaxBracket } from '../types';
import type { ProvinceCode } from './provinces';

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
      { threshold: 0, rate: 0.10 },
      { threshold: 148269, rate: 0.12 },
      { threshold: 177922, rate: 0.13 },
      { threshold: 237230, rate: 0.14 },
      { threshold: 355845, rate: 0.15 },
    ],
    basicPersonalAmount: 21003,
    dividendTaxCredits: {
      eligible: 0.0812, // 8.12% of grossed-up
      nonEligible: 0.0218, // 2.18% of grossed-up
    },
    corporateSmallBusinessRate: 0.02, // 2%
    corporateGeneralRate: 0.08, // 8%
  },
  AB_2026: {
    brackets: [
      { threshold: 0, rate: 0.10 },
      { threshold: 151234, rate: 0.12 },
      { threshold: 181480, rate: 0.13 },
      { threshold: 241975, rate: 0.14 },
      { threshold: 362962, rate: 0.15 },
    ],
    basicPersonalAmount: 21423,
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
      { threshold: 47937, rate: 0.077 },
      { threshold: 95875, rate: 0.105 },
      { threshold: 110076, rate: 0.1229 },
      { threshold: 133664, rate: 0.147 },
      { threshold: 181232, rate: 0.168 },
      { threshold: 252752, rate: 0.205 },
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
      { threshold: 48896, rate: 0.077 },
      { threshold: 97792, rate: 0.105 },
      { threshold: 112278, rate: 0.1229 },
      { threshold: 136337, rate: 0.147 },
      { threshold: 184857, rate: 0.168 },
      { threshold: 257807, rate: 0.205 },
    ],
    basicPersonalAmount: 13191,
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
    brackets: [
      { threshold: 0, rate: 0.108 },
      { threshold: 47940, rate: 0.1275 },
      { threshold: 102000, rate: 0.174 },
    ],
    basicPersonalAmount: 16096,
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
      { threshold: 49958, rate: 0.14 },
      { threshold: 99916, rate: 0.16 },
      { threshold: 185064, rate: 0.195 },
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
      { threshold: 50957, rate: 0.14 },
      { threshold: 101914, rate: 0.16 },
      { threshold: 188765, rate: 0.195 },
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
      { threshold: 43198, rate: 0.145 },
      { threshold: 86395, rate: 0.158 },
      { threshold: 154244, rate: 0.178 },
      { threshold: 215943, rate: 0.198 },
      { threshold: 275870, rate: 0.208 },
      { threshold: 551739, rate: 0.213 },
      { threshold: 1103478, rate: 0.218 },
    ],
    basicPersonalAmount: 10818,
    dividendTaxCredits: {
      eligible: 0.063, // 6.3% of grossed-up
      nonEligible: 0.032, // 3.2% of grossed-up
    },
    corporateSmallBusinessRate: 0.03, // 3%
    corporateGeneralRate: 0.15, // 15%
  },
  NL_2026: {
    brackets: [
      { threshold: 0, rate: 0.087 },
      { threshold: 44062, rate: 0.145 },
      { threshold: 88123, rate: 0.158 },
      { threshold: 157329, rate: 0.178 },
      { threshold: 220262, rate: 0.198 },
      { threshold: 281387, rate: 0.208 },
      { threshold: 562774, rate: 0.213 },
      { threshold: 1125547, rate: 0.218 },
    ],
    basicPersonalAmount: 11034,
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
    brackets: [
      { threshold: 0, rate: 0.0879 },
      { threshold: 29590, rate: 0.1495 },
      { threshold: 59180, rate: 0.1667 },
      { threshold: 93000, rate: 0.175 },
      { threshold: 150000, rate: 0.21 },
    ],
    basicPersonalAmount: 8481,
    dividendTaxCredits: {
      eligible: 0.0885, // 8.85% of grossed-up
      nonEligible: 0.0299, // 2.99% of grossed-up
    },
    corporateSmallBusinessRate: 0.025, // 2.5%
    corporateGeneralRate: 0.14, // 14%
  },
  NS_2026: {
    brackets: [
      { threshold: 0, rate: 0.0879 },
      { threshold: 30182, rate: 0.1495 },
      { threshold: 60364, rate: 0.1667 },
      { threshold: 94860, rate: 0.175 },
      { threshold: 153000, rate: 0.21 },
    ],
    basicPersonalAmount: 8651,
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
      { threshold: 50597, rate: 0.086 },
      { threshold: 101198, rate: 0.122 },
      { threshold: 164525, rate: 0.1405 },
    ],
    basicPersonalAmount: 17373,
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
      { threshold: 51609, rate: 0.086 },
      { threshold: 103222, rate: 0.122 },
      { threshold: 167816, rate: 0.1405 },
    ],
    basicPersonalAmount: 17720,
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
      { threshold: 53268, rate: 0.07 },
      { threshold: 106537, rate: 0.09 },
      { threshold: 173205, rate: 0.115 },
    ],
    basicPersonalAmount: 18767,
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
      { threshold: 54333, rate: 0.07 },
      { threshold: 108668, rate: 0.09 },
      { threshold: 176669, rate: 0.115 },
    ],
    basicPersonalAmount: 19142,
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
    brackets: [
      { threshold: 0, rate: 0.0505 },
      { threshold: 51446, rate: 0.0915 },
      { threshold: 102894, rate: 0.1116 },
      { threshold: 150000, rate: 0.1216 },
      { threshold: 220000, rate: 0.1316 },
    ],
    basicPersonalAmount: 12399,
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
    brackets: [
      { threshold: 0, rate: 0.0505 },
      { threshold: 52475, rate: 0.0915 },
      { threshold: 104952, rate: 0.1116 },
      { threshold: 153000, rate: 0.1216 },
      { threshold: 224400, rate: 0.1316 },
    ],
    basicPersonalAmount: 12647,
    dividendTaxCredits: {
      eligible: 0.10,
      nonEligible: 0.029863,
    },
    corporateSmallBusinessRate: 0.032,
    corporateGeneralRate: 0.115,
    surtax: {
      firstThreshold: 5824,
      firstRate: 0.20,
      secondThreshold: 7453,
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

  // ===========================================
  // PRINCE EDWARD ISLAND
  // ===========================================
  PE_2025: {
    brackets: [
      { threshold: 0, rate: 0.0965 },
      { threshold: 32656, rate: 0.1363 },
      { threshold: 64313, rate: 0.1665 },
    ],
    basicPersonalAmount: 13500,
    dividendTaxCredits: {
      eligible: 0.105, // 10.5% of grossed-up
      nonEligible: 0.0128, // 1.28% of grossed-up
    },
    corporateSmallBusinessRate: 0.01, // 1%
    corporateGeneralRate: 0.16, // 16%
    peiSurtax: {
      threshold: 12500,
      rate: 0.10, // 10% of provincial tax over $12,500
    },
  },
  PE_2026: {
    brackets: [
      { threshold: 0, rate: 0.0965 },
      { threshold: 33309, rate: 0.1363 },
      { threshold: 65599, rate: 0.1665 },
    ],
    basicPersonalAmount: 13770,
    dividendTaxCredits: {
      eligible: 0.105,
      nonEligible: 0.0128,
    },
    corporateSmallBusinessRate: 0.01,
    corporateGeneralRate: 0.16,
    peiSurtax: {
      threshold: 12750,
      rate: 0.10,
    },
  },

  // ===========================================
  // QUEBEC
  // Note: Quebec has a separate tax system. Rates differ significantly.
  // ===========================================
  QC_2025: {
    brackets: [
      { threshold: 0, rate: 0.14 },
      { threshold: 51780, rate: 0.19 },
      { threshold: 103545, rate: 0.24 },
      { threshold: 126000, rate: 0.2575 },
    ],
    basicPersonalAmount: 18056,
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
    brackets: [
      { threshold: 0, rate: 0.14 },
      { threshold: 52816, rate: 0.19 },
      { threshold: 105616, rate: 0.24 },
      { threshold: 128520, rate: 0.2575 },
    ],
    basicPersonalAmount: 18417,
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
    brackets: [
      { threshold: 0, rate: 0.105 },
      { threshold: 52057, rate: 0.125 },
      { threshold: 148734, rate: 0.145 },
    ],
    basicPersonalAmount: 18491,
    dividendTaxCredits: {
      eligible: 0.11, // 11% of grossed-up
      nonEligible: 0.02105, // 2.105% of grossed-up
    },
    corporateSmallBusinessRate: 0.01, // 1%
    corporateGeneralRate: 0.12, // 12%
  },
  SK_2026: {
    brackets: [
      { threshold: 0, rate: 0.105 },
      { threshold: 53098, rate: 0.125 },
      { threshold: 151709, rate: 0.145 },
    ],
    basicPersonalAmount: 18861,
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
    brackets: [
      { threshold: 0, rate: 0.064 },
      { threshold: 55867, rate: 0.09 },
      { threshold: 111733, rate: 0.109 },
      { threshold: 173205, rate: 0.128 },
      { threshold: 500000, rate: 0.15 },
    ],
    basicPersonalAmount: 15705,
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
      { threshold: 56984, rate: 0.09 },
      { threshold: 113968, rate: 0.109 },
      { threshold: 176669, rate: 0.128 },
      { threshold: 510000, rate: 0.15 },
    ],
    basicPersonalAmount: 16019,
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
 * Falls back to projecting from most recent known year if needed
 */
export function getProvincialTaxData(
  province: ProvinceCode,
  year: number,
  inflationRate: number = 0.02
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

  // Project brackets forward using inflation
  return projectProvincialData(baseData, yearsToProject, inflationRate);
}

/**
 * Project provincial tax data forward using inflation rate
 */
function projectProvincialData(
  base: ProvincialTaxData,
  years: number,
  inflationRate: number
): ProvincialTaxData {
  const factor = Math.pow(1 + inflationRate, years);

  const projected: ProvincialTaxData = {
    brackets: base.brackets.map((b) => ({
      threshold: b.threshold === 0 ? 0 : Math.round(b.threshold * factor),
      rate: b.rate,
    })),
    basicPersonalAmount: Math.round(base.basicPersonalAmount * factor),
    dividendTaxCredits: { ...base.dividendTaxCredits },
    corporateSmallBusinessRate: base.corporateSmallBusinessRate,
    corporateGeneralRate: base.corporateGeneralRate,
  };

  // Project surtax thresholds if applicable
  if (base.surtax) {
    projected.surtax = {
      firstThreshold: Math.round(base.surtax.firstThreshold * factor),
      firstRate: base.surtax.firstRate,
      secondThreshold: Math.round(base.surtax.secondThreshold * factor),
      secondRate: base.surtax.secondRate,
    };
  }

  // Project health premium thresholds if applicable
  if (base.healthPremium) {
    projected.healthPremium = {
      brackets: base.healthPremium.brackets.map((b) => ({
        threshold: Math.round(b.threshold * factor),
        base: b.base,
        rate: b.rate,
        maxPremium: b.maxPremium,
      })),
    };
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
