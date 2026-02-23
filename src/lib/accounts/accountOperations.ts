import type { NotionalAccounts, DividendFunding, InvestmentReturns } from '../types';

/**
 * Update notional accounts based on investment returns
 *
 * @param accounts Current notional account balances
 * @param returns Investment return decomposition for the year
 * @param passiveInvestmentTaxRate Combined federal + provincial passive investment income
 *   tax rate (e.g., 0.5017 for Ontario). Sourced from getPassiveInvestmentTaxRate(province).
 */
export function updateAccountsFromReturns(
    accounts: NotionalAccounts,
    returns: InvestmentReturns,
    passiveInvestmentTaxRate: number
): NotionalAccounts {
    // Calculate corporate tax on investment income
    // Canadian dividends: Part IV tax (38.33%) is FULLY refundable via eRDTOH — no net cash impact
    // Foreign income + Capital gains: Taxed at province-specific passive rate
    //   → Refundable portion tracked in nRDTOH (recovered when paying dividends)
    //   → Non-refundable portion permanently reduces corporate balance

    const taxableCapitalGain = returns.realizedCapitalGain * 0.5;
    const taxableInvestmentIncome = returns.foreignIncome + taxableCapitalGain;

    // Total passive tax on non-dividend investment income
    const totalPassiveTax = taxableInvestmentIncome * passiveInvestmentTaxRate;

    // Non-refundable = total tax minus the refundable nRDTOH portion
    // nRDTOH already accounts for foreign withholding tax credit (reduces refundable amount),
    // so the non-refundable portion implicitly includes the foreign WHT impact
    const nonRefundableTax = Math.max(0, totalPassiveTax - returns.nRDTOHIncrease);

    // Canadian dividends: Part IV tax (38.33%) is fully refundable via eRDTOH.
    // In a steady-state model with annual dividend payments, this is approximately a wash.
    // We track eRDTOH separately and recover it when paying eligible dividends.

    // Net increase to corporate investments:
    // Total return minus only the non-refundable tax
    const afterTaxReturn = returns.totalReturn - nonRefundableTax;

    // ACB increases by the tax-paid portion of the return (income minus tax).
    // Unrealized capital appreciation does NOT increase ACB — it's the embedded gain we track.
    const acbIncrease = afterTaxReturn - returns.unrealizedCapitalGain;

    return {
        CDA: accounts.CDA + returns.CDAIncrease,
        eRDTOH: accounts.eRDTOH + returns.eRDTOHIncrease,
        nRDTOH: accounts.nRDTOH + returns.nRDTOHIncrease,
        GRIP: accounts.GRIP + returns.GRIPIncrease,
        corporateInvestments: accounts.corporateInvestments + afterTaxReturn,
        corporateACB: accounts.corporateACB + acbIncrease,
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

    // Proportional ACB reduction (CRA average-cost method, ITA s.47)
    // When corporate investments decrease from dividend payments, ACB decreases proportionally
    // to maintain the same gain-to-value ratio across the remaining portfolio.
    const totalReduction = accounts.corporateInvestments - updatedAccounts.corporateInvestments;
    if (accounts.corporateInvestments > 0 && totalReduction > 0) {
        const retainedRatio = 1 - totalReduction / accounts.corporateInvestments;
        updatedAccounts.corporateACB = accounts.corporateACB * Math.max(0, retainedRatio);
    }

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
    const oldBalance = accounts.corporateInvestments;

    // Proportional ACB reduction when balance is positive.
    // When corporateInvestments goes negative (drawing from current-year earnings
    // before year-end retained earnings are added back), ACB stays unchanged —
    // the negative balance represents a timing difference, not asset liquidation.
    const newACB = oldBalance > 0
        ? accounts.corporateACB * Math.max(0, (oldBalance - totalCost) / oldBalance)
        : accounts.corporateACB;

    return {
        ...accounts,
        corporateInvestments: oldBalance - totalCost,
        corporateACB: newACB,
    };
}

