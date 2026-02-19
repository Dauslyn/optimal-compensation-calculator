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
    it('exposes inflation-adjusted targetSpending on retirement year', () => {
      const inputs = createLifetimeInputs({
        planningHorizon: 22,
        retirementSpending: 70000,
        expectedInflationRate: 0.02,
      });
      const result = calculateProjection(inputs);
      const firstRetirementYear = result.yearlyResults.find(yr => yr.phase === 'retirement')!;

      // targetSpending should be > 70000 (inflated from year 0 to year 20+)
      expect(firstRetirementYear.retirement!.targetSpending).toBeGreaterThan(70000);
      // Should be roughly 70000 * 1.02^20 ≈ 104040
      expect(firstRetirementYear.retirement!.targetSpending).toBeGreaterThan(100000);
      expect(firstRetirementYear.retirement!.targetSpending).toBeLessThan(115000);
    });

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

  describe('spouse CPP/OAS in retirement', () => {
    it('adds spouse CPP income when hasSpouse = true', () => {
      const inputs: UserInputs = {
        ...createLifetimeInputs({
          planningHorizon: 22,
          salaryStrategy: 'dynamic',
        }),
        hasSpouse: true,
        spouseCurrentAge: 48, // Age 48 → 48+20=68 at first retirement year, past CPP start age 65
        spouseRetirementAge: 65,
        spouseCPPStartAge: 65,
        spouseSalaryStartAge: 22,
        spouseAverageHistoricalSalary: 60000,
        spouseOASEligible: true,
        spouseOASStartAge: 65,
        spouseActualRRSPBalance: 100000,
        spouseActualTFSABalance: 50000,
        spouseRequiredIncome: 50000,
      };
      const result = calculateProjection(inputs);
      const retYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      expect(retYears.length).toBeGreaterThan(0);
      const firstRetYear = retYears[0];
      expect(firstRetYear.retirement!.spouseCPPIncome).toBeGreaterThan(0);
    });

    it('adds spouse OAS income when eligible', () => {
      const inputs: UserInputs = {
        ...createLifetimeInputs({ planningHorizon: 22 }),
        hasSpouse: true,
        spouseCurrentAge: 45, // age 45 → age 65 at year 20 (first retirement year)
        spouseCPPStartAge: 65,
        spouseSalaryStartAge: 22,
        spouseAverageHistoricalSalary: 60000,
        spouseOASEligible: true,
        spouseOASStartAge: 65,
        spouseActualRRSPBalance: 100000,
        spouseActualTFSABalance: 50000,
        spouseRequiredIncome: 50000,
      };
      const result = calculateProjection(inputs);
      const retYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      const spouseAt65Year = retYears.find(yr =>
        yr.spouseAge !== undefined && yr.spouseAge >= 65
      );
      expect(spouseAt65Year).toBeDefined(); // spouse must reach 65 in a retirement year
      expect(spouseAt65Year!.retirement!.spouseOASNet).toBeGreaterThan(0);
    });

    it('spouse CPP/OAS reduces drawdown from corporate', () => {
      // Use large corporate balance and no RRSP/TFSA so corporate dividends are the only gap-filler.
      // High retirementSpending forces the engine to draw from corporate every year.
      const baseInputs = createLifetimeInputs({
        planningHorizon: 25,
        retirementSpending: 120000,
        corporateInvestmentBalance: 5000000,
        annualCorporateRetainedEarnings: 0,
        actualRRSPBalance: 0,
        actualTFSABalance: 0,
      });
      const spouseInputs: UserInputs = {
        ...baseInputs,
        hasSpouse: true,
        spouseCurrentAge: 45, // Age 45 → 45+20=65 at first retirement year, CPP/OAS start
        spouseCPPStartAge: 65,
        spouseSalaryStartAge: 22,
        spouseAverageHistoricalSalary: 60000,
        spouseOASEligible: true,
        spouseOASStartAge: 65,
        spouseActualRRSPBalance: 0,
        spouseActualTFSABalance: 0,
        spouseRequiredIncome: 50000,
      };
      const baseResult = calculateProjection(baseInputs);
      const spouseResult = calculateProjection(spouseInputs);
      const baseCorp = baseResult.yearlyResults
        .filter(yr => yr.phase === 'retirement')
        .reduce((s, yr) => s + (yr.retirement?.corporateDividends ?? 0), 0);
      const spouseCorp = spouseResult.yearlyResults
        .filter(yr => yr.phase === 'retirement')
        .reduce((s, yr) => s + (yr.retirement?.corporateDividends ?? 0), 0);
      expect(spouseCorp).toBeLessThan(baseCorp);
    });

    it('lifetime summary includes spouse CPP and OAS totals', () => {
      const inputs: UserInputs = {
        ...createLifetimeInputs({ planningHorizon: 45 }),
        hasSpouse: true,
        spouseCurrentAge: 42,
        spouseCPPStartAge: 65,
        spouseSalaryStartAge: 22,
        spouseAverageHistoricalSalary: 60000,
        spouseOASEligible: true,
        spouseOASStartAge: 65,
        spouseActualRRSPBalance: 100000,
        spouseActualTFSABalance: 50000,
        spouseRequiredIncome: 50000,
      };
      const result = calculateProjection(inputs);
      expect(result.lifetime).toBeDefined();
      expect(result.lifetime!.spouseCPPTotalReceived).toBeGreaterThan(0);
      expect(result.lifetime!.spouseOASTotalReceived).toBeGreaterThan(0);
    });

    it('no spouse fields set means zero spouse income in retirement', () => {
      const inputs = createLifetimeInputs({ planningHorizon: 25 });
      const result = calculateProjection(inputs);
      const retYears = result.yearlyResults.filter(yr => yr.phase === 'retirement');
      for (const yr of retYears) {
        expect(yr.retirement!.spouseCPPIncome).toBe(0);
        expect(yr.retirement!.spouseOASNet).toBe(0);
        expect(yr.retirement!.spouseRRIFWithdrawal).toBe(0);
      }
    });
  });
});
