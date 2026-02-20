import { describe, it, expect } from 'vitest';
import { calculateInvestmentReturns } from '../accounts/investmentReturns';

const BALANCE = 1_000_000;

describe('calculateInvestmentReturns', () => {
  describe('Canadian equity only (100% TSX)', () => {
    it('realized capital gains are ~0.3% of balance (not 50% of price appreciation)', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.085, 100, 0, 0, 0);
      // Realized CG from turnover: ~0.3% of $1M = ~$3,000
      expect(result.realizedCapitalGain).toBeGreaterThan(2000);
      expect(result.realizedCapitalGain).toBeLessThan(5000);
    });

    it('Canadian dividends are ~2.8% of balance', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.085, 100, 0, 0, 0);
      expect(result.canadianDividends).toBeCloseTo(28000, -3);
    });

    it('zero foreign income', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.085, 100, 0, 0, 0);
      expect(result.foreignIncome).toBe(0);
    });

    it('eRDTOH increases by 38.33% of Canadian dividends', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.085, 100, 0, 0, 0);
      expect(result.eRDTOHIncrease).toBeCloseTo(result.canadianDividends * 0.3833, 0);
    });

    it('CDA increases by 50% of realized capital gains', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.085, 100, 0, 0, 0);
      expect(result.CDAIncrease).toBeCloseTo(result.realizedCapitalGain * 0.5, 0);
    });
  });

  describe('100% fixed income', () => {
    it('zero realized capital gains', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.04, 0, 0, 0, 100);
      expect(result.realizedCapitalGain).toBe(0);
    });

    it('zero Canadian dividends', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.04, 0, 0, 0, 100);
      expect(result.canadianDividends).toBe(0);
    });

    it('all return is foreign income (interest)', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.04, 0, 0, 0, 100);
      // All return is interest; modeled as foreign income for AAII purposes
      expect(result.foreignIncome).toBeGreaterThan(0);
    });
  });

  describe('100% US equity', () => {
    it('foreign income ~1.5% of balance', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.095, 0, 100, 0, 0);
      expect(result.foreignIncome).toBeCloseTo(15000, -3);
    });

    it('zero Canadian dividends', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.095, 0, 100, 0, 0);
      expect(result.canadianDividends).toBe(0);
    });

    it('nRDTOH reduced by 15% withholding on foreign dividends', () => {
      const result = calculateInvestmentReturns(BALANCE, 0.095, 0, 100, 0, 0);
      // nRDTOH = foreignIncome * 0.3067 - foreignDividends * 0.15
      // foreignDividends = 1.5% of balance = 15000
      const expectedNRDTOH = (result.foreignIncome * 0.3067) - (15000 * 0.15);
      expect(result.nRDTOHIncrease).toBeCloseTo(expectedNRDTOH, 0);
    });
  });

  describe('AAII for SBD grind threshold', () => {
    it('60/40 equity/bond portfolio: AAII < $50k (no grind) for $1M corporate balance', () => {
      // 60% equity (mixed), 40% bonds
      const result = calculateInvestmentReturns(BALANCE, 0.072, 20, 20, 20, 40);
      // AAII = foreignIncome + taxableCapGain (50% of realizedCG)
      const aaii = result.foreignIncome + (result.realizedCapitalGain * 0.5);
      // $50k is the grind threshold
      expect(aaii).toBeLessThan(50000);
    });

    it('previously: 100% equity with old 50% realization assumption would have triggered grind', () => {
      // This documents the old (broken) behaviour:
      // old realizedCG = capitalGainRate * 0.5 of total return ≈ huge
      // New behaviour should NOT trigger grind
      const result = calculateInvestmentReturns(BALANCE, 0.085, 60, 20, 20, 0);
      const aaii = result.foreignIncome + (result.realizedCapitalGain * 0.5);
      expect(aaii).toBeLessThan(50000); // grind threshold
    });
  });

  describe('zero balance', () => {
    it('returns all zeros when balance is 0', () => {
      const result = calculateInvestmentReturns(0, 0.06, 33, 33, 34, 0);
      expect(result.totalReturn).toBe(0);
      expect(result.canadianDividends).toBe(0);
      expect(result.foreignIncome).toBe(0);
      expect(result.realizedCapitalGain).toBe(0);
    });
  });
});
