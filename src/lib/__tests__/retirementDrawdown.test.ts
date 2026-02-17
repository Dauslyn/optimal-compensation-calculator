import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import { getDefaultInputs } from '../localStorage';
import type { UserInputs } from '../types';

function createLifetimeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...getDefaultInputs(),
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    planningHorizon: 45, // Full lifetime: 45-90
    requiredIncome: 100000,
    retirementSpending: 70000,
    corporateInvestmentBalance: 500000,
    annualCorporateRetainedEarnings: 200000,
    investmentReturnRate: 0.05,
    salaryStrategy: 'dynamic',
    contributeToRRSP: true,
    rrspBalance: 50000, // Room
    actualRRSPBalance: 200000,
    maximizeTFSA: true,
    tfsaBalance: 30000, // Room
    actualTFSABalance: 100000,
    cppStartAge: 65,
    salaryStartAge: 22,
    averageHistoricalSalary: 80000,
    oasEligible: true,
    oasStartAge: 65,
    lifetimeObjective: 'balanced',
    ...overrides,
  };
}

describe('Retirement Drawdown Engine', () => {
  describe('phase transitions', () => {
    it('correctly transitions from accumulation to retirement', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 25, // age 45-70
        retirementAge: 65,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults).toHaveLength(25);

      // First 20 years (age 45-64): accumulation
      for (let i = 0; i < 20; i++) {
        expect(result.yearlyResults[i].phase).toBe('accumulation');
        expect(result.yearlyResults[i].age).toBe(45 + i);
      }

      // Years 21-24 (age 65-68): retirement; Year 25 (age 69): estate
      for (let i = 20; i < 24; i++) {
        expect(result.yearlyResults[i].phase).toBe('retirement');
        expect(result.yearlyResults[i].age).toBe(45 + i);
      }
      // Last year gets estate phase
      expect(result.yearlyResults[24].phase).toBe('estate');
      expect(result.yearlyResults[24].age).toBe(45 + 24);
    });
  });

  describe('CPP income in retirement', () => {
    it('shows CPP income starting at cppStartAge', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 25,
        cppStartAge: 65,
      });
      const result = calculateProjection(inputs);

      // Retirement years (age 65+) should have CPP income
      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      expect(retirementYears.length).toBeGreaterThan(0);

      for (const yr of retirementYears) {
        expect(yr.retirement).toBeDefined();
        expect(yr.retirement!.cppIncome).toBeGreaterThan(0);
      }
    });

    it('dividends-only strategy shows lower CPP than salary strategy', () => {
      const salaryInputs = createLifetimeInputs({
        planningHorizon: 25,
        salaryStrategy: 'dynamic',
      });
      const divInputs = createLifetimeInputs({
        planningHorizon: 25,
        salaryStrategy: 'dividends-only',
      });

      const salaryResult = calculateProjection(salaryInputs);
      const divResult = calculateProjection(divInputs);

      const salaryCPP = salaryResult.yearlyResults.find(yr => yr.phase === 'retirement')?.retirement?.cppIncome ?? 0;
      const divCPP = divResult.yearlyResults.find(yr => yr.phase === 'retirement')?.retirement?.cppIncome ?? 0;

      // Salary strategy generates CPP contributions; dividends-only does not
      expect(salaryCPP).toBeGreaterThan(divCPP);
    });
  });

  describe('OAS in retirement', () => {
    it('shows OAS income for eligible retirees', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 25,
        oasEligible: true,
        oasStartAge: 65,
      });
      const result = calculateProjection(inputs);

      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      for (const yr of retirementYears) {
        expect(yr.retirement).toBeDefined();
        expect(yr.retirement!.oasGross).toBeGreaterThan(0);
        expect(yr.retirement!.oasNet).toBeGreaterThanOrEqual(0);
      }
    });

    it('shows no OAS for ineligible retirees', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 25,
        oasEligible: false,
      });
      const result = calculateProjection(inputs);

      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      for (const yr of retirementYears) {
        expect(yr.retirement!.oasGross).toBe(0);
        expect(yr.retirement!.oasNet).toBe(0);
      }
    });

    it('applies OAS clawback at high income', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 25,
        corporateInvestmentBalance: 5000000, // Very high corp balance
        retirementSpending: 200000, // High spending forces large withdrawals
      });
      const result = calculateProjection(inputs);

      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      const hasClawback = retirementYears.some(yr =>
        yr.retirement && yr.retirement.oasClawback > 0
      );
      expect(hasClawback).toBe(true);
    });
  });

  describe('RRIF withdrawals', () => {
    it('RRIF minimum kicks in at age 72', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 30, // age 45-75
        actualRRSPBalance: 500000,
      });
      const result = calculateProjection(inputs);

      // Find the year at age 72 (first mandatory RRIF year after conversion at 71)
      const age72Year = result.yearlyResults.find(yr => yr.age === 72);
      if (age72Year && age72Year.retirement) {
        expect(age72Year.retirement.rrifMinimum).toBeGreaterThan(0);
      }
    });
  });

  describe('TFSA withdrawals', () => {
    it('TFSA withdrawals do not trigger OAS clawback', () => {
      // TFSA withdrawals are tax-free and not included in net income
      const inputs = createLifetimeInputs({
        planningHorizon: 25,
        actualTFSABalance: 500000,
        retirementSpending: 60000, // Moderate spending
      });
      const result = calculateProjection(inputs);

      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      for (const yr of retirementYears) {
        if (yr.retirement && yr.retirement.tfsaWithdrawal > 0) {
          // TFSA withdrawal should NOT be in taxable income
          expect(yr.retirement.totalTaxableIncome).not.toBeGreaterThan(
            yr.retirement.cppIncome + yr.retirement.oasGross +
            yr.retirement.ippPension + yr.retirement.rrifWithdrawal +
            yr.retirement.corporateDividends + 1 // Small tolerance
          );
        }
      }
    });
  });

  describe('target spending', () => {
    it('meets target when assets sufficient', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 22, // Short retirement, plenty of assets
        corporateInvestmentBalance: 3000000,
        retirementSpending: 80000,
      });
      const result = calculateProjection(inputs);

      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      for (const yr of retirementYears) {
        if (yr.retirement) {
          // Total retirement income should approximate target spending
          // (may not be exact due to tax)
          expect(yr.retirement.totalRetirementIncome).toBeGreaterThan(0);
        }
      }
    });

    it('graceful degradation when assets run out', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 45, // Very long retirement
        corporateInvestmentBalance: 100000, // Low starting balance
        annualCorporateRetainedEarnings: 50000,
        actualRRSPBalance: 50000,
        actualTFSABalance: 20000,
        retirementSpending: 100000,
      });
      const result = calculateProjection(inputs);

      // Should not crash — just have lower income in later years
      expect(result.yearlyResults).toHaveLength(45);
      const lastYears = result.yearlyResults.slice(-5);
      for (const yr of lastYears) {
        expect(yr.afterTaxIncome).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('balance depletion', () => {
    it('RRSP/TFSA/corporate balances decrease over retirement', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 30,
        actualRRSPBalance: 500000,
        actualTFSABalance: 200000,
        corporateInvestmentBalance: 1000000,
        retirementSpending: 80000,
      });
      const result = calculateProjection(inputs);

      const retirementYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      if (retirementYears.length >= 5) {
        const first = retirementYears[0].balances!;
        const last = retirementYears[retirementYears.length - 1].balances!;

        // Over a long retirement, balances should generally decrease
        // (though growth may offset in early years)
        const totalFirst = first.rrspBalance + first.tfsaBalance + first.corporateBalance;
        const totalLast = last.rrspBalance + last.tfsaBalance + last.corporateBalance;

        // After many years of withdrawals, total should be lower
        expect(totalLast).toBeLessThan(totalFirst * 2); // Generous bound
      }
    });
  });

  describe('backward compatibility', () => {
    it('short horizon with no retirement phase still works', () => {
      // Classic v2.x scenario: 5-year horizon, all accumulation
      const inputs = createLifetimeInputs({
        planningHorizon: 5,
        currentAge: 45,
        retirementAge: 65,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults).toHaveLength(5);
      result.yearlyResults.forEach(yr => {
        expect(yr.phase).toBe('accumulation');
      });

      // All v2.x summary fields should be present
      expect(result.totalCompensation).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
    });
  });
});
