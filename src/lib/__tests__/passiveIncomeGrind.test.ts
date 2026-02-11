/**
 * Tests for Passive Income Grind (SBD Clawback)
 *
 * Verifies the calculation of reduced Small Business Deduction limits
 * when corporations have passive investment income above $50,000.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateReducedSBDLimit,
  calculateAAII,
  calculateEffectiveCorporateRate,
  calculatePassiveIncomeGrind,
  willTriggerGrind,
  calculatePassiveIncomeHeadroom,
  calculatePassiveIncomeUntilFullGrind,
  PASSIVE_INCOME_CONSTANTS,
} from '../tax/passiveIncomeGrind';

describe('Passive Income Grind', () => {
  describe('PASSIVE_INCOME_CONSTANTS', () => {
    it('has correct threshold values', () => {
      expect(PASSIVE_INCOME_CONSTANTS.threshold).toBe(50000);
      expect(PASSIVE_INCOME_CONSTANTS.sbdLimit).toBe(500000);
      expect(PASSIVE_INCOME_CONSTANTS.grindRate).toBe(5);
      expect(PASSIVE_INCOME_CONSTANTS.maxPassiveBeforeZeroSBD).toBe(150000);
    });
  });

  describe('calculateReducedSBDLimit', () => {
    it('returns full SBD when passive income is below threshold', () => {
      expect(calculateReducedSBDLimit(0)).toBe(500000);
      expect(calculateReducedSBDLimit(25000)).toBe(500000);
      expect(calculateReducedSBDLimit(50000)).toBe(500000);
    });

    it('reduces SBD by $5 for every $1 over threshold', () => {
      // $1 over threshold = $5 reduction
      expect(calculateReducedSBDLimit(50001)).toBe(500000 - 5);

      // $10,000 over threshold = $50,000 reduction
      expect(calculateReducedSBDLimit(60000)).toBe(500000 - 50000);

      // $50,000 over threshold = $250,000 reduction
      expect(calculateReducedSBDLimit(100000)).toBe(500000 - 250000);
    });

    it('eliminates SBD at $150,000 passive income', () => {
      expect(calculateReducedSBDLimit(150000)).toBe(0);
    });

    it('returns zero for passive income above $150,000', () => {
      expect(calculateReducedSBDLimit(200000)).toBe(0);
      expect(calculateReducedSBDLimit(500000)).toBe(0);
    });

    it('respects custom business limit', () => {
      // If associated corporations share limit
      const sharedLimit = 250000;
      expect(calculateReducedSBDLimit(50000, sharedLimit)).toBe(250000);
      expect(calculateReducedSBDLimit(100000, sharedLimit)).toBe(0); // Fully grinded at lower amount
    });
  });

  describe('calculateAAII', () => {
    it('calculates sum of passive income components', () => {
      const result = calculateAAII(
        10000,  // interest
        5000,   // foreign income
        15000,  // taxable capital gains
        2000    // other passive
      );
      expect(result).toBe(32000);
    });

    it('handles zero values', () => {
      expect(calculateAAII(0, 0, 0, 0)).toBe(0);
    });

    it('defaults other passive income to zero', () => {
      expect(calculateAAII(10000, 5000, 15000)).toBe(30000);
    });
  });

  describe('calculateEffectiveCorporateRate', () => {
    const smallBusinessRate = 0.122; // 12.2% Ontario
    const generalRate = 0.265;       // 26.5% Ontario

    it('uses small business rate when within SBD limit', () => {
      const result = calculateEffectiveCorporateRate(
        100000,
        500000,
        smallBusinessRate,
        generalRate
      );
      expect(result.effectiveRate).toBe(smallBusinessRate);
      expect(result.sbdIncome).toBe(100000);
      expect(result.generalIncome).toBe(0);
    });

    it('uses blended rate when exceeding SBD limit', () => {
      const result = calculateEffectiveCorporateRate(
        600000,     // Active income
        500000,     // Full SBD
        smallBusinessRate,
        generalRate
      );
      expect(result.sbdIncome).toBe(500000);
      expect(result.generalIncome).toBe(100000);
      expect(result.effectiveRate).toBeGreaterThan(smallBusinessRate);
      expect(result.effectiveRate).toBeLessThan(generalRate);
    });

    it('uses general rate when SBD is fully grinded', () => {
      const result = calculateEffectiveCorporateRate(
        100000,
        0,  // Zero SBD
        smallBusinessRate,
        generalRate
      );
      expect(result.effectiveRate).toBe(generalRate);
      expect(result.sbdIncome).toBe(0);
      expect(result.generalIncome).toBe(100000);
    });

    it('returns zero for zero income', () => {
      const result = calculateEffectiveCorporateRate(0, 500000, smallBusinessRate, generalRate);
      expect(result.effectiveRate).toBe(0);
      expect(result.sbdIncome).toBe(0);
      expect(result.generalIncome).toBe(0);
    });
  });

  describe('calculatePassiveIncomeGrind', () => {
    it('returns full SBD for income below threshold', () => {
      const result = calculatePassiveIncomeGrind(40000, 0, 0.122, 0.265);
      expect(result.totalPassiveIncome).toBe(40000);
      expect(result.excessPassiveIncome).toBe(0);
      expect(result.sbdReduction).toBe(0);
      expect(result.reducedSBDLimit).toBe(500000);
      expect(result.isFullyGrounded).toBe(false);
      expect(result.grindPercentage).toBe(0);
    });

    it('calculates partial grind correctly', () => {
      const result = calculatePassiveIncomeGrind(80000, 100000, 0.122, 0.265);
      expect(result.totalPassiveIncome).toBe(80000);
      expect(result.excessPassiveIncome).toBe(30000); // 80k - 50k
      expect(result.sbdReduction).toBe(150000);       // 30k * 5
      expect(result.reducedSBDLimit).toBe(350000);    // 500k - 150k
      expect(result.isFullyGrounded).toBe(false);
      expect(result.grindPercentage).toBe(30);        // 150k/500k = 30%
    });

    it('calculates full grind at threshold', () => {
      const result = calculatePassiveIncomeGrind(150000, 0, 0.122, 0.265);
      expect(result.reducedSBDLimit).toBe(0);
      expect(result.isFullyGrounded).toBe(true);
      expect(result.grindPercentage).toBe(100);
    });

    it('calculates additional tax from grind', () => {
      const smallBusinessRate = 0.122;
      const generalRate = 0.265;

      // $100k passive income = $50k excess = $250k SBD reduction
      const result = calculatePassiveIncomeGrind(100000, 300000, smallBusinessRate, generalRate);

      // $250k of income moves from 12.2% to 26.5%
      const expectedAdditionalTax = 250000 * (generalRate - smallBusinessRate);
      expect(result.additionalTaxFromGrind).toBeCloseTo(expectedAdditionalTax, 0);
    });
  });

  describe('willTriggerGrind', () => {
    it('returns false for income at or below threshold', () => {
      expect(willTriggerGrind(0)).toBe(false);
      expect(willTriggerGrind(50000)).toBe(false);
    });

    it('returns true for income above threshold', () => {
      expect(willTriggerGrind(50001)).toBe(true);
      expect(willTriggerGrind(100000)).toBe(true);
    });
  });

  describe('calculatePassiveIncomeHeadroom', () => {
    it('returns full headroom when no passive income', () => {
      expect(calculatePassiveIncomeHeadroom(0)).toBe(50000);
    });

    it('returns remaining headroom', () => {
      expect(calculatePassiveIncomeHeadroom(30000)).toBe(20000);
    });

    it('returns zero when at or above threshold', () => {
      expect(calculatePassiveIncomeHeadroom(50000)).toBe(0);
      expect(calculatePassiveIncomeHeadroom(100000)).toBe(0);
    });
  });

  describe('calculatePassiveIncomeUntilFullGrind', () => {
    it('returns full amount when no passive income', () => {
      expect(calculatePassiveIncomeUntilFullGrind(0)).toBe(150000);
    });

    it('returns remaining amount until full grind', () => {
      expect(calculatePassiveIncomeUntilFullGrind(100000)).toBe(50000);
    });

    it('returns zero when at or above full grind threshold', () => {
      expect(calculatePassiveIncomeUntilFullGrind(150000)).toBe(0);
      expect(calculatePassiveIncomeUntilFullGrind(200000)).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('scenario: CCPC with $75k passive income', () => {
      // Corporation has $75,000 in passive investment income
      // Excess: $75k - $50k = $25k
      // SBD reduction: $25k × 5 = $125k
      // Remaining SBD: $500k - $125k = $375k

      const grind = calculatePassiveIncomeGrind(75000, 400000, 0.122, 0.265);

      expect(grind.reducedSBDLimit).toBe(375000);
      expect(grind.grindPercentage).toBe(25);

      // Additional tax: min(activeIncome, sbdReduction) × (generalRate - sbdRate)
      // = min($400k, $125k) × (26.5% - 12.2%) = $125k × 14.3% = $17,875
      expect(grind.additionalTaxFromGrind).toBeCloseTo(17875, 0);
    });

    it('scenario: CCPC with $125k passive income', () => {
      // Corporation has $125,000 in passive investment income
      // Excess: $125k - $50k = $75k
      // SBD reduction: $75k × 5 = $375k
      // Remaining SBD: $500k - $375k = $125k

      const grind = calculatePassiveIncomeGrind(125000, 0, 0.122, 0.265);

      expect(grind.reducedSBDLimit).toBe(125000);
      expect(grind.grindPercentage).toBe(75);
    });

    it('scenario: Large investment portfolio with $200k passive income', () => {
      // SBD completely eliminated
      const grind = calculatePassiveIncomeGrind(200000, 500000, 0.122, 0.265);

      expect(grind.reducedSBDLimit).toBe(0);
      expect(grind.isFullyGrounded).toBe(true);

      // All $500k taxed at general rate instead of SBD rate
      const expectedAdditionalTax = 500000 * (0.265 - 0.122);
      expect(grind.additionalTaxFromGrind).toBeCloseTo(expectedAdditionalTax, 0);
    });
  });
});
