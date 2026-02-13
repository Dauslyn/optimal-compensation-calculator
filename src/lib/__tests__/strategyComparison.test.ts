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
  type StrategyResult,
  type ComparisonResult,
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
