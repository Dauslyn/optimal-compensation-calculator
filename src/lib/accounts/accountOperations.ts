import type { NotionalAccounts, DividendFunding, InvestmentReturns } from '../types';
import { TAX_RATES } from '../taxRates';

/**
 * Update notional accounts based on investment returns
 */
export function updateAccountsFromReturns(
    accounts: NotionalAccounts,
    returns: InvestmentReturns
): NotionalAccounts {
    // Calculate corporate tax on investment income
    // Canadian dividends: Already taxed at corporate level, generates eRDTOH (38.33% refundable)
    // Foreign income + Capital gains: Taxed at 50.17% total (26.5% non-refundable + 30.67% refundable via nRDTOH)

    const taxableCapitalGain = returns.realizedCapitalGain * 0.5;
    const taxableInvestmentIncome = returns.foreignIncome + taxableCapitalGain;

    // Only deduct non-refundable portion (26.5%) from corporate investments
    // The refundable portion (30.67%) is already tracked in nRDTOH and will be recovered when paying dividends
    const nonRefundableTax = taxableInvestmentIncome * 0.265;

    // Canadian dividends are already after-tax, no additional deduction needed
    // They just generate eRDTOH which will be refunded when paying eligible dividends

    // Net increase to corporate investments:
    // Total return minus only the non-refundable tax
    const afterTaxReturn = returns.totalReturn - nonRefundableTax;

    return {
        CDA: accounts.CDA + returns.CDAIncrease,
        eRDTOH: accounts.eRDTOH + returns.eRDTOHIncrease,
        nRDTOH: accounts.nRDTOH + returns.nRDTOHIncrease,
        GRIP: accounts.GRIP + returns.GRIPIncrease,
        corporateInvestments: accounts.corporateInvestments + afterTaxReturn,
    };
}

/**
 * Deplete notional accounts to fund required income with explicit rates
 * This version accepts rates as parameters for year-specific calculations
 * Priority order: CDA → eRDTOH → nRDTOH → GRIP
 */
export function depleteAccountsWithRates(
    requiredIncome: number,
    accounts: NotionalAccounts,
    rdtohRefundRate: number,
    eligibleEffectiveRate: number,
    nonEligibleEffectiveRate: number
): { funding: DividendFunding; updatedAccounts: NotionalAccounts; rdtohRefund: number } {
    const updatedAccounts = { ...accounts };
    let remaining = requiredIncome;
    let totalRdtohRefund = 0;

    const funding: DividendFunding = {
        capitalDividends: 0,
        eligibleDividends: 0,
        nonEligibleDividends: 0,
        regularDividends: 0,
        grossDividends: 0,
        afterTaxIncome: 0,
    };

    // Track available corporate cash — never let it go below zero
    let availableCash = Math.max(0, updatedAccounts.corporateInvestments);

    // 1. Capital Dividends (tax-free from CDA)
    if (remaining > 0 && updatedAccounts.CDA > 0 && availableCash > 0) {
        const cdaAmount = Math.min(remaining, updatedAccounts.CDA, availableCash);
        funding.capitalDividends = cdaAmount;
        funding.afterTaxIncome += cdaAmount;
        remaining -= cdaAmount;
        updatedAccounts.CDA -= cdaAmount;
        updatedAccounts.corporateInvestments -= cdaAmount;
        availableCash -= cdaAmount;
    }

    // 2. Eligible Dividends from eRDTOH (generates refund)
    if (remaining > 0 && updatedAccounts.eRDTOH > 0 && availableCash > 0) {
        const grossDividendNeeded = remaining / (1 - eligibleEffectiveRate);
        const maxGrossDividend = updatedAccounts.eRDTOH / rdtohRefundRate;
        // Net corporate cost is dividend minus RDTOH refund — cap at available cash
        const maxByRefund = Math.min(grossDividendNeeded, maxGrossDividend);
        const netCostPerDollar = 1 - rdtohRefundRate; // cost to corp per $1 gross dividend
        const maxByCash = netCostPerDollar > 0 ? availableCash / netCostPerDollar : maxByRefund;

        const actualDividend = Math.min(maxByRefund, maxByCash);
        const refund = actualDividend * rdtohRefundRate;
        const afterTax = actualDividend * (1 - eligibleEffectiveRate);
        const netCorpCost = actualDividend - refund;

        funding.eligibleDividends += actualDividend;
        funding.afterTaxIncome += afterTax;
        remaining -= afterTax;
        updatedAccounts.eRDTOH -= refund;
        updatedAccounts.corporateInvestments -= netCorpCost;
        availableCash -= netCorpCost;
        totalRdtohRefund += refund;
    }

    // 3. Non-Eligible Dividends from nRDTOH (generates refund)
    if (remaining > 0 && updatedAccounts.nRDTOH > 0 && availableCash > 0) {
        const grossDividendNeeded = remaining / (1 - nonEligibleEffectiveRate);
        const maxGrossDividend = updatedAccounts.nRDTOH / rdtohRefundRate;
        const maxByRefund = Math.min(grossDividendNeeded, maxGrossDividend);
        const netCostPerDollar = 1 - rdtohRefundRate;
        const maxByCash = netCostPerDollar > 0 ? availableCash / netCostPerDollar : maxByRefund;

        const actualDividend = Math.min(maxByRefund, maxByCash);
        const refund = actualDividend * rdtohRefundRate;
        const afterTax = actualDividend * (1 - nonEligibleEffectiveRate);
        const netCorpCost = actualDividend - refund;

        funding.nonEligibleDividends += actualDividend;
        funding.afterTaxIncome += afterTax;
        remaining -= afterTax;
        updatedAccounts.nRDTOH -= refund;
        updatedAccounts.corporateInvestments -= netCorpCost;
        availableCash -= netCorpCost;
        totalRdtohRefund += refund;
    }

    // 4. Regular Eligible Dividends from GRIP (no refund)
    if (remaining > 0 && updatedAccounts.GRIP > 0 && availableCash > 0) {
        const grossDividendNeeded = remaining / (1 - eligibleEffectiveRate);
        // Full cost to corp (no refund), so cap at available cash
        const actualDividend = Math.min(grossDividendNeeded, updatedAccounts.GRIP, availableCash);
        const afterTax = actualDividend * (1 - eligibleEffectiveRate);

        funding.eligibleDividends += actualDividend;
        funding.regularDividends += actualDividend;
        funding.afterTaxIncome += afterTax;
        remaining -= afterTax;
        updatedAccounts.GRIP -= actualDividend;
        updatedAccounts.corporateInvestments -= actualDividend;
        availableCash -= actualDividend;
    }

    // Calculate total gross dividends
    funding.grossDividends =
        funding.capitalDividends +
        funding.eligibleDividends +
        funding.nonEligibleDividends;

    return { funding, updatedAccounts, rdtohRefund: totalRdtohRefund };
}

/**
 * Process a salary payment from the corporation
 * Reduces corporate investments by salary amount plus employer CPP/EI
 *
 * Note: Salary is paid from active business income (a deductible expense),
 * so corporateInvestments CAN go negative here — this represents the corp
 * using current-year earnings to fund salary before year-end retained
 * earnings are added back. The afterTaxBusinessIncome added at end-of-year
 * in calculateYear() nets this out. Dividend payments (via depleteAccountsWithRates)
 * are the ones constrained by accumulated retained earnings.
 */
export function processSalaryPayment(
    accounts: NotionalAccounts,
    salary: number,
    employerEI: number,
    employerCPP: number
): NotionalAccounts {
    const totalCost = salary + employerCPP + employerEI;

    return {
        ...accounts,
        corporateInvestments: accounts.corporateInvestments - totalCost,
    };
}

/**
 * Add a capital gain to the CDA
 */
export function addCapitalGainToCDA(
    accounts: NotionalAccounts,
    capitalGain: number
): NotionalAccounts {
    return {
        ...accounts,
        CDA: accounts.CDA + capitalGain * 0.5, // 50% of capital gain
    };
}

/**
 * Add RDTOH from investment income
 */
export function addRDTOH(
    accounts: NotionalAccounts,
    investmentIncome: number,
    canadianDividends: number
): NotionalAccounts {
    // nRDTOH: 30.67% of investment income (except Canadian dividends)
    const nRDTOHIncrease = investmentIncome * 0.3067;

    // eRDTOH: 38.33% of Canadian dividends
    const eRDTOHIncrease = canadianDividends * 0.3833;

    return {
        ...accounts,
        nRDTOH: accounts.nRDTOH + nRDTOHIncrease,
        eRDTOH: accounts.eRDTOH + eRDTOHIncrease,
    };
}

/**
 * Add income to GRIP
 */
export function addToGRIP(
    accounts: NotionalAccounts,
    generalRateIncome: number
): NotionalAccounts {
    return {
        ...accounts,
        GRIP: accounts.GRIP + generalRateIncome,
    };
}

/**
 * @deprecated Uses hardcoded TAX_RATES. The RDTOH refund rate (38.33%) is
 * federal and doesn't vary by province, but this function should accept
 * the rate as a parameter for consistency.
 *
 * Calculate total available dividend capacity
 */
export function calculateDividendCapacity(accounts: NotionalAccounts): {
    capitalDividendCapacity: number;
    eligibleDividendCapacity: number;
    nonEligibleDividendCapacity: number;
    totalCapacity: number;
} {
    const capitalDividendCapacity = accounts.CDA;

    const eligibleFromRDTOH = accounts.eRDTOH / TAX_RATES.rdtoh.refundRate;
    const eligibleFromGRIP = accounts.GRIP;
    const eligibleDividendCapacity = eligibleFromRDTOH + eligibleFromGRIP;

    const nonEligibleDividendCapacity = accounts.nRDTOH / TAX_RATES.rdtoh.refundRate;

    const totalCapacity =
        capitalDividendCapacity + eligibleDividendCapacity + nonEligibleDividendCapacity;

    return {
        capitalDividendCapacity,
        eligibleDividendCapacity,
        nonEligibleDividendCapacity,
        totalCapacity,
    };
}
