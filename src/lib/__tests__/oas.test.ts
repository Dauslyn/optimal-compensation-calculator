import { describe, it, expect } from 'vitest';
import {
  getMaxOASBenefit,
  getClawbackThreshold,
  solveOASWithClawback,
  calculateOAS,
} from '../tax/oas';

describe('OAS Module', () => {
  // ─── Max Benefit ──────────────────────────────────────────────────────

  describe('getMaxOASBenefit', () => {
    it('returns correct max for 2025, age 65, start at 65', () => {
      const maxAnnual = getMaxOASBenefit(2025, 65, 65, 0.02);
      // $727.67/month × 12 = $8,732.04 annual (2025 base, no deferral)
      expect(maxAnnual).toBeCloseTo(727.67 * 12, 0);
    });

    it('returns 0 if age < startAge', () => {
      expect(getMaxOASBenefit(2025, 64, 65, 0.02)).toBe(0);
    });

    it('includes 10% supplement for age 75+', () => {
      const at74 = getMaxOASBenefit(2025, 74, 65, 0.02);
      const at75 = getMaxOASBenefit(2025, 75, 65, 0.02);
      // 75+ should be ~10% higher
      expect(at75 / at74).toBeCloseTo(800.44 / 727.67, 2);
    });

    it('includes deferral bonus for start at 70', () => {
      const at65 = getMaxOASBenefit(2025, 70, 65, 0.02);
      const at70 = getMaxOASBenefit(2025, 70, 70, 0.02);
      // 60 months × 0.6% = 36% bonus
      expect(at70 / at65).toBeCloseTo(1.36, 2);
    });

    it('projects forward with inflation', () => {
      const oas2025 = getMaxOASBenefit(2025, 65, 65, 0.02);
      const oas2035 = getMaxOASBenefit(2035, 65, 65, 0.02);
      const expectedRatio = Math.pow(1.02, 10);
      expect(oas2035 / oas2025).toBeCloseTo(expectedRatio, 2);
    });

    it('caps deferral at 5 years (age 70)', () => {
      // Deferral to 70 and 71 should give same bonus (capped at 36%)
      const deferred70 = getMaxOASBenefit(2025, 71, 70, 0.02);
      // If someone somehow set start age to 70, at age 71 they get the 36% bonus
      const expectedMonthly = 727.67 * 1.36 * 12;
      // At age 71 they're still under 75, so use 65-74 rate
      expect(deferred70).toBeCloseTo(expectedMonthly, 0);
    });
  });

  // ─── Clawback Threshold ───────────────────────────────────────────────

  describe('getClawbackThreshold', () => {
    it('returns $93,454 for 2025', () => {
      expect(getClawbackThreshold(2025, 0.02)).toBeCloseTo(93454, 0);
    });

    it('projects forward with inflation', () => {
      const threshold2030 = getClawbackThreshold(2030, 0.02);
      expect(threshold2030).toBeCloseTo(93454 * Math.pow(1.02, 5), 0);
    });
  });

  // ─── OAS with Clawback ───────────────────────────────────────────────

  describe('solveOASWithClawback', () => {
    const maxOAS = 727.67 * 12; // ~$8,732
    const threshold = 93454;

    it('no clawback when income below threshold', () => {
      const result = solveOASWithClawback(80000, maxOAS, threshold);
      expect(result.clawback).toBe(0);
      expect(result.netOAS).toBeCloseTo(maxOAS, 0);
    });

    it('partial clawback at $100K income', () => {
      const result = solveOASWithClawback(100000, maxOAS, threshold);
      expect(result.clawback).toBeGreaterThan(0);
      expect(result.clawback).toBeLessThan(maxOAS);
      expect(result.netOAS).toBeGreaterThan(0);
      expect(result.netOAS).toBeLessThan(maxOAS);
    });

    it('full clawback at very high income', () => {
      const result = solveOASWithClawback(200000, maxOAS, threshold);
      expect(result.clawback).toBeCloseTo(maxOAS, 0);
      expect(result.netOAS).toBeCloseTo(0, 0);
    });

    it('handles zero OAS', () => {
      const result = solveOASWithClawback(100000, 0, threshold);
      expect(result.grossOAS).toBe(0);
      expect(result.clawback).toBe(0);
      expect(result.netOAS).toBe(0);
    });

    it('clawback at $150K income is significant', () => {
      const result = solveOASWithClawback(150000, maxOAS, threshold);
      // At $150K, excess = $150K - $93,454 = $56,546
      // Clawback = 15% × excess = $8,482 → close to full clawback
      expect(result.clawback).toBeGreaterThan(maxOAS * 0.8);
    });

    it('iterative solver converges for borderline income', () => {
      // Income right at threshold + small amount
      const result = solveOASWithClawback(95000, maxOAS, threshold);
      // Should have small clawback
      expect(result.grossOAS).toBeCloseTo(maxOAS, 0);
      expect(result.clawback).toBeGreaterThan(0);
      expect(result.clawback).toBeLessThan(2000);
      // Verify internal consistency
      expect(result.grossOAS - result.clawback).toBeCloseTo(result.netOAS, 1);
    });
  });

  // ─── Full OAS Calculation ─────────────────────────────────────────────

  describe('calculateOAS', () => {
    it('returns 0 when not eligible', () => {
      const result = calculateOAS({
        calendarYear: 2025,
        age: 65,
        oasStartAge: 65,
        oasEligible: false,
        baseIncomeBeforeOAS: 50000,
        inflationRate: 0.02,
      });
      expect(result.grossOAS).toBe(0);
      expect(result.netOAS).toBe(0);
    });

    it('returns 0 before start age', () => {
      const result = calculateOAS({
        calendarYear: 2025,
        age: 64,
        oasStartAge: 65,
        oasEligible: true,
        baseIncomeBeforeOAS: 50000,
        inflationRate: 0.02,
      });
      expect(result.grossOAS).toBe(0);
    });

    it('returns full OAS for low-income retiree', () => {
      const result = calculateOAS({
        calendarYear: 2025,
        age: 65,
        oasStartAge: 65,
        oasEligible: true,
        baseIncomeBeforeOAS: 40000,
        inflationRate: 0.02,
      });
      expect(result.netOAS).toBeCloseTo(727.67 * 12, 0);
      expect(result.clawback).toBe(0);
    });

    it('applies clawback for high-income retiree', () => {
      const result = calculateOAS({
        calendarYear: 2025,
        age: 65,
        oasStartAge: 65,
        oasEligible: true,
        baseIncomeBeforeOAS: 120000,
        inflationRate: 0.02,
      });
      expect(result.clawback).toBeGreaterThan(0);
      expect(result.netOAS).toBeLessThan(result.grossOAS);
    });

    it('applies deferral bonus when starting at 70', () => {
      const at65 = calculateOAS({
        calendarYear: 2030,
        age: 70,
        oasStartAge: 65,
        oasEligible: true,
        baseIncomeBeforeOAS: 40000,
        inflationRate: 0.02,
      });
      const at70 = calculateOAS({
        calendarYear: 2030,
        age: 70,
        oasStartAge: 70,
        oasEligible: true,
        baseIncomeBeforeOAS: 40000,
        inflationRate: 0.02,
      });
      // Deferred should be 36% higher
      expect(at70.grossOAS / at65.grossOAS).toBeCloseTo(1.36, 2);
    });
  });
});
