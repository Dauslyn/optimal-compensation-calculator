import { TAX_RATES, calculateTaxByBrackets } from './constants';
import { calculateCPP, calculateEI } from './payrollTax';

/**
 * Calculate Ontario surtax on provincial tax payable
 * 20% on provincial tax over $5,554
 * 36% on provincial tax over $7,108
 */
export function calculateOntarioSurtax(provincialTax: number): number {
    if (provincialTax <= TAX_RATES.ontarioSurtax.firstThreshold) return 0;

    let surtax = 0;

    // 20% on amount over first threshold
    if (provincialTax > TAX_RATES.ontarioSurtax.firstThreshold) {
        surtax += (provincialTax - TAX_RATES.ontarioSurtax.firstThreshold) * TAX_RATES.ontarioSurtax.firstRate;
    }

    // Additional 36% on amount over second threshold (this is IN ADDITION to the 20%)
    if (provincialTax > TAX_RATES.ontarioSurtax.secondThreshold) {
        surtax += (provincialTax - TAX_RATES.ontarioSurtax.secondThreshold) * TAX_RATES.ontarioSurtax.secondRate;
    }

    return surtax;
}

/**
 * Calculate Ontario Health Premium based on taxable income
 * Graduated premium from $0 to $900 depending on income
 */
export function calculateOntarioHealthPremium(taxableIncome: number): number {
    const brackets = TAX_RATES.ontarioHealthPremium.brackets;

    // Find the applicable bracket
    let applicableBracket = brackets[0];
    for (let i = brackets.length - 1; i >= 0; i--) {
        if (taxableIncome > brackets[i].threshold) {
            applicableBracket = brackets[i];
            break;
        }
    }

    // Income under $20,000 pays no premium
    if (taxableIncome <= 20000) return 0;

    // Calculate premium based on bracket
    const premium = applicableBracket.base +
        (taxableIncome - applicableBracket.threshold) * applicableBracket.rate;

    // Cap at the maximum for this bracket
    return Math.min(premium, applicableBracket.maxPremium);
}

/**
 * Calculate personal income tax on salary (simple version)
 * Includes federal, provincial, Ontario surtax, and health premium
 */
export function calculateSalaryTax(salary: number, rrspDeduction: number = 0): number {
    const breakdown = calculateSalaryTaxDetailed(salary, rrspDeduction);
    return breakdown.totalTax;
}

/**
 * Calculate personal income tax on salary with detailed breakdown
 * @param salary - Gross salary amount
 * @param rrspDeduction - RRSP contribution to deduct from taxable income
 * @returns Detailed tax breakdown
 */
export function calculateSalaryTaxDetailed(salary: number, rrspDeduction: number = 0): {
    federalTax: number;
    provincialTax: number;
    ontarioSurtax: number;
    ontarioHealthPremium: number;
    totalTax: number;
    taxableIncome: number;
} {
    if (salary <= 0) {
        return {
            federalTax: 0,
            provincialTax: 0,
            ontarioSurtax: 0,
            ontarioHealthPremium: 0,
            totalTax: 0,
            taxableIncome: 0,
        };
    }

    // Taxable income = salary minus RRSP deduction
    const taxableIncome = Math.max(0, salary - rrspDeduction);

    // Federal tax
    const federalTax = calculateTaxByBrackets(
        Math.max(0, taxableIncome - TAX_RATES.federal.basicPersonalAmount),
        TAX_RATES.federal.brackets
    );

    // Provincial tax (before surtax)
    const provincialTax = calculateTaxByBrackets(
        Math.max(0, taxableIncome - TAX_RATES.provincial.basicPersonalAmount),
        TAX_RATES.provincial.brackets
    );

    // Ontario surtax (on provincial tax payable)
    const ontarioSurtax = calculateOntarioSurtax(provincialTax);

    // Ontario Health Premium (based on taxable income)
    const ontarioHealthPremium = calculateOntarioHealthPremium(taxableIncome);

    const totalTax = federalTax + provincialTax + ontarioSurtax + ontarioHealthPremium;

    return {
        federalTax,
        provincialTax,
        ontarioSurtax,
        ontarioHealthPremium,
        totalTax,
        taxableIncome,
    };
}

/**
 * UNIFIED Personal Tax Calculation
 * Combines salary and dividend income on one return, applies:
 * - Basic personal amounts (federal and provincial)
 * - Graduated tax brackets on combined taxable income
 * - Dividend gross-up and tax credits
 * - Ontario surtax on total provincial tax
 * - Ontario health premium on total taxable income
 */
export function calculateCombinedPersonalTax(
    salary: number,
    eligibleDividends: number = 0,
    nonEligibleDividends: number = 0,
    rrspDeduction: number = 0
): {
    federalTax: number;
    provincialTax: number;
    ontarioSurtax: number;
    ontarioHealthPremium: number;
    dividendTaxCredits: number;
    totalTax: number;
    taxableIncome: number;
    grossedUpIncome: number;
} {
    // Step 1: Calculate grossed-up dividend amounts
    const eligibleGrossUp = eligibleDividends * (1 + TAX_RATES.dividend.eligible.grossUp);
    const nonEligibleGrossUp = nonEligibleDividends * (1 + TAX_RATES.dividend.nonEligible.grossUp);

    // Step 2: Calculate total taxable income (salary + grossed-up dividends - RRSP)
    const grossedUpIncome = salary + eligibleGrossUp + nonEligibleGrossUp;
    const taxableIncome = Math.max(0, grossedUpIncome - rrspDeduction);

    if (taxableIncome <= 0) {
        return {
            federalTax: 0,
            provincialTax: 0,
            ontarioSurtax: 0,
            ontarioHealthPremium: 0,
            dividendTaxCredits: 0,
            totalTax: 0,
            taxableIncome: 0,
            grossedUpIncome: 0,
        };
    }

    // Step 3: Calculate federal tax on combined income (minus BPA)
    const federalTaxableIncome = Math.max(0, taxableIncome - TAX_RATES.federal.basicPersonalAmount);
    const federalTaxBeforeCredits = calculateTaxByBrackets(federalTaxableIncome, TAX_RATES.federal.brackets);

    // Step 4: Calculate provincial tax on combined income (minus BPA)
    const provincialTaxableIncome = Math.max(0, taxableIncome - TAX_RATES.provincial.basicPersonalAmount);
    const provincialTaxBeforeCredits = calculateTaxByBrackets(provincialTaxableIncome, TAX_RATES.provincial.brackets);

    // Step 5: Calculate dividend tax credits
    const federalEligibleDTC = eligibleGrossUp * TAX_RATES.dividend.eligible.federalCredit;
    const federalNonEligibleDTC = nonEligibleGrossUp * TAX_RATES.dividend.nonEligible.federalCredit;
    const totalFederalDTC = federalEligibleDTC + federalNonEligibleDTC;

    const provincialEligibleDTC = eligibleGrossUp * TAX_RATES.dividend.eligible.provincialCredit;
    const provincialNonEligibleDTC = nonEligibleGrossUp * TAX_RATES.dividend.nonEligible.provincialCredit;
    const totalProvincialDTC = provincialEligibleDTC + provincialNonEligibleDTC;

    const dividendTaxCredits = totalFederalDTC + totalProvincialDTC;

    // Step 6: Calculate net federal and provincial tax (after credits)
    const federalTax = Math.max(0, federalTaxBeforeCredits - totalFederalDTC);
    const provincialTaxBeforeSurtax = Math.max(0, provincialTaxBeforeCredits - totalProvincialDTC);

    // Step 7: Ontario surtax on provincial tax payable (AFTER credits)
    const ontarioSurtax = calculateOntarioSurtax(provincialTaxBeforeSurtax);

    // Step 8: Ontario Health Premium (based on actual taxable income, not grossed-up)
    const actualIncome = salary + eligibleDividends + nonEligibleDividends - rrspDeduction;
    const ontarioHealthPremium = calculateOntarioHealthPremium(Math.max(0, actualIncome));

    // Total provincial tax includes surtax
    const provincialTax = provincialTaxBeforeSurtax + ontarioSurtax;

    // Step 9: Total personal tax
    const totalTax = federalTax + provincialTax + ontarioHealthPremium;

    return {
        federalTax,
        provincialTax,
        ontarioSurtax,
        ontarioHealthPremium,
        dividendTaxCredits,
        totalTax,
        taxableIncome,
        grossedUpIncome,
    };
}

/**
 * Calculate tax on eligible dividends ONLY (standalone - for backwards compatibility)
 */
export function calculateEligibleDividendTax(dividends: number): number {
    if (dividends <= 0) return 0;
    const result = calculateCombinedPersonalTax(0, dividends, 0, 0);
    return result.totalTax;
}

/**
 * Calculate tax on non-eligible dividends ONLY (standalone - for backwards compatibility)
 */
export function calculateNonEligibleDividendTax(dividends: number): number {
    if (dividends <= 0) return 0;
    const result = calculateCombinedPersonalTax(0, 0, dividends, 0);
    return result.totalTax;
}

/**
 * Calculate required gross salary to achieve a target after-tax amount
 */
export function calculateRequiredSalary(
    targetAfterTax: number,
    maxIterations: number = 10
): number {

    let estimatedSalary = targetAfterTax * 1.5;

    for (let i = 0; i < maxIterations; i++) {
        const tax = calculateSalaryTax(estimatedSalary);
        const cpp = calculateCPP(estimatedSalary);
        const ei = calculateEI(estimatedSalary);
        const afterTax = estimatedSalary - tax - cpp - ei;

        const difference = targetAfterTax - afterTax;

        if (Math.abs(difference) < 1) {
            return estimatedSalary;
        }

        estimatedSalary += difference * 1.4;
    }

    return estimatedSalary;
}
