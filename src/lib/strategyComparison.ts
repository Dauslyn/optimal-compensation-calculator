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
import type { ProvinceCode } from './tax/provinces';
import { calculateProjection } from './calculator';
import { getTaxYearData } from './tax/indexation';
import { getTopProvincialRate } from './tax/provinces';
import { formatCurrency } from './formatters';

export interface AfterTaxWealthScenarios {
  atCurrentRate: number;      // Using average marginal rate from projection
  atLowerRate: number;        // Marginal - 10%, min 20%
  atTopRate: number;          // Top provincial rate
  assumptions: {
    currentRRSPWithdrawalRate: number;
    lowerRRSPWithdrawalRate: number;
    topRRSPWithdrawalRate: number;
    corpLiquidationRate: number;  // Fixed at 40% (non-eligible dividends)
  };
}

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
  trueAfterTaxWealth: AfterTaxWealthScenarios;
  isCurrentSetup?: boolean;   // true when this slot represents the user's actual current inputs
}

export interface ComparisonResult {
  strategies: StrategyResult[];
  winner: {
    lowestTax: string;
    highestBalance: string;
    bestOverall: string;
  };
  lifetimeWinner?: {
    maximizeSpending: string;     // highest lifetime.totalLifetimeSpending
    maximizeEstate: string;       // highest lifetime.estateValue
    balanced: string;             // weighted 60% spending / 40% estate
    byObjective: string;          // winner using user's chosen objective
    objective: 'maximize-spending' | 'maximize-estate' | 'balanced';
  };
  yearlyData: {
    strategyId: string;
    years: import('./types').YearlyResult[];
  }[];
}

/**
 * Calculate true after-tax wealth if all assets were liquidated at end of planning horizon.
 * Shows 3 scenarios based on RRSP withdrawal tax rates.
 *
 * Note: Pre-existing RRSP/TFSA balances are intentionally excluded because they are
 * identical across all strategies and cancel out in comparison. Only contributions
 * made during the planning horizon are included, as those differ by strategy.
 */
export function calculateAfterTaxWealth(
  summary: ProjectionSummary,
  province: ProvinceCode,
  averageMarginalRate: number
): AfterTaxWealthScenarios {
  const topRate = getTopProvincialRate(province);
  const lowerRate = Math.max(averageMarginalRate - 0.10, 0.20);
  const corpLiquidationRate = 0.40; // Conservative estimate (non-eligible dividends)

  // Base wealth = already taxed income (includes money used for TFSA contributions,
  // which are tax-free on withdrawal — no additional adjustment needed for TFSA).
  const totalAfterTaxIncome = summary.totalCompensation - summary.totalTax;
  const baseWealth = totalAfterTaxIncome;

  return {
    atCurrentRate: baseWealth +
      (summary.totalRRSPContributions * (1 - averageMarginalRate)) +
      (summary.finalCorporateBalance * (1 - corpLiquidationRate)),

    atLowerRate: baseWealth +
      (summary.totalRRSPContributions * (1 - lowerRate)) +
      (summary.finalCorporateBalance * (1 - corpLiquidationRate)),

    atTopRate: baseWealth +
      (summary.totalRRSPContributions * (1 - topRate)) +
      (summary.finalCorporateBalance * (1 - corpLiquidationRate)),

    assumptions: {
      currentRRSPWithdrawalRate: averageMarginalRate,
      lowerRRSPWithdrawalRate: lowerRate,
      topRRSPWithdrawalRate: topRate,
      corpLiquidationRate,
    },
  };
}

/**
 * Run the 3 preset strategies against the user's inputs.
 * The user's other settings (province, income needs, balances, spouse, IPP, etc.)
 * are preserved — only the salary strategy changes.
 */
export function runStrategyComparison(inputs: UserInputs): ComparisonResult {
  const ympe = getTaxYearData(inputs.startingYear ?? new Date().getFullYear()).cpp.ympe;

  // Define the 3 strategy variants
  const strategyDefs: Array<{
    id: string;
    label: string;
    description: string;
    inputOverrides: Partial<UserInputs>;
    isCurrentSetup?: boolean;
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

  // If the user has a fixed salary or dividends-only set, add their current setup as a 4th strategy
  const hasCustomSetup =
    (inputs.salaryStrategy === 'fixed' && inputs.fixedSalaryAmount && inputs.fixedSalaryAmount > 0) ||
    inputs.salaryStrategy === 'dividends-only';
  const currentSetupDescription = inputs.salaryStrategy === 'dividends-only'
    ? 'Your current dividends-only setup — compare against the optimized strategies'
    : `Your current fixed salary of ${formatCurrency(inputs.fixedSalaryAmount ?? 0)} — compare against the optimized strategies`;
  const strategyDefsWithCurrent = hasCustomSetup ? [
    {
      id: 'current-setup',
      label: 'My Current Setup',
      description: currentSetupDescription,
      inputOverrides: {} as Partial<UserInputs>,
      isCurrentSetup: true as const,
    },
    ...strategyDefs,
  ] : strategyDefs;

  // Run each strategy
  const strategies: Array<{ id: string; label: string; description: string; summary: ProjectionSummary; isCurrentSetup?: boolean }> =
    strategyDefsWithCurrent.map(def => ({
      id: def.id,
      label: def.label,
      description: def.description,
      isCurrentSetup: def.isCurrentSetup,
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

  // Compute diffs and after-tax wealth relative to best-overall
  const results: StrategyResult[] = strategies.map(s => {
    // Calculate average marginal rate for after-tax wealth scenarios
    const totalIncome = s.summary.totalCompensation;
    const averageMarginalRate = totalIncome > 0 ? s.summary.totalTax / totalIncome : 0.35;

    return {
      id: s.id,
      label: s.label,
      description: s.description,
      isCurrentSetup: s.isCurrentSetup,
      summary: s.summary,
      diff: {
        taxSavings: bestOverallStrategy.summary.totalTax - s.summary.totalTax,
        balanceDifference: s.summary.finalCorporateBalance - bestOverallStrategy.summary.finalCorporateBalance,
        rrspRoomDifference: s.summary.totalRRSPRoomGenerated - bestOverallStrategy.summary.totalRRSPRoomGenerated,
      },
      trueAfterTaxWealth: calculateAfterTaxWealth(s.summary, inputs.province as ProvinceCode, averageMarginalRate),
    };
  });

  // Lifetime winner determination (only when lifetime data is available)
  const hasLifetime = strategies.every(s => s.summary.lifetime != null);
  const lifetimeWinner = hasLifetime ? computeLifetimeWinner(strategies, inputs.lifetimeObjective ?? 'balanced') : undefined;

  return {
    strategies: results,
    winner: {
      lowestTax: lowestTaxStrategy.id,
      highestBalance: highestBalanceStrategy.id,
      bestOverall: lifetimeWinner?.byObjective ?? bestOverallStrategy.id,
    },
    lifetimeWinner,
    yearlyData: strategies.map(s => ({
      strategyId: s.id,
      years: s.summary.yearlyResults,
    })),
  };
}

/**
 * Determine lifetime winners across strategies using spending, estate, and balanced metrics.
 */
function computeLifetimeWinner(
  strategies: Array<{ id: string; summary: ProjectionSummary }>,
  objective: 'maximize-spending' | 'maximize-estate' | 'balanced',
): ComparisonResult['lifetimeWinner'] {
  // Maximize spending: highest totalLifetimeSpending
  const maxSpending = strategies.reduce((best, s) =>
    (s.summary.lifetime!.totalLifetimeSpending > best.summary.lifetime!.totalLifetimeSpending) ? s : best
  );

  // Maximize estate: highest estateValue
  const maxEstate = strategies.reduce((best, s) =>
    (s.summary.lifetime!.estateValue > best.summary.lifetime!.estateValue) ? s : best
  );

  // Balanced: weighted 60% spending / 40% estate (normalized)
  const maxSpendVal = Math.max(...strategies.map(s => s.summary.lifetime!.totalLifetimeSpending));
  const maxEstateVal = Math.max(...strategies.map(s => s.summary.lifetime!.estateValue));

  const balanced = strategies.reduce((best, s) => {
    const spendScore = maxSpendVal > 0 ? s.summary.lifetime!.totalLifetimeSpending / maxSpendVal : 0;
    const estateScore = maxEstateVal > 0 ? s.summary.lifetime!.estateValue / maxEstateVal : 0;
    const score = spendScore * 0.6 + estateScore * 0.4;

    const bestSpendScore = maxSpendVal > 0 ? best.summary.lifetime!.totalLifetimeSpending / maxSpendVal : 0;
    const bestEstateScore = maxEstateVal > 0 ? best.summary.lifetime!.estateValue / maxEstateVal : 0;
    const bestScore = bestSpendScore * 0.6 + bestEstateScore * 0.4;

    return score > bestScore ? s : best;
  });

  const byObjectiveMap = {
    'maximize-spending': maxSpending.id,
    'maximize-estate': maxEstate.id,
    'balanced': balanced.id,
  };

  return {
    maximizeSpending: maxSpending.id,
    maximizeEstate: maxEstate.id,
    balanced: balanced.id,
    byObjective: byObjectiveMap[objective],
    objective,
  };
}
