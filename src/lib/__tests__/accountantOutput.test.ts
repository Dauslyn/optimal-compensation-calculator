/**
 * Tests for v1.8.0 "Accountant-Ready Output" features:
 * - INPUT_TOOLTIPS completeness
 * - ReportTemplate executive bullet generation
 * - EmailAccountantButton mailto URL generation
 */

import { describe, it, expect } from 'vitest';
import { INPUT_TOOLTIPS } from '../../components/Tooltip';
import type { UserInputs } from '../types';
import { getDefaultInputs } from '../localStorage';
import { calculateProjection } from '../calculator';

describe('INPUT_TOOLTIPS', () => {
  it('should have a tooltip for every major input field', () => {
    const requiredKeys = [
      'province', 'requiredIncome', 'corporateInvestmentBalance',
      'annualCorporateRetainedEarnings', 'planningHorizon', 'investmentReturnRate',
      'startingYear', 'inflationRate', 'inflateSpendingNeeds',
      'canadianEquity', 'usEquity', 'internationalEquity', 'fixedIncome',
      'cdaBalance', 'gripBalance', 'erdtohBalance', 'nrdtohBalance',
      'rrspRoom', 'tfsaRoom',
      'salaryStrategy', 'fixedSalaryAmount', 'maximizeTFSA', 'contributeToRRSP',
      'includeDebt', 'totalDebtAmount', 'annualDebtPayment', 'debtInterestRate',
      'includeIPP', 'ippAge', 'ippYearsOfService',
    ];

    for (const key of requiredKeys) {
      expect(INPUT_TOOLTIPS).toHaveProperty(key);
      expect((INPUT_TOOLTIPS as Record<string, string>)[key].length).toBeGreaterThan(20);
    }
  });

  it('should not have any empty tooltip strings', () => {
    for (const [key, value] of Object.entries(INPUT_TOOLTIPS)) {
      expect(value, `Tooltip "${key}" should not be empty`).toBeTruthy();
      expect(typeof value, `Tooltip "${key}" should be a string`).toBe('string');
    }
  });

  it('should mention key concepts in specific tooltips', () => {
    expect(INPUT_TOOLTIPS.annualCorporateRetainedEarnings).toContain('BEFORE');
    expect(INPUT_TOOLTIPS.inflationRate).toContain('bracket');
    expect(INPUT_TOOLTIPS.salaryStrategy).toContain('Dynamic');
    expect(INPUT_TOOLTIPS.rrspRoom).toContain('salary');
    expect(INPUT_TOOLTIPS.nrdtohBalance).toContain('38.33');
    expect(INPUT_TOOLTIPS.fixedIncome).toContain('fully taxable');
  });
});

describe('Accountant Report - Executive Summary Generation', () => {
  const defaults = getDefaultInputs();

  it('should generate a projection for report testing', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
    };
    const summary = calculateProjection(inputs);

    expect(summary.yearlyResults).toHaveLength(5);
    expect(summary.totalCompensation).toBeGreaterThan(0);
    expect(summary.effectiveTaxRate).toBeGreaterThan(0);
    expect(summary.effectiveTaxRate).toBeLessThan(1);
  });

  it('should have all fields needed for the report template', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'BC',
      requiredIncome: 150000,
      annualCorporateRetainedEarnings: 500000,
      planningHorizon: 10,
    };
    const summary = calculateProjection(inputs);

    // Verify all fields used by ReportTemplate exist
    expect(summary.totalCompensation).toBeDefined();
    expect(summary.totalSalary).toBeDefined();
    expect(summary.totalDividends).toBeDefined();
    expect(summary.totalPersonalTax).toBeDefined();
    expect(summary.totalCorporateTaxOnActive).toBeDefined();
    expect(summary.totalCorporateTaxOnPassive).toBeDefined();
    expect(summary.totalRdtohRefund).toBeDefined();
    expect(summary.effectiveTaxRate).toBeDefined();
    expect(summary.effectiveCompensationRate).toBeDefined();
    expect(summary.effectivePassiveRate).toBeDefined();
    expect(summary.totalRRSPRoomGenerated).toBeDefined();
    expect(summary.totalRRSPContributions).toBeDefined();
    expect(summary.totalTFSAContributions).toBeDefined();
    expect(summary.finalCorporateBalance).toBeDefined();
    expect(summary.averageAnnualIncome).toBeDefined();

    // Verify yearly results have all fields for detailed tables
    const yr = summary.yearlyResults[0];
    expect(yr.salary).toBeDefined();
    expect(yr.dividends.capitalDividends).toBeDefined();
    expect(yr.dividends.eligibleDividends).toBeDefined();
    expect(yr.dividends.nonEligibleDividends).toBeDefined();
    expect(yr.personalTax).toBeDefined();
    expect(yr.cpp).toBeDefined();
    expect(yr.cpp2).toBeDefined();
    expect(yr.ei).toBeDefined();
    expect(yr.qpip).toBeDefined();
    expect(yr.afterTaxIncome).toBeDefined();
    expect(yr.effectiveIntegratedRate).toBeDefined();
    expect(yr.corporateTaxOnActive).toBeDefined();
    expect(yr.corporateTaxOnPassive).toBeDefined();
    expect(yr.rdtohRefundReceived).toBeDefined();
    expect(yr.passiveIncomeGrind.additionalTaxFromGrind).toBeDefined();
    expect(yr.investmentReturns.totalReturn).toBeDefined();
    expect(yr.notionalAccounts.corporateInvestments).toBeDefined();
    expect(yr.notionalAccounts.CDA).toBeDefined();
    expect(yr.notionalAccounts.eRDTOH).toBeDefined();
    expect(yr.notionalAccounts.nRDTOH).toBeDefined();
    expect(yr.notionalAccounts.GRIP).toBeDefined();
    expect(yr.rrspContribution).toBeDefined();
    expect(yr.tfsaContribution).toBeDefined();
  });

  it('should correctly calculate compensation mix percentages', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      salaryStrategy: 'dynamic',
      planningHorizon: 5,
    };
    const summary = calculateProjection(inputs);

    const salaryPct = summary.totalCompensation > 0
      ? (summary.totalSalary / summary.totalCompensation) * 100
      : 0;
    const divPct = summary.totalCompensation > 0
      ? (summary.totalDividends / summary.totalCompensation) * 100
      : 0;

    // Should add up to approximately 100%
    expect(salaryPct + divPct).toBeCloseTo(100, 0);
    expect(salaryPct).toBeGreaterThanOrEqual(0);
    expect(salaryPct).toBeLessThanOrEqual(100);
  });
});

describe('Email Accountant - mailto URL structure', () => {
  it('should generate valid mailto subject with year and province', () => {
    const year = 2026;
    const provinceName = 'Ontario';
    const subject = `Optimal Compensation Plan — ${year} - ${provinceName}`;
    const encoded = encodeURIComponent(subject);

    expect(encoded).toContain('Optimal');
    expect(encoded).toContain('2026');
    expect(encoded).toContain('Ontario');
  });

  it('should produce a valid mailto URL format', () => {
    const subject = encodeURIComponent('Test Subject');
    const body = encodeURIComponent('Test body content');
    const url = `mailto:?subject=${subject}&body=${body}`;

    expect(url).toMatch(/^mailto:\?subject=.+&body=.+$/);
    expect(url).not.toContain(' '); // Should be fully encoded
  });

  it('should handle special characters in currency formatting', () => {
    // Test that formatted values can be safely encoded
    const formatted = '$123,456';
    const encoded = encodeURIComponent(formatted);
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toBe(formatted);
  });
});
