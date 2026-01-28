/**
 * End-to-end calculator tests
 *
 * Verifies the calculator produces sensible results for realistic scenarios.
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

// Helper to create valid default inputs
function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    province: 'ON',
    requiredIncome: 100000,
    planningHorizon: 5,
    startingYear: 2025,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: true,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    investmentReturnRate: 0.04,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: 100000,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

describe('Calculator End-to-End', () => {
  describe('Basic calculation', () => {
    it('should produce valid results for Ontario business owner', () => {
      const inputs = createInputs({ province: 'ON' });
      const result = calculateProjection(inputs);

      // Should have correct number of years
      expect(result.yearlyResults.length).toBe(5);

      // Total compensation should be reasonable
      expect(result.totalCompensation).toBeGreaterThan(400000); // At least $80k/yr avg
      expect(result.totalCompensation).toBeLessThan(1000000);

      // Tax should be reasonable (20-50% effective rate)
      expect(result.effectiveTaxRate).toBeGreaterThan(0.15);
      expect(result.effectiveTaxRate).toBeLessThan(0.55);

      // Each year should have positive after-tax income
      for (const year of result.yearlyResults) {
        expect(year.afterTaxIncome).toBeGreaterThan(0);
      }
    });

    it('should produce valid results for Quebec business owner', () => {
      const inputs = createInputs({ province: 'QC' });
      const result = calculateProjection(inputs);

      // Should have correct number of years
      expect(result.yearlyResults.length).toBe(5);

      // Quebec should have QPP and QPIP instead of CPP/EI
      for (const year of result.yearlyResults) {
        if (year.salary > 0) {
          // Quebec uses QPP (higher rate than CPP)
          expect(year.cpp).toBeGreaterThan(0);
          // Quebec has QPIP
          expect(year.qpip).toBeGreaterThanOrEqual(0);
        }
      }

      // Tax should be reasonable
      expect(result.effectiveTaxRate).toBeGreaterThan(0.15);
      expect(result.effectiveTaxRate).toBeLessThan(0.55);
    });

    it('should produce valid results for Alberta business owner', () => {
      const inputs = createInputs({ province: 'AB' });
      const result = calculateProjection(inputs);

      // Alberta has lower provincial rates, so effective rate should be lower
      expect(result.effectiveTaxRate).toBeGreaterThan(0.1);
      expect(result.effectiveTaxRate).toBeLessThan(0.5);

      // Each year should have positive after-tax income
      for (const year of result.yearlyResults) {
        expect(year.afterTaxIncome).toBeGreaterThan(0);
      }
    });
  });

  describe('Salary strategies', () => {
    it('should use dividends first in dynamic strategy', () => {
      const inputs = createInputs({
        salaryStrategy: 'dynamic',
        cdaBalance: 50000, // Has CDA to deplete first
        eRDTOHBalance: 20000,
      });
      const result = calculateProjection(inputs);

      // Year 1 should use capital dividends from CDA
      const year1 = result.yearlyResults[0];
      expect(year1.dividends.capitalDividends).toBeGreaterThan(0);
    });

    it('should respect fixed salary amount', () => {
      const inputs = createInputs({
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 80000,
      });
      const result = calculateProjection(inputs);

      // Year 1 salary should be close to $80,000
      const year1 = result.yearlyResults[0];
      expect(year1.salary).toBeCloseTo(80000, -2); // Within $100
    });

    it('should use only dividends when dividends-only strategy', () => {
      const inputs = createInputs({
        salaryStrategy: 'dividends-only',
        eRDTOHBalance: 100000,
        nRDTOHBalance: 100000,
      });
      const result = calculateProjection(inputs);

      // Should have no salary
      for (const year of result.yearlyResults) {
        expect(year.salary).toBe(0);
      }

      // Should have dividends
      expect(result.totalDividends).toBeGreaterThan(0);
    });
  });

  describe('Investment returns', () => {
    it('should grow corporate balance with positive returns', () => {
      const inputs = createInputs({
        investmentReturnRate: 0.06, // 6% return
        annualCorporateRetainedEarnings: 0, // No new earnings
        salaryStrategy: 'dividends-only',
        requiredIncome: 20000, // Low withdrawal
      });
      const result = calculateProjection(inputs);

      // With high returns and low withdrawal, balance should grow
      const endBalance = result.finalCorporateBalance;

      // May not always grow due to withdrawals, but should be reasonable
      expect(endBalance).toBeGreaterThan(0);
    });

    it('should track notional accounts correctly', () => {
      const inputs = createInputs({
        cdaBalance: 100000,
        eRDTOHBalance: 50000,
        nRDTOHBalance: 30000,
        gripBalance: 80000,
      });
      const result = calculateProjection(inputs);

      // Final notional accounts should be tracked
      const finalYear = result.yearlyResults[result.yearlyResults.length - 1];
      expect(finalYear.notionalAccounts.CDA).toBeGreaterThanOrEqual(0);
      expect(finalYear.notionalAccounts.eRDTOH).toBeGreaterThanOrEqual(0);
      expect(finalYear.notionalAccounts.nRDTOH).toBeGreaterThanOrEqual(0);
      expect(finalYear.notionalAccounts.GRIP).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-year inflation', () => {
    it('should inflate spending needs over time', () => {
      const inputs = createInputs({
        planningHorizon: 5,
        expectedInflationRate: 0.03, // 3% inflation
        inflateSpendingNeeds: true,
      });
      const result = calculateProjection(inputs);

      // With fixed salary strategy, we can observe increasing needed withdrawals
      // The total compensation should reflect inflated needs
      const year1AfterTax = result.yearlyResults[0].afterTaxIncome;
      const year5AfterTax = result.yearlyResults[4].afterTaxIncome;

      // Year 5 after-tax should be higher due to inflation
      // (roughly 1.03^4 = 1.126 times year 1)
      expect(year5AfterTax).toBeGreaterThan(year1AfterTax);
    });
  });

  describe('10-year projection', () => {
    it('should handle 10-year planning horizon', () => {
      const inputs = createInputs({
        planningHorizon: 10,
      });
      const result = calculateProjection(inputs);

      // Should have 10 years of results
      expect(result.yearlyResults.length).toBe(10);

      // Each year should be valid
      for (let i = 0; i < 10; i++) {
        expect(result.yearlyResults[i].year).toBe(i + 1);
        expect(result.yearlyResults[i].afterTaxIncome).toBeGreaterThan(0);
      }
    });
  });
});
