/**
 * Provincial Employer Health Taxes
 *
 * BC Employer Health Tax (EHT), Manitoba Health & Post-Secondary Education Tax Levy,
 * and Quebec Health Services Fund (FSS).
 * These are employer-side payroll taxes based on total remuneration.
 *
 * Sources:
 * - BC: https://www2.gov.bc.ca/gov/content/taxes/employer-health-tax/employer-health-tax-overview
 * - MB: https://www.gov.mb.ca/finance/taxation/taxes/payroll.html
 * - QC: https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/calculating-source-deductions-and-employer-contributions/employer-contributions-to-the-health-services-fund/
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

  if (province === 'QC') {
    return calculateQuebecHSF(totalPayroll);
  }

  return 0;
}

/**
 * Quebec Health Services Fund (FSS - Fonds des services de santé)
 *
 * Employer-paid contribution on total employee remuneration (no cap).
 * Rate depends on total worldwide payroll. For "Other Employers" (services sector,
 * which covers most CCPCs):
 *
 * - Payroll ≤ $1M: 1.65%
 * - $1M < Payroll < $7.8M: graduated rate = 1.2662 + 0.3838 × (payroll / $1M)
 * - Payroll ≥ $7.8M: 4.26%
 *
 * Thresholds: $1M / $7.8M (effective 2025, unchanged for 2026). Not indexed.
 * Uses "Other Employers" rates (services sector). Primary/manufacturing sector
 * employers have a lower minimum rate of 1.25%.
 */
const QC_HSF = {
  lowerThreshold: 1_000_000,
  upperThreshold: 7_800_000,
  minRate: 0.0165,      // 1.65% for other employers
  maxRate: 0.0426,      // 4.26%
  // Graduated formula coefficients: rate = (a + b × S) / 100, where S = payroll / $1M
  formulaA: 1.2662,
  formulaB: 0.3838,
};

function calculateQuebecHSF(totalPayroll: number): number {
  if (totalPayroll <= QC_HSF.lowerThreshold) {
    return totalPayroll * QC_HSF.minRate;
  }
  if (totalPayroll >= QC_HSF.upperThreshold) {
    return totalPayroll * QC_HSF.maxRate;
  }
  // Graduated rate
  const s = totalPayroll / 1_000_000;
  const ratePercent = QC_HSF.formulaA + QC_HSF.formulaB * s;
  const rate = ratePercent / 100;
  return totalPayroll * rate;
}
