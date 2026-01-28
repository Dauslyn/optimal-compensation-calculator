/**
 * Share Link Utility
 *
 * Encodes/decodes UserInputs to/from URL-safe strings for sharing calculator configurations.
 * Uses base64 encoding of JSON for compact representation.
 */

import type { UserInputs } from './types';
import type { ProvinceCode } from './tax/provinces';
import { DEFAULT_PROVINCE } from './tax/provinces';
import { getStartingYear, getDefaultInflationRate } from './tax/indexation';

// Version for backwards compatibility if we change the format
const SHARE_FORMAT_VERSION = 1;

interface ShareData {
  v: number; // version
  d: CompactInputs; // data
}

// Compact representation of UserInputs (shorter keys to reduce URL length)
interface CompactInputs {
  pv: string;   // province
  ri: number;   // requiredIncome
  ph: number;   // planningHorizon
  sy: number;   // startingYear
  ei: number;   // expectedInflationRate
  is: boolean;  // inflateSpendingNeeds
  cib: number;  // corporateInvestmentBalance
  tb: number;   // tfsaBalance
  rb: number;   // rrspBalance
  cda: number;  // cdaBalance
  erd: number;  // eRDTOHBalance
  nrd: number;  // nRDTOHBalance
  grp: number;  // gripBalance
  irr: number;  // investmentReturnRate
  ce: number;   // canadianEquityPercent
  ue: number;   // usEquityPercent
  ie: number;   // internationalEquityPercent
  fi: number;   // fixedIncomePercent
  are: number;  // annualCorporateRetainedEarnings
  mt: boolean;  // maximizeTFSA
  cr: boolean;  // contributeToRRSP
  ce2: boolean; // contributeToRESP
  pd: boolean;  // payDownDebt
  rca?: number; // respContributionAmount
  dpa?: number; // debtPaydownAmount
  tda?: number; // totalDebtAmount
  dir?: number; // debtInterestRate
  ss: string;   // salaryStrategy
  fsa?: number; // fixedSalaryAmount
  cip?: boolean; // considerIPP
  ima?: number;  // ippMemberAge
  iys?: number;  // ippYearsOfService
}

/**
 * Compress UserInputs to compact format
 */
function compressInputs(inputs: UserInputs): CompactInputs {
  const compact: CompactInputs = {
    pv: inputs.province,
    ri: inputs.requiredIncome,
    ph: inputs.planningHorizon,
    sy: inputs.startingYear,
    ei: inputs.expectedInflationRate,
    is: inputs.inflateSpendingNeeds,
    cib: inputs.corporateInvestmentBalance,
    tb: inputs.tfsaBalance,
    rb: inputs.rrspBalance,
    cda: inputs.cdaBalance,
    erd: inputs.eRDTOHBalance,
    nrd: inputs.nRDTOHBalance,
    grp: inputs.gripBalance,
    irr: inputs.investmentReturnRate,
    ce: inputs.canadianEquityPercent,
    ue: inputs.usEquityPercent,
    ie: inputs.internationalEquityPercent,
    fi: inputs.fixedIncomePercent,
    are: inputs.annualCorporateRetainedEarnings,
    mt: inputs.maximizeTFSA,
    cr: inputs.contributeToRRSP,
    ce2: inputs.contributeToRESP,
    pd: inputs.payDownDebt,
    ss: inputs.salaryStrategy,
  };

  // Only include optional fields if they have values
  if (inputs.respContributionAmount !== undefined) {
    compact.rca = inputs.respContributionAmount;
  }
  if (inputs.debtPaydownAmount !== undefined) {
    compact.dpa = inputs.debtPaydownAmount;
  }
  if (inputs.totalDebtAmount !== undefined) {
    compact.tda = inputs.totalDebtAmount;
  }
  if (inputs.debtInterestRate !== undefined) {
    compact.dir = inputs.debtInterestRate;
  }
  if (inputs.fixedSalaryAmount !== undefined) {
    compact.fsa = inputs.fixedSalaryAmount;
  }
  if (inputs.considerIPP !== undefined) {
    compact.cip = inputs.considerIPP;
  }
  if (inputs.ippMemberAge !== undefined) {
    compact.ima = inputs.ippMemberAge;
  }
  if (inputs.ippYearsOfService !== undefined) {
    compact.iys = inputs.ippYearsOfService;
  }

  return compact;
}

/**
 * Expand compact format back to UserInputs
 */
function expandInputs(compact: CompactInputs): UserInputs {
  return {
    province: (compact.pv || DEFAULT_PROVINCE) as ProvinceCode,
    requiredIncome: compact.ri,
    planningHorizon: compact.ph as 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    startingYear: compact.sy,
    expectedInflationRate: compact.ei,
    inflateSpendingNeeds: compact.is,
    corporateInvestmentBalance: compact.cib,
    tfsaBalance: compact.tb,
    rrspBalance: compact.rb,
    cdaBalance: compact.cda,
    eRDTOHBalance: compact.erd,
    nRDTOHBalance: compact.nrd,
    gripBalance: compact.grp,
    investmentReturnRate: compact.irr,
    canadianEquityPercent: compact.ce,
    usEquityPercent: compact.ue,
    internationalEquityPercent: compact.ie,
    fixedIncomePercent: compact.fi,
    annualCorporateRetainedEarnings: compact.are,
    maximizeTFSA: compact.mt,
    contributeToRRSP: compact.cr,
    contributeToRESP: compact.ce2,
    payDownDebt: compact.pd,
    salaryStrategy: compact.ss as 'dynamic' | 'fixed' | 'dividends-only',
    respContributionAmount: compact.rca,
    debtPaydownAmount: compact.dpa,
    totalDebtAmount: compact.tda,
    debtInterestRate: compact.dir,
    fixedSalaryAmount: compact.fsa,
    considerIPP: compact.cip,
    ippMemberAge: compact.ima,
    ippYearsOfService: compact.iys,
  };
}

/**
 * Encode UserInputs to a URL-safe string
 */
export function encodeShareLink(inputs: UserInputs): string {
  const shareData: ShareData = {
    v: SHARE_FORMAT_VERSION,
    d: compressInputs(inputs),
  };

  const json = JSON.stringify(shareData);
  // Use base64url encoding (URL-safe base64)
  const base64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64;
}

/**
 * Decode a share link string back to UserInputs
 * Returns null if the string is invalid
 */
export function decodeShareLink(encoded: string): UserInputs | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    const json = atob(base64);
    const shareData: ShareData = JSON.parse(json);

    // Version check for future compatibility
    if (shareData.v !== SHARE_FORMAT_VERSION) {
      console.warn(`Unknown share link version: ${shareData.v}`);
      // Could add migration logic here in the future
    }

    return expandInputs(shareData.d);
  } catch (error) {
    console.error('Failed to decode share link:', error);
    return null;
  }
}

/**
 * Generate a full shareable URL with the current inputs
 */
export function generateShareUrl(inputs: UserInputs): string {
  const encoded = encodeShareLink(inputs);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?s=${encoded}`;
}

/**
 * Check if the current URL has a share parameter and decode it
 */
export function getInputsFromUrl(): UserInputs | null {
  const params = new URLSearchParams(window.location.search);
  const shareParam = params.get('s');

  if (!shareParam) {
    return null;
  }

  return decodeShareLink(shareParam);
}

/**
 * Get default inputs (used when no share link is present)
 */
export function getDefaultInputs(): UserInputs {
  return {
    province: DEFAULT_PROVINCE,
    requiredIncome: 150000,
    planningHorizon: 5,
    startingYear: getStartingYear(),
    expectedInflationRate: getDefaultInflationRate(),
    inflateSpendingNeeds: true,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 50000,
    rrspBalance: 100000,
    cdaBalance: 25000,
    eRDTOHBalance: 10000,
    nRDTOHBalance: 5000,
    gripBalance: 50000,
    investmentReturnRate: 4.31,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: 200000,
    maximizeTFSA: true,
    contributeToRRSP: true,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
    considerIPP: false,
  };
}
