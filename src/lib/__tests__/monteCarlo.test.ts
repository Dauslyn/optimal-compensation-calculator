import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../monteCarlo';
import { getDefaultInputs } from '../localStorage';
import type { UserInputs } from '../types';

function makeLifetimeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...getDefaultInputs(),
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    planningHorizon: 45,
    requiredIncome: 100000,
    retirementSpending: 70000,
    annualCorporateRetainedEarnings: 200000,
    corporateInvestmentBalance: 500000,
    investmentReturnRate: 0.06,
    expectedInflationRate: 0.02,   // NOTE: field is expectedInflationRate, not inflationRate
    actualRRSPBalance: 200000,
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

describe('runMonteCarlo', () => {
  it('returns correct structure', () => {
    const result = runMonteCarlo(makeLifetimeInputs(), { simulationCount: 50 });
    expect(result).not.toBeNull();
    expect(result!.simulationCount).toBe(50);
    expect(result!.percentiles.p10).toHaveLength(45);
    expect(result!.percentiles.p50).toHaveLength(45);
    expect(result!.percentiles.p90).toHaveLength(45);
    expect(result!.successRate).toBeGreaterThanOrEqual(0);
    expect(result!.successRate).toBeLessThanOrEqual(1);
  });

  it('p10 <= p50 <= p90 at every year', () => {
    const result = runMonteCarlo(makeLifetimeInputs(), { simulationCount: 100 });
    expect(result).not.toBeNull();
    for (let i = 0; i < result!.percentiles.p10.length; i++) {
      expect(result!.percentiles.p10[i]).toBeLessThanOrEqual(result!.percentiles.p50[i]);
      expect(result!.percentiles.p50[i]).toBeLessThanOrEqual(result!.percentiles.p90[i]);
    }
  });

  it('higher return rate produces higher median estate', () => {
    const low  = runMonteCarlo(makeLifetimeInputs({ investmentReturnRate: 0.02 }), { simulationCount: 100 });
    const high = runMonteCarlo(makeLifetimeInputs({ investmentReturnRate: 0.10 }), { simulationCount: 100 });
    expect(low).not.toBeNull();
    expect(high).not.toBeNull();
    expect(high!.medianEstate).toBeGreaterThan(low!.medianEstate);
  });

  it('successRate is high for very wealthy scenario', () => {
    const result = runMonteCarlo(
      makeLifetimeInputs({ corporateInvestmentBalance: 10_000_000, retirementSpending: 50000 }),
      { simulationCount: 100 }
    );
    expect(result).not.toBeNull();
    expect(result!.successRate).toBeGreaterThan(0.95);
  });

  it('successRate is low for underfunded scenario', () => {
    const result = runMonteCarlo(
      makeLifetimeInputs({
        corporateInvestmentBalance: 50000,
        actualRRSPBalance: 10000,
        actualTFSABalance: 0,
        annualCorporateRetainedEarnings: 20000,
        retirementSpending: 120000,
      }),
      { simulationCount: 100 }
    );
    expect(result).not.toBeNull();
    expect(result!.successRate).toBeLessThan(0.5);
  });

  it('non-lifetime inputs return null', () => {
    const result = runMonteCarlo(
      makeLifetimeInputs({ planningHorizon: 5 }),
      { simulationCount: 50 }
    );
    expect(result).toBeNull();
  });
});
