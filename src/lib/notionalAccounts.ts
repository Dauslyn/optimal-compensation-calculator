/**
 * Notional Accounts Module - Barrel Export
 * 
 * This file re-exports all account-related functions from the
 * modular accounts/ directory structure. Import from here for backwards compatibility.
 * 
 * Module structure:
 * - accounts/investmentReturns.ts - Investment return calculations
 * - accounts/accountOperations.ts - Account updates, depletion, payments
 */

export {
  calculateInvestmentReturns,
  updateAccountsFromReturns,
  depleteAccounts,
  processSalaryPayment,
  addCapitalGainToCDA,
  addRDTOH,
  addToGRIP,
  calculateDividendCapacity,
} from './accounts';
