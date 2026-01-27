/**
 * Tests for input validation
 */

import { describe, it, expect } from 'vitest';
import { validateInputs, isValid, getFieldErrors } from '../validation';
import type { UserInputs } from '../types';

// Helper to create valid default inputs
function createValidInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    province: 'ON',
    requiredIncome: 100000,
    planningHorizon: 5,
    startingYear: new Date().getFullYear(),
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: true,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    investmentReturnRate: 0.0431,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: 50000,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

describe('validateInputs', () => {
  describe('requiredIncome', () => {
    it('should reject zero income', () => {
      const inputs = createValidInputs({ requiredIncome: 0 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'requiredIncome')).toBe(true);
    });

    it('should reject negative income', () => {
      const inputs = createValidInputs({ requiredIncome: -50000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'requiredIncome')).toBe(true);
    });

    it('should reject income over $10M', () => {
      const inputs = createValidInputs({ requiredIncome: 15000000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'requiredIncome')).toBe(true);
    });

    it('should accept valid income', () => {
      const inputs = createValidInputs({ requiredIncome: 100000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'requiredIncome')).toBe(false);
    });
  });

  describe('planningHorizon', () => {
    it('should reject invalid horizon', () => {
      // Test horizon below minimum (2 years)
      const inputs = createValidInputs({ planningHorizon: 2 as any });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'planningHorizon')).toBe(true);
    });

    it('should reject horizon above maximum', () => {
      // Test horizon above maximum (11 years)
      const inputs = createValidInputs({ planningHorizon: 11 as any });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'planningHorizon')).toBe(true);
    });

    it('should accept valid horizons', () => {
      for (const horizon of [3, 4, 5, 6, 7, 8, 9, 10] as const) {
        const inputs = createValidInputs({ planningHorizon: horizon });
        const errors = validateInputs(inputs);
        expect(errors.some(e => e.field === 'planningHorizon')).toBe(false);
      }
    });
  });

  describe('expectedInflationRate', () => {
    it('should reject negative rate', () => {
      const inputs = createValidInputs({ expectedInflationRate: -0.01 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'expectedInflationRate')).toBe(true);
    });

    it('should reject rate over 10%', () => {
      const inputs = createValidInputs({ expectedInflationRate: 0.15 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'expectedInflationRate')).toBe(true);
    });

    it('should accept valid rates', () => {
      const inputs = createValidInputs({ expectedInflationRate: 0.02 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'expectedInflationRate')).toBe(false);
    });
  });

  describe('investmentReturnRate', () => {
    it('should reject negative rate', () => {
      const inputs = createValidInputs({ investmentReturnRate: -0.01 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'investmentReturnRate')).toBe(true);
    });

    it('should reject rate over 20%', () => {
      const inputs = createValidInputs({ investmentReturnRate: 0.25 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'investmentReturnRate')).toBe(true);
    });

    it('should accept valid rates', () => {
      const inputs = createValidInputs({ investmentReturnRate: 0.0431 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'investmentReturnRate')).toBe(false);
    });
  });

  describe('portfolio allocation', () => {
    it('should reject allocation not summing to 100%', () => {
      const inputs = createValidInputs({
        canadianEquityPercent: 30,
        usEquityPercent: 30,
        internationalEquityPercent: 30,
        fixedIncomePercent: 5, // Total: 95%
      });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'canadianEquityPercent')).toBe(true);
    });

    it('should accept allocation summing to 100%', () => {
      const inputs = createValidInputs({
        canadianEquityPercent: 25,
        usEquityPercent: 25,
        internationalEquityPercent: 25,
        fixedIncomePercent: 25,
      });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'canadianEquityPercent' && e.message.includes('100%'))).toBe(false);
    });

    it('should reject negative percentages', () => {
      const inputs = createValidInputs({
        canadianEquityPercent: -10,
        usEquityPercent: 50,
        internationalEquityPercent: 30,
        fixedIncomePercent: 30,
      });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'canadianEquityPercent')).toBe(true);
    });
  });

  describe('notional accounts', () => {
    it('should reject negative CDA balance', () => {
      const inputs = createValidInputs({ cdaBalance: -1000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'cdaBalance')).toBe(true);
    });

    it('should reject negative eRDTOH balance', () => {
      const inputs = createValidInputs({ eRDTOHBalance: -1000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'eRDTOHBalance')).toBe(true);
    });

    it('should reject negative nRDTOH balance', () => {
      const inputs = createValidInputs({ nRDTOHBalance: -1000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'nRDTOHBalance')).toBe(true);
    });

    it('should reject negative GRIP balance', () => {
      const inputs = createValidInputs({ gripBalance: -1000 });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'gripBalance')).toBe(true);
    });
  });

  describe('fixed salary strategy', () => {
    it('should require salary amount when using fixed strategy', () => {
      const inputs = createValidInputs({
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 0,
      });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'fixedSalaryAmount')).toBe(true);
    });

    it('should accept valid salary amount with fixed strategy', () => {
      const inputs = createValidInputs({
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 75000,
      });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'fixedSalaryAmount')).toBe(false);
    });

    it('should not require salary amount for dynamic strategy', () => {
      const inputs = createValidInputs({
        salaryStrategy: 'dynamic',
        fixedSalaryAmount: undefined,
      });
      const errors = validateInputs(inputs);
      expect(errors.some(e => e.field === 'fixedSalaryAmount')).toBe(false);
    });
  });
});

describe('isValid', () => {
  it('should return true for valid inputs', () => {
    const inputs = createValidInputs();
    expect(isValid(inputs)).toBe(true);
  });

  it('should return false for invalid inputs', () => {
    const inputs = createValidInputs({ requiredIncome: -1000 });
    expect(isValid(inputs)).toBe(false);
  });
});

describe('getFieldErrors', () => {
  it('should return errors for specific field', () => {
    const inputs = createValidInputs({
      requiredIncome: -1000,
      investmentReturnRate: 0.5,
    });
    const errors = validateInputs(inputs);

    const incomeErrors = getFieldErrors(errors, 'requiredIncome');
    expect(incomeErrors.length).toBeGreaterThan(0);

    const returnErrors = getFieldErrors(errors, 'investmentReturnRate');
    expect(returnErrors.length).toBeGreaterThan(0);
  });

  it('should return empty array for field with no errors', () => {
    const inputs = createValidInputs({ requiredIncome: -1000 });
    const errors = validateInputs(inputs);

    const horizonErrors = getFieldErrors(errors, 'planningHorizon');
    expect(horizonErrors.length).toBe(0);
  });
});
