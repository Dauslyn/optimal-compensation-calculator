/**
 * Scenario Management for What-If Analysis
 *
 * Allows users to create, compare, and save multiple scenarios
 * with different input parameters to find the optimal strategy.
 */

import type { UserInputs, ProjectionSummary } from './types';
import { getDefaultInputs } from './localStorage';
import { getTaxYearData } from './tax/indexation';
import { getStartingYear } from './tax/indexation';

/**
 * A scenario represents a complete set of inputs and calculated results
 */
export interface Scenario {
  id: string;
  name: string;
  description?: string;
  inputs: UserInputs;
  results: ProjectionSummary | null;
  createdAt: number;
  updatedAt: number;
  color: string; // For visual distinction in comparisons
}

/**
 * Available scenario colors for visual distinction
 */
export const SCENARIO_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
] as const;

/**
 * Generate a unique scenario ID
 */
export function generateScenarioId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new scenario with default values
 */
export function createScenario(
  name: string,
  inputs?: Partial<UserInputs>,
  color?: string
): Scenario {
  const now = Date.now();
  const defaultInputs = getDefaultInputs();

  return {
    id: generateScenarioId(),
    name,
    inputs: { ...defaultInputs, ...inputs },
    results: null,
    createdAt: now,
    updatedAt: now,
    color: color || SCENARIO_COLORS[0],
  };
}

/**
 * Duplicate an existing scenario
 */
export function duplicateScenario(
  scenario: Scenario,
  newName?: string,
  newColor?: string
): Scenario {
  const now = Date.now();

  return {
    ...scenario,
    id: generateScenarioId(),
    name: newName || `${scenario.name} (Copy)`,
    color: newColor || getNextColor(scenario.color),
    results: null, // Reset results since they need recalculation
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get the next color in the rotation
 */
function getNextColor(currentColor: string): string {
  const currentIndex = SCENARIO_COLORS.indexOf(currentColor as typeof SCENARIO_COLORS[number]);
  const nextIndex = (currentIndex + 1) % SCENARIO_COLORS.length;
  return SCENARIO_COLORS[nextIndex];
}

/**
 * Comparison metrics for ranking scenarios
 */
export interface ScenarioComparison {
  scenarioId: string;
  totalTaxPaid: number;
  averageTaxRate: number;
  finalCorporateBalance: number;
  totalAfterTaxIncome: number;
  totalDividends: number;
  totalSalary: number;
}

/**
 * Compare scenarios and determine the winner
 */
export function compareScenarios(scenarios: Scenario[]): {
  comparisons: ScenarioComparison[];
  winner: {
    lowestTax: string | null;
    highestBalance: string | null;
    bestOverall: string | null;
  };
} {
  const comparisons: ScenarioComparison[] = scenarios
    .filter(s => s.results !== null)
    .map(scenario => {
      const results = scenario.results!;
      const totalTaxPaid = results.yearlyResults.reduce(
        (sum, year) => sum + year.totalTax,
        0
      );
      const totalAfterTaxIncome = results.yearlyResults.reduce(
        (sum, year) => sum + year.afterTaxIncome,
        0
      );
      const totalDividends = results.yearlyResults.reduce(
        (sum, year) => sum + year.dividends.grossDividends,
        0
      );
      const totalSalary = results.yearlyResults.reduce(
        (sum, year) => sum + year.salary,
        0
      );

      return {
        scenarioId: scenario.id,
        totalTaxPaid,
        averageTaxRate: totalAfterTaxIncome > 0
          ? totalTaxPaid / (totalAfterTaxIncome + totalTaxPaid)
          : 0,
        finalCorporateBalance: results.yearlyResults.length > 0
          ? results.yearlyResults[results.yearlyResults.length - 1].notionalAccounts.corporateInvestments
          : 0,
        totalAfterTaxIncome,
        totalDividends,
        totalSalary,
      };
    });

  // Determine winners
  let lowestTax: string | null = null;
  let highestBalance: string | null = null;
  let bestOverall: string | null = null;

  if (comparisons.length > 0) {
    // Lowest total tax paid
    const sortedByTax = [...comparisons].sort((a, b) => a.totalTaxPaid - b.totalTaxPaid);
    lowestTax = sortedByTax[0].scenarioId;

    // Highest final corporate balance
    const sortedByBalance = [...comparisons].sort((a, b) => b.finalCorporateBalance - a.finalCorporateBalance);
    highestBalance = sortedByBalance[0].scenarioId;

    // Best overall: weighted score (lower tax + higher balance)
    // Normalize and combine metrics
    const maxTax = Math.max(...comparisons.map(c => c.totalTaxPaid));
    const maxBalance = Math.max(...comparisons.map(c => c.finalCorporateBalance));

    const scored = comparisons.map(c => ({
      scenarioId: c.scenarioId,
      score: (maxTax > 0 ? (1 - c.totalTaxPaid / maxTax) * 0.6 : 0) + // 60% weight on tax savings
             (maxBalance > 0 ? (c.finalCorporateBalance / maxBalance) * 0.4 : 0), // 40% weight on balance
    }));

    const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
    bestOverall = sortedByScore[0].scenarioId;
  }

  return {
    comparisons,
    winner: {
      lowestTax,
      highestBalance,
      bestOverall,
    },
  };
}

// Local Storage Keys
const SCENARIOS_STORAGE_KEY = 'ccpc-calculator-scenarios';

/**
 * Save scenarios to localStorage
 */
export function saveScenariosToStorage(scenarios: Scenario[]): void {
  try {
    // Don't save results to localStorage (too large), just inputs
    const scenariosToSave = scenarios.map(s => ({
      ...s,
      results: null, // Strip results to save space
    }));
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenariosToSave));
  } catch (error) {
    console.error('Failed to save scenarios:', error);
  }
}

/**
 * Load scenarios from localStorage
 */
export function loadScenariosFromStorage(): Scenario[] | null {
  try {
    const stored = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Scenario[];
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    return null;
  }
}

/**
 * Clear stored scenarios
 */
export function clearStoredScenarios(): void {
  localStorage.removeItem(SCENARIOS_STORAGE_KEY);
}

/**
 * Get preset scenario templates
 */
export function getPresetScenarios(): Array<{ name: string; description: string; inputs: Partial<UserInputs> }> {
  return [
    {
      name: 'Maximize Dividends',
      description: 'All dividends, no salary - maximize RDTOH refunds',
      inputs: {
        salaryStrategy: 'dividends-only',
        maximizeTFSA: true,
        contributeToRRSP: false,
      },
    },
    {
      name: 'Balanced Approach',
      description: 'Dynamic optimization between salary and dividends',
      inputs: {
        salaryStrategy: 'dynamic',
        maximizeTFSA: true,
        contributeToRRSP: true,
      },
    },
    {
      name: 'CPP Maximizer',
      description: 'Fixed salary at YMPE to maximize CPP benefits',
      inputs: {
        salaryStrategy: 'fixed',
        fixedSalaryAmount: getTaxYearData(getStartingYear()).cpp.ympe,
        maximizeTFSA: true,
        contributeToRRSP: true,
      },
    },
    {
      name: 'Tax Minimizer',
      description: 'Optimize purely for lowest total tax',
      inputs: {
        salaryStrategy: 'dynamic',
        maximizeTFSA: false,
        contributeToRRSP: false,
      },
    },
  ];
}
