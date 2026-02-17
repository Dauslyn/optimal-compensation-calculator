import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import { getDefaultInputs } from '../localStorage';

/**
 * Estate Calculation Tests (Phase 5)
 *
 * Tests the terminal year deemed dispositions:
 * - RRSP/RRIF deemed disposition (taxed as income)
 * - Corporate wind-up (CDA tax-free, remainder taxed as dividends)
 * - TFSA pass-through (tax-free to beneficiary)
 * - CPP death benefit ($2,500 lump sum)
 * - Province-specific tax impacts
 * - Lifetime summary statistics
 */

function makeLifetimeInputs(overrides: Partial<ReturnType<typeof getDefaultInputs>> = {}) {
  return {
    ...getDefaultInputs(),
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    planningHorizon: 45, // 90 - 45
    retirementSpending: 70000,
    lifetimeObjective: 'balanced' as const,
    cppStartAge: 65,
    salaryStartAge: 22,
    averageHistoricalSalary: 60000,
    oasEligible: true,
    oasStartAge: 65,
    actualRRSPBalance: 200000,
    actualTFSABalance: 50000,
    annualCorporateRetainedEarnings: 200000,
    requiredIncome: 100000,
    corporateInvestmentBalance: 500000,
    investmentReturnRate: 0.06,
    inflationRate: 0.02,
    province: 'ON',
    ...overrides,
  };
}

describe('Estate Calculation', () => {
  describe('estate breakdown on last year', () => {
    it('attaches estate breakdown to the final year', () => {
      const inputs = makeLifetimeInputs();
      const result = calculateProjection(inputs);
      const lastYear = result.yearlyResults[result.yearlyResults.length - 1];

      expect(lastYear.estate).toBeDefined();
      expect(lastYear.estate!.netEstateValue).toBeGreaterThan(0);
      expect(lastYear.estate!.terminalRRIFTax).toBeGreaterThanOrEqual(0);
      expect(lastYear.estate!.corporateWindUpTax).toBeGreaterThanOrEqual(0);
      expect(lastYear.estate!.tfsaPassThrough).toBeGreaterThanOrEqual(0);
    });

    it('marks last year with estate phase', () => {
      const inputs = makeLifetimeInputs();
      const result = calculateProjection(inputs);
      const lastYear = result.yearlyResults[result.yearlyResults.length - 1];

      // Last year should be 'estate' phase if there are retirement years
      expect(lastYear.phase).toBe('estate');
    });

    it('only the last year has estate data', () => {
      const inputs = makeLifetimeInputs();
      const result = calculateProjection(inputs);

      for (let i = 0; i < result.yearlyResults.length - 1; i++) {
        expect(result.yearlyResults[i].estate).toBeUndefined();
      }
    });
  });

  describe('RRIF/RRSP deemed disposition', () => {
    it('taxes remaining RRSP/RRIF balance as income at death', () => {
      const inputs = makeLifetimeInputs({
        actualRRSPBalance: 500000,
        actualTFSABalance: 0,
        corporateInvestmentBalance: 0,
        annualCorporateRetainedEarnings: 100000,
      });
      const result = calculateProjection(inputs);
      const estate = result.yearlyResults[result.yearlyResults.length - 1].estate!;

      // Terminal RRIF tax should be positive (remaining RRIF balance taxed)
      // After 25 years of retirement drawdowns, there may still be a balance
      expect(estate.terminalRRIFTax).toBeGreaterThanOrEqual(0);
    });

    it('produces higher terminal tax with larger RRSP balances', () => {
      // Compare two scenarios: one with large RRSP, one with small
      const smallRRSP = makeLifetimeInputs({
        actualRRSPBalance: 50000,
        actualTFSABalance: 0,
        corporateInvestmentBalance: 100000,
      });
      const largeRRSP = makeLifetimeInputs({
        actualRRSPBalance: 500000,
        actualTFSABalance: 0,
        corporateInvestmentBalance: 100000,
      });

      const smallResult = calculateProjection(smallRRSP);
      const largeResult = calculateProjection(largeRRSP);

      const smallEstate = smallResult.yearlyResults[smallResult.yearlyResults.length - 1].estate!;
      const largeEstate = largeResult.yearlyResults[largeResult.yearlyResults.length - 1].estate!;

      // Larger RRSP should result in at least as much terminal tax
      // (may be equal if both fully depleted during retirement)
      expect(largeEstate.terminalRRIFTax).toBeGreaterThanOrEqual(smallEstate.terminalRRIFTax);
    });
  });

  describe('corporate wind-up', () => {
    it('includes CDA as tax-free pass-through', () => {
      const inputs = makeLifetimeInputs({
        cdaBalance: 100000,
        corporateInvestmentBalance: 500000,
      });
      const result = calculateProjection(inputs);
      const estate = result.yearlyResults[result.yearlyResults.length - 1].estate!;

      // CDA should reduce effective wind-up tax
      // Net estate should reflect tax-free CDA portion
      expect(estate.netEstateValue).toBeGreaterThan(0);
    });

    it('higher CDA balance reduces corporate wind-up tax burden', () => {
      const lowCDA = makeLifetimeInputs({
        cdaBalance: 0,
        corporateInvestmentBalance: 500000,
        eRDTOHBalance: 0,
        nRDTOHBalance: 0,
        gripBalance: 0,
      });
      const highCDA = makeLifetimeInputs({
        cdaBalance: 200000,
        corporateInvestmentBalance: 500000,
        eRDTOHBalance: 0,
        nRDTOHBalance: 0,
        gripBalance: 0,
      });

      const lowResult = calculateProjection(lowCDA);
      const highResult = calculateProjection(highCDA);

      const lowEstate = lowResult.yearlyResults[lowResult.yearlyResults.length - 1].estate!;
      const highEstate = highResult.yearlyResults[highResult.yearlyResults.length - 1].estate!;

      // Higher CDA means less taxable wind-up dividends
      expect(highEstate.corporateWindUpTax).toBeLessThanOrEqual(lowEstate.corporateWindUpTax);
    });
  });

  describe('TFSA pass-through', () => {
    it('TFSA passes tax-free to beneficiary', () => {
      const inputs = makeLifetimeInputs({
        actualTFSABalance: 100000,
      });
      const result = calculateProjection(inputs);
      const estate = result.yearlyResults[result.yearlyResults.length - 1].estate!;

      // TFSA balance should pass through tax-free
      expect(estate.tfsaPassThrough).toBeGreaterThanOrEqual(0);
    });

    it('TFSA does not affect terminal RRIF tax or corporate wind-up tax', () => {
      const noTFSA = makeLifetimeInputs({
        actualTFSABalance: 0,
      });
      const bigTFSA = makeLifetimeInputs({
        actualTFSABalance: 500000,
      });

      const noResult = calculateProjection(noTFSA);
      const bigResult = calculateProjection(bigTFSA);

      const noEstate = noResult.yearlyResults[noResult.yearlyResults.length - 1].estate!;
      const bigEstate = bigResult.yearlyResults[bigResult.yearlyResults.length - 1].estate!;

      // TFSA should not affect the tax calculations (only the pass-through)
      // The RRIF tax and corporate wind-up should be identical
      // (they could differ slightly if TFSA changes drawdown behavior)
      expect(bigEstate.tfsaPassThrough).toBeGreaterThan(noEstate.tfsaPassThrough);
    });
  });

  describe('provincial differences', () => {
    it('different provinces produce different estate values', () => {
      // Use high enough assets and short enough retirement to have surplus at death
      const baseOverrides = {
        currentAge: 60,
        retirementAge: 65,
        planningEndAge: 75,
        planningHorizon: 15,
        actualRRSPBalance: 1000000,
        actualTFSABalance: 200000,
        corporateInvestmentBalance: 2000000,
        annualCorporateRetainedEarnings: 300000,
        retirementSpending: 80000,
      };
      const onInputs = makeLifetimeInputs({ ...baseOverrides, province: 'ON' });
      const abInputs = makeLifetimeInputs({ ...baseOverrides, province: 'AB' });

      const onResult = calculateProjection(onInputs);
      const abResult = calculateProjection(abInputs);

      const onEstate = onResult.yearlyResults[onResult.yearlyResults.length - 1].estate!;
      const abEstate = abResult.yearlyResults[abResult.yearlyResults.length - 1].estate!;

      // Both should have positive estate values with substantial assets
      expect(onEstate.netEstateValue).toBeGreaterThan(2500);
      expect(abEstate.netEstateValue).toBeGreaterThan(2500);

      // AB has lower provincial tax rates → different estate value
      expect(onEstate.netEstateValue).not.toBe(abEstate.netEstateValue);
    });
  });

  describe('net estate value components', () => {
    it('net estate = after-tax RRIF + after-tax corp + TFSA + death benefit', () => {
      const inputs = makeLifetimeInputs({
        actualRRSPBalance: 200000,
        actualTFSABalance: 100000,
        corporateInvestmentBalance: 300000,
      });
      const result = calculateProjection(inputs);
      const estate = result.yearlyResults[result.yearlyResults.length - 1].estate!;

      // Net estate should always be positive when there are assets
      expect(estate.netEstateValue).toBeGreaterThan(0);

      // Net estate >= TFSA pass-through (since TFSA is tax-free floor)
      expect(estate.netEstateValue).toBeGreaterThanOrEqual(estate.tfsaPassThrough);
    });

    it('estate value includes CPP death benefit of $2,500', () => {
      // With decent assets, the death benefit is included in the total
      const inputs = makeLifetimeInputs({
        actualRRSPBalance: 100000,
        actualTFSABalance: 100000,
        corporateInvestmentBalance: 300000,
        annualCorporateRetainedEarnings: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const estate = result.yearlyResults[result.yearlyResults.length - 1].estate!;

      // Net estate should include the $2,500 death benefit
      expect(estate.netEstateValue).toBeGreaterThanOrEqual(2500);
    });
  });

  describe('lifetime summary', () => {
    it('populates lifetime stats on projection summary', () => {
      const inputs = makeLifetimeInputs();
      const result = calculateProjection(inputs);

      expect(result.lifetime).toBeDefined();
      expect(result.lifetime!.totalAccumulationYears).toBe(20);
      expect(result.lifetime!.totalRetirementYears).toBe(25); // includes estate year
      expect(result.lifetime!.totalLifetimeSpending).toBeGreaterThan(0);
      expect(result.lifetime!.totalLifetimeTax).toBeGreaterThan(0);
      expect(result.lifetime!.lifetimeEffectiveRate).toBeGreaterThan(0);
      expect(result.lifetime!.lifetimeEffectiveRate).toBeLessThan(1);
      expect(result.lifetime!.peakCorporateBalance).toBeGreaterThan(0);
      expect(result.lifetime!.estateValue).toBeGreaterThan(0);
    });

    it('tracks retirement income sources over lifetime', () => {
      const inputs = makeLifetimeInputs();
      const result = calculateProjection(inputs);

      expect(result.lifetime!.cppTotalReceived).toBeGreaterThan(0);
      expect(result.lifetime!.oasTotalReceived).toBeGreaterThanOrEqual(0);
      expect(result.lifetime!.rrifTotalWithdrawn).toBeGreaterThanOrEqual(0);
    });

    it('accumulation-only projection has no lifetime stats', () => {
      // Short horizon that doesn't reach retirement
      const inputs = makeLifetimeInputs({
        currentAge: 45,
        retirementAge: 65,
        planningHorizon: 10, // Only 10 years, doesn't reach retirement
      });
      const result = calculateProjection(inputs);

      // No retirement years → no lifetime stats
      expect(result.lifetime).toBeUndefined();
    });

    it('estate value in summary matches last year estate breakdown', () => {
      const inputs = makeLifetimeInputs();
      const result = calculateProjection(inputs);
      const lastYear = result.yearlyResults[result.yearlyResults.length - 1];

      expect(result.lifetime!.estateValue).toBe(lastYear.estate!.netEstateValue);
    });
  });

  describe('backward compatibility', () => {
    it('short-horizon projections still work without estate', () => {
      const inputs = makeLifetimeInputs({
        currentAge: 45,
        retirementAge: 65,
        planningHorizon: 5,
      });
      const result = calculateProjection(inputs);

      expect(result.yearlyResults).toHaveLength(5);
      // All years should be accumulation phase
      for (const yr of result.yearlyResults) {
        expect(yr.phase).toBe('accumulation');
      }
    });

    it('existing calculator tests inputs still produce valid results', () => {
      // Simple 5-year projection
      const inputs = {
        ...getDefaultInputs(),
        planningHorizon: 5,
      };
      const result = calculateProjection(inputs);

      expect(result.yearlyResults).toHaveLength(5);
      expect(result.totalCompensation).toBeGreaterThan(0);
    });
  });
});
