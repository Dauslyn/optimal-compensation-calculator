/**
 * Province Configuration
 *
 * Defines all Canadian provinces and territories with their specific tax features.
 */

export type ProvinceCode =
  | 'AB' // Alberta
  | 'BC' // British Columbia
  | 'MB' // Manitoba
  | 'NB' // New Brunswick
  | 'NL' // Newfoundland and Labrador
  | 'NS' // Nova Scotia
  | 'NT' // Northwest Territories
  | 'NU' // Nunavut
  | 'ON' // Ontario
  | 'PE' // Prince Edward Island
  | 'QC' // Quebec
  | 'SK' // Saskatchewan
  | 'YT'; // Yukon

export interface ProvinceConfig {
  code: ProvinceCode;
  name: string;
  shortName: string;
  hasSurtax: boolean;
  hasHealthPremium: boolean;
  hasHealthTax: boolean; // Employer health tax (BC, MB, ON)
  usesQPP: boolean; // Quebec Pension Plan instead of CPP
  hasQPIP: boolean; // Quebec Parental Insurance Plan
}

export const PROVINCES: Record<ProvinceCode, ProvinceConfig> = {
  AB: {
    code: 'AB',
    name: 'Alberta',
    shortName: 'Alta.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  BC: {
    code: 'BC',
    name: 'British Columbia',
    shortName: 'B.C.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: true, // Employer Health Tax
    usesQPP: false,
    hasQPIP: false,
  },
  MB: {
    code: 'MB',
    name: 'Manitoba',
    shortName: 'Man.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: true, // Health and Education Levy
    usesQPP: false,
    hasQPIP: false,
  },
  NB: {
    code: 'NB',
    name: 'New Brunswick',
    shortName: 'N.B.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  NL: {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    shortName: 'N.L.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  NS: {
    code: 'NS',
    name: 'Nova Scotia',
    shortName: 'N.S.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  NT: {
    code: 'NT',
    name: 'Northwest Territories',
    shortName: 'N.W.T.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  NU: {
    code: 'NU',
    name: 'Nunavut',
    shortName: 'Nvt.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  ON: {
    code: 'ON',
    name: 'Ontario',
    shortName: 'Ont.',
    hasSurtax: true, // Ontario surtax (20%/36% on provincial tax)
    hasHealthPremium: true, // Ontario Health Premium
    hasHealthTax: true, // Employer Health Tax
    usesQPP: false,
    hasQPIP: false,
  },
  PE: {
    code: 'PE',
    name: 'Prince Edward Island',
    shortName: 'P.E.I.',
    hasSurtax: false, // PEI surtax eliminated starting 2024
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  QC: {
    code: 'QC',
    name: 'Quebec',
    shortName: 'Que.',
    hasSurtax: false,
    hasHealthPremium: true, // Quebec Health Contribution
    hasHealthTax: true, // Health Services Fund (employer)
    usesQPP: true, // Uses QPP instead of CPP
    hasQPIP: true, // Quebec Parental Insurance Plan
  },
  SK: {
    code: 'SK',
    name: 'Saskatchewan',
    shortName: 'Sask.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
  YT: {
    code: 'YT',
    name: 'Yukon',
    shortName: 'Y.T.',
    hasSurtax: false,
    hasHealthPremium: false,
    hasHealthTax: false,
    usesQPP: false,
    hasQPIP: false,
  },
};

/**
 * Get province configuration by code
 */
export function getProvinceConfig(code: ProvinceCode): ProvinceConfig {
  return PROVINCES[code];
}

/**
 * Get all province options for selector
 */
export function getProvinceOptions(): Array<{ code: ProvinceCode; name: string }> {
  return Object.values(PROVINCES).map(({ code, name }) => ({ code, name }));
}

/**
 * Default province (Ontario)
 */
export const DEFAULT_PROVINCE: ProvinceCode = 'ON';

/**
 * Top combined federal + provincial marginal tax rates for 2025.
 * Used for after-tax wealth "reality check" scenarios.
 * Sources: CRA T1 rates, provincial finance ministries.
 */
const TOP_COMBINED_RATES: Record<ProvinceCode, number> = {
  AB: 0.4800,  // 33% + 15%
  BC: 0.5350,  // 33% + 20.5%
  MB: 0.5040,  // 33% + 17.4%
  NB: 0.5250,  // 33% + 19.5%
  NL: 0.5480,  // 33% + 21.8%
  NS: 0.5400,  // 33% + 21%
  NT: 0.4705,  // 33% + 14.05%
  NU: 0.4450,  // 33% + 11.5%
  ON: 0.5353,  // 33% + 20.53% (incl. surtax effect)
  PE: 0.5200,  // 33% + 19.00% (top bracket, no surtax since 2024)
  QC: 0.5331,  // 33% - 16.5% abatement + 25.75%
  SK: 0.4750,  // 33% + 14.5%
  YT: 0.4800,  // 33% + 15%
};

/**
 * Get the top combined federal + provincial marginal tax rate for a province.
 */
export function getTopProvincialRate(province: ProvinceCode): number {
  return TOP_COMBINED_RATES[province];
}

/**
 * Combined federal + provincial corporate passive investment income tax rates (2025).
 * Federal rate: 38.67% (28% base + 10.67% additional refundable tax).
 * Provincial rates sourced from TaxTips.ca corporate investment income table (2025).
 */
const PASSIVE_INVESTMENT_TAX_RATES: Record<ProvinceCode, number> = {
  AB: 0.4667,  // 38.67% + 8%
  BC: 0.5067,  // 38.67% + 12%
  MB: 0.5067,  // 38.67% + 12%
  NB: 0.5267,  // 38.67% + 14%
  NL: 0.5367,  // 38.67% + 15%
  NS: 0.5267,  // 38.67% + 14%
  NT: 0.5017,  // 38.67% + 11.5%
  NU: 0.5067,  // 38.67% + 12%
  ON: 0.5017,  // 38.67% + 11.5%
  PE: 0.5467,  // 38.67% + 16%
  QC: 0.5017,  // 38.67% + 11.5%
  SK: 0.5067,  // 38.67% + 12%
  YT: 0.5067,  // 38.67% + 12%
};

/**
 * Get the combined federal + provincial corporate passive investment income tax rate.
 */
export function getPassiveInvestmentTaxRate(province: ProvinceCode | string): number {
  return PASSIVE_INVESTMENT_TAX_RATES[province as ProvinceCode] ?? PASSIVE_INVESTMENT_TAX_RATES.ON;
}
