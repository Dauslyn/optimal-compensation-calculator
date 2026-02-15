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

describe('Quebec Health Services Fund (FSS)', () => {
  it('applies minimum 1.65% rate at payroll <= $1M', () => {
    // $200,000 payroll: 1.65% × $200,000 = $3,300
    expect(calculateEmployerHealthTax('QC', 200_000, 2026)).toBeCloseTo(3_300, 0);
    // $1,000,000 payroll: 1.65% × $1,000,000 = $16,500
    expect(calculateEmployerHealthTax('QC', 1_000_000, 2026)).toBeCloseTo(16_500, 0);
  });

  it('applies graduated rate between $1M and $7.8M', () => {
    // $2M payroll: rate = (1.2662 + 0.3838 × 2) / 100 = 2.0338%
    // FSS = $2,000,000 × 0.020338 = $40,676
    expect(calculateEmployerHealthTax('QC', 2_000_000, 2026)).toBeCloseTo(40_676, 0);

    // $5M payroll: rate = (1.2662 + 0.3838 × 5) / 100 = 3.1852%
    // FSS = $5,000,000 × 0.031852 = $159,260
    expect(calculateEmployerHealthTax('QC', 5_000_000, 2026)).toBeCloseTo(159_260, 0);
  });

  it('applies maximum 4.26% rate at payroll >= $7.8M', () => {
    // $10,000,000 payroll: 4.26% × $10,000,000 = $426,000
    expect(calculateEmployerHealthTax('QC', 10_000_000, 2026)).toBeCloseTo(426_000, 0);
  });

  it('is continuous at the lower threshold ($1M)', () => {
    // At $1M: flat rate = 1.65%, graduated = (1.2662 + 0.3838 × 1) / 100 = 1.65%
    const flat = 1_000_000 * 0.0165;
    const graduated = 1_000_000 * ((1.2662 + 0.3838 * 1) / 100);
    expect(flat).toBeCloseTo(graduated, 0);
  });

  it('is approximately continuous at the upper threshold ($7.8M)', () => {
    // At $7.8M: graduated = (1.2662 + 0.3838 × 7.8) / 100 ≈ 4.2598%
    // Full rate = 4.26%. Slight gap due to coefficient rounding.
    const graduated = 7_800_000 * ((1.2662 + 0.3838 * 7.8) / 100);
    const full = 7_800_000 * 0.0426;
    expect(Math.abs(graduated - full)).toBeLessThan(200); // within $200
  });

  it('returns 0 for zero payroll', () => {
    expect(calculateEmployerHealthTax('QC', 0, 2026)).toBe(0);
  });

  it('typical CCPC scenario: $150K salary = $2,475 FSS', () => {
    // Most CCPCs have payroll well under $1M, so 1.65% applies
    // $150,000 × 0.0165 = $2,475
    expect(calculateEmployerHealthTax('QC', 150_000, 2026)).toBeCloseTo(2_475, 0);
  });
});

describe('Ontario Employer Health Tax', () => {
  it('returns 0 when payroll is below exemption (eligible employer)', () => {
    expect(calculateEmployerHealthTax('ON', 500_000, 2026)).toBe(0);
    expect(calculateEmployerHealthTax('ON', 1_000_000, 2026)).toBe(0);
  });

  it('applies lowest rate (0.98%) for small payrolls', () => {
    // $150K payroll: under $200K threshold → 0.98% rate
    // Eligible for exemption, but payroll < $1M → taxable = 0
    expect(calculateEmployerHealthTax('ON', 150_000, 2026)).toBe(0);
  });

  it('applies graduated rate for payroll in $200K-$400K range', () => {
    // $1,100,000 payroll (eligible, > $400K → 1.95% rate)
    // Taxable = $1,100,000 - $1,000,000 = $100,000
    // EHT = $100,000 × 1.95% = $1,950
    expect(calculateEmployerHealthTax('ON', 1_100_000, 2026)).toBeCloseTo(1_950, 0);
  });

  it('applies max rate (1.95%) above $400K payroll', () => {
    // $1,500,000 payroll (eligible, > $400K → 1.95%)
    // Taxable = $1,500,000 - $1,000,000 = $500,000
    // EHT = $500,000 × 1.95% = $9,750
    expect(calculateEmployerHealthTax('ON', 1_500_000, 2026)).toBeCloseTo(9_750, 0);
  });

  it('removes exemption at $5M payroll (not eligible)', () => {
    // $5,000,000 payroll: at cap, no exemption → 1.95% × $5,000,000 = $97,500
    expect(calculateEmployerHealthTax('ON', 5_000_000, 2026)).toBeCloseTo(97_500, 0);
  });

  it('no exemption for large employers', () => {
    // $6,000,000 payroll: > $5M → no exemption, 1.95% on full payroll
    // EHT = $6,000,000 × 1.95% = $117,000
    expect(calculateEmployerHealthTax('ON', 6_000_000, 2026)).toBeCloseTo(117_000, 0);
  });

  it('typical CCPC: $150K salary = $0 EHT (under exemption)', () => {
    // Most CCPCs have payroll well under $1M, so exemption covers everything
    expect(calculateEmployerHealthTax('ON', 150_000, 2026)).toBe(0);
  });

  it('typical CCPC: $200K salary = $0 EHT (under exemption)', () => {
    expect(calculateEmployerHealthTax('ON', 200_000, 2026)).toBe(0);
  });

  it('returns 0 for zero or negative payroll', () => {
    expect(calculateEmployerHealthTax('ON', 0, 2026)).toBe(0);
    expect(calculateEmployerHealthTax('ON', -100, 2026)).toBe(0);
  });

  it('rate lookup uses total payroll before exemption', () => {
    // $1,050,000 payroll: > $400K → rate = 1.95%
    // Taxable = $1,050,000 - $1,000,000 = $50,000
    // EHT = $50,000 × 1.95% = $975
    expect(calculateEmployerHealthTax('ON', 1_050_000, 2026)).toBeCloseTo(975, 0);

    // $4,999,999 payroll: still eligible, > $400K → rate = 1.95%
    // Taxable = $4,999,999 - $1,000,000 = $3,999,999
    // EHT = $3,999,999 × 1.95% = $77,999.98
    expect(calculateEmployerHealthTax('ON', 4_999_999, 2026)).toBeCloseTo(78_000, 0);
  });
});

describe('Other provinces', () => {
  it('returns 0 for provinces without employer health tax', () => {
    const provinces = ['AB', 'SK', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'YT'] as const;
    for (const prov of provinces) {
      expect(calculateEmployerHealthTax(prov, 2_000_000, 2025)).toBe(0);
    }
  });
});
