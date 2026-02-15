/**
 * Provincial Employer Health Taxes
 *
 * BC Employer Health Tax (EHT) and Manitoba Health & Post-Secondary Education Tax Levy.
 * These are employer-side payroll taxes based on total remuneration.
 *
 * Sources:
 * - BC: https://www2.gov.bc.ca/gov/content/taxes/employer-health-tax/employer-health-tax-overview
 * - MB: https://www.gov.mb.ca/finance/taxation/taxes/payroll.html
 */

import type { ProvinceCode } from './provinces';

/**
 * BC Employer Health Tax
 * Thresholds set January 1, 2024 — not indexed for inflation.
 */
const BC_EHT = {
  exemption: 1_000_000,
  upperThreshold: 1_500_000,
  fullRate: 0.0195,       // 1.95%
  notchRate: 0.0585,      // 5.85% on amount over exemption (in the notch zone)
};

/**
 * Manitoba Health & Post-Secondary Education Tax Levy
 * Thresholds not indexed — changed by legislation.
 */
const MB_HE_LEVY: Record<number, { exemption: number; upperThreshold: number }> = {
  2025: { exemption: 2_250_000, upperThreshold: 4_500_000 },
  2026: { exemption: 2_500_000, upperThreshold: 5_000_000 },
};
const MB_HE_FULL_RATE = 0.0215;  // 2.15%
const MB_HE_NOTCH_RATE = 0.043;  // 4.3%

function getMBThresholds(year: number): { exemption: number; upperThreshold: number } {
  if (year >= 2026) return MB_HE_LEVY[2026];
  return MB_HE_LEVY[2025];
}

/**
 * Calculate employer health tax for a given province and total payroll.
 * Returns 0 for provinces without an employer health tax.
 */
export function calculateEmployerHealthTax(
  province: ProvinceCode,
  totalPayroll: number,
  year: number
): number {
  if (totalPayroll <= 0) return 0;

  if (province === 'BC') {
    if (totalPayroll <= BC_EHT.exemption) return 0;
    if (totalPayroll <= BC_EHT.upperThreshold) {
      return BC_EHT.notchRate * (totalPayroll - BC_EHT.exemption);
    }
    return BC_EHT.fullRate * totalPayroll;
  }

  if (province === 'MB') {
    const thresholds = getMBThresholds(year);
    if (totalPayroll <= thresholds.exemption) return 0;
    if (totalPayroll <= thresholds.upperThreshold) {
      return MB_HE_NOTCH_RATE * (totalPayroll - thresholds.exemption);
    }
    return MB_HE_FULL_RATE * totalPayroll;
  }

  // ON also has an EHT, but it follows the same structure as BC.
  // ON EHT is already implicitly captured in Ontario's higher corporate costs
  // and the calculator already models Ontario's employer costs separately.
  // For now, only BC and MB are implemented as they were the identified gaps.

  return 0;
}
