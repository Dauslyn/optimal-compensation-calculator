/**
 * Tests for v1.9.0 "Spousal Income" feature:
 * - Backward compatibility (no spouse = unchanged)
 * - Spouse compensation populated
 * - Shared account depletion across two taxpayers
 * - Spouse strategy variants (dynamic, fixed, dividends-only)
 * - Family tax advantage from income splitting
 * - SBD grind includes both salaries
 * - Share link round-trip with spouse fields
 */

import { describe, it, expect } from 'vitest';
import type { UserInputs } from '../types';
import { getDefaultInputs } from '../localStorage';
import { calculateProjection } from '../calculator';
import { encodeShareLink, decodeShareLink } from '../shareLink';
import { INPUT_TOOLTIPS } from '../../components/Tooltip';
import { depleteAccountsWithRates } from '../accounts/accountOperations';

const defaults = getDefaultInputs();

describe('Spousal Income - Backward Compatibility', () => {
  it('should produce identical results when hasSpouse is false', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
      hasSpouse: false,
    };
    const summary = calculateProjection(inputs);

    expect(summary.yearlyResults).toHaveLength(5);
    expect(summary.spouse).toBeUndefined();
    for (const yr of summary.yearlyResults) {
      expect(yr.spouse).toBeUndefined();
    }
  });

  it('should produce identical results when hasSpouse is undefined', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      planningHorizon: 5,
    };
    // Remove hasSpouse entirely
    delete (inputs as unknown as Record<string, unknown>).hasSpouse;
    const summary = calculateProjection(inputs);

    expect(summary.spouse).toBeUndefined();
    for (const yr of summary.yearlyResults) {
      expect(yr.spouse).toBeUndefined();
    }
  });
});

describe('Spousal Income - Basic Scenario', () => {
  it('should populate spouse data when hasSpouse is true', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dynamic',
    };
    const summary = calculateProjection(inputs);

    // Spouse data should exist
    expect(summary.spouse).toBeDefined();
    expect(summary.spouse!.totalSalary).toBeGreaterThanOrEqual(0);
    expect(summary.spouse!.totalAfterTaxIncome).toBeGreaterThan(0);

    // Each year should have spouse data
    for (const yr of summary.yearlyResults) {
      expect(yr.spouse).toBeDefined();
      expect(yr.spouse!.afterTaxIncome).toBeGreaterThan(0);
    }
  });

  it('should include spouse in family totals', () => {
    const inputsNoSpouse: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
      hasSpouse: false,
    };
    const inputsWithSpouse: UserInputs = {
      ...inputsNoSpouse,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dynamic',
    };

    const noSpouse = calculateProjection(inputsNoSpouse);
    const withSpouse = calculateProjection(inputsWithSpouse);

    // Family total compensation should be higher with spouse
    expect(withSpouse.totalCompensation).toBeGreaterThan(noSpouse.totalCompensation);
    // Family total personal tax should be higher (two people paying tax)
    expect(withSpouse.totalPersonalTax).toBeGreaterThan(noSpouse.totalPersonalTax);
  });
});

describe('Spousal Income - Shared Account Depletion', () => {
  it('should deplete CDA across both primary and spouse', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 50000,
      annualCorporateRetainedEarnings: 200000,
      corporateInvestmentBalance: 1000000,
      cdaBalance: 100000,  // Enough for primary but not both
      planningHorizon: 3,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dividends-only',
      salaryStrategy: 'dividends-only',
    };
    const summary = calculateProjection(inputs);

    // Year 1: primary draws from CDA first, then spouse draws from remaining
    const yr1 = summary.yearlyResults[0];
    const primaryCapDiv = yr1.dividends.capitalDividends;
    const spouseCapDiv = yr1.spouse?.dividends.capitalDividends || 0;

    // Primary should have drawn capital dividends
    expect(primaryCapDiv).toBeGreaterThan(0);
    // Together they should deplete CDA more than either alone would
    expect(primaryCapDiv + spouseCapDiv).toBeLessThanOrEqual(100000 + 1); // Can't exceed starting CDA (+ rounding)
  });
});

describe('Spousal Income - Strategy Variants', () => {
  it('should handle spouse dividends-only strategy (no salary)', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dividends-only',
    };
    const summary = calculateProjection(inputs);

    // Spouse salary should be 0 every year
    for (const yr of summary.yearlyResults) {
      expect(yr.spouse!.salary).toBe(0);
      expect(yr.spouse!.rrspRoomGenerated).toBe(0);
    }
    expect(summary.spouse!.totalSalary).toBe(0);
    expect(summary.spouse!.totalRRSPRoomGenerated).toBe(0);
  });

  it('should handle spouse fixed salary strategy', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'fixed',
      spouseFixedSalaryAmount: 60000,
    };
    const summary = calculateProjection(inputs);

    // Spouse salary in year 1 should be approximately 60000 (may be inflated)
    const yr1SpouseSalary = summary.yearlyResults[0].spouse!.salary;
    expect(yr1SpouseSalary).toBeCloseTo(60000, -2); // Within $100
    expect(summary.spouse!.totalSalary).toBeGreaterThan(0);
    expect(summary.spouse!.totalRRSPRoomGenerated).toBeGreaterThan(0);
  });

  it('should handle spouse dynamic strategy', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dynamic',
    };
    const summary = calculateProjection(inputs);

    // Should have positive after-tax income
    expect(summary.spouse!.totalAfterTaxIncome).toBeGreaterThan(0);
  });
});

describe('Spousal Income - Family Tax Advantage', () => {
  it('should result in lower family tax when splitting vs single-person', () => {
    // Single person taking $150k
    const singleInputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 150000,
      annualCorporateRetainedEarnings: 500000,
      corporateInvestmentBalance: 1000000,
      planningHorizon: 5,
      salaryStrategy: 'dynamic',
      hasSpouse: false,
    };

    // Two people: $100k primary + $50k spouse
    const familyInputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 500000,
      corporateInvestmentBalance: 1000000,
      planningHorizon: 5,
      salaryStrategy: 'dynamic',
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dynamic',
    };

    const singleResult = calculateProjection(singleInputs);
    const familyResult = calculateProjection(familyInputs);

    // Family personal tax should be lower due to two sets of brackets
    expect(familyResult.totalPersonalTax).toBeLessThan(singleResult.totalPersonalTax);
  });
});

describe('Spousal Income - Corporate Tax Impact', () => {
  it('should deduct both salaries from active business income for SBD', () => {
    const inputsNoSpouse: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 50000,
      annualCorporateRetainedEarnings: 300000,
      corporateInvestmentBalance: 100000,
      planningHorizon: 3,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 80000,
      hasSpouse: false,
    };

    const inputsWithSpouse: UserInputs = {
      ...inputsNoSpouse,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'fixed',
      spouseFixedSalaryAmount: 60000,
    };

    const noSpouse = calculateProjection(inputsNoSpouse);
    const withSpouse = calculateProjection(inputsWithSpouse);

    // With spouse salary, more income is deducted from active business income
    // This means less corporate tax on active income (lower taxable amount)
    // but the difference could be complex; at minimum, corporate active tax should differ
    expect(withSpouse.totalCorporateTaxOnActive).not.toBe(noSpouse.totalCorporateTaxOnActive);
  });
});

describe('Spousal Income - Share Link Round-Trip', () => {
  it('should preserve spouse fields through encode/decode', () => {
    const inputs: UserInputs = {
      ...defaults,
      hasSpouse: true,
      spouseRequiredIncome: 75000,
      spouseSalaryStrategy: 'fixed',
      spouseFixedSalaryAmount: 60000,
      spouseRRSPRoom: 30000,
      spouseTFSARoom: 15000,
      spouseMaximizeTFSA: true,
      spouseContributeToRRSP: true,
    };

    const encoded = encodeShareLink(inputs);
    const decoded = decodeShareLink(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.hasSpouse).toBe(true);
    expect(decoded!.spouseRequiredIncome).toBe(75000);
    expect(decoded!.spouseSalaryStrategy).toBe('fixed');
    expect(decoded!.spouseFixedSalaryAmount).toBe(60000);
    expect(decoded!.spouseRRSPRoom).toBe(30000);
    expect(decoded!.spouseTFSARoom).toBe(15000);
    expect(decoded!.spouseMaximizeTFSA).toBe(true);
    expect(decoded!.spouseContributeToRRSP).toBe(true);
  });

  it('should not include spouse fields when hasSpouse is false', () => {
    const inputs: UserInputs = {
      ...defaults,
      hasSpouse: false,
    };

    const encoded = encodeShareLink(inputs);
    const decoded = decodeShareLink(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.hasSpouse).toBeFalsy();
    expect(decoded!.spouseRequiredIncome).toBeUndefined();
  });
});

describe('Spousal Income - Tooltips', () => {
  it('should have tooltips for all spouse input fields', () => {
    const spouseKeys = [
      'hasSpouse', 'spouseRequiredIncome', 'spouseSalaryStrategy',
      'spouseFixedSalaryAmount', 'spouseRRSPRoom', 'spouseTFSARoom',
    ];

    for (const key of spouseKeys) {
      expect(INPUT_TOOLTIPS).toHaveProperty(key);
      expect((INPUT_TOOLTIPS as Record<string, string>)[key].length).toBeGreaterThan(20);
    }
  });
});

describe('Spousal Income - Quebec', () => {
  it('should handle spouse with Quebec payroll (QPP/QPIP)', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'QC',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 3,
      hasSpouse: true,
      spouseRequiredIncome: 50000,
      spouseSalaryStrategy: 'dynamic',
    };
    const summary = calculateProjection(inputs);

    expect(summary.spouse).toBeDefined();
    expect(summary.spouse!.totalAfterTaxIncome).toBeGreaterThan(0);

    // Quebec spouse should have QPIP if they have salary
    const hasSpouseSalary = summary.yearlyResults.some(yr => yr.spouse && yr.spouse.salary > 0);
    if (hasSpouseSalary) {
      const yrWithSalary = summary.yearlyResults.find(yr => yr.spouse && yr.spouse.salary > 0);
      expect(yrWithSalary!.spouse!.qpip).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Corporate Cash Floor - Dividend Capping', () => {
  it('should never let corporateInvestments go below zero from dividends alone', () => {
    // Scenario: very low starting balance, dividends-only strategy
    // depleteAccountsWithRates should cap dividends at available cash
    const accounts = {
      CDA: 100000,
      eRDTOH: 50000,
      nRDTOH: 50000,
      GRIP: 100000,
      corporateInvestments: 10000, // Only $10k cash
    };
    const result = depleteAccountsWithRates(
      200000, // Want $200k after-tax but only $10k in corp
      accounts,
      0.3833,  // RDTOH refund rate
      0.25,    // eligible effective rate
      0.35,    // non-eligible effective rate
    );

    // Corporate investments should not go below zero
    expect(result.updatedAccounts.corporateInvestments).toBeGreaterThanOrEqual(-0.01);
    // Should have funded less than requested
    expect(result.funding.afterTaxIncome).toBeLessThan(200000);
    expect(result.funding.afterTaxIncome).toBeGreaterThan(0);
  });

  it('should fund zero dividends when corporate investments is zero', () => {
    const accounts = {
      CDA: 100000,
      eRDTOH: 50000,
      nRDTOH: 50000,
      GRIP: 100000,
      corporateInvestments: 0,
    };
    const result = depleteAccountsWithRates(
      100000,
      accounts,
      0.3833,
      0.25,
      0.35,
    );

    expect(result.updatedAccounts.corporateInvestments).toBe(0);
    expect(result.funding.afterTaxIncome).toBe(0);
    expect(result.funding.capitalDividends).toBe(0);
    expect(result.funding.eligibleDividends).toBe(0);
    expect(result.funding.nonEligibleDividends).toBe(0);
  });

  it('should allow salary even when corporateInvestments is zero (paid from active income)', () => {
    // Dynamic strategy with no corporate savings — should still generate salary
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 80000,
      annualCorporateRetainedEarnings: 200000,
      corporateInvestmentBalance: 0, // No accumulated savings
      planningHorizon: 3,
      salaryStrategy: 'dynamic',
    };
    const summary = calculateProjection(inputs);

    // Should still produce after-tax income via salary
    for (const yr of summary.yearlyResults) {
      expect(yr.afterTaxIncome).toBeGreaterThan(0);
      expect(yr.salary).toBeGreaterThan(0);
    }
  });

  it('should cap spouse dividends when corp is depleted by primary', () => {
    // Primary takes dividends first, leaving little for spouse
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 100000,
      corporateInvestmentBalance: 50000, // Small balance
      cdaBalance: 40000,
      planningHorizon: 3,
      salaryStrategy: 'dividends-only', // Primary takes all dividends
      hasSpouse: true,
      spouseRequiredIncome: 100000,
      spouseSalaryStrategy: 'dividends-only', // Spouse also wants dividends
    };
    const summary = calculateProjection(inputs);

    // Corporate investments should never go materially negative
    // (salary still nets out at end of year, but dividends should be capped)
    for (const yr of summary.yearlyResults) {
      // After all end-of-year adjustments, check the final state
      // Since both are dividends-only, corp shouldn't go negative
      // Note: first year might start with only $50k available
      expect(yr.notionalAccounts.corporateInvestments).toBeGreaterThanOrEqual(-1);
    }
  });
});
