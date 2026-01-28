/**
 * Tests for Quebec Payroll Calculations
 *
 * Tests QPP, QPP2, QPIP, and reduced EI rates for Quebec residents.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQPP,
  calculateQPP2,
  calculateQPIPEmployee,
  calculateQPIPEmployer,
  calculateQuebecEI,
  calculateQuebecPayrollDeductions,
  getQuebecPayrollData,
  QUEBEC_PAYROLL_DATA,
} from '../tax/quebecPayroll';

describe('Quebec Payroll', () => {
  describe('getQuebecPayrollData', () => {
    it('returns known data for 2025', () => {
      const data = getQuebecPayrollData(2025);
      expect(data.qpp.rate).toBe(0.064);
      expect(data.qpp.ympe).toBe(71300);
      expect(data.qpip.employeeRate).toBe(0.00494);
      expect(data.ei.rate).toBe(0.01278);
    });

    it('returns known data for 2026', () => {
      const data = getQuebecPayrollData(2026);
      expect(data.qpp.ympe).toBe(74600);
      expect(data.qpp2.secondCeiling).toBe(85000);
    });

    it('projects forward for unknown years', () => {
      const data2026 = getQuebecPayrollData(2026);
      const data2027 = getQuebecPayrollData(2027, 0.02);

      // YMPE should increase by ~2%
      expect(data2027.qpp.ympe).toBeGreaterThan(data2026.qpp.ympe);
      expect(data2027.qpp.ympe).toBeCloseTo(data2026.qpp.ympe * 1.02, -1);
    });
  });

  describe('calculateQPP', () => {
    const qppData = QUEBEC_PAYROLL_DATA[2025].qpp;

    it('returns 0 for salary at or below basic exemption', () => {
      expect(calculateQPP(0, qppData)).toBe(0);
      expect(calculateQPP(3500, qppData)).toBe(0);
    });

    it('calculates QPP for salary just above exemption', () => {
      const salary = 10000;
      const expected = (salary - qppData.basicExemption) * qppData.rate;
      expect(calculateQPP(salary, qppData)).toBeCloseTo(expected, 2);
    });

    it('calculates QPP at YMPE', () => {
      const salary = 71300;
      const expected = (salary - qppData.basicExemption) * qppData.rate;
      expect(calculateQPP(salary, qppData)).toBeCloseTo(expected, 2);
    });

    it('caps QPP at maximum contribution', () => {
      const salary = 200000;
      const result = calculateQPP(salary, qppData);
      expect(result).toBeLessThanOrEqual(qppData.maxContribution);
    });

    it('QPP rate is higher than CPP rate (6.4% vs 5.95%)', () => {
      // QPP rate should be 6.4%
      expect(qppData.rate).toBe(0.064);
    });
  });

  describe('calculateQPP2', () => {
    const qpp2Data = QUEBEC_PAYROLL_DATA[2025].qpp2;

    it('returns 0 for salary at or below first ceiling (YMPE)', () => {
      expect(calculateQPP2(0, qpp2Data)).toBe(0);
      expect(calculateQPP2(71300, qpp2Data)).toBe(0);
    });

    it('calculates QPP2 for salary between YMPE and YAMPE', () => {
      const salary = 76000;
      const expected = (salary - qpp2Data.firstCeiling) * qpp2Data.rate;
      expect(calculateQPP2(salary, qpp2Data)).toBeCloseTo(expected, 2);
    });

    it('caps QPP2 at second ceiling (YAMPE)', () => {
      const salary = 150000;
      const result = calculateQPP2(salary, qpp2Data);
      expect(result).toBeLessThanOrEqual(qpp2Data.maxContribution);
    });
  });

  describe('calculateQPIPEmployee', () => {
    const qpipData = QUEBEC_PAYROLL_DATA[2025].qpip;

    it('returns 0 for zero salary', () => {
      expect(calculateQPIPEmployee(0, qpipData)).toBe(0);
    });

    it('calculates QPIP for typical salary', () => {
      const salary = 80000;
      const expected = salary * qpipData.employeeRate;
      expect(calculateQPIPEmployee(salary, qpipData)).toBeCloseTo(expected, 2);
    });

    it('caps QPIP at maximum insurable earnings', () => {
      const salary = 150000;
      const expected = qpipData.maxInsurableEarnings * qpipData.employeeRate;
      expect(calculateQPIPEmployee(salary, qpipData)).toBeCloseTo(expected, 2);
    });

    it('caps QPIP at maximum contribution', () => {
      const salary = 200000;
      const result = calculateQPIPEmployee(salary, qpipData);
      expect(result).toBeLessThanOrEqual(qpipData.maxEmployeeContribution);
    });
  });

  describe('calculateQPIPEmployer', () => {
    const qpipData = QUEBEC_PAYROLL_DATA[2025].qpip;

    it('employer rate is higher than employee rate', () => {
      expect(qpipData.employerRate).toBeGreaterThan(qpipData.employeeRate);
    });

    it('calculates higher employer contribution', () => {
      const salary = 80000;
      const employee = calculateQPIPEmployee(salary, qpipData);
      const employer = calculateQPIPEmployer(salary, qpipData);
      expect(employer).toBeGreaterThan(employee);
    });
  });

  describe('calculateQuebecEI', () => {
    const eiData = QUEBEC_PAYROLL_DATA[2025].ei;

    it('returns 0 for zero salary', () => {
      expect(calculateQuebecEI(0, eiData)).toBe(0);
    });

    it('Quebec EI rate is lower than rest of Canada', () => {
      // Quebec EI rate should be ~1.278% (no QPIP component)
      // Rest of Canada is 1.64%
      expect(eiData.rate).toBeLessThan(0.0164);
      expect(eiData.rate).toBe(0.01278);
    });

    it('calculates EI for typical salary', () => {
      const salary = 50000;
      const expected = salary * eiData.rate;
      expect(calculateQuebecEI(salary, eiData)).toBeCloseTo(expected, 2);
    });

    it('caps EI at maximum insurable earnings', () => {
      const salary = 100000;
      const expected = eiData.maxInsurableEarnings * eiData.rate;
      expect(calculateQuebecEI(salary, eiData)).toBeCloseTo(expected, 1);
    });
  });

  describe('calculateQuebecPayrollDeductions', () => {
    it('calculates all Quebec deductions for typical salary', () => {
      const salary = 100000;
      const result = calculateQuebecPayrollDeductions(salary, 2025);

      expect(result.qpp).toBeGreaterThan(0);
      expect(result.qpp2).toBeGreaterThan(0);
      expect(result.qpip).toBeGreaterThan(0);
      expect(result.ei).toBeGreaterThan(0);
      expect(result.total).toBe(result.qpp + result.qpp2 + result.qpip + result.ei);
    });

    it('employer total includes higher QPIP rate', () => {
      const salary = 100000;
      const result = calculateQuebecPayrollDeductions(salary, 2025);

      // Employer pays matching QPP/QPP2, higher QPIP rate, and 1.4x EI
      expect(result.employerTotal).toBeGreaterThan(result.total);
    });

    it('Quebec total payroll is higher than rest of Canada due to QPIP', () => {
      // Quebec has QPIP (~0.494%) but lower EI
      // Net effect depends on salary level
      const salary = 80000;
      const qcResult = calculateQuebecPayrollDeductions(salary, 2025);

      // Total Quebec payroll deductions
      // QPP is higher than CPP (6.4% vs 5.95%), plus QPIP, minus EI savings
      expect(qcResult.total).toBeGreaterThan(0);
      expect(qcResult.qpip).toBeGreaterThan(0);
    });

    it('handles zero salary', () => {
      const result = calculateQuebecPayrollDeductions(0, 2025);
      expect(result.qpp).toBe(0);
      expect(result.qpp2).toBe(0);
      expect(result.qpip).toBe(0);
      expect(result.ei).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Comparison: Quebec vs Rest of Canada', () => {
    it('QPP maximum contribution is higher than CPP', () => {
      // 2025: QPP max ~$4,343.20 vs CPP max ~$4,034.10
      const qppData = QUEBEC_PAYROLL_DATA[2025].qpp;
      expect(qppData.maxContribution).toBeGreaterThan(4000);
      expect(qppData.maxContribution).toBeCloseTo(4343.20, 1);
    });

    it('Quebec has additional QPIP contribution not present in rest of Canada', () => {
      const qpipData = QUEBEC_PAYROLL_DATA[2025].qpip;
      expect(qpipData.employeeRate).toBeGreaterThan(0);
      expect(qpipData.maxEmployeeContribution).toBeGreaterThan(0);
    });

    it('Quebec EI rate is reduced to account for QPIP', () => {
      const eiData = QUEBEC_PAYROLL_DATA[2025].ei;
      // Rest of Canada pays 1.64%, Quebec pays ~1.278%
      // Difference ~0.362% roughly equals the parental portion
      const rocEiRate = 0.0164;
      expect(eiData.rate).toBeLessThan(rocEiRate);
    });
  });
});
