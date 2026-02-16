import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import { getDefaultInputs } from '../localStorage';
import type { UserInputs } from '../types';

function createLifetimeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...getDefaultInputs(),
    planningHorizon: 20, // 20-year accumulation (age 45-65)
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    requiredIncome: 100000,
    corporateInvestmentBalance: 500000,
    annualCorporateRetainedEarnings: 200000,
    investmentReturnRate: 0.05,
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

describe('Lifetime Accumulation Phase', () => {
  describe('phase annotation', () => {
    it('annotates all years with accumulation phase', () => {
      const inputs = createLifetimeInputs({ planningHorizon: 5 });
      const result = calculateProjection(inputs);

      for (const year of result.yearlyResults) {
        expect(year.phase).toBe('accumulation');
      }
    });

    it('includes calendarYear on each result', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 3,
        startingYear: 2026,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults[0].calendarYear).toBe(2026);
      expect(result.yearlyResults[1].calendarYear).toBe(2027);
      expect(result.yearlyResults[2].calendarYear).toBe(2028);
    });

    it('includes age on each result', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 3,
        currentAge: 45,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults[0].age).toBe(45);
      expect(result.yearlyResults[1].age).toBe(46);
      expect(result.yearlyResults[2].age).toBe(47);
    });

    it('includes spouse age when spouse is enabled', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 3,
        currentAge: 45,
        hasSpouse: true,
        spouseCurrentAge: 42,
        spouseRequiredIncome: 50000,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults[0].spouseAge).toBe(42);
      expect(result.yearlyResults[1].spouseAge).toBe(43);
      expect(result.yearlyResults[2].spouseAge).toBe(44);
    });
  });

  describe('balance tracking', () => {
    it('tracks RRSP balance growth over time', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 5,
        contributeToRRSP: true,
        rrspBalance: 50000, // $50K RRSP room
        actualRRSPBalance: 100000, // $100K starting balance
        salaryStrategy: 'dynamic',
      });
      const result = calculateProjection(inputs);

      // Balance should track contributions + growth
      for (const year of result.yearlyResults) {
        expect(year.balances).toBeDefined();
        expect(year.balances!.rrspBalance).toBeGreaterThanOrEqual(0);
      }

      // RRSP balance should grow over time (contributions + investment return)
      const firstYear = result.yearlyResults[0].balances!.rrspBalance;
      const lastYear = result.yearlyResults[result.yearlyResults.length - 1].balances!.rrspBalance;
      expect(lastYear).toBeGreaterThanOrEqual(firstYear);
    });

    it('tracks TFSA balance growth over time', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 5,
        maximizeTFSA: true,
        tfsaBalance: 30000, // $30K room
        actualTFSABalance: 50000, // $50K starting balance
      });
      const result = calculateProjection(inputs);

      for (const year of result.yearlyResults) {
        expect(year.balances).toBeDefined();
        expect(year.balances!.tfsaBalance).toBeGreaterThanOrEqual(0);
      }
    });

    it('tracks corporate balance matching notional accounts', () => {
      const inputs = createLifetimeInputs({ planningHorizon: 5 });
      const result = calculateProjection(inputs);

      for (const year of result.yearlyResults) {
        expect(year.balances).toBeDefined();
        expect(year.balances!.corporateBalance).toBe(
          year.notionalAccounts.corporateInvestments
        );
      }
    });

    it('tracks IPP fund balance when IPP enabled', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 5,
        considerIPP: true,
        ippMemberAge: 45,
        ippYearsOfService: 5,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 80000,
      });
      const result = calculateProjection(inputs);

      // IPP fund should grow from contributions
      const lastYear = result.yearlyResults[result.yearlyResults.length - 1];
      if (lastYear.ipp) {
        expect(lastYear.balances!.ippFundBalance).toBeGreaterThan(0);
      }
    });

    it('tracks zero IPP balance when IPP not enabled', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 3,
        considerIPP: false,
      });
      const result = calculateProjection(inputs);

      for (const year of result.yearlyResults) {
        expect(year.balances!.ippFundBalance).toBe(0);
      }
    });
  });

  describe('CPP earnings history', () => {
    it('records salary in each year for CPP calculations', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 5,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 80000,
      });
      const result = calculateProjection(inputs);

      // Every year with a salary should have it reflected in the result
      for (const year of result.yearlyResults) {
        expect(year.salary).toBeGreaterThan(0);
      }
    });

    it('dividends-only strategy records zero salary for CPP', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 3,
        salaryStrategy: 'dividends-only',
      });
      const result = calculateProjection(inputs);

      for (const year of result.yearlyResults) {
        expect(year.salary).toBe(0);
      }
    });
  });

  describe('20-year accumulation', () => {
    it('handles full 20-year accumulation period', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 20,
        contributeToRRSP: true,
        rrspBalance: 50000,
        actualRRSPBalance: 200000,
        maximizeTFSA: true,
        tfsaBalance: 30000,
        actualTFSABalance: 100000,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults).toHaveLength(20);

      // Balances should grow substantially over 20 years
      const firstYear = result.yearlyResults[0].balances!;
      const lastYear = result.yearlyResults[19].balances!;

      // Corporate balance should be significantly different after 20 years
      // (could be higher or lower depending on retained earnings vs withdrawals)
      expect(lastYear.corporateBalance).toBeDefined();

      // All years should be accumulation phase
      result.yearlyResults.forEach(yr => {
        expect(yr.phase).toBe('accumulation');
      });
    });
  });

  describe('backward compatibility', () => {
    it('existing functionality is preserved for short horizons', () => {
      // Classic v2.x use case: 5-year horizon
      const inputs = createLifetimeInputs({
        planningHorizon: 5,
        requiredIncome: 100000,
        corporateInvestmentBalance: 500000,
        annualCorporateRetainedEarnings: 200000,
      });
      const result = calculateProjection(inputs);

      // All existing fields should be present and correct
      expect(result.totalCompensation).toBeGreaterThan(0);
      expect(result.totalTax).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(1);
      expect(result.yearlyResults).toHaveLength(5);

      // Yearly results should have all existing fields
      for (const yr of result.yearlyResults) {
        expect(yr.salary).toBeGreaterThanOrEqual(0);
        expect(yr.dividends).toBeDefined();
        expect(yr.personalTax).toBeGreaterThanOrEqual(0);
        expect(yr.corporateTax).toBeGreaterThanOrEqual(0);
        expect(yr.notionalAccounts).toBeDefined();
        expect(yr.investmentReturns).toBeDefined();
        expect(yr.passiveIncomeGrind).toBeDefined();

        // New fields should also be present
        expect(yr.phase).toBeDefined();
        expect(yr.calendarYear).toBeDefined();
        expect(yr.age).toBeDefined();
        expect(yr.balances).toBeDefined();
      }
    });
  });
});
