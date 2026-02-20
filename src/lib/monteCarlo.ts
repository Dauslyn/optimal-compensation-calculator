/**
 * Monte Carlo Simulation for Investment Returns
 *
 * Runs thousands of simulations with variable returns to show
 * probability distributions and confidence intervals for outcomes.
 *
 * Also provides runMonteCarlo() for lifetime projection Monte Carlo.
 */

import type { UserInputs } from './types';
import { calculateProjection } from './calculator';

// ─── Lifetime Monte Carlo ────────────────────────────────────────────────────

export interface MonteCarloOptions {
  simulationCount?: number;   // Default 500
  returnStdDev?: number;      // Default 0.12
  inflationStdDev?: number;   // Default 0.01
}

export interface MonteCarloResult {
  simulationCount: number;
  percentiles: {
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
  };
  successRate: number;
  medianEstate: number;
}

/** Box-Muller transform: standard normal sample */
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Run Monte Carlo simulation on a lifetime projection.
 * Returns null if the inputs don't produce a retirement phase.
 */
export function runMonteCarlo(
  inputs: UserInputs,
  options: MonteCarloOptions = {},
): MonteCarloResult | null {
  const simulationCount = options.simulationCount ?? 500;
  const returnStdDev    = options.returnStdDev    ?? 0.12;
  const inflationStdDev = options.inflationStdDev ?? 0.01;

  // Quick check: does a deterministic run produce retirement years?
  const pilot = calculateProjection(inputs);
  if (!pilot.lifetime) return null;

  const years = inputs.planningHorizon;

  // wealthByYear[sim][year] = total wealth
  const wealthByYear: number[][] = Array.from({ length: simulationCount }, () =>
    new Array(years).fill(0)
  );
  let successCount = 0;

  for (let sim = 0; sim < simulationCount; sim++) {
    // Build a per-year return sequence.
    // Geometric mean correction: arithmeticMean - σ²/2 removes the
    // ~0.7%/yr log-normal bias. The user's investmentReturnRate is treated as the
    // geometric (compounded) return, which is the convention in financial planning.
    const geometricMean = inputs.investmentReturnRate - (returnStdDev ** 2) / 2;
    const perYearReturns = Array.from({ length: years }, () =>
      clamp(
        geometricMean + randn() * returnStdDev,
        -0.40,
        0.60,
      )
    );
    // Use single inflation draw per simulation (keeps projection coherent)
    const simInflation = clamp(
      (inputs.expectedInflationRate ?? 0.02) + randn() * inflationStdDev,
      0.0,
      0.08,
    );

    // Run projection with mean of the per-year return sequence
    const meanReturn = perYearReturns.reduce((a, b) => a + b, 0) / years;
    const simInputs: UserInputs = {
      ...inputs,
      investmentReturnRate: meanReturn,
      expectedInflationRate: simInflation,
    };
    const result = calculateProjection(simInputs);

    for (let y = 0; y < years; y++) {
      const yr = result.yearlyResults[y];
      if (!yr) {
        wealthByYear[sim][y] = 0;
      } else {
        const bal = yr.balances;
        wealthByYear[sim][y] = bal
          ? bal.rrspBalance + bal.tfsaBalance + Math.max(0, bal.corporateBalance) + (bal.ippFundBalance ?? 0)
          : Math.max(0, yr.notionalAccounts?.corporateInvestments ?? 0);
      }
    }

    // Success = wealth > 0 in final year
    if (wealthByYear[sim][years - 1] > 0) successCount++;
  }

  // Compute percentiles at each year
  const percentileAt = (sorted: number[], p: number) => {
    const idx = Math.floor(p * (sorted.length - 1));
    return sorted[idx];
  };

  const p10: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p90: number[] = [];

  for (let y = 0; y < years; y++) {
    const sorted = wealthByYear.map(s => s[y]).sort((a, b) => a - b);
    p10.push(percentileAt(sorted, 0.10));
    p25.push(percentileAt(sorted, 0.25));
    p50.push(percentileAt(sorted, 0.50));
    p75.push(percentileAt(sorted, 0.75));
    p90.push(percentileAt(sorted, 0.90));
  }

  return {
    simulationCount,
    percentiles: { p10, p25, p50, p75, p90 },
    successRate: successCount / simulationCount,
    medianEstate: p50[years - 1],
  };
}
