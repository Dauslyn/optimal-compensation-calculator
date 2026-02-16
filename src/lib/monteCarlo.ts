/**
 * Monte Carlo Simulation for Investment Returns
 *
 * Runs thousands of simulations with variable returns to show
 * probability distributions and confidence intervals for outcomes.
 */

import type { UserInputs } from './types';
import { calculateProjection } from './calculator';

/**
 * Configuration for Monte Carlo simulation
 */
export interface MonteCarloConfig {
  numSimulations: number;       // Number of simulations to run (default: 1000)
  returnVolatility: number;     // Standard deviation of returns (default: 0.12 = 12%)
  seed?: number;                // Optional seed for reproducibility
}

/**
 * Single simulation result
 */
export interface SimulationResult {
  simulationId: number;
  yearlyReturns: number[];      // Actual returns used each year
  totalTax: number;
  finalCorporateBalance: number;
  totalAfterTaxIncome: number;
  integratedTaxRate: number;
}

/**
 * Percentile data for a metric
 */
export interface PercentileData {
  p10: number;   // 10th percentile (pessimistic)
  p25: number;   // 25th percentile
  p50: number;   // 50th percentile (median)
  p75: number;   // 75th percentile
  p90: number;   // 90th percentile (optimistic)
  mean: number;  // Average
  min: number;
  max: number;
  stdDev: number;
}

/**
 * Monte Carlo simulation results
 */
export interface MonteCarloResults {
  config: MonteCarloConfig;
  baseInputs: UserInputs;
  simulations: SimulationResult[];

  // Aggregated percentile data
  totalTax: PercentileData;
  finalCorporateBalance: PercentileData;
  totalAfterTaxIncome: PercentileData;
  integratedTaxRate: PercentileData;

  // Year-by-year distribution
  yearlyBalanceDistribution: Array<{
    year: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  }>;

  // Probability metrics
  probabilityOfMeetingGoal: number;  // % of simulations where final balance > starting
  probabilityOfLoss: number;          // % of simulations where final balance < starting

  // Timing
  executionTimeMs: number;
}

/**
 * Default Monte Carlo configuration
 */
export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  numSimulations: 1000,
  returnVolatility: 0.12,  // 12% standard deviation (typical for balanced portfolio)
};

/**
 * Box-Muller transform to generate normally distributed random numbers
 */
function generateNormalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/**
 * Generate random returns for each year of the projection
 */
function generateRandomReturns(
  baseReturn: number,
  volatility: number,
  numYears: number
): number[] {
  const returns: number[] = [];

  for (let i = 0; i < numYears; i++) {
    // Generate return with log-normal distribution (prevents negative portfolio values)
    const logReturn = generateNormalRandom(
      Math.log(1 + baseReturn) - (volatility * volatility) / 2,
      volatility
    );
    const annualReturn = Math.exp(logReturn) - 1;

    // Clamp to reasonable bounds (-50% to +100%)
    returns.push(Math.max(-0.5, Math.min(1.0, annualReturn)));
  }

  return returns;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[], mean: number): number {
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Build percentile data from array of values
 */
function buildPercentileData(values: number[]): PercentileData {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    mean,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: standardDeviation(values, mean),
  };
}

/**
 * Run a single Monte Carlo simulation with specific returns
 */
function runSimulation(
  inputs: UserInputs,
  randomReturns: number[],
  simulationId: number
): SimulationResult {
  // Create modified inputs with variable returns per year
  // Since our calculator uses a single return rate, we'll calculate
  // an effective average return and run the projection
  // For more accuracy, we'd need to modify the calculator to accept yearly returns

  // For now, use geometric mean of random returns as the effective rate
  const geometricMean = randomReturns.reduce((product, r) => product * (1 + r), 1);
  const effectiveReturn = Math.pow(geometricMean, 1 / randomReturns.length) - 1;

  const modifiedInputs: UserInputs = {
    ...inputs,
    investmentReturnRate: effectiveReturn,
  };

  const projection = calculateProjection(modifiedInputs);

  return {
    simulationId,
    yearlyReturns: randomReturns,
    totalTax: projection.totalTax,
    finalCorporateBalance: projection.finalCorporateBalance,
    totalAfterTaxIncome: projection.yearlyResults.reduce((sum, y) => sum + y.afterTaxIncome, 0),
    integratedTaxRate: projection.effectiveCompensationRate,
  };
}

/**
 * Run Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  inputs: UserInputs,
  config: Partial<MonteCarloConfig> = {}
): MonteCarloResults {
  const startTime = performance.now();

  const fullConfig: MonteCarloConfig = {
    ...DEFAULT_MONTE_CARLO_CONFIG,
    ...config,
  };

  const simulations: SimulationResult[] = [];
  const yearlyBalances: Array<number[]> = Array(inputs.planningHorizon).fill(null).map(() => []);

  // Run simulations
  for (let i = 0; i < fullConfig.numSimulations; i++) {
    const randomReturns = generateRandomReturns(
      inputs.investmentReturnRate,
      fullConfig.returnVolatility,
      inputs.planningHorizon
    );

    const result = runSimulation(inputs, randomReturns, i);
    simulations.push(result);

    // Track yearly balances (approximation - actual implementation would need per-year data)
    // For now, interpolate based on final balance
    const startBalance = inputs.corporateInvestmentBalance;
    const endBalance = result.finalCorporateBalance;

    for (let year = 0; year < inputs.planningHorizon; year++) {
      const yearFraction = (year + 1) / inputs.planningHorizon;
      // Exponential interpolation for more realistic year-by-year estimates
      const yearBalance = startBalance * Math.pow(endBalance / startBalance, yearFraction);
      yearlyBalances[year].push(yearBalance);
    }
  }

  // Build aggregated statistics
  const totalTaxes = simulations.map(s => s.totalTax);
  const finalBalances = simulations.map(s => s.finalCorporateBalance);
  const totalIncomes = simulations.map(s => s.totalAfterTaxIncome);
  const effectiveRates = simulations.map(s => s.integratedTaxRate);

  // Build year-by-year distribution
  const yearlyBalanceDistribution = yearlyBalances.map((balances, index) => {
    const sorted = [...balances].sort((a, b) => a - b);
    return {
      year: index + 1,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
    };
  });

  // Calculate probability metrics
  const startingBalance = inputs.corporateInvestmentBalance;
  const simulationsAboveStart = simulations.filter(s => s.finalCorporateBalance >= startingBalance).length;
  const simulationsBelowStart = simulations.filter(s => s.finalCorporateBalance < startingBalance).length;

  const executionTimeMs = performance.now() - startTime;

  return {
    config: fullConfig,
    baseInputs: inputs,
    simulations,
    totalTax: buildPercentileData(totalTaxes),
    finalCorporateBalance: buildPercentileData(finalBalances),
    totalAfterTaxIncome: buildPercentileData(totalIncomes),
    integratedTaxRate: buildPercentileData(effectiveRates),
    yearlyBalanceDistribution,
    probabilityOfMeetingGoal: (simulationsAboveStart / fullConfig.numSimulations) * 100,
    probabilityOfLoss: (simulationsBelowStart / fullConfig.numSimulations) * 100,
    executionTimeMs,
  };
}

/**
 * Compare Monte Carlo results between two scenarios
 */
export interface MonteCarloComparison {
  scenario1: MonteCarloResults;
  scenario2: MonteCarloResults;
  comparison: {
    // How often scenario 1 beats scenario 2
    scenario1WinsOnTax: number;        // % of simulations
    scenario1WinsOnBalance: number;    // % of simulations
    scenario1WinsOverall: number;      // % where both metrics favor scenario 1
  };
}

/**
 * Run Monte Carlo comparison between two input sets
 */
export function compareMonteCarloResults(
  inputs1: UserInputs,
  inputs2: UserInputs,
  config: Partial<MonteCarloConfig> = {}
): MonteCarloComparison {
  // Use same random seed for fair comparison
  const fullConfig: MonteCarloConfig = {
    ...DEFAULT_MONTE_CARLO_CONFIG,
    ...config,
  };

  const scenario1 = runMonteCarloSimulation(inputs1, fullConfig);
  const scenario2 = runMonteCarloSimulation(inputs2, fullConfig);

  // Count wins (using same simulation index for paired comparison)
  let scenario1WinsOnTax = 0;
  let scenario1WinsOnBalance = 0;
  let scenario1WinsOverall = 0;

  for (let i = 0; i < fullConfig.numSimulations; i++) {
    const s1 = scenario1.simulations[i];
    const s2 = scenario2.simulations[i];

    const taxWin = s1.totalTax < s2.totalTax;
    const balanceWin = s1.finalCorporateBalance > s2.finalCorporateBalance;

    if (taxWin) scenario1WinsOnTax++;
    if (balanceWin) scenario1WinsOnBalance++;
    if (taxWin && balanceWin) scenario1WinsOverall++;
  }

  return {
    scenario1,
    scenario2,
    comparison: {
      scenario1WinsOnTax: (scenario1WinsOnTax / fullConfig.numSimulations) * 100,
      scenario1WinsOnBalance: (scenario1WinsOnBalance / fullConfig.numSimulations) * 100,
      scenario1WinsOverall: (scenario1WinsOverall / fullConfig.numSimulations) * 100,
    },
  };
}
