import type { NotionalAccounts, DividendFunding, InvestmentReturns } from '../types';

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
    nonEligibleEffectiveRate: number,
    useRetainedEarnings: boolean = false
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
    // Must also have GRIP to designate as eligible — cap at both eRDTOH capacity and GRIP
    if (remaining > 0 && updatedAccounts.eRDTOH > 0 && updatedAccounts.GRIP > 0 && availableCash > 0) {
        const grossDividendNeeded = remaining / (1 - eligibleEffectiveRate);
        const maxByERDTOH = updatedAccounts.eRDTOH / rdtohRefundRate;
        const maxGrossDividend = Math.min(maxByERDTOH, updatedAccounts.GRIP);
        // Net corporate cost is dividend minus RDTOH refund — cap at available cash
        const netCostPerDollar = 1 - rdtohRefundRate; // cost to corp per $1 gross dividend
        const maxByCash = netCostPerDollar > 0 ? availableCash / netCostPerDollar : maxGrossDividend;

        const actualDividend = Math.min(grossDividendNeeded, maxGrossDividend, maxByCash);
        const refund = actualDividend * rdtohRefundRate;
        const afterTax = actualDividend * (1 - eligibleEffectiveRate);
        const netCorpCost = actualDividend - refund;

        funding.eligibleDividends += actualDividend;
        funding.afterTaxIncome += afterTax;
        remaining -= afterTax;
        updatedAccounts.eRDTOH -= refund;
        updatedAccounts.GRIP -= actualDividend;
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
        updatedAccounts.nRDTOH = Math.max(0, updatedAccounts.nRDTOH - refund);
        updatedAccounts.corporateInvestments -= netCorpCost;
        availableCash -= netCorpCost;
        totalRdtohRefund += refund;
    }

    // 3b. Non-Eligible Dividends with eRDTOH cascade refund
    // Per ITA s.129(1), when non-eligible dividends are paid and nRDTOH is depleted,
    // the refund cascades to eRDTOH. This is cheaper than GRIP without refund
    // (~$1.16 vs ~$1.64 per after-tax dollar), so it comes before step 4.
    if (remaining > 0 && updatedAccounts.eRDTOH > 0 && availableCash > 0) {
        const grossDividendNeeded = remaining / (1 - nonEligibleEffectiveRate);
        const maxGrossDividend = updatedAccounts.eRDTOH / rdtohRefundRate;
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
        updatedAccounts.eRDTOH -= refund;
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

    // 5. Non-Eligible Dividends from retained earnings (no notional account, no refund)
    // When all notional accounts are exhausted, the corp can still pay non-eligible
    // dividends from its accumulated retained earnings.
    if (useRetainedEarnings && remaining > 0 && availableCash > 0) {
        const grossDividendNeeded = remaining / (1 - nonEligibleEffectiveRate);
        const actualDividend = Math.min(grossDividendNeeded, availableCash);
        const afterTax = actualDividend * (1 - nonEligibleEffectiveRate);

        funding.nonEligibleDividends += actualDividend;
        funding.afterTaxIncome += afterTax;
        remaining -= afterTax;
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

