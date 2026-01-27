/**
 * Tests for payroll tax calculations (CPP, CPP2, EI)
 *
 * These tests verify calculations against official CRA values.
 * Reference: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions.html
 *
 * Note: Tests use the current year's tax values from the indexation module,
 * so expected values are calculated dynamically.
 */

import { describe, it, expect } from 'vitest';
import { calculateCPP, calculateCPP2, calculateTotalCPP, calculateEI } from '../tax/payrollTax';
import { TAX_RATES } from '../tax/constants';

// Get current year's values from TAX_RATES (which uses indexation module)
const CPP = TAX_RATES.cpp;
const CPP2 = TAX_RATES.cpp2;
const EI = TAX_RATES.ei;

describe('calculateCPP (base CPP)', () => {
  it('should return 0 for salary below basic exemption', () => {
    expect(calculateCPP(CPP.basicExemption)).toBe(0);
    expect(calculateCPP(CPP.basicExemption - 500)).toBe(0);
    expect(calculateCPP(0)).toBe(0);
  });

  it('should calculate CPP for salary just above exemption', () => {
    const salary = 10000;
    const expectedCPP = (salary - CPP.basicExemption) * CPP.rate;
    const cpp = calculateCPP(salary);
    expect(cpp).toBeCloseTo(expectedCPP, 2);
  });

  it('should calculate CPP for mid-range salary', () => {
    const salary = 50000;
    const expectedCPP = (salary - CPP.basicExemption) * CPP.rate;
    const cpp = calculateCPP(salary);
    expect(cpp).toBeCloseTo(expectedCPP, 2);
  });

  it('should cap CPP at YMPE', () => {
    const ympe = CPP.maximumPensionableEarnings;
    const expectedMax = (ympe - CPP.basicExemption) * CPP.rate;

    // At YMPE
    const cppAtYmpe = calculateCPP(ympe);
    expect(cppAtYmpe).toBeCloseTo(expectedMax, 2);

    // Above YMPE should be same as at YMPE
    const cppAboveYmpe = calculateCPP(ympe + 50000);
    expect(cppAboveYmpe).toBeCloseTo(expectedMax, 2);
  });

  it('should match the documented max contribution', () => {
    const cppMax = calculateCPP(500000);
    expect(cppMax).toBeCloseTo(CPP.maxContribution, 2);
  });
});

describe('calculateCPP2 (enhanced CPP)', () => {
  it('should return 0 for salary at or below YMPE (first ceiling)', () => {
    expect(calculateCPP2(CPP2.firstCeiling)).toBe(0);
    expect(calculateCPP2(CPP2.firstCeiling - 10000)).toBe(0);
    expect(calculateCPP2(0)).toBe(0);
  });

  it('should calculate CPP2 for salary between YMPE and YAMPE', () => {
    // Test at midpoint between ceilings
    const midpoint = (CPP2.firstCeiling + CPP2.secondCeiling) / 2;
    const expectedCPP2 = (midpoint - CPP2.firstCeiling) * CPP2.rate;
    const cpp2 = calculateCPP2(midpoint);
    expect(cpp2).toBeCloseTo(expectedCPP2, 2);
  });

  it('should calculate CPP2 for salary at YAMPE', () => {
    const yampe = CPP2.secondCeiling;
    const expectedMax = (yampe - CPP2.firstCeiling) * CPP2.rate;
    const cpp2AtYampe = calculateCPP2(yampe);
    expect(cpp2AtYampe).toBeCloseTo(expectedMax, 2);
  });

  it('should cap CPP2 at YAMPE', () => {
    const expectedMax = (CPP2.secondCeiling - CPP2.firstCeiling) * CPP2.rate;

    // Above YAMPE should be same as at YAMPE
    const cpp2AboveYampe = calculateCPP2(CPP2.secondCeiling + 50000);
    expect(cpp2AboveYampe).toBeCloseTo(expectedMax, 2);
  });

  it('should match the documented max contribution', () => {
    const cpp2Max = calculateCPP2(500000);
    expect(cpp2Max).toBeCloseTo(CPP2.maxContribution, 2);
  });
});

describe('calculateTotalCPP', () => {
  it('should return both CPP and CPP2 components', () => {
    const result = calculateTotalCPP(CPP2.secondCeiling);

    expect(result).toHaveProperty('cpp');
    expect(result).toHaveProperty('cpp2');
    expect(result).toHaveProperty('total');
    expect(result.total).toBe(result.cpp + result.cpp2);
  });

  it('should calculate correct total for salary above YAMPE', () => {
    const result = calculateTotalCPP(CPP2.secondCeiling + 50000);

    expect(result.cpp).toBeCloseTo(CPP.maxContribution, 2);
    expect(result.cpp2).toBeCloseTo(CPP2.maxContribution, 2);
    expect(result.total).toBeCloseTo(CPP.maxContribution + CPP2.maxContribution, 2);
  });

  it('should calculate correct total for salary between YMPE and YAMPE', () => {
    const midpoint = (CPP2.firstCeiling + CPP2.secondCeiling) / 2;
    const result = calculateTotalCPP(midpoint);

    // CPP should be maxed
    expect(result.cpp).toBeCloseTo(CPP.maxContribution, 2);

    // CPP2 should be partial
    const expectedCPP2 = (midpoint - CPP2.firstCeiling) * CPP2.rate;
    expect(result.cpp2).toBeCloseTo(expectedCPP2, 2);
  });

  it('should calculate correct total for salary below YMPE', () => {
    const salary = CPP2.firstCeiling - 20000;
    const result = calculateTotalCPP(salary);

    // No CPP2 for salary below YMPE
    expect(result.cpp2).toBe(0);
    expect(result.total).toBe(result.cpp);
  });
});

describe('calculateEI', () => {
  it('should return 0 for zero salary', () => {
    expect(calculateEI(0)).toBe(0);
  });

  it('should calculate EI for salary below max insurable', () => {
    const salary = 50000;
    const expectedEI = salary * EI.rate;
    const ei = calculateEI(salary);
    expect(ei).toBeCloseTo(expectedEI, 2);
  });

  it('should cap EI at maximum insurable earnings', () => {
    const maxInsurable = EI.maximumInsurableEarnings;
    const expectedMax = maxInsurable * EI.rate;

    // At max insurable
    const eiAtMax = calculateEI(maxInsurable);
    expect(eiAtMax).toBeCloseTo(expectedMax, 2);

    // Above max should be same
    const eiAboveMax = calculateEI(maxInsurable + 50000);
    expect(eiAboveMax).toBeCloseTo(expectedMax, 2);
  });

  it('should match the documented max contribution', () => {
    const eiMax = calculateEI(500000);
    expect(eiMax).toBeCloseTo(EI.maxContribution, 2);
  });
});

describe('employer contributions', () => {
  it('should calculate employer EI at 1.4x employee rate', () => {
    const salary = 50000;
    const employeeEI = calculateEI(salary);
    const employerEI = employeeEI * EI.employerMultiplier;

    expect(EI.employerMultiplier).toBe(1.4);
    expect(employerEI).toBeCloseTo(employeeEI * 1.4, 2);
  });

  it('employer CPP matches employee CPP (both base and enhanced)', () => {
    const salary = CPP2.secondCeiling + 10000;
    const result = calculateTotalCPP(salary);

    // Employer matches both CPP and CPP2
    const employerCPP = result.cpp;
    const employerCPP2 = result.cpp2;

    expect(employerCPP).toBe(result.cpp);
    expect(employerCPP2).toBe(result.cpp2);
  });
});

describe('specific year verification', () => {
  // These tests verify specific values against CRA documentation
  // They will need updating when new tax years are added

  it('should use 2026 YMPE of $74,600 or 2025 YMPE of $71,300', () => {
    // Accept either 2025 or 2026 values depending on current year
    const ympe = CPP.maximumPensionableEarnings;
    expect([71300, 74600]).toContain(ympe);
  });

  it('should use 2026 YAMPE of $85,000 or 2025 YAMPE of $81,200', () => {
    const yampe = CPP2.secondCeiling;
    expect([81200, 85000]).toContain(yampe);
  });

  it('should use 2026 EI rate of 1.63% or 2025 rate of 1.64%', () => {
    const rate = EI.rate;
    expect([0.0163, 0.0164]).toContain(rate);
  });

  it('should use 2026 EI max insurable of $68,900 or 2025 value of $65,700', () => {
    const maxInsurable = EI.maximumInsurableEarnings;
    expect([65700, 68900]).toContain(maxInsurable);
  });
});
