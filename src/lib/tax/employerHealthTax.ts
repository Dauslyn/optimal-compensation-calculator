/**
 * Provincial Employer Health Taxes
 *
 * Ontario EHT, BC Employer Health Tax (EHT), Manitoba Health & Post-Secondary
 * Education Tax Levy, and Quebec Health Services Fund (FSS).
 * These are employer-side payroll taxes based on total remuneration.
 *
 * Sources:
 * - ON: https://www.ontario.ca/document/employer-health-tax-eht
 * - BC: https://www2.gov.bc.ca/gov/content/taxes/employer-health-tax/employer-health-tax-overview
 * - MB: https://www.gov.mb.ca/finance/taxation/taxes/payroll.html
 * - QC: https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/calculating-source-deductions-and-employer-contributions/employer-contributions-to-the-health-services-fund/
 */

import type { ProvinceCode } from './provinces';

/**
 * Ontario Employer Health Tax
 *
 * Graduated rate from 0.98% to 1.95% based on total Ontario payroll.
 * Employers with total payroll (including associated employers) under $5M
 * get a $1M exemption (2020–2028, not indexed until 2029).
 * Rate is determined by total payroll BEFORE exemption, then applied to
 * (payroll − exemption).
 *
 * Rate brackets (unchanged since 1996, not indexed):
 *   ≤ $200K: 0.98%    $200K–$230K: 1.101%   $230K–$260K: 1.223%
 *   $260K–$290K: 1.344%   $290K–$320K: 1.465%   $320K–$350K: 1.586%
 *   $350K–$380K: 1.708%   $380K–$400K: 1.829%   > $400K: 1.95%
 *
 * For a typical CCPC (single owner, payroll well under $5M), the employer
 * qualifies for the exemption. Most CCPCs with salary > $400K pay 1.95%
 * on the amount above $1M.
 */
const ON_EHT = {
  exemption: 1_000_000,
  exemptionPayrollCap: 5_000_000,  // exemption only if total payroll < $5M
  brackets: [
    { threshold: 200_000, rate: 0.0098 },
    { threshold: 230_000, rate: 0.01101 },
    { threshold: 260_000, rate: 0.01223 },
    { threshold: 290_000, rate: 0.01344 },
    { threshold: 320_000, rate: 0.01465 },
    { threshold: 350_000, rate: 0.01586 },
    { threshold: 380_000, rate: 0.01708 },
    { threshold: 400_000, rate: 0.01829 },
  ],
  maxRate: 0.0195,
};

// Each bracket's `rate` applies when payroll is AT OR BELOW its `threshold`.
// When payroll exceeds threshold[i], the applicable rate is brackets[i+1].rate.
// If payroll exceeds the last threshold (index 7), brackets[8] is undefined → maxRate.
function getOntarioEHTRate(totalPayroll: number): number {
  for (let i = ON_EHT.brackets.length - 1; i >= 0; i--) {
    if (totalPayroll > ON_EHT.brackets[i].threshold) {
      return ON_EHT.brackets[i + 1]?.rate ?? ON_EHT.maxRate;
    }
  }
  return ON_EHT.brackets[0].rate;
}

function calculateOntarioEHT(totalPayroll: number): number {
  const eligible = totalPayroll < ON_EHT.exemptionPayrollCap;
  const taxable = eligible
    ? Math.max(0, totalPayroll - ON_EHT.exemption)
    : totalPayroll;
  if (taxable <= 0) return 0;
  const rate = getOntarioEHTRate(totalPayroll);
  return taxable * rate;
}

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

  if (province === 'ON') {
    return calculateOntarioEHT(totalPayroll);
  }

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
