/**
 * Tests for IPP (Individual Pension Plan) Calculations
 *
 * Verifies the calculation of IPP contributions, pension adjustments,
 * and comparisons with RRSP limits.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCurrentServiceCost,
  calculatePastServiceCost,
  calculatePensionAdjustment,
  calculateIPPContribution,
  compareIPPvsRRSP,
  estimateIPPAdminCosts,
  calculateNetIPPBenefit,
} from '../tax/ipp';

describe('IPP Calculations', () => {
  describe('calculateCurrentServiceCost', () => {
    it('calculates higher contributions for older members', () => {
      const youngMember = {
        age: 35,
        yearsOfService: 5,
        currentSalary: 150000,
      };

      const olderMember = {
        age: 55,
        yearsOfService: 5,
        currentSalary: 150000,
      };

      const youngCost = calculateCurrentServiceCost(youngMember, 2025);
      const olderCost = calculateCurrentServiceCost(olderMember, 2025);

      // Older members have higher contributions due to less time to grow
      expect(olderCost).toBeGreaterThan(youngCost);
    });

    it('calculates higher contributions for higher salaries', () => {
      const lowSalary = {
        age: 50,
        yearsOfService: 10,
        currentSalary: 80000,
      };

      const highSalary = {
        age: 50,
        yearsOfService: 10,
        currentSalary: 180000,
      };

      const lowCost = calculateCurrentServiceCost(lowSalary, 2025);
      const highCost = calculateCurrentServiceCost(highSalary, 2025);

      expect(highCost).toBeGreaterThan(lowCost);
    });

    it('returns positive contribution amount', () => {
      const member = {
        age: 45,
        yearsOfService: 10,
        currentSalary: 120000,
      };

      const cost = calculateCurrentServiceCost(member, 2025);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('calculatePastServiceCost', () => {
    it('returns zero for zero past years', () => {
      const member = {
        age: 45,
        yearsOfService: 0,
        currentSalary: 100000,
      };

      const cost = calculatePastServiceCost(member, 0, 100000, 2025);
      expect(cost).toBe(0);
    });

    it('returns positive amount for past service', () => {
      const member = {
        age: 50,
        yearsOfService: 10,
        currentSalary: 150000,
      };

      const cost = calculatePastServiceCost(member, 5, 120000, 2025);
      expect(cost).toBeGreaterThan(0);
    });

    it('increases with more past years', () => {
      const member = {
        age: 50,
        yearsOfService: 10,
        currentSalary: 150000,
      };

      const cost5Years = calculatePastServiceCost(member, 5, 120000, 2025);
      const cost10Years = calculatePastServiceCost(member, 10, 120000, 2025);

      expect(cost10Years).toBeGreaterThan(cost5Years);
    });
  });

  describe('calculatePensionAdjustment', () => {
    it('calculates PA that reduces RRSP room', () => {
      const pa = calculatePensionAdjustment(150000, 2025);
      expect(pa).toBeGreaterThan(0);
    });

    it('PA increases with higher salary', () => {
      const paLow = calculatePensionAdjustment(80000, 2025);
      const paHigh = calculatePensionAdjustment(180000, 2025);

      expect(paHigh).toBeGreaterThan(paLow);
    });

    it('PA is at least zero', () => {
      const pa = calculatePensionAdjustment(10000, 2025);
      expect(pa).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateIPPContribution', () => {
    it('returns complete contribution analysis', () => {
      const member = {
        age: 50,
        yearsOfService: 15,
        currentSalary: 175000,
      };

      const result = calculateIPPContribution(member, 0.122, 2025);

      expect(result.currentServiceCost).toBeGreaterThan(0);
      expect(result.totalAnnualContribution).toBeGreaterThan(0);
      expect(result.projectedAnnualPension).toBeGreaterThan(0);
      expect(result.rrspRoomReduction).toBeGreaterThan(0);
      expect(result.effectiveTaxSavings).toBeGreaterThan(0);
      expect(result.breakEvenAge).toBeGreaterThan(0);
    });

    it('calculates tax savings based on corporate rate', () => {
      const member = {
        age: 55,
        yearsOfService: 20,
        currentSalary: 200000,
      };

      const resultLowTax = calculateIPPContribution(member, 0.12, 2025);
      const resultHighTax = calculateIPPContribution(member, 0.26, 2025);

      // Same contribution, different tax savings
      expect(resultHighTax.effectiveTaxSavings).toBeGreaterThan(
        resultLowTax.effectiveTaxSavings
      );
    });
  });

  describe('compareIPPvsRRSP', () => {
    it('shows IPP advantage for older high-income earners', () => {
      const olderHighIncome = {
        age: 55,
        yearsOfService: 20,
        currentSalary: 180000,
      };

      const rrspLimit = 32490; // 2025 RRSP limit

      const result = compareIPPvsRRSP(olderHighIncome, rrspLimit, 2025);

      expect(result.ippContribution).toBeGreaterThan(0);
      expect(result.rrspContribution).toBe(rrspLimit);
      expect(result.notes.length).toBeGreaterThan(0);
    });

    it('provides notes for younger members', () => {
      const youngMember = {
        age: 35,
        yearsOfService: 5,
        currentSalary: 100000,
      };

      const rrspLimit = 32490;

      const result = compareIPPvsRRSP(youngMember, rrspLimit, 2025);

      // Should have a note about IPP not being advantageous under 40
      expect(result.notes.some(n => n.includes('under age 40'))).toBe(true);
    });

    it('notes higher contribution room for 50+ members', () => {
      const member = {
        age: 52,
        yearsOfService: 15,
        currentSalary: 150000,
      };

      const rrspLimit = 32490;

      const result = compareIPPvsRRSP(member, rrspLimit, 2025);

      expect(result.notes.some(n => n.includes('50+'))).toBe(true);
    });
  });

  describe('estimateIPPAdminCosts', () => {
    it('returns flat $2,500 annual fee with no setup or triennial costs', () => {
      const costs = estimateIPPAdminCosts();

      expect(costs.setup).toBe(0);
      expect(costs.annualActuarial).toBe(2500);
      expect(costs.annualAdmin).toBe(0);
      expect(costs.triennialValuation).toBe(0);
    });

    it('total annual cost is $2,500', () => {
      const costs = estimateIPPAdminCosts();
      const annualTotal = costs.annualActuarial + costs.annualAdmin;

      expect(annualTotal).toBe(2500);
    });
  });

  describe('calculateNetIPPBenefit', () => {
    it('calculates net benefit after admin costs', () => {
      const member = {
        age: 50,
        yearsOfService: 15,
        currentSalary: 175000,
      };

      const result = calculateNetIPPBenefit(member, 0.122, 2025);

      expect(result.grossContribution).toBeGreaterThan(0);
      expect(result.adminCosts).toBeGreaterThan(0);
      expect(result.netContribution).toBeLessThan(result.grossContribution);
      expect(result.taxSavings).toBeGreaterThan(0);
      expect(result.netBenefit).toBeGreaterThan(0);
    });

    it('admin costs reduce net contribution', () => {
      const member = {
        age: 55,
        yearsOfService: 20,
        currentSalary: 200000,
      };

      const result = calculateNetIPPBenefit(member, 0.265, 2025);

      const expectedNetContrib = result.grossContribution - result.adminCosts;
      expect(result.netContribution).toBeCloseTo(expectedNetContrib, 2);
    });
  });

  describe('Real-world scenarios', () => {
    it('scenario: 55-year-old professional with $200K salary', () => {
      const professional = {
        age: 55,
        yearsOfService: 25,
        currentSalary: 200000,
      };

      const ipp = calculateIPPContribution(professional, 0.122, 2025);

      // IPP contribution should be meaningful (note: our simplified model may underestimate)
      // Real IPP contributions can be higher due to terminal funding and funding deficits
      expect(ipp.totalAnnualContribution).toBeGreaterThan(20000);

      // Projected pension should be meaningful based on 26 years of service
      expect(ipp.projectedAnnualPension).toBeGreaterThan(50000);

      // Tax savings should be calculated
      expect(ipp.effectiveTaxSavings).toBeGreaterThan(0);
    });

    it('scenario: 40-year-old business owner with $150K salary', () => {
      const owner = {
        age: 40,
        yearsOfService: 10,
        currentSalary: 150000,
      };

      const ipp = calculateIPPContribution(owner, 0.122, 2025);

      // Should have positive contribution
      expect(ipp.totalAnnualContribution).toBeGreaterThan(0);

      // PA should reduce RRSP room
      expect(ipp.rrspRoomReduction).toBeGreaterThan(0);
      expect(ipp.rrspRoomReduction).toBeLessThan(owner.currentSalary * 0.18);
    });

    it('scenario: comparing IPP vs RRSP for 58-year-old', () => {
      const nearRetirement = {
        age: 58,
        yearsOfService: 30,
        currentSalary: 175000,
      };

      const comparison = compareIPPvsRRSP(nearRetirement, 32490, 2025);

      // At 58 with 30 years service, IPP should be advantageous
      expect(comparison.ippAdvantage).toBe(true);
      expect(comparison.difference).toBeGreaterThan(0);
    });
  });
});
