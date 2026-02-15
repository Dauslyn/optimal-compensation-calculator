import { describe, it, expect } from 'vitest';
import { calculateEmployerHealthTax } from '../tax/employerHealthTax';

describe('BC Employer Health Tax', () => {
  it('returns 0 when payroll is below exemption', () => {
    expect(calculateEmployerHealthTax('BC', 500_000, 2025)).toBe(0);
    expect(calculateEmployerHealthTax('BC', 1_000_000, 2025)).toBe(0);
  });

  it('applies notch rate in the transition zone', () => {
    // $1,200,000 payroll: 5.85% × ($1,200,000 - $1,000,000) = 5.85% × $200,000 = $11,700
    expect(calculateEmployerHealthTax('BC', 1_200_000, 2025)).toBeCloseTo(11_700, 0);
  });

  it('applies full rate above upper threshold', () => {
    // $2,000,000 payroll: 1.95% × $2,000,000 = $39,000
    expect(calculateEmployerHealthTax('BC', 2_000_000, 2025)).toBeCloseTo(39_000, 0);
  });

  it('is continuous at the upper threshold', () => {
    // At exactly $1,500,000, both formulas should give the same result
    const notch = 0.0585 * (1_500_000 - 1_000_000);  // $29,250
    const full = 0.0195 * 1_500_000;                   // $29,250
    expect(notch).toBeCloseTo(full, 2);
    expect(calculateEmployerHealthTax('BC', 1_500_000, 2025)).toBeCloseTo(29_250, 0);
  });

  it('returns 0 for zero or negative payroll', () => {
    expect(calculateEmployerHealthTax('BC', 0, 2025)).toBe(0);
    expect(calculateEmployerHealthTax('BC', -100, 2025)).toBe(0);
  });
});

describe('Manitoba Health & Education Levy', () => {
  describe('2025 thresholds', () => {
    it('returns 0 when payroll is below exemption', () => {
      expect(calculateEmployerHealthTax('MB', 1_000_000, 2025)).toBe(0);
      expect(calculateEmployerHealthTax('MB', 2_250_000, 2025)).toBe(0);
    });

    it('applies notch rate in the transition zone', () => {
      // $3,000,000 payroll: 4.3% × ($3,000,000 - $2,250,000) = 4.3% × $750,000 = $32,250
      expect(calculateEmployerHealthTax('MB', 3_000_000, 2025)).toBeCloseTo(32_250, 0);
    });

    it('applies full rate above upper threshold', () => {
      // $5,000,000 payroll: 2.15% × $5,000,000 = $107,500
      expect(calculateEmployerHealthTax('MB', 5_000_000, 2025)).toBeCloseTo(107_500, 0);
    });

    it('is continuous at the upper threshold', () => {
      const notch = 0.043 * (4_500_000 - 2_250_000);  // $96,750
      const full = 0.0215 * 4_500_000;                  // $96,750
      expect(notch).toBeCloseTo(full, 2);
      expect(calculateEmployerHealthTax('MB', 4_500_000, 2025)).toBeCloseTo(96_750, 0);
    });
  });

  describe('2026 thresholds', () => {
    it('returns 0 when payroll is below exemption', () => {
      expect(calculateEmployerHealthTax('MB', 2_400_000, 2026)).toBe(0);
      expect(calculateEmployerHealthTax('MB', 2_500_000, 2026)).toBe(0);
    });

    it('applies notch rate in the transition zone', () => {
      // $3,500,000 payroll: 4.3% × ($3,500,000 - $2,500,000) = 4.3% × $1,000,000 = $43,000
      expect(calculateEmployerHealthTax('MB', 3_500_000, 2026)).toBeCloseTo(43_000, 0);
    });

    it('applies full rate above upper threshold', () => {
      // $6,000,000 payroll: 2.15% × $6,000,000 = $129,000
      expect(calculateEmployerHealthTax('MB', 6_000_000, 2026)).toBeCloseTo(129_000, 0);
    });

    it('is continuous at the upper threshold', () => {
      const notch = 0.043 * (5_000_000 - 2_500_000);  // $107,500
      const full = 0.0215 * 5_000_000;                  // $107,500
      expect(notch).toBeCloseTo(full, 2);
      expect(calculateEmployerHealthTax('MB', 5_000_000, 2026)).toBeCloseTo(107_500, 0);
    });
  });
});

describe('Other provinces', () => {
  it('returns 0 for provinces without employer health tax', () => {
    const provinces = ['AB', 'SK', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'QC', 'YT'] as const;
    for (const prov of provinces) {
      expect(calculateEmployerHealthTax(prov, 2_000_000, 2025)).toBe(0);
    }
  });

  it('returns 0 for Ontario (modeled elsewhere)', () => {
    expect(calculateEmployerHealthTax('ON', 2_000_000, 2025)).toBe(0);
  });
});
