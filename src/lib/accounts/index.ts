// Barrel export for accounts module
// Re-exports all notional account functions

export { calculateInvestmentReturns } from './investmentReturns';

export {
    updateAccountsFromReturns,
    depleteAccounts,
    processSalaryPayment,
    addCapitalGainToCDA,
    addRDTOH,
    addToGRIP,
    calculateDividendCapacity,
} from './accountOperations';
