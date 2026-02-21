/**
 * Share Link Utility
 *
 * Encodes/decodes UserInputs to/from URL-safe strings for sharing calculator configurations.
 * Uses base64 encoding of JSON for compact representation.
 */

import type { UserInputs, PaymentFrequency } from './types';
import type { ProvinceCode } from './tax/provinces';
import { DEFAULT_PROVINCE, PROVINCES } from './tax/provinces';

// Version for backwards compatibility if we change the format
const SHARE_FORMAT_VERSION = 3;

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
  // Lifetime model (v3)
  ca?: number;   // currentAge
  ra?: number;   // retirementAge
  pea?: number;  // planningEndAge
  rs?: number;   // retirementSpending
  lo?: string;   // lifetimeObjective
  csa?: number;  // cppStartAge
  ssa?: number;  // salaryStartAge
  ahs?: number;  // averageHistoricalSalary
  oe?: boolean;  // oasEligible
  osa?: number;  // oasStartAge
  arb?: number;  // actualRRSPBalance
  atb?: number;  // actualTFSABalance
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
  // Spouse lifetime (v3)
  sca?: number;   // spouseCurrentAge
  sra2?: number;  // spouseRetirementAge
  scsa?: number;  // spouseCPPStartAge
  sssa2?: number; // spouseSalaryStartAge
  sahs?: number;  // spouseAverageHistoricalSalary
  soe?: boolean;  // spouseOASEligible
  sosa?: number;  // spouseOASStartAge
  sarb?: number;  // spouseActualRRSPBalance
  satb?: number;  // spouseActualTFSABalance
  // Multi-debt (v3.4)
  dts?: Array<{
    id: string;
    lb: string;         // label
    bl: number;         // balance
    pa: number;         // paymentAmount
    pf: string;         // paymentFrequency
    ir: number;         // interestRate
  }>;
  // IPP expanded (v3.4)
  im?: string;          // ippMode
  ib3?: number;         // ippBest3AvgSalary
  ips?: number;         // ippPastServiceYears
  ief?: number;         // ippExistingFundBalance
  ilvy?: number;        // ippLastValuationYear
  ilvl?: number;        // ippLastValuationLiability
  ilvc?: number;        // ippLastValuationAnnualContribution
  // Spouse IPP expanded (v3.4)
  sim?: string;         // spouseIPPMode
  sib3?: number;
  sips?: number;
  sief?: number;
  silvy?: number;
  silvl?: number;
  silvc?: number;
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
    // Lifetime model fields (v3)
    ca: inputs.currentAge,
    ra: inputs.retirementAge,
    pea: inputs.planningEndAge,
    rs: inputs.retirementSpending,
    lo: inputs.lifetimeObjective,
    csa: inputs.cppStartAge,
    ssa: inputs.salaryStartAge,
    ahs: inputs.averageHistoricalSalary,
    oe: inputs.oasEligible,
    osa: inputs.oasStartAge,
    arb: inputs.actualRRSPBalance,
    atb: inputs.actualTFSABalance,
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
    // Spouse lifetime fields (v3)
    if (inputs.spouseCurrentAge !== undefined) compact.sca = inputs.spouseCurrentAge;
    if (inputs.spouseRetirementAge !== undefined) compact.sra2 = inputs.spouseRetirementAge;
    if (inputs.spouseCPPStartAge !== undefined) compact.scsa = inputs.spouseCPPStartAge;
    if (inputs.spouseSalaryStartAge !== undefined) compact.sssa2 = inputs.spouseSalaryStartAge;
    if (inputs.spouseAverageHistoricalSalary !== undefined) compact.sahs = inputs.spouseAverageHistoricalSalary;
    if (inputs.spouseOASEligible !== undefined) compact.soe = inputs.spouseOASEligible;
    if (inputs.spouseOASStartAge !== undefined) compact.sosa = inputs.spouseOASStartAge;
    if (inputs.spouseActualRRSPBalance !== undefined) compact.sarb = inputs.spouseActualRRSPBalance;
    if (inputs.spouseActualTFSABalance !== undefined) compact.satb = inputs.spouseActualTFSABalance;
    // Spouse IPP expanded (v3.4)
    if (inputs.spouseIPPMode && inputs.spouseIPPMode !== 'considering') compact.sim = inputs.spouseIPPMode;
    if (inputs.spouseIPPBest3AvgSalary !== undefined) compact.sib3 = inputs.spouseIPPBest3AvgSalary;
    if (inputs.spouseIPPPastServiceYears !== undefined) compact.sips = inputs.spouseIPPPastServiceYears;
    if (inputs.spouseIPPExistingFundBalance !== undefined) compact.sief = inputs.spouseIPPExistingFundBalance;
    if (inputs.spouseIPPLastValuationYear !== undefined) compact.silvy = inputs.spouseIPPLastValuationYear;
    if (inputs.spouseIPPLastValuationLiability !== undefined) compact.silvl = inputs.spouseIPPLastValuationLiability;
    if (inputs.spouseIPPLastValuationAnnualContribution !== undefined) compact.silvc = inputs.spouseIPPLastValuationAnnualContribution;
  }

  // Multi-debt (v3.4)
  if (inputs.debts && inputs.debts.length > 0) {
    compact.dts = inputs.debts.map(d => ({
      id: d.id,
      lb: d.label,
      bl: d.balance,
      pa: d.paymentAmount,
      pf: d.paymentFrequency,
      ir: d.interestRate,
    }));
  }

  // IPP expanded (v3.4) — only serialize existing-mode fields when in 'existing' mode
  if (inputs.ippMode && inputs.ippMode !== 'considering') {
    compact.im = inputs.ippMode;
    if (inputs.ippExistingFundBalance !== undefined) compact.ief = inputs.ippExistingFundBalance;
    if (inputs.ippLastValuationYear !== undefined) compact.ilvy = inputs.ippLastValuationYear;
    if (inputs.ippLastValuationLiability !== undefined) compact.ilvl = inputs.ippLastValuationLiability;
    if (inputs.ippLastValuationAnnualContribution !== undefined) compact.ilvc = inputs.ippLastValuationAnnualContribution;
  }
  if (inputs.ippBest3AvgSalary !== undefined) compact.ib3 = inputs.ippBest3AvgSalary;
  if (inputs.ippPastServiceYears !== undefined) compact.ips = inputs.ippPastServiceYears;

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
 * Validate lifetime objective
 */
function validateLifetimeObjective(objective: string | undefined): 'maximize-spending' | 'maximize-estate' | 'balanced' {
  const valid = ['maximize-spending', 'maximize-estate', 'balanced'];
  if (objective && valid.includes(objective)) {
    return objective as 'maximize-spending' | 'maximize-estate' | 'balanced';
  }
  return 'balanced';
}

/**
 * Validate payment frequency
 */
function validatePaymentFrequency(freq: string): PaymentFrequency {
  const valid: PaymentFrequency[] = ['monthly', 'biweekly', 'weekly', 'annually'];
  if (valid.includes(freq as PaymentFrequency)) {
    return freq as PaymentFrequency;
  }
  return 'monthly';
}

/**
 * Validate IPP mode
 */
function validateIPPMode(mode: string | undefined): 'considering' | 'existing' {
  if (mode === 'existing') return 'existing';
  return 'considering';
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
    planningHorizon: clamp(compact.ph, 1, 80),
    startingYear: clamp(compact.sy, 2024, 2030),
    expectedInflationRate: clamp(compact.ei, 0, 0.1),
    inflateSpendingNeeds: Boolean(compact.is),
    corporateInvestmentBalance: clamp(compact.cib, 0, 100_000_000),
    tfsaBalance: clamp(compact.tb, 0, 1_000_000),
    rrspBalance: clamp(compact.rb, 0, 10_000_000),
    cdaBalance: clamp(compact.cda, 0, 100_000_000),
    eRDTOHBalance: clamp(compact.erd, 0, 100_000_000),
    nRDTOHBalance: clamp(compact.nrd, 0, 100_000_000),
    gripBalance: clamp(compact.grp, 0, 100_000_000),
    investmentReturnRate: clamp(investmentReturnRate, 0, 0.2),
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
    // Lifetime model fields (v3) — use defaults for v1/v2 links
    currentAge: compact.ca !== undefined ? clamp(compact.ca, 18, 80) : 45,
    retirementAge: compact.ra !== undefined ? clamp(compact.ra, 40, 80) : 65,
    planningEndAge: compact.pea !== undefined ? clamp(compact.pea, 50, 100) : 90,
    retirementSpending: compact.rs !== undefined ? clamp(compact.rs, 0, 10_000_000) : 70000,
    lifetimeObjective: validateLifetimeObjective(compact.lo),
    cppStartAge: compact.csa !== undefined ? clamp(compact.csa, 60, 70) : 65,
    salaryStartAge: compact.ssa !== undefined ? clamp(compact.ssa, 16, 65) : 22,
    averageHistoricalSalary: compact.ahs !== undefined ? clamp(compact.ahs, 0, 1_000_000) : 60000,
    oasEligible: compact.oe !== undefined ? Boolean(compact.oe) : true,
    oasStartAge: compact.osa !== undefined ? clamp(compact.osa, 65, 70) : 65,
    actualRRSPBalance: compact.arb !== undefined ? clamp(compact.arb, 0, 10_000_000) : 0,
    actualTFSABalance: compact.atb !== undefined ? clamp(compact.atb, 0, 10_000_000) : 0,
    // Multi-debt (v3.4)
    debts: compact.dts
      ? compact.dts.map(d => ({
          id: d.id,
          label: d.lb,
          balance: d.bl,
          paymentAmount: d.pa,
          paymentFrequency: validatePaymentFrequency(d.pf),
          interestRate: d.ir,
        }))
      : [],
    // IPP expanded (v3.4)
    ippMode: validateIPPMode(compact.im),
    ippBest3AvgSalary: compact.ib3,
    ippPastServiceYears: compact.ips,
    ippExistingFundBalance: compact.ief,
    ippLastValuationYear: compact.ilvy,
    ippLastValuationLiability: compact.ilvl,
    ippLastValuationAnnualContribution: compact.ilvc,
    // Spouse IPP expanded (v3.4)
    spouseIPPMode: validateIPPMode(compact.sim),
    spouseIPPBest3AvgSalary: compact.sib3,
    spouseIPPPastServiceYears: compact.sips,
    spouseIPPExistingFundBalance: compact.sief,
    spouseIPPLastValuationYear: compact.silvy,
    spouseIPPLastValuationLiability: compact.silvl,
    spouseIPPLastValuationAnnualContribution: compact.silvc,
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
      // Spouse lifetime fields (v3)
      spouseCurrentAge: compact.sca !== undefined ? clamp(compact.sca, 18, 80) : undefined,
      spouseRetirementAge: compact.sra2 !== undefined ? clamp(compact.sra2, 30, 80) : undefined,
      spouseCPPStartAge: compact.scsa !== undefined ? clamp(compact.scsa, 60, 70) : undefined,
      spouseSalaryStartAge: compact.sssa2 !== undefined ? clamp(compact.sssa2, 16, 65) : undefined,
      spouseAverageHistoricalSalary: compact.sahs !== undefined ? clamp(compact.sahs, 0, 1_000_000) : undefined,
      spouseOASEligible: compact.soe,
      spouseOASStartAge: compact.sosa !== undefined ? clamp(compact.sosa, 65, 70) : undefined,
      spouseActualRRSPBalance: compact.sarb !== undefined ? clamp(compact.sarb, 0, 10_000_000) : undefined,
      spouseActualTFSABalance: compact.satb !== undefined ? clamp(compact.satb, 0, 10_000_000) : undefined,
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

    // Version check - accept v1 (no spouse), v2 (with spouse), v3 (lifetime)
    if (![1, 2, 3].includes(shareData.v)) {
      console.warn(`Unknown share link version: ${shareData.v}`);
      return null;
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
