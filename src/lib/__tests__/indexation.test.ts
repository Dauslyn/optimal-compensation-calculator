/**
 * Tests for the tax indexation module
 *
 * Verifies that:
 * 1. Known tax year values match official CRA data
 * 2. Future year projections apply inflation correctly
 * 3. Utility functions work as expected
 */

import { describe, it, expect } from 'vitest';
import {
  KNOWN_TAX_YEARS,
  getTaxYearData,
  getDefaultInflationRate,
  getStartingYear,
  getLatestKnownYear,
  inflateAmount,
  CRA_INDEXATION_FACTORS,
} from '../tax/indexation';

describe('KNOWN_TAX_YEARS', () => {
  describe('2025 values', () => {
    const data2025 = KNOWN_TAX_YEARS[2025];

    it('should have correct CPP YMPE for 2025', () => {
      expect(data2025.cpp.ympe).toBe(71300);
    });

    it('should have correct CPP2 YAMPE for 2025', () => {
      expect(data2025.cpp2.secondCeiling).toBe(81200);
    });

    it('should have correct CPP rate', () => {
      expect(data2025.cpp.rate).toBe(0.0595);
    });

    it('should have correct CPP max contribution for 2025', () => {
      // (71300 - 3500) * 0.0595 = 4034.10
      expect(data2025.cpp.maxContribution).toBe(4034.10);
    });

    it('should have correct CPP2 max contribution for 2025', () => {
      // (81200 - 71300) * 0.04 = 396.00
      expect(data2025.cpp2.maxContribution).toBe(396.00);
    });

    it('should have correct EI rate for 2025', () => {
      expect(data2025.ei.rate).toBe(0.0164);
    });

    it('should have correct EI max insurable earnings for 2025', () => {
      expect(data2025.ei.maxInsurableEarnings).toBe(65700);
    });

    it('should have correct EI max contribution for 2025', () => {
      expect(data2025.ei.maxContribution).toBe(1077.48);
    });

    it('should have correct federal basic personal amount for 2025', () => {
      expect(data2025.federal.basicPersonalAmount).toBe(15705);
    });

    it('should have correct federal tax brackets for 2025', () => {
      expect(data2025.federal.brackets[0].rate).toBe(0.145); // Blended rate
      expect(data2025.federal.brackets[1].threshold).toBe(57375);
      expect(data2025.federal.brackets[2].threshold).toBe(114750);
      expect(data2025.federal.brackets[3].threshold).toBe(177882);
      expect(data2025.federal.brackets[4].threshold).toBe(253414);
    });

    it('should have correct Ontario surtax thresholds for 2025', () => {
      expect(data2025.provincial.surtax.firstThreshold).toBe(5710);
      expect(data2025.provincial.surtax.secondThreshold).toBe(7307);
    });

    it('should have correct TFSA limit for 2025', () => {
      expect(data2025.tfsa.annualLimit).toBe(7000);
    });

    it('should have correct RRSP limit for 2025', () => {
      expect(data2025.rrsp.dollarLimit).toBe(32490);
    });
  });

  describe('2026 values', () => {
    const data2026 = KNOWN_TAX_YEARS[2026];

    it('should have correct CPP YMPE for 2026', () => {
      expect(data2026.cpp.ympe).toBe(74600);
    });

    it('should have correct CPP2 YAMPE for 2026', () => {
      expect(data2026.cpp2.secondCeiling).toBe(85000);
    });

    it('should have correct CPP max contribution for 2026', () => {
      expect(data2026.cpp.maxContribution).toBe(4230.45);
    });

    it('should have correct CPP2 max contribution for 2026', () => {
      expect(data2026.cpp2.maxContribution).toBe(416.00);
    });

    it('should have correct EI rate for 2026', () => {
      expect(data2026.ei.rate).toBe(0.0163);
    });

    it('should have correct EI max insurable earnings for 2026', () => {
      expect(data2026.ei.maxInsurableEarnings).toBe(68900);
    });

    it('should have correct EI max contribution for 2026', () => {
      expect(data2026.ei.maxContribution).toBe(1123.07);
    });

    it('should have correct federal basic personal amount for 2026', () => {
      expect(data2026.federal.basicPersonalAmount).toBe(16452);
    });

    it('should have correct federal tax brackets for 2026', () => {
      expect(data2026.federal.brackets[0].rate).toBe(0.14); // Full year at 14%
      expect(data2026.federal.brackets[1].threshold).toBe(58523);
      expect(data2026.federal.brackets[2].threshold).toBe(117045);
      expect(data2026.federal.brackets[3].threshold).toBe(181440);
      expect(data2026.federal.brackets[4].threshold).toBe(258482);
    });

    it('should have correct RRSP limit for 2026', () => {
      expect(data2026.rrsp.dollarLimit).toBe(33810);
    });
  });
});

describe('getTaxYearData', () => {
  it('should return correct federal data for 2025 (Ontario default)', () => {
    const data = getTaxYearData(2025);
    const knownFederal = KNOWN_TAX_YEARS[2025].federal;

    // Federal data should match
    expect(data.federal.basicPersonalAmount).toBe(knownFederal.basicPersonalAmount);
    expect(data.federal.brackets).toEqual(knownFederal.brackets);

    // CPP/EI data should match
    expect(data.cpp.ympe).toBe(KNOWN_TAX_YEARS[2025].cpp.ympe);
    expect(data.ei.maxInsurableEarnings).toBe(KNOWN_TAX_YEARS[2025].ei.maxInsurableEarnings);

    // Provincial data should be for Ontario
    expect(data.provincial.basicPersonalAmount).toBe(12399);
    expect(data.provincial.surtax.firstThreshold).toBe(5710);
  });

  it('should return correct federal data for 2026 (Ontario default)', () => {
    const data = getTaxYearData(2026);
    const knownFederal = KNOWN_TAX_YEARS[2026].federal;

    // Federal data should match
    expect(data.federal.basicPersonalAmount).toBe(knownFederal.basicPersonalAmount);
    expect(data.federal.brackets).toEqual(knownFederal.brackets);

    // CPP/EI data should match
    expect(data.cpp.ympe).toBe(KNOWN_TAX_YEARS[2026].cpp.ympe);
    expect(data.ei.maxInsurableEarnings).toBe(KNOWN_TAX_YEARS[2026].ei.maxInsurableEarnings);

    // Provincial data should be for Ontario
    expect(data.provincial.basicPersonalAmount).toBe(12647);
    expect(data.provincial.surtax.firstThreshold).toBe(5824);
  });

  it('should return different provincial data for different provinces', () => {
    const ontarioData = getTaxYearData(2025, 0.02, 'ON');
    const albertaData = getTaxYearData(2025, 0.02, 'AB');
    const bcData = getTaxYearData(2025, 0.02, 'BC');

    // Federal data should be the same
    expect(ontarioData.federal).toEqual(albertaData.federal);
    expect(ontarioData.federal).toEqual(bcData.federal);

    // Provincial data should differ
    expect(ontarioData.provincial.basicPersonalAmount).not.toBe(albertaData.provincial.basicPersonalAmount);
    expect(ontarioData.provincial.brackets[0].rate).not.toBe(albertaData.provincial.brackets[0].rate);

    // BC has no surtax
    expect(bcData.provincial.surtax.firstThreshold).toBe(Infinity);

    // Ontario has surtax
    expect(ontarioData.provincial.surtax.firstThreshold).toBe(5710);
  });

  it('should return correct Quebec tax rates for 2025', () => {
    const quebecData = getTaxYearData(2025, 0.02, 'QC');
    const ontarioData = getTaxYearData(2025, 0.02, 'ON');

    // Federal data should be the same
    expect(quebecData.federal).toEqual(ontarioData.federal);

    // Quebec has distinct tax brackets (QC uses 14%, 19%, 24%, 25.75%)
    expect(quebecData.provincial.brackets[0].rate).toBe(0.14);
    expect(quebecData.provincial.brackets[1].rate).toBe(0.19);
    expect(quebecData.provincial.brackets[2].rate).toBe(0.24);
    expect(quebecData.provincial.brackets[3].rate).toBe(0.2575);

    // Quebec bracket thresholds (2025)
    expect(quebecData.provincial.brackets[1].threshold).toBe(51780);
    expect(quebecData.provincial.brackets[2].threshold).toBe(103545);
    expect(quebecData.provincial.brackets[3].threshold).toBe(126000);

    // Quebec basic personal amount (2025)
    expect(quebecData.provincial.basicPersonalAmount).toBe(18056);

    // Quebec has no Ontario-style surtax
    expect(quebecData.provincial.surtax.firstThreshold).toBe(Infinity);

    // Quebec dividend tax credits differ from Ontario
    expect(quebecData.dividend.eligible.provincialCredit).toBe(0.117);
    expect(quebecData.dividend.nonEligible.provincialCredit).toBe(0.0342);

    // Quebec corporate rates
    expect(quebecData.corporate.smallBusiness).toBeCloseTo(0.122, 3); // 9% federal + 3.2% QC
    expect(quebecData.corporate.general).toBeCloseTo(0.265, 3); // 15% federal + 11.5% QC

    // Verify Quebec rates are different from Ontario
    expect(quebecData.provincial.brackets[0].rate).not.toBe(ontarioData.provincial.brackets[0].rate);
    expect(quebecData.dividend.eligible.provincialCredit).not.toBe(ontarioData.dividend.eligible.provincialCredit);
  });

  it('should provide province-specific data for effective dividend rate calculations', () => {
    // This test verifies that each province has unique dividend tax credit rates
    // which are used to calculate province-specific effective dividend tax rates
    const provinces = ['ON', 'QC', 'AB', 'BC'] as const;
    const eligibleCredits: number[] = [];
    const nonEligibleCredits: number[] = [];

    for (const province of provinces) {
      const data = getTaxYearData(2025, 0.02, province);
      eligibleCredits.push(data.dividend.eligible.provincialCredit);
      nonEligibleCredits.push(data.dividend.nonEligible.provincialCredit);

      // Verify credits are reasonable (between 0 and 20%)
      expect(data.dividend.eligible.provincialCredit).toBeGreaterThanOrEqual(0);
      expect(data.dividend.eligible.provincialCredit).toBeLessThan(0.2);
      expect(data.dividend.nonEligible.provincialCredit).toBeGreaterThanOrEqual(0);
      expect(data.dividend.nonEligible.provincialCredit).toBeLessThan(0.1);
    }

    // Verify not all provinces have the same credits (they should vary)
    const uniqueEligible = new Set(eligibleCredits);
    const uniqueNonEligible = new Set(nonEligibleCredits);
    expect(uniqueEligible.size).toBeGreaterThan(1);
    expect(uniqueNonEligible.size).toBeGreaterThan(1);
  });

  it('should return valid tax data for all 13 provinces/territories', () => {
    // All Canadian provinces and territories
    const allProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] as const;

    for (const province of allProvinces) {
      const data = getTaxYearData(2025, 0.02, province);

      // Each province should have valid federal data (same for all)
      expect(data.federal.brackets.length).toBeGreaterThan(0);
      expect(data.federal.basicPersonalAmount).toBeGreaterThan(10000);

      // Each province should have valid provincial data
      expect(data.provincial.brackets.length).toBeGreaterThan(0);
      expect(data.provincial.basicPersonalAmount).toBeGreaterThan(0);

      // Each province should have dividend tax credit rates
      expect(data.dividend.eligible.provincialCredit).toBeGreaterThanOrEqual(0);
      expect(data.dividend.nonEligible.provincialCredit).toBeGreaterThanOrEqual(0);

      // Each province should have corporate rates
      expect(data.corporate.smallBusiness).toBeGreaterThan(0.05); // At least 5%
      expect(data.corporate.general).toBeGreaterThan(0.2); // At least 20%

      // CPP and EI should be present
      expect(data.cpp.ympe).toBeGreaterThan(60000);
      expect(data.ei.maxInsurableEarnings).toBeGreaterThan(50000);
    }
  });

  it('should project 2027 from 2026 with default inflation', () => {
    const data2027 = getTaxYearData(2027, 0.02);
    const data2026 = KNOWN_TAX_YEARS[2026];

    // YMPE should be inflated by 2%
    expect(data2027.cpp.ympe).toBe(Math.round(data2026.cpp.ympe * 1.02));

    // Federal BPA should be inflated
    expect(data2027.federal.basicPersonalAmount).toBe(Math.round(data2026.federal.basicPersonalAmount * 1.02));

    // Rates should not change
    expect(data2027.cpp.rate).toBe(data2026.cpp.rate);
    expect(data2027.federal.brackets[0].rate).toBe(data2026.federal.brackets[0].rate);
  });

  it('should project multiple years forward correctly', () => {
    const data2028 = getTaxYearData(2028, 0.02);
    const data2026 = KNOWN_TAX_YEARS[2026];

    // Two years of 2% inflation = 1.02^2 = 1.0404
    const expectedYmpe = Math.round(data2026.cpp.ympe * 1.0404);
    expect(data2028.cpp.ympe).toBe(expectedYmpe);
  });

  it('should handle custom inflation rates', () => {
    const data2027_high = getTaxYearData(2027, 0.05);
    const data2026 = KNOWN_TAX_YEARS[2026];

    const expectedYmpe = Math.round(data2026.cpp.ympe * 1.05);
    expect(data2027_high.cpp.ympe).toBe(expectedYmpe);
  });
});

describe('utility functions', () => {
  it('getDefaultInflationRate should return most recent CRA factor', () => {
    const rate = getDefaultInflationRate();
    // Should be 2026's factor (2.0%) as it's the most recent
    expect(rate).toBe(0.02);
  });

  it('getLatestKnownYear should return 2026', () => {
    expect(getLatestKnownYear()).toBe(2026);
  });

  it('getStartingYear should return a valid year', () => {
    const year = getStartingYear();
    expect(year).toBeGreaterThanOrEqual(2025);
    expect(year).toBeLessThanOrEqual(2030); // Reasonable future bound
  });

  it('inflateAmount should apply compound inflation', () => {
    const base = 100000;
    const inflated1 = inflateAmount(base, 1, 0.02);
    expect(inflated1).toBe(102000);

    const inflated2 = inflateAmount(base, 2, 0.02);
    expect(inflated2).toBeCloseTo(104040, 0);

    const inflated5 = inflateAmount(base, 5, 0.02);
    expect(inflated5).toBeCloseTo(110408.08, 0);
  });

  it('inflateAmount with zero years should return base amount', () => {
    expect(inflateAmount(100000, 0, 0.02)).toBe(100000);
  });

  it('inflateAmount with zero inflation should return base amount', () => {
    expect(inflateAmount(100000, 5, 0)).toBe(100000);
  });
});

describe('CRA_INDEXATION_FACTORS', () => {
  it('should have 2025 factor of 2.7%', () => {
    expect(CRA_INDEXATION_FACTORS[2025]).toBe(0.027);
  });

  it('should have 2026 factor of 2.0%', () => {
    expect(CRA_INDEXATION_FACTORS[2026]).toBe(0.02);
  });
});
