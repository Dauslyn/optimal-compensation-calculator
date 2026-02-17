import { describe, it, expect } from 'vitest';
import {
  getRRIFMinimumRate,
  calculateRRIFMinimum,
  mustConvertToRRIF,
  calculateRRIFYear,
} from '../tax/rrif';

describe('RRIF Module', () => {
  // ─── Minimum Rates ────────────────────────────────────────────────────

  describe('getRRIFMinimumRate', () => {
    it('returns 5.28% at age 71', () => {
      expect(getRRIFMinimumRate(71)).toBeCloseTo(0.0528, 4);
    });

    it('returns 5.40% at age 72', () => {
      expect(getRRIFMinimumRate(72)).toBeCloseTo(0.0540, 4);
    });

    it('returns 5.82% at age 75', () => {
      expect(getRRIFMinimumRate(75)).toBeCloseTo(0.0582, 4);
    });

    it('returns 6.82% at age 80', () => {
      expect(getRRIFMinimumRate(80)).toBeCloseTo(0.0682, 4);
    });

    it('returns 8.51% at age 85', () => {
      expect(getRRIFMinimumRate(85)).toBeCloseTo(0.0851, 4);
    });

    it('returns 11.92% at age 90', () => {
      expect(getRRIFMinimumRate(90)).toBeCloseTo(0.1192, 4);
    });

    it('returns 18.79% at age 94', () => {
      expect(getRRIFMinimumRate(94)).toBeCloseTo(0.1879, 4);
    });

    it('returns 20% at age 95', () => {
      expect(getRRIFMinimumRate(95)).toBe(0.20);
    });

    it('returns 20% at age 100', () => {
      expect(getRRIFMinimumRate(100)).toBe(0.20);
    });

    it('returns 0 for age below 55', () => {
      expect(getRRIFMinimumRate(50)).toBe(0);
      expect(getRRIFMinimumRate(54)).toBe(0);
    });

    it('returns 2.86% at age 55', () => {
      expect(getRRIFMinimumRate(55)).toBeCloseTo(0.0286, 4);
    });

    it('returns 3.33% at age 60', () => {
      expect(getRRIFMinimumRate(60)).toBeCloseTo(0.0333, 4);
    });

    it('returns 4.00% at age 65', () => {
      expect(getRRIFMinimumRate(65)).toBeCloseTo(0.0400, 4);
    });

    it('returns 5.00% at age 70', () => {
      expect(getRRIFMinimumRate(70)).toBeCloseTo(0.0500, 4);
    });
  });

  // ─── Minimum Withdrawal ───────────────────────────────────────────────

  describe('calculateRRIFMinimum', () => {
    it('calculates $1M at age 71 = $52,800', () => {
      const minimum = calculateRRIFMinimum(1000000, 71);
      expect(minimum).toBeCloseTo(52800, 0);
    });

    it('calculates $500K at age 80 = $34,100', () => {
      const minimum = calculateRRIFMinimum(500000, 80);
      expect(minimum).toBeCloseTo(34100, 0);
    });

    it('calculates $1M at age 95 = $200,000', () => {
      const minimum = calculateRRIFMinimum(1000000, 95);
      expect(minimum).toBe(200000);
    });

    it('returns 0 for zero balance', () => {
      expect(calculateRRIFMinimum(0, 71)).toBe(0);
    });

    it('returns 0 for negative balance', () => {
      expect(calculateRRIFMinimum(-1000, 71)).toBe(0);
    });
  });

  // ─── RRIF Conversion ─────────────────────────────────────────────────

  describe('mustConvertToRRIF', () => {
    it('returns false for age 70', () => {
      expect(mustConvertToRRIF(70)).toBe(false);
    });

    it('returns true for age 71', () => {
      expect(mustConvertToRRIF(71)).toBe(true);
    });

    it('returns true for age 72', () => {
      expect(mustConvertToRRIF(72)).toBe(true);
    });
  });

  // ─── Full Year Calculation ────────────────────────────────────────────

  describe('calculateRRIFYear', () => {
    it('calculates correctly with no extra withdrawal', () => {
      const result = calculateRRIFYear(1000000, 71, 0.05);
      expect(result.minimum).toBeCloseTo(52800, 0);
      expect(result.withdrawal).toBeCloseTo(52800, 0);
      expect(result.balanceAfterWithdrawal).toBeCloseTo(947200, 0);
      // Growth: 947,200 × 1.05 = 994,560
      expect(result.balanceAfterGrowth).toBeCloseTo(994560, 0);
    });

    it('handles extra withdrawal correctly', () => {
      const result = calculateRRIFYear(1000000, 71, 0.05, 50000);
      expect(result.minimum).toBeCloseTo(52800, 0);
      // Total withdrawal = minimum + extra = 52,800 + 50,000 = 102,800
      expect(result.withdrawal).toBeCloseTo(102800, 0);
      expect(result.balanceAfterWithdrawal).toBeCloseTo(897200, 0);
    });

    it('caps total withdrawal at balance', () => {
      const result = calculateRRIFYear(10000, 95, 0.05, 100000);
      // Minimum = 20% of 10,000 = 2,000
      // Total requested = 2,000 + 100,000 = 102,000 → capped at 10,000
      expect(result.withdrawal).toBe(10000);
      expect(result.balanceAfterWithdrawal).toBe(0);
      expect(result.balanceAfterGrowth).toBe(0);
    });

    it('handles zero balance', () => {
      const result = calculateRRIFYear(0, 71, 0.05);
      expect(result.minimum).toBe(0);
      expect(result.withdrawal).toBe(0);
      expect(result.balanceAfterWithdrawal).toBe(0);
      expect(result.balanceAfterGrowth).toBe(0);
    });

    it('applies investment return after withdrawal', () => {
      const result = calculateRRIFYear(100000, 71, 0.10);
      const afterWithdrawal = 100000 - result.minimum;
      expect(result.balanceAfterGrowth).toBeCloseTo(afterWithdrawal * 1.10, 0);
    });

    it('handles negative extra withdrawal (treated as 0)', () => {
      const withoutExtra = calculateRRIFYear(1000000, 71, 0.05, 0);
      const withNegExtra = calculateRRIFYear(1000000, 71, 0.05, -5000);
      // Negative extra should be treated as 0 (Math.max(0, extra))
      expect(withNegExtra.withdrawal).toBeCloseTo(withoutExtra.withdrawal, 0);
    });
  });
});
