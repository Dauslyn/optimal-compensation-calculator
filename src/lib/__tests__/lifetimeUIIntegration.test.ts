/**
 * Lifetime UI Integration Tests
 *
 * Verifies the data shapes that UI components depend on after v3.0:
 * - WinnerStrategyCard: summary.lifetime fields
 * - BalanceDepletionChart / RetirementIncomeChart: yearlyData[].years[].phase, .balances, .retirement
 * - LifetimeOverviewStats: summary.lifetime stats
 * - RecommendedTab hasLifetime guard: yearlyData[0].years.some(y => y.phase === 'retirement')
 * - DetailsTab hasLifetime guard: same
 *
 * Scenario: age 45 → retire 65 → end 90 (20yr accum + 25yr retirement/estate)
 */

import { describe, it, expect } from 'vitest';
import { runStrategyComparison } from '../strategyComparison';
import { getDefaultInputs } from '../localStorage';
import type { UserInputs } from '../types';

function makeLifetimeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...getDefaultInputs(),
    province: 'ON',
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    planningHorizon: 45,
    requiredIncome: 100000,
    retirementSpending: 70000,
    annualCorporateRetainedEarnings: 200000,
    corporateInvestmentBalance: 500000,
    investmentReturnRate: 0.05,
    inflationRate: 0.02,
    contributeToRRSP: true,
    rrspBalance: 50000,
    actualRRSPBalance: 200000,
    maximizeTFSA: true,
    tfsaBalance: 30000,
    actualTFSABalance: 100000,
    cppStartAge: 65,
    salaryStartAge: 22,
    averageHistoricalSalary: 70000,
    oasEligible: true,
    oasStartAge: 65,
    lifetimeObjective: 'balanced',
    ...overrides,
  };
}

describe('Lifetime UI Integration — full 45→90 projection', () => {
  const comparison = runStrategyComparison(makeLifetimeInputs());

  describe('comparison shape', () => {
    it('produces 3 strategies', () => {
      expect(comparison.strategies).toHaveLength(3);
    });

    it('yearlyData has one entry per strategy', () => {
      expect(comparison.yearlyData).toHaveLength(3);
    });

    it('each yearlyData entry has 45 years', () => {
      for (const sd of comparison.yearlyData) {
        expect(sd.years).toHaveLength(45);
      }
    });
  });

  describe('hasLifetime guard (used by RecommendedTab + DetailsTab)', () => {
    it('yearlyData[0].years has at least one retirement phase year', () => {
      const hasRetirement = comparison.yearlyData[0].years.some(y => y.phase === 'retirement');
      expect(hasRetirement).toBe(true);
    });

    it('phase transitions are accumulation → retirement → estate', () => {
      const phases = comparison.yearlyData[0].years.map(y => y.phase);
      // First year should be accumulation
      expect(phases[0]).toBe('accumulation');
      // Last year should be estate
      expect(phases[phases.length - 1]).toBe('estate');
      // At least one retirement year in between
      expect(phases).toContain('retirement');
    });
  });

  describe('BalanceDepletionChart data', () => {
    it('each year has balances with required fields', () => {
      for (const sd of comparison.yearlyData) {
        for (const year of sd.years) {
          expect(year.balances).toBeDefined();
          expect(year.balances!.rrspBalance).toBeGreaterThanOrEqual(0);
          expect(year.balances!.tfsaBalance).toBeGreaterThanOrEqual(0);
          expect(typeof year.balances!.corporateBalance).toBe('number');
        }
      }
    });

    it('each year has calendarYear or year for X axis', () => {
      for (const year of comparison.yearlyData[0].years) {
        expect(year.calendarYear ?? year.year).toBeDefined();
      }
    });

    it('retirement reference line: firstRetirementYear is defined', () => {
      const firstRetirementYear = comparison.yearlyData[0].years.find(y => y.phase === 'retirement');
      expect(firstRetirementYear).toBeDefined();
      expect(firstRetirementYear!.calendarYear ?? firstRetirementYear!.year).toBeDefined();
    });

    it('estate reference line: firstEstateYear is defined', () => {
      const firstEstateYear = comparison.yearlyData[0].years.find(y => y.phase === 'estate');
      expect(firstEstateYear).toBeDefined();
    });

    it('all 3 strategy labels are present in the winner lookup', () => {
      const strategyIds = comparison.strategies.map(s => s.id);
      for (const sd of comparison.yearlyData) {
        expect(strategyIds).toContain(sd.strategyId);
      }
    });
  });

  describe('RetirementIncomeChart data', () => {
    it('retirement years have .retirement object with income sources', () => {
      const retirementYears = comparison.yearlyData[0].years.filter(y => y.phase === 'retirement');
      expect(retirementYears.length).toBeGreaterThan(0);

      for (const yr of retirementYears) {
        expect(yr.retirement).toBeDefined();
        expect(typeof yr.retirement!.cppIncome).toBe('number');
        expect(typeof yr.retirement!.oasNet).toBe('number');
        expect(typeof yr.retirement!.rrifWithdrawal).toBe('number');
        expect(typeof yr.retirement!.corporateDividends).toBe('number');
        expect(typeof yr.retirement!.tfsaWithdrawal).toBe('number');
        expect(typeof yr.retirement!.ippPension).toBe('number');
      }
    });

    it('accumulation years do not have .retirement object', () => {
      const accYears = comparison.yearlyData[0].years.filter(y => y.phase === 'accumulation');
      for (const yr of accYears) {
        expect(yr.retirement).toBeUndefined();
      }
    });
  });

  describe('WinnerStrategyCard lifetime data', () => {
    it('winner strategy has summary.lifetime populated', () => {
      const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);
      expect(winner).toBeDefined();
      expect(winner!.summary.lifetime).toBeDefined();

      const lt = winner!.summary.lifetime!;
      expect(lt.totalLifetimeSpending).toBeGreaterThan(0);
      expect(lt.estateValue).toBeGreaterThan(0);
      expect(lt.lifetimeEffectiveRate).toBeGreaterThan(0);
      expect(lt.lifetimeEffectiveRate).toBeLessThan(1);
    });

    it('comparison.lifetimeWinner is populated', () => {
      expect(comparison.lifetimeWinner).toBeDefined();
      expect(comparison.lifetimeWinner!.byObjective).toBeDefined();
      expect(comparison.lifetimeWinner!.maximizeSpending).toBeDefined();
      expect(comparison.lifetimeWinner!.maximizeEstate).toBeDefined();
      expect(comparison.lifetimeWinner!.balanced).toBeDefined();
    });

    it('bestOverall is set to lifetimeWinner.byObjective', () => {
      expect(comparison.winner.bestOverall).toBe(comparison.lifetimeWinner!.byObjective);
    });
  });

  describe('LifetimeOverviewStats data', () => {
    it('all stat fields are defined and numeric', () => {
      const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall)!;
      const lt = winner.summary.lifetime!;

      expect(typeof lt.totalLifetimeSpending).toBe('number');
      expect(typeof lt.lifetimeEffectiveRate).toBe('number');
      expect(typeof lt.peakCorporateBalance).toBe('number');
      expect(typeof lt.peakYear).toBe('number');
      expect(typeof lt.estateValue).toBe('number');
      expect(typeof lt.cppTotalReceived).toBe('number');
      expect(typeof lt.oasTotalReceived).toBe('number');
      expect(typeof lt.rrifTotalWithdrawn).toBe('number');
      expect(typeof lt.tfsaTotalWithdrawn).toBe('number');
      expect(typeof lt.totalAccumulationYears).toBe('number');
      expect(typeof lt.totalRetirementYears).toBe('number');
    });
  });

  describe('non-lifetime inputs produce no lifetime data (guard integrity)', () => {
    it('short 5-year projection has no yearlyData retirement years', () => {
      const shortComparison = runStrategyComparison(
        makeLifetimeInputs({ planningHorizon: 5, currentAge: 45, retirementAge: 65 })
      );
      const hasRetirement = shortComparison.yearlyData[0].years.some(y => y.phase === 'retirement');
      expect(hasRetirement).toBe(false);
    });

    it('short projection has no lifetimeWinner', () => {
      const shortComparison = runStrategyComparison(
        makeLifetimeInputs({ planningHorizon: 5 })
      );
      expect(shortComparison.lifetimeWinner).toBeUndefined();
    });

    it('short projection winner strategy has no summary.lifetime', () => {
      const shortComparison = runStrategyComparison(
        makeLifetimeInputs({ planningHorizon: 5 })
      );
      const winner = shortComparison.strategies.find(s => s.id === shortComparison.winner.bestOverall);
      expect(winner!.summary.lifetime).toBeUndefined();
    });
  });
});
