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
    hasSurtax: true, // PEI has a surtax as well
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
