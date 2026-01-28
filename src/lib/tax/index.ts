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
    getTaxRatesForYear,
    getContributionLimitsForYear,
} from './constants';

export {
    getTaxYearData,
    getCurrentTaxYear,
    getStartingYear,
    getLatestKnownYear,
    getDefaultInflationRate,
    inflateAmount,
    KNOWN_TAX_YEARS,
    CRA_INDEXATION_FACTORS,
    type TaxYearData,
} from './indexation';

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

export {
    calculateQuebecPayrollDeductions,
    getQuebecPayrollData,
    calculateQPP,
    calculateQPP2,
    calculateQPIPEmployee,
    calculateQPIPEmployer,
    calculateQuebecEI,
    type QuebecPayrollData,
    type QPPData,
    type QPP2Data,
    type QPIPData,
    type QuebecEIData,
} from './quebecPayroll';

export {
    calculateReducedSBDLimit,
    calculateAAII,
    calculateEffectiveCorporateRate,
    calculatePassiveIncomeGrind,
    willTriggerGrind,
    calculatePassiveIncomeHeadroom,
    calculatePassiveIncomeUntilFullGrind,
    PASSIVE_INCOME_CONSTANTS,
    type PassiveIncomeGrindResult,
} from './passiveIncomeGrind';

export {
    calculateCurrentServiceCost,
    calculatePastServiceCost,
    calculatePensionAdjustment,
    calculateIPPContribution,
    compareIPPvsRRSP,
    estimateIPPAdminCosts,
    calculateNetIPPBenefit,
} from './ipp';
