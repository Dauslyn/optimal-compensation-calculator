/**
 * Tests for after-tax wealth calculation.
 * Calculates true after-tax value if all assets were liquidated at end of planning horizon.
 */

import { describe, it, expect } from 'vitest';
import { calculateAfterTaxWealth } from '../strategyComparison';
import type { ProjectionSummary } from '../types';

// Minimal mock with only the fields calculateAfterTaxWealth needs
function makeMockSummary(overrides: Partial<ProjectionSummary> = {}): ProjectionSummary {
  return {
    totalCompensation: 500000,
    totalSalary: 300000,
    totalDividends: 200000,
    totalPersonalTax: 80000,
    totalCorporateTax: 20000,
    totalCorporateTaxOnActive: 15000,
    totalCorporateTaxOnPassive: 5000,
    totalRdtohRefund: 2000,
    totalTax: 100000,
    effectiveTaxRate: 0.32,
    effectiveCompensationRate: 0.28,
    effectivePassiveRate: 0.15,
    finalCorporateBalance: 250000,
    totalRRSPRoomGenerated: 50000,
    totalRRSPContributions: 40000,
    totalTFSAContributions: 30000,
    averageAnnualIncome: 100000,
    yearlyResults: [],
    ...overrides,
  };
}

describe('calculateAfterTaxWealth', () => {
  const summary = makeMockSummary();

  it('calculates after-tax wealth at current rate', () => {
    const result = calculateAfterTaxWealth(summary, 'ON', 0.35);

    // baseWealth = totalAfterTax (TFSA contributions already came from after-tax income)
    // totalAfterTax = totalCompensation - totalTax = 500k - 100k = 400k
    // baseWealth = 400k
    // RRSP = 40k * (1 - 0.35) = 26k
    // Corp = 250k * (1 - 0.40) = 150k
    // Total = 400k + 26k + 150k = 576k
    expect(result.atCurrentRate).toBeCloseTo(576000, 0);
  });

  it('calculates after-tax wealth at lower rate (marginal - 10%)', () => {
    const result = calculateAfterTaxWealth(summary, 'ON', 0.35);

    // Lower rate = 0.35 - 0.10 = 0.25
    // RRSP = 40k * (1 - 0.25) = 30k
    // Total = 400k + 30k + 150k = 580k
    expect(result.atLowerRate).toBeCloseTo(580000, 0);
  });

  it('calculates after-tax wealth at top provincial rate', () => {
    const result = calculateAfterTaxWealth(summary, 'ON', 0.35);

    // Top ON rate = 0.5353
    // RRSP = 40k * (1 - 0.5353) = 18,588
    // Total = 400k + 18,588 + 150k = 568,588
    expect(result.atTopRate).toBeCloseTo(568588, 0);
  });

  it('lower rate floors at 20% minimum', () => {
    const result = calculateAfterTaxWealth(summary, 'AB', 0.22);

    // Lower would be 0.12, but floors at 0.20
    expect(result.assumptions.lowerRRSPWithdrawalRate).toBe(0.20);
  });

  it('returns correct assumptions object', () => {
    const result = calculateAfterTaxWealth(summary, 'BC', 0.40);

    expect(result.assumptions.currentRRSPWithdrawalRate).toBe(0.40);
    expect(result.assumptions.lowerRRSPWithdrawalRate).toBeCloseTo(0.30, 10);
    expect(result.assumptions.topRRSPWithdrawalRate).toBeCloseTo(0.535, 3);
    expect(result.assumptions.corpLiquidationRate).toBe(0.40);
  });

  it('lower rate always gives higher wealth than current rate', () => {
    const result = calculateAfterTaxWealth(summary, 'ON', 0.35);
    expect(result.atLowerRate).toBeGreaterThan(result.atCurrentRate);
  });

  it('current rate always gives higher wealth than top rate', () => {
    const result = calculateAfterTaxWealth(summary, 'ON', 0.35);
    expect(result.atCurrentRate).toBeGreaterThan(result.atTopRate);
  });

  it('handles zero RRSP contributions gracefully', () => {
    const noRRSP = makeMockSummary({ totalRRSPContributions: 0 });
    const result = calculateAfterTaxWealth(noRRSP, 'ON', 0.35);

    // All three scenarios should be equal (no RRSP variation)
    expect(result.atCurrentRate).toBe(result.atLowerRate);
    expect(result.atCurrentRate).toBe(result.atTopRate);
  });

  it('handles zero corporate balance', () => {
    const noCorp = makeMockSummary({ finalCorporateBalance: 0 });
    const result = calculateAfterTaxWealth(noCorp, 'ON', 0.35);

    // No corp liquidation component
    expect(result.atCurrentRate).toBeLessThan(
      calculateAfterTaxWealth(summary, 'ON', 0.35).atCurrentRate
    );
  });
});
