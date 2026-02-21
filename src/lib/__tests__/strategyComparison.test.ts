/**
 * Tests for v2.1.0 "Strategy Comparison" engine:
 * - runStrategyComparison() returns exactly 3 strategies
 * - Each strategy has correct label and salaryStrategy
 * - All strategies share the same base inputs (province, income, etc.)
 * - Winner is determined by lowest total tax (primary) and highest balance (secondary)
 * - Diffs are computed correctly between winner and other strategies
 * - Dividends-only strategy has $0 salary
 * - Salary-at-YMPE strategy has salary near YMPE
 * - Dynamic strategy may differ from both
 * - Works with spouse enabled
 * - Works with IPP enabled
 */

import { describe, it, expect } from 'vitest';
import type { UserInputs } from '../types';
import { getDefaultInputs } from '../localStorage';
import {
  runStrategyComparison,
} from '../strategyComparison';

const defaults = getDefaultInputs();

/** Helper: standard test inputs */
function makeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...defaults,
    province: 'ON',
    requiredIncome: 100000,
    annualCorporateRetainedEarnings: 400000,
    corporateInvestmentBalance: 500000,
    planningHorizon: 5,
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

describe('runStrategyComparison', () => {
  it('returns exactly 3 strategies', () => {
    const result = runStrategyComparison(makeInputs());
    expect(result.strategies).toHaveLength(3);
  });

  it('strategies have correct labels', () => {
    const result = runStrategyComparison(makeInputs());
    const labels = result.strategies.map(s => s.label);
    expect(labels).toContain('Salary at YMPE');
    expect(labels).toContain('Dividends Only');
    expect(labels).toContain('Dynamic Optimizer');
  });

  it('each strategy has a valid ProjectionSummary', () => {
    const result = runStrategyComparison(makeInputs());
    for (const strategy of result.strategies) {
      expect(strategy.summary.yearlyResults).toHaveLength(5);
      expect(strategy.summary.totalTax).toBeGreaterThan(0);
      expect(strategy.summary.totalCompensation).toBeGreaterThan(0);
    }
  });

  it('dividends-only strategy has zero salary', () => {
    const result = runStrategyComparison(makeInputs());
    const divOnly = result.strategies.find(s => s.id === 'dividends-only')!;
    expect(divOnly.summary.totalSalary).toBe(0);
  });

  it('salary-at-ympe strategy uses fixed salary', () => {
    const result = runStrategyComparison(makeInputs());
    const salaryStrat = result.strategies.find(s => s.id === 'salary-at-ympe')!;
    // Should have non-zero salary
    expect(salaryStrat.summary.totalSalary).toBeGreaterThan(0);
  });

  it('winner is the strategy with lowest total tax', () => {
    const result = runStrategyComparison(makeInputs());
    const taxes = result.strategies.map(s => s.summary.totalTax);
    const minTax = Math.min(...taxes);
    const winnerStrategy = result.strategies.find(s => s.id === result.winner.lowestTax)!;
    expect(winnerStrategy.summary.totalTax).toBe(minTax);
  });

  it('winner.highestBalance picks strategy with largest final balance', () => {
    const result = runStrategyComparison(makeInputs());
    const balances = result.strategies.map(s => s.summary.finalCorporateBalance);
    const maxBalance = Math.max(...balances);
    const balanceWinner = result.strategies.find(s => s.id === result.winner.highestBalance)!;
    expect(balanceWinner.summary.finalCorporateBalance).toBe(maxBalance);
  });

  it('diffs are computed relative to the best-overall strategy', () => {
    const result = runStrategyComparison(makeInputs());
    // The best-overall strategy should have diff of 0 for tax
    const best = result.strategies.find(s => s.id === result.winner.bestOverall)!;
    expect(best.diff.taxSavings).toBe(0);
  });

  it('all strategies share base inputs (province, income, horizon)', () => {
    const inputs = makeInputs({ province: 'BC' });
    const result = runStrategyComparison(inputs);
    // Each strategy's yearly results should have same length as horizon
    for (const strategy of result.strategies) {
      expect(strategy.summary.yearlyResults).toHaveLength(inputs.planningHorizon);
    }
  });

  it('works with spouse enabled', () => {
    const inputs = makeInputs({
      hasSpouse: true,
      spouseRequiredIncome: 60000,
      spouseSalaryStrategy: 'dynamic',
    });
    const result = runStrategyComparison(inputs);
    expect(result.strategies).toHaveLength(3);
    // Each strategy should have spouse results
    for (const strategy of result.strategies) {
      expect(strategy.summary.spouse).toBeDefined();
    }
  });

  it('works with IPP enabled', () => {
    const inputs = makeInputs({
      considerIPP: true,
      ippMemberAge: 50,
      ippYearsOfService: 10,
    });
    const result = runStrategyComparison(inputs);
    expect(result.strategies).toHaveLength(3);
    // Dynamic and salary strategies should have IPP
    const dynamic = result.strategies.find(s => s.id === 'dynamic')!;
    expect(dynamic.summary.ipp).toBeDefined();
    // Dividends-only with IPP → IPP = 0 (no salary = no pensionable earnings)
    const divOnly = result.strategies.find(s => s.id === 'dividends-only')!;
    expect(divOnly.summary.ipp?.totalContributions ?? 0).toBe(0);
  });

  it('strategies differ in tax outcomes', () => {
    const result = runStrategyComparison(makeInputs());
    const taxes = result.strategies.map(s => s.summary.totalTax);
    // At least two strategies should have different tax outcomes
    const uniqueTaxes = new Set(taxes.map(t => Math.round(t)));
    expect(uniqueTaxes.size).toBeGreaterThanOrEqual(2);
  });
});

describe('after-tax wealth in strategy comparison', () => {
  it('includes after-tax wealth scenarios for all strategies', () => {
    const result = runStrategyComparison(makeInputs());

    result.strategies.forEach(strategy => {
      expect(strategy.trueAfterTaxWealth).toBeDefined();
      expect(strategy.trueAfterTaxWealth.atCurrentRate).toBeGreaterThan(0);
      expect(strategy.trueAfterTaxWealth.atLowerRate).toBeGreaterThan(0);
      expect(strategy.trueAfterTaxWealth.atTopRate).toBeGreaterThan(0);
      expect(strategy.trueAfterTaxWealth.assumptions).toBeDefined();

      // Lower rate should give higher or equal after-tax wealth than top rate
      // (equal when RRSP contributions are 0, e.g., dividends-only strategy)
      expect(strategy.trueAfterTaxWealth.atLowerRate).toBeGreaterThanOrEqual(
        strategy.trueAfterTaxWealth.atTopRate
      );
    });
  });
});

describe('year-by-year data for charts', () => {
  it('includes yearlyData for all strategies', () => {
    const inputs = makeInputs();
    const result = runStrategyComparison(inputs);

    expect(result.yearlyData).toBeDefined();
    expect(result.yearlyData).toHaveLength(3);

    result.yearlyData.forEach(strategyYearly => {
      expect(strategyYearly.strategyId).toBeDefined();
      expect(strategyYearly.years).toBeDefined();
      expect(strategyYearly.years.length).toBe(inputs.planningHorizon);
    });
  });

  it('yearlyData strategyIds match strategy ids', () => {
    const result = runStrategyComparison(makeInputs());
    const strategyIds = result.strategies.map(s => s.id);
    const yearlyIds = result.yearlyData.map(y => y.strategyId);
    expect(yearlyIds).toEqual(strategyIds);
  });
});

describe('comparison data for report/email', () => {
  it('each strategy summary has all fields needed for report table', () => {
    const result = runStrategyComparison(makeInputs());
    for (const strategy of result.strategies) {
      const s = strategy.summary;
      expect(typeof s.totalTax).toBe('number');
      expect(typeof s.effectiveTaxRate).toBe('number');
      expect(typeof s.averageAnnualIncome).toBe('number');
      expect(typeof s.finalCorporateBalance).toBe('number');
      expect(typeof s.totalRRSPRoomGenerated).toBe('number');
      expect(typeof s.totalSalary).toBe('number');
      expect(typeof s.totalDividends).toBe('number');
      expect(typeof s.totalRdtohRefund).toBe('number');
    }
  });

  it('winner IDs reference valid strategies', () => {
    const result = runStrategyComparison(makeInputs());
    const ids = result.strategies.map(s => s.id);
    expect(ids).toContain(result.winner.lowestTax);
    expect(ids).toContain(result.winner.highestBalance);
    expect(ids).toContain(result.winner.bestOverall);
  });

  it('diff.taxSavings is 0 for best-overall strategy', () => {
    const result = runStrategyComparison(makeInputs());
    const best = result.strategies.find(s => s.id === result.winner.bestOverall)!;
    expect(best.diff.taxSavings).toBe(0);
    expect(best.diff.balanceDifference).toBe(0);
  });

  it('strategy descriptions are non-empty strings', () => {
    const result = runStrategyComparison(makeInputs());
    for (const strategy of result.strategies) {
      expect(strategy.description.length).toBeGreaterThan(10);
    }
  });

  it('salary-at-ympe description includes the YMPE dollar amount', () => {
    const result = runStrategyComparison(makeInputs());
    const ympeStrat = result.strategies.find(s => s.id === 'salary-at-ympe')!;
    expect(ympeStrat.description).toMatch(/\$[\d,]+/);
  });
});

describe('lifetime winner determination', () => {
  /** Helper: lifetime-aware inputs with retirement phase */
  function makeLifetimeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
    return {
      ...defaults,
      province: 'ON',
      requiredIncome: 100000,
      annualCorporateRetainedEarnings: 200000,
      corporateInvestmentBalance: 500000,
      investmentReturnRate: 0.06,
      expectedInflationRate: 0.02,
      currentAge: 55,
      retirementAge: 65,
      planningEndAge: 80,
      planningHorizon: 25,
      retirementSpending: 70000,
      lifetimeObjective: 'balanced' as const,
      cppStartAge: 65,
      salaryStartAge: 22,
      averageHistoricalSalary: 60000,
      oasEligible: true,
      oasStartAge: 65,
      actualRRSPBalance: 200000,
      actualTFSABalance: 50000,
      salaryStrategy: 'dynamic',
      ...overrides,
    };
  }

  it('populates lifetimeWinner when lifetime data available', () => {
    const result = runStrategyComparison(makeLifetimeInputs());

    expect(result.lifetimeWinner).toBeDefined();
    expect(result.lifetimeWinner!.maximizeSpending).toBeDefined();
    expect(result.lifetimeWinner!.maximizeEstate).toBeDefined();
    expect(result.lifetimeWinner!.balanced).toBeDefined();
    expect(result.lifetimeWinner!.byObjective).toBeDefined();
    expect(result.lifetimeWinner!.objective).toBe('balanced');
  });

  it('lifetime winner IDs reference valid strategies', () => {
    const result = runStrategyComparison(makeLifetimeInputs());
    const ids = result.strategies.map(s => s.id);

    expect(ids).toContain(result.lifetimeWinner!.maximizeSpending);
    expect(ids).toContain(result.lifetimeWinner!.maximizeEstate);
    expect(ids).toContain(result.lifetimeWinner!.balanced);
    expect(ids).toContain(result.lifetimeWinner!.byObjective);
  });

  it('bestOverall uses lifetime winner when lifetime data available', () => {
    const result = runStrategyComparison(makeLifetimeInputs());

    // bestOverall should match the lifetimeWinner.byObjective
    expect(result.winner.bestOverall).toBe(result.lifetimeWinner!.byObjective);
  });

  it('maximize-spending objective picks highest spending strategy', () => {
    const result = runStrategyComparison(makeLifetimeInputs({
      lifetimeObjective: 'maximize-spending',
    }));

    const winnerStrategy = result.strategies.find(
      s => s.id === result.lifetimeWinner!.maximizeSpending
    )!;
    // Winner should have the highest lifetime spending
    for (const s of result.strategies) {
      expect(winnerStrategy.summary.lifetime!.totalLifetimeSpending)
        .toBeGreaterThanOrEqual(s.summary.lifetime!.totalLifetimeSpending);
    }
  });

  it('maximize-estate objective picks highest estate strategy', () => {
    const result = runStrategyComparison(makeLifetimeInputs({
      lifetimeObjective: 'maximize-estate',
    }));

    const winnerStrategy = result.strategies.find(
      s => s.id === result.lifetimeWinner!.maximizeEstate
    )!;
    // Winner should have the highest estate value
    for (const s of result.strategies) {
      expect(winnerStrategy.summary.lifetime!.estateValue)
        .toBeGreaterThanOrEqual(s.summary.lifetime!.estateValue);
    }
  });

  it('byObjective respects user objective choice', () => {
    for (const objective of ['maximize-spending', 'maximize-estate', 'balanced'] as const) {
      const result = runStrategyComparison(makeLifetimeInputs({
        lifetimeObjective: objective,
      }));

      expect(result.lifetimeWinner!.objective).toBe(objective);

      const expected = {
        'maximize-spending': result.lifetimeWinner!.maximizeSpending,
        'maximize-estate': result.lifetimeWinner!.maximizeEstate,
        'balanced': result.lifetimeWinner!.balanced,
      }[objective];

      expect(result.lifetimeWinner!.byObjective).toBe(expected);
    }
  });

  it('no lifetimeWinner for short-horizon (no retirement)', () => {
    // Short horizon that doesn't reach retirement
    const result = runStrategyComparison(makeInputs({
      planningHorizon: 5,
      currentAge: 45,
      retirementAge: 65,
    }));

    // No retirement years → no lifetime data → no lifetimeWinner
    expect(result.lifetimeWinner).toBeUndefined();
  });

  it('each strategy has lifetime stats when running lifetime model', () => {
    const result = runStrategyComparison(makeLifetimeInputs());

    for (const strategy of result.strategies) {
      expect(strategy.summary.lifetime).toBeDefined();
      expect(strategy.summary.lifetime!.totalAccumulationYears).toBe(10);
      expect(strategy.summary.lifetime!.totalRetirementYears).toBe(15);
      expect(strategy.summary.lifetime!.totalLifetimeSpending).toBeGreaterThan(0);
      expect(strategy.summary.lifetime!.estateValue).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('lifetime winner as primary recommendation', () => {
  it('lifetimeWinner.byObjective is defined when planningHorizon >= 20', () => {
    const result = runStrategyComparison(makeInputs({
      planningHorizon: 45,
      currentAge: 45,
      retirementAge: 65,
      planningEndAge: 90,
      retirementSpending: 70000,
      actualRRSPBalance: 200000,
      actualTFSABalance: 100000,
      cppStartAge: 65,
      salaryStartAge: 22,
      averageHistoricalSalary: 60000,
      oasEligible: true,
      oasStartAge: 65,
      lifetimeObjective: 'balanced',
    }));
    expect(result.lifetimeWinner).toBeDefined();
    expect(result.lifetimeWinner!.byObjective).toBeTruthy();
  });
});

describe('4th strategy slot — my current setup', () => {
  it('returns 3 strategies when salaryStrategy is dynamic', () => {
    const result = runStrategyComparison(makeInputs({ salaryStrategy: 'dynamic' }));
    expect(result.strategies).toHaveLength(3);
  });

  it('returns 4 strategies when user has a fixed salary amount set', () => {
    const result = runStrategyComparison(makeInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 150000,
    }));
    expect(result.strategies).toHaveLength(4);
  });

  it('4th strategy is labelled "My Current Setup" and marked isCurrentSetup', () => {
    const result = runStrategyComparison(makeInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 150000,
    }));
    const current = result.strategies.find(s => s.isCurrentSetup);
    expect(current).toBeDefined();
    expect(current!.label).toBe('My Current Setup');
  });

  it('current setup salary matches user input', () => {
    const result = runStrategyComparison(makeInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 150000,
    }));
    const current = result.strategies.find(s => s.isCurrentSetup);
    expect(current).toBeDefined();
    const firstYear = current!.summary.yearlyResults[0];
    expect(firstYear.salary).toBeCloseTo(150000, -3);
  });
});
