/**
 * Share Link Utility
 *
 * Encodes/decodes UserInputs to/from URL-safe strings for sharing calculator configurations.
 * Uses base64 encoding of JSON for compact representation.
 */

import type { UserInputs } from './types';
import type { ProvinceCode } from './tax/provinces';
import { DEFAULT_PROVINCE, PROVINCES } from './tax/provinces';

// Version for backwards compatibility if we change the format
const SHARE_FORMAT_VERSION = 2;

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
  // Spouse (v2)
  hs?: boolean;  // hasSpouse
  sri?: number;  // spouseRequiredIncome
  sss?: string;  // spouseSalaryStrategy
  sfsa?: number; // spouseFixedSalaryAmount
  srr?: number;  // spouseRRSPRoom
  str?: number;  // spouseTFSARoom
  smt?: boolean; // spouseMaximizeTFSA
  scr?: boolean; // spouseContributeToRRSP
  scip?: boolean; // spouseConsiderIPP
  sipa?: number;  // spouseIPPAge
  siys?: number;  // spouseIPPYearsOfService
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
  // Spouse fields (only include when spouse is enabled)
  if (inputs.hasSpouse) {
    compact.hs = true;
    if (inputs.spouseRequiredIncome !== undefined) {
      compact.sri = inputs.spouseRequiredIncome;
    }
    if (inputs.spouseSalaryStrategy !== undefined) {
      compact.sss = inputs.spouseSalaryStrategy;
    }
    if (inputs.spouseFixedSalaryAmount !== undefined) {
      compact.sfsa = inputs.spouseFixedSalaryAmount;
    }
    if (inputs.spouseRRSPRoom !== undefined) {
      compact.srr = inputs.spouseRRSPRoom;
    }
    if (inputs.spouseTFSARoom !== undefined) {
      compact.str = inputs.spouseTFSARoom;
    }
    if (inputs.spouseMaximizeTFSA !== undefined) {
      compact.smt = inputs.spouseMaximizeTFSA;
    }
    if (inputs.spouseContributeToRRSP !== undefined) {
      compact.scr = inputs.spouseContributeToRRSP;
    }
    if (inputs.spouseConsiderIPP !== undefined) {
      compact.scip = inputs.spouseConsiderIPP;
    }
    if (inputs.spouseIPPAge !== undefined) {
      compact.sipa = inputs.spouseIPPAge;
    }
    if (inputs.spouseIPPYearsOfService !== undefined) {
      compact.siys = inputs.spouseIPPYearsOfService;
    }
  }

  return compact;
}

/**
 * Validate and clamp a number to a range
 */
function clamp(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate a province code against known provinces
 */
function validateProvinceCode(code: string): ProvinceCode {
  if (code in PROVINCES) {
    return code as ProvinceCode;
  }
  console.warn(`Invalid province code in share link: "${code}", falling back to ${DEFAULT_PROVINCE}`);
  return DEFAULT_PROVINCE;
}

/**
 * Validate salary strategy
 */
function validateSalaryStrategy(strategy: string): 'dynamic' | 'fixed' | 'dividends-only' {
  const valid = ['dynamic', 'fixed', 'dividends-only'];
  if (valid.includes(strategy)) {
    return strategy as 'dynamic' | 'fixed' | 'dividends-only';
  }
  return 'dynamic';
}

/**
 * Expand compact format back to UserInputs with validation
 */
function expandInputs(compact: CompactInputs): UserInputs {
  // Normalize investmentReturnRate: if > 1, assume it was stored as percentage
  let investmentReturnRate = compact.irr;
  if (investmentReturnRate > 1) {
    investmentReturnRate = investmentReturnRate / 100;
  }

  return {
    province: validateProvinceCode(compact.pv || DEFAULT_PROVINCE),
    requiredIncome: clamp(compact.ri, 0, 10_000_000),
    planningHorizon: clamp(compact.ph, 3, 10) as 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    startingYear: clamp(compact.sy, 2025, 2050),
    expectedInflationRate: clamp(compact.ei, 0, 0.2),
    inflateSpendingNeeds: Boolean(compact.is),
    corporateInvestmentBalance: clamp(compact.cib, 0, 100_000_000),
    tfsaBalance: clamp(compact.tb, 0, 1_000_000),
    rrspBalance: clamp(compact.rb, 0, 10_000_000),
    cdaBalance: clamp(compact.cda, 0, 100_000_000),
    eRDTOHBalance: clamp(compact.erd, 0, 100_000_000),
    nRDTOHBalance: clamp(compact.nrd, 0, 100_000_000),
    gripBalance: clamp(compact.grp, 0, 100_000_000),
    investmentReturnRate: clamp(investmentReturnRate, -0.5, 0.5),
    canadianEquityPercent: clamp(compact.ce, 0, 100),
    usEquityPercent: clamp(compact.ue, 0, 100),
    internationalEquityPercent: clamp(compact.ie, 0, 100),
    fixedIncomePercent: clamp(compact.fi, 0, 100),
    annualCorporateRetainedEarnings: clamp(compact.are, 0, 10_000_000),
    maximizeTFSA: Boolean(compact.mt),
    contributeToRRSP: Boolean(compact.cr),
    contributeToRESP: Boolean(compact.ce2),
    payDownDebt: Boolean(compact.pd),
    salaryStrategy: validateSalaryStrategy(compact.ss),
    respContributionAmount: compact.rca,
    debtPaydownAmount: compact.dpa,
    totalDebtAmount: compact.tda,
    debtInterestRate: compact.dir,
    fixedSalaryAmount: compact.fsa,
    considerIPP: compact.cip,
    ippMemberAge: compact.ima,
    ippYearsOfService: compact.iys,
    // Spouse fields (v2) — only include when present for backward compatibility
    ...(compact.hs ? {
      hasSpouse: true,
      spouseRequiredIncome: compact.sri !== undefined ? clamp(compact.sri, 0, 10_000_000) : undefined,
      spouseSalaryStrategy: compact.sss ? validateSalaryStrategy(compact.sss) : undefined,
      spouseFixedSalaryAmount: compact.sfsa,
      spouseRRSPRoom: compact.srr !== undefined ? clamp(compact.srr, 0, 10_000_000) : undefined,
      spouseTFSARoom: compact.str !== undefined ? clamp(compact.str, 0, 1_000_000) : undefined,
      spouseMaximizeTFSA: compact.smt,
      spouseContributeToRRSP: compact.scr,
      spouseConsiderIPP: compact.scip,
      spouseIPPAge: compact.sipa,
      spouseIPPYearsOfService: compact.siys !== undefined ? Math.max(0, compact.siys) : undefined,
    } : {}),
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

    // Version check - accept v1 (no spouse) and v2 (with spouse)
    if (shareData.v !== SHARE_FORMAT_VERSION && shareData.v !== 1) {
      console.warn(`Unknown share link version: ${shareData.v}`);
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

// getDefaultInputs() is exported from localStorage.ts as the single source of truth.
// Previously this file had a duplicate with different values (including investmentReturnRate: 4.31 = 431%!).
// Import from localStorage.ts if you need default inputs.
