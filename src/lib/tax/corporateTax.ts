import { TAX_RATES, SBD_THRESHOLD, PASSIVE_INCOME_THRESHOLD, PASSIVE_INCOME_GRIND_RATE } from './constants';

/**
 * Calculate corporate tax based on income level and passive income
 */
export function calculateCorporateTax(
    activeIncome: number,
    passiveIncome: number
): { tax: number; rate: number } {
    if (activeIncome <= 0) return { tax: 0, rate: 0 };

    // Calculate small business deduction limit based on passive income
    let sblLimit = SBD_THRESHOLD;
    if (passiveIncome > PASSIVE_INCOME_THRESHOLD) {
        const excess = passiveIncome - PASSIVE_INCOME_THRESHOLD;
        const reduction = excess * PASSIVE_INCOME_GRIND_RATE;
        sblLimit = Math.max(0, SBD_THRESHOLD - reduction);
    }

    // Calculate tax in each bracket
    const smallBusinessIncome = Math.min(activeIncome, sblLimit);
    const generalRateIncome = Math.max(0, activeIncome - sblLimit);

    const smallBusinessTax = smallBusinessIncome * TAX_RATES.corporate.smallBusiness;
    const generalRateTax = generalRateIncome * TAX_RATES.corporate.general;

    const totalTax = smallBusinessTax + generalRateTax;
    const effectiveRate = totalTax / activeIncome;

    return { tax: totalTax, rate: effectiveRate };
}

/**
 * Calculate RDTOH refund for dividend distributions
 */
export function calculateRDTOHRefund(
    dividendAmount: number,
    _rdtohType: 'eligible' | 'non-eligible'
): number {
    // RDTOH refund is $0.3833 per $1 of dividends paid, up to the balance
    return dividendAmount * TAX_RATES.rdtoh.refundRate;
}
