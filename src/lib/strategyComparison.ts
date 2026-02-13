/**
 * Strategy Comparison Engine (v2.1.0)
 *
 * Takes a user's inputs and runs 3 preset strategies through calculateProjection(),
 * returning side-by-side results with winner determination and diff computation.
 *
 * Strategies:
 * 1. Salary at YMPE — Fixed salary at Year's Maximum Pensionable Earnings
 * 2. Dividends Only — Zero salary, all dividends
 * 3. Dynamic Optimizer — Engine picks optimal salary/dividend mix
 */

import type { UserInputs, ProjectionSummary } from './types';
import { calculateProjection } from './calculator';
import { getTaxYearData } from './tax/indexation';

export interface StrategyResult {
  id: string;
  label: string;
  description: string;
  summary: ProjectionSummary;
  diff: {
    taxSavings: number;         // vs best-overall (negative = pays more tax)
    balanceDifference: number;  // vs best-overall
    rrspRoomDifference: number; // vs best-overall
  };
}

export interface ComparisonResult {
  strategies: StrategyResult[];
  winner: {
    lowestTax: string;
    highestBalance: string;
    bestOverall: string;
  };
}

/**
 * Run the 3 preset strategies against the user's inputs.
 * The user's other settings (province, income needs, balances, spouse, IPP, etc.)
 * are preserved — only the salary strategy changes.
 */
export function runStrategyComparison(inputs: UserInputs): ComparisonResult {
  const ympe = getTaxYearData(inputs.startingYear).cpp.ympe;

  // Define the 3 strategy variants
  const strategyDefs: Array<{
    id: string;
    label: string;
    description: string;
    inputOverrides: Partial<UserInputs>;
  }> = [
    {
      id: 'salary-at-ympe',
      label: 'Salary at YMPE',
      description: `Fixed salary at $${ympe.toLocaleString()} (maximizes CPP, generates RRSP room)`,
      inputOverrides: {
        salaryStrategy: 'fixed',
        fixedSalaryAmount: ympe,
      },
    },
    {
      id: 'dividends-only',
      label: 'Dividends Only',
      description: 'Zero salary — all compensation via dividends (no CPP, no RRSP room)',
      inputOverrides: {
        salaryStrategy: 'dividends-only',
      },
    },
    {
      id: 'dynamic',
      label: 'Dynamic Optimizer',
      description: 'Engine selects optimal salary/dividend split each year',
      inputOverrides: {
        salaryStrategy: 'dynamic',
      },
    },
  ];

  // Run each strategy
  const strategies: Array<{ id: string; label: string; description: string; summary: ProjectionSummary }> =
    strategyDefs.map(def => ({
      id: def.id,
      label: def.label,
      description: def.description,
      summary: calculateProjection({ ...inputs, ...def.inputOverrides }),
    }));

  // Determine winners
  const lowestTaxStrategy = strategies.reduce((best, s) =>
    s.summary.totalTax < best.summary.totalTax ? s : best
  );
  const highestBalanceStrategy = strategies.reduce((best, s) =>
    s.summary.finalCorporateBalance > best.summary.finalCorporateBalance ? s : best
  );

  // Best overall: weighted score (60% tax savings, 40% balance)
  const maxTax = Math.max(...strategies.map(s => s.summary.totalTax));
  const maxBalance = Math.max(...strategies.map(s => s.summary.finalCorporateBalance));
  const bestOverallStrategy = strategies.reduce((best, s) => {
    const score =
      (maxTax > 0 ? (1 - s.summary.totalTax / maxTax) * 0.6 : 0) +
      (maxBalance > 0 ? (s.summary.finalCorporateBalance / maxBalance) * 0.4 : 0);
    const bestScore =
      (maxTax > 0 ? (1 - best.summary.totalTax / maxTax) * 0.6 : 0) +
      (maxBalance > 0 ? (best.summary.finalCorporateBalance / maxBalance) * 0.4 : 0);
    return score > bestScore ? s : best;
  });

  // Compute diffs relative to best-overall
  const results: StrategyResult[] = strategies.map(s => ({
    id: s.id,
    label: s.label,
    description: s.description,
    summary: s.summary,
    diff: {
      taxSavings: bestOverallStrategy.summary.totalTax - s.summary.totalTax,
      balanceDifference: s.summary.finalCorporateBalance - bestOverallStrategy.summary.finalCorporateBalance,
      rrspRoomDifference: s.summary.totalRRSPRoomGenerated - bestOverallStrategy.summary.totalRRSPRoomGenerated,
    },
  }));

  return {
    strategies: results,
    winner: {
      lowestTax: lowestTaxStrategy.id,
      highestBalance: highestBalanceStrategy.id,
      bestOverall: bestOverallStrategy.id,
    },
  };
}
