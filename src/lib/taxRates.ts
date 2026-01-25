/**
 * Tax Rates Module - Barrel Export
 * 
 * This file re-exports all tax-related functions and constants from the
 * modular tax/ directory structure. Import from here for backwards compatibility.
 * 
 * Module structure:
 * - tax/constants.ts - Tax rates, limits, and bracket calculation
 * - tax/personalTax.ts - Personal income tax calculations
 * - tax/payrollTax.ts - CPP, CPP2, EI calculations
 * - tax/corporateTax.ts - Corporate tax calculations
 */

export {
  // Constants
  TAX_RATES,
  TFSA_ANNUAL_LIMIT,
  RRSP_CONTRIBUTION_RATE,
  RRSP_ANNUAL_LIMIT,
  SBD_THRESHOLD,
  PASSIVE_INCOME_THRESHOLD,
  PASSIVE_INCOME_GRIND_RATE,
  calculateTaxByBrackets,

  // Personal Tax
  calculateSalaryTax,
  calculateSalaryTaxDetailed,
  calculateCombinedPersonalTax,
  calculateEligibleDividendTax,
  calculateNonEligibleDividendTax,
  calculateOntarioSurtax,
  calculateOntarioHealthPremium,
  calculateRequiredSalary,

  // Payroll Tax
  calculateCPP,
  calculateCPP2,
  calculateTotalCPP,
  calculateEI,

  // Corporate Tax
  calculateCorporateTax,
  calculateRDTOHRefund,
} from './tax';
