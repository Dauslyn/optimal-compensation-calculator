import { TAX_RATES } from './constants';

/**
 * Calculate CPP contributions on salary (base CPP - first tier)
 */
export function calculateCPP(salary: number): number {
    if (salary <= TAX_RATES.cpp.basicExemption) return 0;

    const pensionableEarnings = Math.min(
        salary - TAX_RATES.cpp.basicExemption,
        TAX_RATES.cpp.maximumPensionableEarnings - TAX_RATES.cpp.basicExemption
    );

    return pensionableEarnings * TAX_RATES.cpp.rate;
}

/**
 * Calculate CPP2 contributions on salary (second tier - since 2024)
 * Applies to earnings between YMPE ($68,500) and YAMPE ($73,200)
 */
export function calculateCPP2(salary: number): number {
    if (salary <= TAX_RATES.cpp2.firstCeiling) return 0;

    const cpp2Earnings = Math.min(
        salary - TAX_RATES.cpp2.firstCeiling,
        TAX_RATES.cpp2.secondCeiling - TAX_RATES.cpp2.firstCeiling
    );

    return cpp2Earnings * TAX_RATES.cpp2.rate;
}

/**
 * Calculate total CPP contributions (CPP + CPP2)
 */
export function calculateTotalCPP(salary: number): { cpp: number; cpp2: number; total: number } {
    const cpp = calculateCPP(salary);
    const cpp2 = calculateCPP2(salary);
    return { cpp, cpp2, total: cpp + cpp2 };
}

/**
 * Calculate EI premiums on salary
 */
export function calculateEI(salary: number): number {
    if (salary <= 0) return 0;

    const insurableEarnings = Math.min(salary, TAX_RATES.ei.maximumInsurableEarnings);

    return insurableEarnings * TAX_RATES.ei.rate;
}
