// Barrel export for tax module
// Re-exports all tax-related functions and constants

export {
    TAX_RATES,
    TFSA_ANNUAL_LIMIT,
    RRSP_CONTRIBUTION_RATE,
    RRSP_ANNUAL_LIMIT,
    SBD_THRESHOLD,
    PASSIVE_INCOME_THRESHOLD,
    PASSIVE_INCOME_GRIND_RATE,
    calculateTaxByBrackets,
} from './constants';

export {
    calculateSalaryTax,
    calculateSalaryTaxDetailed,
    calculateCombinedPersonalTax,
    calculateEligibleDividendTax,
    calculateNonEligibleDividendTax,
    calculateOntarioSurtax,
    calculateOntarioHealthPremium,
    calculateRequiredSalary,
} from './personalTax';

export {
    calculateCPP,
    calculateCPP2,
    calculateTotalCPP,
    calculateEI,
} from './payrollTax';

export {
    calculateCorporateTax,
    calculateRDTOHRefund,
} from './corporateTax';
