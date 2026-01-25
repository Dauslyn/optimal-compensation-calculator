import type { InvestmentReturns } from '../types';

/**
 * Calculate investment return composition based on portfolio allocation
 * Returns the breakdown of dividends, interest, and capital gains
 */
interface ReturnComposition {
    canadianDividendRate: number;
    foreignIncomeRate: number;
    capitalGainRate: number;
}

function calculateReturnComposition(
    canadianEquityPercent: number,
    usEquityPercent: number,
    internationalEquityPercent: number,
    fixedIncomePercent: number,
    totalReturnRate: number
): ReturnComposition {
    // Asset class characteristics based on PWL research
    // Canadian equity: Higher dividend yield (~2.4% dividend, rest capital gains)
    // US equity: Lower dividend yield (~1.5% dividend, rest capital gains)
    // International equity: Moderate dividend yield (~2.0% dividend, rest capital gains)
    // Fixed income: All interest income

    const canadianEquityDividendYield = 0.024;
    const usEquityDividendYield = 0.015;
    const intlEquityDividendYield = 0.020;

    // Calculate weighted dividend yield
    const canadianDividendRate =
        (canadianEquityPercent / 100) * canadianEquityDividendYield;

    const foreignDividendRate =
        ((usEquityPercent + internationalEquityPercent) / 100) *
        ((usEquityDividendYield * (usEquityPercent / (usEquityPercent + internationalEquityPercent || 1))) +
            (intlEquityDividendYield * (internationalEquityPercent / (usEquityPercent + internationalEquityPercent || 1))));

    // Fixed income generates interest
    const interestRate = (fixedIncomePercent / 100) * totalReturnRate;

    // Remaining return is capital gains from equities
    const capitalGainRate =
        totalReturnRate - canadianDividendRate - foreignDividendRate - interestRate;

    // Foreign income = foreign dividends + interest
    const foreignIncomeRate = foreignDividendRate + interestRate;

    return {
        canadianDividendRate,
        foreignIncomeRate,
        capitalGainRate,
    };
}

/**
 * Calculate investment returns for the corporate account
 * Based on portfolio composition and total return rate
 */
export function calculateInvestmentReturns(
    corporateBalance: number,
    returnRate: number = 0.0431, // 4.31% default from paper
    canadianEquityPercent: number = 33.33,
    usEquityPercent: number = 33.33,
    internationalEquityPercent: number = 33.33,
    fixedIncomePercent: number = 0
): InvestmentReturns {
    if (corporateBalance <= 0) {
        return {
            totalReturn: 0,
            canadianDividends: 0,
            foreignIncome: 0,
            realizedCapitalGain: 0,
            unrealizedCapitalGain: 0,
            CDAIncrease: 0,
            nRDTOHIncrease: 0,
            eRDTOHIncrease: 0,
            GRIPIncrease: 0,
        };
    }

    const totalReturn = corporateBalance * returnRate;

    // Calculate return composition based on portfolio
    const composition = calculateReturnComposition(
        canadianEquityPercent,
        usEquityPercent,
        internationalEquityPercent,
        fixedIncomePercent,
        returnRate
    );

    const canadianDividends = corporateBalance * composition.canadianDividendRate;
    const foreignIncome = corporateBalance * composition.foreignIncomeRate;
    const totalCapitalGain = corporateBalance * composition.capitalGainRate;

    // Assume 50% of capital gains realized each year (from paper assumption)
    const realizedCapitalGain = totalCapitalGain * 0.5;
    const unrealizedCapitalGain = totalCapitalGain * 0.5;

    // Notional account increases
    // CDA: 50% of realized capital gains
    const CDAIncrease = realizedCapitalGain * 0.5;

    // nRDTOH: 30.67% of aggregate investment income (taxable capital gains + foreign income + interest)
    // This is the refundable portion of the ~50% corporate tax on investment income
    const taxableCapitalGain = realizedCapitalGain * 0.5;
    const nRDTOHIncrease = (taxableCapitalGain + foreignIncome) * 0.3067;

    // eRDTOH: Part IV tax on Canadian dividends received (38.33%)
    // For portfolio investments in public companies, dividends are subject to Part IV tax
    const eRDTOHIncrease = canadianDividends * 0.3833;

    // GRIP (General Rate Income Pool): 
    // Per ITA 89(1), GRIP is INCREASED by:
    //   1. Income taxed at the general corporate rate (not small business rate)
    //   2. Eligible dividends RECEIVED from other Canadian corporations
    // When a CCPC receives eligible dividends (e.g., from Canadian equity ETFs/stocks),
    // those dividends maintain their "eligible" character and are added to GRIP.
    // This allows the CCPC to pay them out as eligible dividends to shareholders.
    const GRIPIncrease = canadianDividends; // Eligible dividends received add to GRIP

    return {
        totalReturn,
        canadianDividends,
        foreignIncome,
        realizedCapitalGain,
        unrealizedCapitalGain,
        CDAIncrease,
        nRDTOHIncrease,
        eRDTOHIncrease,
        GRIPIncrease,
    };
}
