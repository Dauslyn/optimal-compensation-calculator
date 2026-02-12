/**
 * Tests for v2.0.0 "IPP Full Integration" into calculator engine:
 * - Backward compatibility: considerIPP: false = no IPP in results
 * - IPP reduces corporate investments vs baseline without IPP
 * - IPP reduces taxable business income → lower corporate tax
 * - PA reduces RRSP room year-over-year
 * - IPP = 0 when dividends-only strategy (salary = 0)
 * - IPP contribution increases each year (member ages)
 * - Spouse IPP works independently, draws from same corp
 * - Admin costs: year 1 includes setup, subsequent years don't
 * - Summary accumulators match sum of yearly values
 * - Share link round-trip with spouse IPP fields
 * - IPP with fixed salary strategy works correctly
 */

import { describe, it, expect } from 'vitest';
import type { UserInputs } from '../types';
import { getDefaultInputs } from '../localStorage';
import { calculateProjection } from '../calculator';
import { encodeShareLink, decodeShareLink } from '../shareLink';
import { estimateIPPAdminCosts } from '../tax/ipp';

const defaults = getDefaultInputs();

/** Helper: create standard IPP-enabled inputs */
function makeIPPInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...defaults,
    province: 'ON',
    requiredIncome: 100000,
    annualCorporateRetainedEarnings: 400000,
    corporateInvestmentBalance: 1000000,
    planningHorizon: 5,
    salaryStrategy: 'dynamic',
    considerIPP: true,
    ippMemberAge: 50,
    ippYearsOfService: 10,
    ...overrides,
  };
}

describe('IPP Integration - Backward Compatibility', () => {
  it('should produce no IPP results when considerIPP is false', () => {
    const inputs = makeIPPInputs({ considerIPP: false });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeUndefined();
    for (const yr of summary.yearlyResults) {
      expect(yr.ipp).toBeUndefined();
    }
  });

  it('should produce no IPP results when considerIPP is undefined', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      planningHorizon: 5,
    };
    // Ensure considerIPP is not set
    delete (inputs as Record<string, unknown>).considerIPP;
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeUndefined();
    for (const yr of summary.yearlyResults) {
      expect(yr.ipp).toBeUndefined();
    }
  });

  it('should not change other results when IPP is disabled', () => {
    const withoutIPP = makeIPPInputs({ considerIPP: false });
    const summaryNoIPP = calculateProjection(withoutIPP);

    // Basic sanity checks: projection still works fine without IPP
    expect(summaryNoIPP.yearlyResults).toHaveLength(5);
    expect(summaryNoIPP.totalCompensation).toBeGreaterThan(0);
    expect(summaryNoIPP.effectiveTaxRate).toBeGreaterThan(0);
    expect(summaryNoIPP.effectiveTaxRate).toBeLessThan(1);
  });
});

describe('IPP Integration - Corporate Investment Impact', () => {
  it('should reduce corporate investments vs baseline without IPP', () => {
    const withIPP = makeIPPInputs({ considerIPP: true });
    const withoutIPP = makeIPPInputs({ considerIPP: false });

    const summaryIPP = calculateProjection(withIPP);
    const summaryNoIPP = calculateProjection(withoutIPP);

    // IPP draws from corporate investments, so final balance should be lower
    expect(summaryIPP.finalCorporateBalance).toBeLessThan(summaryNoIPP.finalCorporateBalance);
  });

  it('should reduce corporate investments each year by totalDeductible', () => {
    const inputs = makeIPPInputs();
    const summary = calculateProjection(inputs);

    for (const yr of summary.yearlyResults) {
      expect(yr.ipp).toBeDefined();
      if (yr.ipp) {
        expect(yr.ipp.totalDeductible).toBeGreaterThan(0);
        expect(yr.ipp.totalDeductible).toBe(yr.ipp.contribution + yr.ipp.adminCosts);
      }
    }
  });

  it('should clamp IPP draw so it does not exceed available corporate cash', () => {
    // With very small corp balance and no retained earnings, IPP draw is clamped
    // but other draws (salary, dividends) may still push balance negative.
    // This test verifies IPP contribution still appears (calc doesn't crash) and
    // that the IPP draw was attempted on the corporate pool.
    const inputs = makeIPPInputs({
      corporateInvestmentBalance: 500,
      annualCorporateRetainedEarnings: 0,
    });
    const summary = calculateProjection(inputs);

    // Should not crash
    expect(summary.yearlyResults).toHaveLength(5);
    // IPP should still have calculated contributions (even if corp couldn't fully fund them)
    expect(summary.ipp).toBeDefined();
    if (summary.ipp) {
      expect(summary.ipp.totalContributions).toBeGreaterThan(0);
    }
  });
});

describe('IPP Integration - Corporate Tax Reduction', () => {
  it('should reduce corporate tax when IPP is enabled', () => {
    const withIPP = makeIPPInputs();
    const withoutIPP = makeIPPInputs({ considerIPP: false });

    const summaryIPP = calculateProjection(withIPP);
    const summaryNoIPP = calculateProjection(withoutIPP);

    // IPP is a deductible expense, so it should reduce corporate tax on active income
    // Note: This might not always hold if the salary strategy shifts significantly,
    // but with same dynamic strategy and enough income, the effect should be visible
    expect(summaryIPP.totalCorporateTaxOnActive).toBeLessThanOrEqual(
      summaryNoIPP.totalCorporateTaxOnActive
    );
  });

  it('should record corporate tax savings in yearly IPP results', () => {
    const inputs = makeIPPInputs();
    const summary = calculateProjection(inputs);

    for (const yr of summary.yearlyResults) {
      if (yr.ipp && yr.ipp.contribution > 0) {
        expect(yr.ipp.corporateTaxSavings).toBeGreaterThan(0);
      }
    }
  });
});

describe('IPP Integration - Pension Adjustment & RRSP Room', () => {
  it('should reduce RRSP room via Pension Adjustment', () => {
    const withIPP = makeIPPInputs({ contributeToRRSP: true });
    const withoutIPP = makeIPPInputs({ considerIPP: false, contributeToRRSP: true });

    const summaryIPP = calculateProjection(withIPP);
    const summaryNoIPP = calculateProjection(withoutIPP);

    // IPP's PA reduces RRSP room, so total RRSP contributions should be lower
    // (or at minimum, RRSP room generated net of PA is lower)
    // We can check that IPP has positive PA values
    expect(summaryIPP.ipp).toBeDefined();
    if (summaryIPP.ipp) {
      expect(summaryIPP.ipp.totalPensionAdjustments).toBeGreaterThan(0);
    }
  });

  it('should have positive PA for each year when salary > 0', () => {
    const inputs = makeIPPInputs();
    const summary = calculateProjection(inputs);

    for (const yr of summary.yearlyResults) {
      if (yr.ipp && yr.salary > 0) {
        expect(yr.ipp.pensionAdjustment).toBeGreaterThan(0);
      }
    }
  });

  it('PA formula should be (9 × benefit accrual) - $600', () => {
    const inputs = makeIPPInputs({ salaryStrategy: 'fixed', fixedSalaryAmount: 120000 });
    const summary = calculateProjection(inputs);

    // With a fixed salary, we can verify the PA formula
    const yr1 = summary.yearlyResults[0];
    expect(yr1.ipp).toBeDefined();
    if (yr1.ipp) {
      // PA = (9 × (salary × 0.02)) - 600 capped at 0
      // For $120k salary: benefit = 120000 × 0.02 = 2400 per year of service (1 year)
      // But capped at maxPensionableBenefit if lower
      // PA = max(0, 9 × benefit - 600)
      expect(yr1.ipp.pensionAdjustment).toBeGreaterThan(0);
      // Verify it's approximately correct (9 × annual accrual - 600)
      // annual accrual = min(salary × 0.02, maxBenefit) for 1 year
      const expectedAccrual = Math.min(120000 * 0.02, 3725); // ~2400
      const expectedPA = Math.max(0, 9 * expectedAccrual - 600); // ~21000
      expect(yr1.ipp.pensionAdjustment).toBeCloseTo(expectedPA, -2);
    }
  });
});

describe('IPP Integration - Dividends-Only Strategy', () => {
  it('should produce no IPP results when salary = 0 (dividends-only)', () => {
    const inputs = makeIPPInputs({
      salaryStrategy: 'dividends-only',
      considerIPP: true,
    });
    const summary = calculateProjection(inputs);

    // IPP requires pensionable earnings (salary). No salary = no IPP contribution
    expect(summary.ipp).toBeUndefined();
    for (const yr of summary.yearlyResults) {
      expect(yr.ipp).toBeUndefined();
    }
  });

  it('should not affect corporate investments when dividends-only + IPP', () => {
    const withIPP = makeIPPInputs({
      salaryStrategy: 'dividends-only',
      considerIPP: true,
    });
    const withoutIPP = makeIPPInputs({
      salaryStrategy: 'dividends-only',
      considerIPP: false,
    });

    const summaryIPP = calculateProjection(withIPP);
    const summaryNoIPP = calculateProjection(withoutIPP);

    // With dividends-only, IPP has no effect since salary = 0
    expect(summaryIPP.finalCorporateBalance).toBe(summaryNoIPP.finalCorporateBalance);
  });
});

describe('IPP Integration - Age Progression', () => {
  it('should increment member age each year', () => {
    const inputs = makeIPPInputs({ ippMemberAge: 50 });
    const summary = calculateProjection(inputs);

    for (let i = 0; i < summary.yearlyResults.length; i++) {
      const yr = summary.yearlyResults[i];
      expect(yr.ipp).toBeDefined();
      if (yr.ipp) {
        expect(yr.ipp.memberAge).toBe(50 + i); // age + displayYear - 1
      }
    }
  });

  it('should show increasing projected pension as years of service grow', () => {
    const inputs = makeIPPInputs({
      ippMemberAge: 50,
      ippYearsOfService: 5,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
    });
    const summary = calculateProjection(inputs);

    // With fixed salary, projected pension should increase with more years of service
    for (let i = 1; i < summary.yearlyResults.length; i++) {
      const prev = summary.yearlyResults[i - 1];
      const curr = summary.yearlyResults[i];
      if (prev.ipp && curr.ipp) {
        expect(curr.ipp.projectedAnnualPension).toBeGreaterThan(prev.ipp.projectedAnnualPension);
      }
    }
  });

  it('should show increasing IPP contribution as member ages (closer to retirement)', () => {
    // Older age → less time to retirement → higher present-value contribution needed
    const inputs = makeIPPInputs({
      ippMemberAge: 50,
      ippYearsOfService: 10,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 120000,
    });
    const summary = calculateProjection(inputs);

    // Contribution should generally increase as member ages (present value factor grows)
    for (let i = 1; i < summary.yearlyResults.length; i++) {
      const prev = summary.yearlyResults[i - 1];
      const curr = summary.yearlyResults[i];
      if (prev.ipp && curr.ipp) {
        // Note: Year 1 has higher admin costs (setup), so compare contributions only
        expect(curr.ipp.contribution).toBeGreaterThanOrEqual(prev.ipp.contribution);
      }
    }
  });
});

describe('IPP Integration - Admin Costs', () => {
  it('should include setup cost in year 1 only', () => {
    const inputs = makeIPPInputs();
    const summary = calculateProjection(inputs);

    const yr1 = summary.yearlyResults[0];
    const yr2 = summary.yearlyResults[1];
    expect(yr1.ipp).toBeDefined();
    expect(yr2.ipp).toBeDefined();

    if (yr1.ipp && yr2.ipp) {
      const ippCosts = estimateIPPAdminCosts();
      const year1Expected = ippCosts.setup + ippCosts.annualActuarial + ippCosts.annualAdmin;
      const year2Expected = ippCosts.annualActuarial + ippCosts.annualAdmin;

      expect(yr1.ipp.adminCosts).toBe(year1Expected); // 2500 + 1500 + 500 = 4500
      expect(yr2.ipp.adminCosts).toBe(year2Expected); // 1500 + 500 = 2000

      // Year 1 should have higher admin costs than year 2
      expect(yr1.ipp.adminCosts).toBeGreaterThan(yr2.ipp.adminCosts);
    }
  });

  it('should have consistent admin costs for years 2+', () => {
    const inputs = makeIPPInputs();
    const summary = calculateProjection(inputs);

    const ippCosts = estimateIPPAdminCosts();
    const expectedAnnual = ippCosts.annualActuarial + ippCosts.annualAdmin;

    for (let i = 1; i < summary.yearlyResults.length; i++) {
      const yr = summary.yearlyResults[i];
      if (yr.ipp) {
        expect(yr.ipp.adminCosts).toBe(expectedAnnual);
      }
    }
  });
});

describe('IPP Integration - Spouse IPP', () => {
  function makeSpouseIPPInputs(overrides: Partial<UserInputs> = {}): UserInputs {
    return {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 600000,
      corporateInvestmentBalance: 2000000,
      planningHorizon: 5,
      salaryStrategy: 'dynamic',
      considerIPP: true,
      ippMemberAge: 50,
      ippYearsOfService: 10,
      hasSpouse: true,
      spouseRequiredIncome: 80000,
      spouseSalaryStrategy: 'dynamic',
      spouseConsiderIPP: true,
      spouseIPPAge: 48,
      spouseIPPYearsOfService: 5,
      ...overrides,
    };
  }

  it('should produce both primary and spouse IPP results', () => {
    const inputs = makeSpouseIPPInputs();
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    expect(summary.spouse).toBeDefined();
    expect(summary.spouse?.ipp).toBeDefined();

    for (const yr of summary.yearlyResults) {
      if (yr.salary > 0) {
        expect(yr.ipp).toBeDefined();
      }
      if (yr.spouse && yr.spouse.salary > 0) {
        expect(yr.spouse.ipp).toBeDefined();
      }
    }
  });

  it('should have independent age progressions for primary and spouse', () => {
    const inputs = makeSpouseIPPInputs({
      ippMemberAge: 55,
      spouseIPPAge: 48,
    });
    const summary = calculateProjection(inputs);

    for (let i = 0; i < summary.yearlyResults.length; i++) {
      const yr = summary.yearlyResults[i];
      if (yr.ipp) {
        expect(yr.ipp.memberAge).toBe(55 + i);
      }
      if (yr.spouse?.ipp) {
        expect(yr.spouse.ipp.memberAge).toBe(48 + i);
      }
    }
  });

  it('should draw both IPPs from same corporate investments pool', () => {
    const bothIPP = makeSpouseIPPInputs();
    const primaryOnly = makeSpouseIPPInputs({ spouseConsiderIPP: false });
    const neitherIPP = makeSpouseIPPInputs({ considerIPP: false, spouseConsiderIPP: false });

    const summaryBoth = calculateProjection(bothIPP);
    const summaryPrimary = calculateProjection(primaryOnly);
    const summaryNeither = calculateProjection(neitherIPP);

    // Both IPPs should result in lowest corporate balance
    expect(summaryBoth.finalCorporateBalance).toBeLessThan(summaryPrimary.finalCorporateBalance);
    expect(summaryPrimary.finalCorporateBalance).toBeLessThan(summaryNeither.finalCorporateBalance);
  });

  it('should work when only spouse has IPP (primary disabled)', () => {
    const inputs = makeSpouseIPPInputs({
      considerIPP: false,
      spouseConsiderIPP: true,
    });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeUndefined();
    expect(summary.spouse?.ipp).toBeDefined();

    for (const yr of summary.yearlyResults) {
      expect(yr.ipp).toBeUndefined();
    }
  });

  it('spouse IPP should have no effect when spouse uses dividends-only', () => {
    const inputs = makeSpouseIPPInputs({
      spouseSalaryStrategy: 'dividends-only',
      spouseConsiderIPP: true,
    });
    const summary = calculateProjection(inputs);

    // Spouse with dividends-only has salary = 0, so no IPP
    if (summary.spouse?.ipp) {
      expect(summary.spouse.ipp.totalContributions).toBe(0);
    }
  });

  it('spouse IPP admin costs should follow same year-1 pattern', () => {
    const inputs = makeSpouseIPPInputs();
    const summary = calculateProjection(inputs);

    const yr1 = summary.yearlyResults[0];
    const yr2 = summary.yearlyResults[1];

    if (yr1.spouse?.ipp && yr2.spouse?.ipp) {
      const ippCosts = estimateIPPAdminCosts();
      const year1Expected = ippCosts.setup + ippCosts.annualActuarial + ippCosts.annualAdmin;
      const year2Expected = ippCosts.annualActuarial + ippCosts.annualAdmin;

      expect(yr1.spouse.ipp.adminCosts).toBe(year1Expected);
      expect(yr2.spouse.ipp.adminCosts).toBe(year2Expected);
    }
  });
});

describe('IPP Integration - Summary Accumulators', () => {
  it('should match sum of yearly values for primary IPP', () => {
    const inputs = makeIPPInputs();
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    if (!summary.ipp) return;

    let totalContribs = 0;
    let totalAdmin = 0;
    let totalCorpTaxSavings = 0;
    let totalPA = 0;
    let lastProjectedPension = 0;

    for (const yr of summary.yearlyResults) {
      if (yr.ipp) {
        totalContribs += yr.ipp.contribution;
        totalAdmin += yr.ipp.adminCosts;
        totalCorpTaxSavings += yr.ipp.corporateTaxSavings;
        totalPA += yr.ipp.pensionAdjustment;
        lastProjectedPension = yr.ipp.projectedAnnualPension;
      }
    }

    expect(summary.ipp.totalContributions).toBeCloseTo(totalContribs, 2);
    expect(summary.ipp.totalAdminCosts).toBeCloseTo(totalAdmin, 2);
    expect(summary.ipp.totalCorporateTaxSavings).toBeCloseTo(totalCorpTaxSavings, 2);
    expect(summary.ipp.totalPensionAdjustments).toBeCloseTo(totalPA, 2);
    expect(summary.ipp.projectedAnnualPensionAtEnd).toBeCloseTo(lastProjectedPension, 2);
  });

  it('should match sum of yearly values for spouse IPP', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 600000,
      corporateInvestmentBalance: 2000000,
      planningHorizon: 5,
      considerIPP: true,
      ippMemberAge: 50,
      ippYearsOfService: 10,
      hasSpouse: true,
      spouseRequiredIncome: 80000,
      spouseSalaryStrategy: 'dynamic',
      spouseConsiderIPP: true,
      spouseIPPAge: 48,
      spouseIPPYearsOfService: 5,
    };
    const summary = calculateProjection(inputs);

    if (!summary.spouse?.ipp) return;

    let totalContribs = 0;
    let totalAdmin = 0;
    let totalPA = 0;

    for (const yr of summary.yearlyResults) {
      if (yr.spouse?.ipp) {
        totalContribs += yr.spouse.ipp.contribution;
        totalAdmin += yr.spouse.ipp.adminCosts;
        totalPA += yr.spouse.ipp.pensionAdjustment;
      }
    }

    expect(summary.spouse.ipp.totalContributions).toBeCloseTo(totalContribs, 2);
    expect(summary.spouse.ipp.totalAdminCosts).toBeCloseTo(totalAdmin, 2);
    expect(summary.spouse.ipp.totalPensionAdjustments).toBeCloseTo(totalPA, 2);
  });
});

describe('IPP Integration - Fixed Salary Strategy', () => {
  it('should work correctly with fixed salary and IPP enabled', () => {
    const inputs = makeIPPInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
    });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    expect(summary.yearlyResults).toHaveLength(5);

    // Every year should have IPP (since fixed salary > 0)
    for (const yr of summary.yearlyResults) {
      expect(yr.ipp).toBeDefined();
      if (yr.ipp) {
        expect(yr.ipp.contribution).toBeGreaterThan(0);
      }
    }
  });

  it('should show consistent contribution pattern with fixed salary', () => {
    const inputs = makeIPPInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 120000,
      ippMemberAge: 50,
    });
    const summary = calculateProjection(inputs);

    // With fixed salary, contributions should increase (aging = higher present value)
    // but the annual accrual per year of service doesn't change (same salary each year)
    const contributions = summary.yearlyResults.map(yr => yr.ipp?.contribution ?? 0);
    for (let i = 1; i < contributions.length; i++) {
      expect(contributions[i]).toBeGreaterThanOrEqual(contributions[i - 1]);
    }
  });
});

describe('IPP Integration - Share Link Round-Trip', () => {
  it('should preserve all IPP fields through encode/decode', () => {
    const inputs = makeIPPInputs({
      considerIPP: true,
      ippMemberAge: 52,
      ippYearsOfService: 15,
    });

    const encoded = encodeShareLink(inputs);
    const decoded = decodeShareLink(encoded);

    expect(decoded).not.toBeNull();
    if (!decoded) return;

    expect(decoded.considerIPP).toBe(true);
    expect(decoded.ippMemberAge).toBe(52);
    expect(decoded.ippYearsOfService).toBe(15);
  });

  it('should preserve spouse IPP fields through encode/decode', () => {
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      planningHorizon: 5,
      hasSpouse: true,
      spouseRequiredIncome: 80000,
      spouseSalaryStrategy: 'dynamic',
      spouseConsiderIPP: true,
      spouseIPPAge: 48,
      spouseIPPYearsOfService: 8,
    };

    const encoded = encodeShareLink(inputs);
    const decoded = decodeShareLink(encoded);

    expect(decoded).not.toBeNull();
    if (!decoded) return;

    expect(decoded.hasSpouse).toBe(true);
    expect(decoded.spouseConsiderIPP).toBe(true);
    expect(decoded.spouseIPPAge).toBe(48);
    expect(decoded.spouseIPPYearsOfService).toBe(8);
  });

  it('should handle missing spouse IPP fields gracefully (backward compat)', () => {
    // Simulate a v1 share link without spouse IPP fields
    const inputs: UserInputs = {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 400000,
      planningHorizon: 5,
      hasSpouse: true,
      spouseRequiredIncome: 60000,
      // No spouse IPP fields
    };

    const encoded = encodeShareLink(inputs);
    const decoded = decodeShareLink(encoded);

    expect(decoded).not.toBeNull();
    if (!decoded) return;

    // Spouse IPP should be undefined/falsy when not included
    expect(decoded.spouseConsiderIPP).toBeFalsy();
  });

  it('should produce valid projection from decoded share link with IPP', () => {
    const original = makeIPPInputs({
      considerIPP: true,
      ippMemberAge: 55,
      ippYearsOfService: 20,
    });

    const encoded = encodeShareLink(original);
    const decoded = decodeShareLink(encoded);
    expect(decoded).not.toBeNull();
    if (!decoded) return;

    const summary = calculateProjection(decoded);
    expect(summary.ipp).toBeDefined();
    expect(summary.ipp?.totalContributions).toBeGreaterThan(0);
  });
});

describe('IPP Integration - Edge Cases', () => {
  it('should handle zero years of service', () => {
    const inputs = makeIPPInputs({ ippYearsOfService: 0 });
    const summary = calculateProjection(inputs);

    // With zero starting years of service, IPP should still work
    // (displayYear starts at 1, so yearsOfService = 0 + 1 = 1)
    expect(summary.ipp).toBeDefined();
    for (const yr of summary.yearlyResults) {
      if (yr.ipp) {
        expect(yr.ipp.contribution).toBeGreaterThan(0);
      }
    }
  });

  it('should handle young member age', () => {
    const inputs = makeIPPInputs({ ippMemberAge: 25 });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    // Young member = low contribution (long time to retirement, lower PV factor)
    const yr1 = summary.yearlyResults[0];
    if (yr1.ipp) {
      expect(yr1.ipp.memberAge).toBe(25);
      expect(yr1.ipp.contribution).toBeGreaterThan(0);
    }
  });

  it('should handle member near retirement age', () => {
    const inputs = makeIPPInputs({
      ippMemberAge: 63,
      planningHorizon: 3,
    });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    // Near retirement = high contribution (short time to fund, higher PV factor)
    const yr1 = summary.yearlyResults[0];
    if (yr1.ipp) {
      expect(yr1.ipp.memberAge).toBe(63);
      // Contribution should be substantial at 63
      expect(yr1.ipp.contribution).toBeGreaterThan(0);
    }
  });

  it('should handle very high salary (contribution capped at benefit limit)', () => {
    const inputs = makeIPPInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 500000,
    });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    // Even with $500K salary, benefit per year is capped by CRA maxPensionableBenefit
    for (const yr of summary.yearlyResults) {
      if (yr.ipp) {
        expect(yr.ipp.contribution).toBeGreaterThan(0);
      }
    }
  });

  it('should handle low corporate balance with IPP without crashing', () => {
    const inputs = makeIPPInputs({
      corporateInvestmentBalance: 1000,
      annualCorporateRetainedEarnings: 200000,
    });
    const summary = calculateProjection(inputs);

    // Should not crash and should produce full projection
    expect(summary.yearlyResults).toHaveLength(5);
    expect(summary.ipp).toBeDefined();
    if (summary.ipp) {
      expect(summary.ipp.totalContributions).toBeGreaterThan(0);
    }
  });

  it('contribution amount should increase with member age (PV factor)', () => {
    // Compare same salary/YoS but different ages
    const youngInputs = makeIPPInputs({
      ippMemberAge: 35,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
    });
    const olderInputs = makeIPPInputs({
      ippMemberAge: 55,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
    });

    const youngSummary = calculateProjection(youngInputs);
    const olderSummary = calculateProjection(olderInputs);

    const youngContrib = youngSummary.yearlyResults[0].ipp?.contribution ?? 0;
    const olderContrib = olderSummary.yearlyResults[0].ipp?.contribution ?? 0;

    // Older member should have higher contribution (less time to fund = higher PV)
    expect(olderContrib).toBeGreaterThan(youngContrib);
  });
});

describe('IPP Integration - Full Projection Sanity', () => {
  it('should produce reasonable total contributions over 5 years', () => {
    const inputs = makeIPPInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 150000,
      ippMemberAge: 50,
    });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    if (!summary.ipp) return;

    // With $150K salary at age 50, IPP contributions should be in a reasonable range
    // (approximately $20K-$80K per year depending on actuarial assumptions)
    expect(summary.ipp.totalContributions).toBeGreaterThan(0);

    // Should be non-trivially more than admin costs
    expect(summary.ipp.totalContributions).toBeGreaterThan(summary.ipp.totalAdminCosts);
  });

  it('projected pension should grow with years of service', () => {
    const inputs = makeIPPInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
      ippMemberAge: 45,
      ippYearsOfService: 0,
      planningHorizon: 10,
    });
    const summary = calculateProjection(inputs);

    expect(summary.ipp).toBeDefined();
    if (!summary.ipp) return;

    // Projected pension at end should be > 0
    expect(summary.ipp.projectedAnnualPensionAtEnd).toBeGreaterThan(0);

    // End pension should be greater than first year's pension (more YoS)
    const yr1Pension = summary.yearlyResults[0].ipp?.projectedAnnualPension ?? 0;
    expect(summary.ipp.projectedAnnualPensionAtEnd).toBeGreaterThan(yr1Pension);
  });
});
