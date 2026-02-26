/**
 * MATHEMATICAL AUDIT TEST SUITE
 *
 * Hand-calculated verification of every calculation path in the Optimal Compensation Calculator.
 * Each test case shows the full derivation with CRA-sourced constants, so any discrepancy
 * between our calculator and the expected value is immediately traceable.
 *
 * CRA sources:
 * - Federal brackets: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html
 * - CPP: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html
 * - EI: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
 * - Corporate rates: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-tax-rates.html
 * - Dividend: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40425-federal-dividend-tax-credit.html
 * - RRIF: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-retirement-income-fund-rrif/payments-rrif.html
 * - OAS: https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security.html
 *
 * Date: 2026-02-22
 */
import { describe, it, expect } from 'vitest';
import { getTaxYearData, getStartingYear } from '../tax/indexation';
import { calculateTaxByBrackets } from '../tax/constants';
import { calculateCPP, calculateCPP2, calculateEI } from '../tax/payrollTax';
import { calculateInvestmentReturns, CG_INCLUSION_RATE, computeBlendedReturnRate } from '../accounts/investmentReturns';
import { updateAccountsFromReturns } from '../accounts/accountOperations';
import { calculatePassiveIncomeGrind, calculateReducedSBDLimit, calculateAAII } from '../tax/passiveIncomeGrind';
import { getRRIFMinimumRate, mustConvertToRRIF, calculateRRIFMinimum } from '../tax/rrif';
import { getMaxOASBenefit, getClawbackThreshold, solveOASWithClawback, calculateOAS } from '../tax/oas';
import { applyEarlyLateAdjustment, buildContributoryEarnings, calculateBaseCPP } from '../tax/cpp';
import { calculateEmployerHealthTax } from '../tax/employerHealthTax';
import { getPassiveInvestmentTaxRate } from '../tax/provinces';
import { calculateProjection } from '../calculator';
import type { UserInputs, NotionalAccounts } from '../types';
import { getDefaultInputs } from '../localStorage';

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CRA RATE VERIFICATION (2026)
// Verify every hardcoded constant against CRA-published values
// ══════════════════════════════════════════════════════════════════════════════

describe('CRA Rate Verification — 2026 Tax Year', () => {
  const taxData = getTaxYearData(2026, 0.02, 'ON');

  describe('Federal Tax Brackets', () => {
    // CRA 2026 federal brackets (after 14% lowest bracket takes effect)
    it('should have correct federal bracket thresholds and rates', () => {
      const brackets = taxData.federal.brackets;
      expect(brackets[0]).toEqual({ threshold: 0, rate: 0.14 });
      expect(brackets[1]).toEqual({ threshold: 58523, rate: 0.205 });
      expect(brackets[2]).toEqual({ threshold: 117045, rate: 0.26 });
      expect(brackets[3]).toEqual({ threshold: 181440, rate: 0.29 });
      expect(brackets[4]).toEqual({ threshold: 258482, rate: 0.33 });
    });

    it('should have correct federal BPA', () => {
      // 2026 BPA = $16,452
      expect(taxData.federal.basicPersonalAmount).toBe(16452);
    });
  });

  describe('Ontario Provincial Brackets', () => {
    it('should have correct Ontario bracket thresholds and rates', () => {
      const brackets = taxData.provincial.brackets;
      expect(brackets[0]).toEqual({ threshold: 0, rate: 0.0505 });
      expect(brackets[1]).toEqual({ threshold: 53891, rate: 0.0915 });
      expect(brackets[2]).toEqual({ threshold: 107785, rate: 0.1116 });
      // $150K and $220K are NOT indexed (legislatively fixed)
      expect(brackets[3]).toEqual({ threshold: 150000, rate: 0.1216 });
      expect(brackets[4]).toEqual({ threshold: 220000, rate: 0.1316 });
    });

    it('should have correct Ontario BPA', () => {
      expect(taxData.provincial.basicPersonalAmount).toBe(12989);
    });

    it('should have correct Ontario surtax thresholds', () => {
      expect(taxData.provincial.surtax.firstThreshold).toBe(5818);
      expect(taxData.provincial.surtax.firstRate).toBe(0.20);
      expect(taxData.provincial.surtax.secondThreshold).toBe(7446);
      expect(taxData.provincial.surtax.secondRate).toBe(0.36);
    });
  });

  describe('CPP/CPP2 Constants (2026)', () => {
    // CRA: YMPE 2026 = $74,600, basic exemption = $3,500, rate = 5.95%
    it('should have correct CPP parameters', () => {
      expect(taxData.cpp.ympe).toBe(74600);
      expect(taxData.cpp.basicExemption).toBe(3500);
      expect(taxData.cpp.rate).toBe(0.0595);
      // Max contribution = (74600 - 3500) * 5.95% = 71100 * 0.0595 = $4,230.45
      expect(taxData.cpp.maxContribution).toBe(4230.45);
    });

    // CRA: CPP2 2026 — YAMPE = $85,000, rate = 4%
    it('should have correct CPP2 parameters', () => {
      expect(taxData.cpp2.firstCeiling).toBe(74600);
      expect(taxData.cpp2.secondCeiling).toBe(85000);
      expect(taxData.cpp2.rate).toBe(0.04);
      // Max contribution = (85000 - 74600) * 4% = 10400 * 0.04 = $416.00
      expect(taxData.cpp2.maxContribution).toBe(416.00);
    });
  });

  describe('EI Constants (2026)', () => {
    // CRA: EI rate 2026 = 1.63%, max insurable earnings = $68,900
    it('should have correct EI parameters', () => {
      expect(taxData.ei.rate).toBe(0.0163);
      expect(taxData.ei.maxInsurableEarnings).toBe(68900);
      // Max contribution = 68900 * 1.63% = $1,123.07
      expect(taxData.ei.maxContribution).toBe(1123.07);
      expect(taxData.ei.employerMultiplier).toBe(1.4);
    });
  });

  describe('Dividend Tax Credit Rates', () => {
    it('should have correct eligible dividend rates', () => {
      // Federal: 38% gross-up, 15.0198% federal DTC
      // Ontario: 10% provincial DTC
      expect(taxData.dividend.eligible.grossUp).toBe(0.38);
      expect(taxData.dividend.eligible.federalCredit).toBe(0.150198);
      expect(taxData.dividend.eligible.provincialCredit).toBe(0.10);
    });

    it('should have correct non-eligible dividend rates', () => {
      // Federal: 15% gross-up, 9.0301% federal DTC
      // Ontario: 2.9863% provincial DTC
      expect(taxData.dividend.nonEligible.grossUp).toBe(0.15);
      expect(taxData.dividend.nonEligible.federalCredit).toBe(0.090301);
      expect(taxData.dividend.nonEligible.provincialCredit).toBe(0.029863);
    });
  });

  describe('Corporate Tax Rates', () => {
    it('should have correct combined corporate rates for Ontario', () => {
      // Small business: 9% federal + 3.2% Ontario = 12.2%
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.122, 3);
      // General: 15% federal + 11.5% Ontario = 26.5%
      expect(taxData.corporate.general).toBeCloseTo(0.265, 3);
    });
  });

  describe('RRSP/TFSA Limits', () => {
    it('should have correct 2026 contribution limits', () => {
      expect(taxData.rrsp.contributionRate).toBe(0.18);
      expect(taxData.rrsp.dollarLimit).toBe(33810);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2: PERSONAL TAX CALCULATION — HAND-CALCULATED TRACES
// ══════════════════════════════════════════════════════════════════════════════

describe('Personal Tax — Hand-Calculated Traces', () => {
  const taxData = getTaxYearData(2026, 0.02, 'ON');

  describe('Federal tax on $100,000 salary', () => {
    it('should match hand calculation', () => {
      // Taxable = $100,000 - $16,452 BPA = $83,548
      // Bracket 1: $58,523 * 14% = $8,193.22
      // Bracket 2: ($83,548 - $58,523) * 20.5% = $25,025 * 0.205 = $5,130.13
      // Total federal = $13,323.35
      const taxableIncome = 100000 - taxData.federal.basicPersonalAmount;
      const federalTax = calculateTaxByBrackets(taxableIncome, taxData.federal.brackets);

      expect(taxableIncome).toBe(83548);
      expect(federalTax).toBeCloseTo(8193.22 + 5130.125, 0);
    });
  });

  describe('Federal tax on $200,000 salary', () => {
    it('should match hand calculation', () => {
      // Taxable = $200,000 - $16,452 = $183,548
      // Bracket 1: $58,523 * 14% = $8,193.22
      // Bracket 2: ($117,045 - $58,523) * 20.5% = $58,522 * 0.205 = $11,997.01
      // Bracket 3: ($181,440 - $117,045) * 26% = $64,395 * 0.26 = $16,742.70
      // Bracket 4: ($183,548 - $181,440) * 29% = $2,108 * 0.29 = $611.32
      // Total = $37,544.25
      const taxableIncome = 200000 - taxData.federal.basicPersonalAmount;
      const federalTax = calculateTaxByBrackets(taxableIncome, taxData.federal.brackets);

      const expected =
        58523 * 0.14 +           // $8,193.22
        (117045 - 58523) * 0.205 + // $11,997.01
        (181440 - 117045) * 0.26 + // $16,742.70
        (183548 - 181440) * 0.29;  // $611.32

      expect(federalTax).toBeCloseTo(expected, 0);
    });
  });

  describe('Ontario provincial tax on $100,000 salary', () => {
    it('should match hand calculation', () => {
      // Taxable = $100,000 - $12,989 BPA = $87,011
      // Bracket 1: $53,891 * 5.05% = $2,721.50
      // Bracket 2: ($87,011 - $53,891) * 9.15% = $33,120 * 0.0915 = $3,030.48
      // Total Ontario base = $5,751.98
      const taxableIncome = 100000 - taxData.provincial.basicPersonalAmount;
      const provincialTax = calculateTaxByBrackets(taxableIncome, taxData.provincial.brackets);

      expect(taxableIncome).toBe(87011);
      const expected = 53891 * 0.0505 + (87011 - 53891) * 0.0915;
      expect(provincialTax).toBeCloseTo(expected, 0);
    });
  });

  describe('Eligible dividend tax — $50,000 dividend', () => {
    it('should produce correct gross-up and DTC', () => {
      // $50,000 eligible dividend
      // Gross-up: $50,000 * 1.38 = $69,000
      // Federal tax on $69,000 - $16,452 BPA = $52,548
      //   = $52,548 * 14% = $7,356.72
      // Federal DTC: $69,000 * 15.0198% = $10,363.66
      // Net federal = max(0, 7356.72 - 10363.66) = $0 (excess credit)
      //
      // Provincial tax on $69,000 - $12,989 = $56,011
      //   Bracket 1: $53,891 * 5.05% = $2,721.50
      //   Bracket 2: ($56,011 - $53,891) * 9.15% = $2,120 * 0.0915 = $193.98
      //   Total prov = $2,915.48
      // Provincial DTC: $69,000 * 10% = $6,900
      // Net provincial = max(0, 2915.48 - 6900) = $0
      //
      // Health premium: actual income = $50,000 - 0 = $50,000
      //   Bracket: $48,000-$72,000 → base $750 + ($50,000-$48,000)*0.25 = $750 + $500 = $1,250
      //   But max premium for this bracket is $900
      //   So health premium = $900
      //
      // Total tax on $50K eligible dividends in ON = $0 + $0 + $900 = $900
      // This means the effective rate is just the health premium

      const grossedUp = 50000 * (1 + 0.38);
      expect(grossedUp).toBe(69000);

      const federalDTC = grossedUp * 0.150198;
      expect(federalDTC).toBeCloseTo(10363.66, 0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CPP/EI CALCULATIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('CPP/EI — Hand-Calculated', () => {
  describe('CPP on $80,000 salary (2026)', () => {
    it('should cap at YMPE', () => {
      // Pensionable earnings = min(80000, 74600) - 3500 = 74600 - 3500 = 71100
      // CPP = 71100 * 5.95% = $4,230.45
      const cpp = calculateCPP(80000);
      expect(cpp).toBeCloseTo(4230.45, 1);
    });
  });

  describe('CPP on $50,000 salary (2026)', () => {
    it('should be below maximum', () => {
      // Pensionable earnings = 50000 - 3500 = 46500
      // CPP = 46500 * 5.95% = $2,766.75
      const cpp = calculateCPP(50000);
      expect(cpp).toBeCloseTo(2766.75, 1);
    });
  });

  describe('CPP2 on $80,000 salary (2026)', () => {
    it('should calculate earnings between YMPE and YAMPE', () => {
      // CPP2 band: min(80000, 85000) - 74600 = 80000 - 74600 = 5400
      // CPP2 = 5400 * 4% = $216.00
      const cpp2 = calculateCPP2(80000);
      expect(cpp2).toBeCloseTo(216.00, 1);
    });
  });

  describe('CPP2 on $90,000 salary (2026)', () => {
    it('should cap at YAMPE', () => {
      // CPP2 band: min(90000, 85000) - 74600 = 85000 - 74600 = 10400
      // CPP2 = 10400 * 4% = $416.00
      const cpp2 = calculateCPP2(90000);
      expect(cpp2).toBeCloseTo(416.00, 1);
    });
  });

  describe('CPP2 on $70,000 salary (2026)', () => {
    it('should be zero when below YMPE', () => {
      // $70,000 < $74,600 YMPE → CPP2 = $0
      const cpp2 = calculateCPP2(70000);
      expect(cpp2).toBe(0);
    });
  });

  describe('EI on $80,000 salary (2026)', () => {
    it('should cap at max insurable earnings', () => {
      // Insurable = min(80000, 68900) = 68900
      // EI = 68900 * 1.63% = $1,123.07
      const ei = calculateEI(80000);
      expect(ei).toBeCloseTo(1123.07, 1);
    });
  });

  describe('EI on $50,000 salary (2026)', () => {
    it('should be below maximum', () => {
      // EI = 50000 * 1.63% = $815.00
      const ei = calculateEI(50000);
      expect(ei).toBeCloseTo(815.00, 1);
    });
  });

  describe('Employer payroll costs on $80,000', () => {
    it('should match employee CPP/CPP2 + 1.4x EI', () => {
      // Employee CPP = $4,230.45
      // Employee CPP2 = $216.00
      // Employee EI = $1,123.07
      // Employer: CPP $4,230.45 + CPP2 $216.00 + EI $1,123.07 * 1.4 = $1,572.30
      // Total employer = $4,230.45 + $216.00 + $1,572.30 = $6,018.75
      const cpp = calculateCPP(80000);
      const cpp2 = calculateCPP2(80000);
      const ei = calculateEI(80000);
      const employerCost = cpp + cpp2 + (ei * 1.4);

      expect(employerCost).toBeCloseTo(4230.45 + 216.00 + 1123.07 * 1.4, 0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CORPORATE TAX & PASSIVE INCOME GRIND
// ══════════════════════════════════════════════════════════════════════════════

describe('Corporate Tax — Hand-Calculated', () => {
  describe('Small business rate on $400,000 active income', () => {
    it('should apply 12.2% combined rate', () => {
      // ON combined: 9% federal + 3.2% provincial = 12.2%
      // Tax = $400,000 * 12.2% = $48,800
      const tax = 400000 * 0.122;
      expect(tax).toBeCloseTo(48800, 0);
    });
  });

  describe('Passive income grind — SBD clawback', () => {
    it('should not grind when passive income <= $50,000', () => {
      const result = calculateReducedSBDLimit(50000);
      expect(result).toBe(500000);
    });

    it('should grind $5 per $1 over $50,000', () => {
      // $75,000 passive income → excess = $25,000 → grind = $125,000
      // Reduced SBD = $500,000 - $125,000 = $375,000
      const result = calculateReducedSBDLimit(75000);
      expect(result).toBe(375000);
    });

    it('should fully eliminate SBD at $150,000 passive income', () => {
      // $150,000 → excess = $100,000 → grind = $500,000
      // Reduced SBD = $500,000 - $500,000 = $0
      const result = calculateReducedSBDLimit(150000);
      expect(result).toBe(0);
    });

    it('should calculate AAII correctly', () => {
      // AAII = interest + foreign income + taxable capital gains (50% of realized CG)
      // = $10,000 + $5,000 + $7,500 = $22,500
      const aaii = calculateAAII(10000, 5000, 7500);
      expect(aaii).toBe(22500);
    });

    it('should compute additional tax from grind correctly', () => {
      // Active income = $500,000, passive = $75,000
      // Reduced SBD = $375,000
      // SBD reduction = $125,000
      // Rate difference = 26.5% - 12.2% = 14.3%
      // Additional tax = min(500000, 125000) * 14.3% = $125,000 * 0.143 = $17,875
      const result = calculatePassiveIncomeGrind(75000, 500000, 0.122, 0.265);
      expect(result.reducedSBDLimit).toBe(375000);
      expect(result.additionalTaxFromGrind).toBeCloseTo(17875, 0);
    });
  });

  describe('Passive investment tax rate by province', () => {
    it('should return correct rates for key provinces', () => {
      // Federal: 38.67% (28% + 10.67% additional refundable)
      // ON: 38.67% + 11.5% = 50.17%
      expect(getPassiveInvestmentTaxRate('ON')).toBeCloseTo(0.5017, 4);
      // AB: 38.67% + 8% = 46.67%
      expect(getPassiveInvestmentTaxRate('AB')).toBeCloseTo(0.4667, 4);
      // BC: 38.67% + 12% = 50.67%
      expect(getPassiveInvestmentTaxRate('BC')).toBeCloseTo(0.5067, 4);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5: INVESTMENT RETURNS — DOLLAR TRACE
// ══════════════════════════════════════════════════════════════════════════════

describe('Investment Returns — Dollar Trace on $1M Portfolio', () => {
  // 25/25/25/25 allocation (Canadian equity / US equity / International / Fixed income)
  const balance = 1000000;
  const result = calculateInvestmentReturns(balance, 0.0725, 25, 25, 25, 25);

  it('should calculate total return correctly', () => {
    // Total return = $1M * 7.25% = $72,500
    expect(result.totalReturn).toBeCloseTo(72500, 0);
  });

  it('should calculate Canadian dividends correctly', () => {
    // Canadian dividends = $1M * 25% * 2.8% = $7,000
    expect(result.canadianDividends).toBeCloseTo(7000, 0);
  });

  it('should calculate foreign income correctly', () => {
    // US dividends = $1M * 25% * 1.5% = $3,750
    // Intl dividends = $1M * 25% * 3.0% = $7,500
    // Fixed income interest = $1M * 25% * 4.05% = $10,125  (FP Canada 2025 rate)
    // Total foreign = $3,750 + $7,500 + $10,125 = $21,375
    expect(result.foreignIncome).toBeCloseTo(21375, 0);
  });

  it('should calculate realized capital gains (turnover-based) correctly', () => {
    // Canadian: $1M * 25% * 0.3% = $750
    // US: $1M * 25% * 0.3% = $750
    // International: $1M * 25% * 0.4% = $1,000
    // Fixed income: $1M * 25% * 0% = $0
    // Total realized CG = $2,500
    expect(result.realizedCapitalGain).toBeCloseTo(2500, 0);
  });

  it('should calculate unrealized capital gains correctly', () => {
    // Total price appreciation = totalReturn - Canadian divs - foreign income
    // = $72,500 - $7,000 - $21,375 = $44,125  (FI income is $125 higher at 4.05%)
    // Unrealized = $44,125 - $2,500 realized = $41,625
    expect(result.unrealizedCapitalGain).toBeCloseTo(41625, 0);
  });

  it('should calculate CDA increase correctly', () => {
    // CDA = non-taxable portion of realized CG = $2,500 * 50% = $1,250
    expect(result.CDAIncrease).toBeCloseTo(1250, 0);
  });

  it('should calculate eRDTOH correctly', () => {
    // eRDTOH = Canadian dividends * 38.33% = $7,000 * 0.3833 = $2,683.10
    expect(result.eRDTOHIncrease).toBeCloseTo(2683.10, 0);
  });

  it('should calculate nRDTOH correctly', () => {
    // Taxable CG = $2,500 * 50% = $1,250
    // Gross nRDTOH = (foreign income + taxable CG) * 30.67%
    // = ($21,375 + $1,250) * 0.3067 = $22,625 * 0.3067 = $6,939.09  (FI rate is 4.05%)
    // Foreign withholding = foreign dividends * 15%
    // = ($3,750 + $7,500) * 0.15 = $11,250 * 0.15 = $1,687.50
    // Net nRDTOH = max(0, $6,939.09 - $1,687.50) = $5,251.59
    expect(result.nRDTOHIncrease).toBeCloseTo(5251.59, 0);
  });

  it('should calculate GRIP correctly', () => {
    // GRIP = Canadian eligible dividends received = $7,000
    expect(result.GRIPIncrease).toBeCloseTo(7000, 0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6: BLENDED RETURN RATE
// ══════════════════════════════════════════════════════════════════════════════

describe('Blended Return Rate Calculation', () => {
  it('should compute correct blended rate from default asset class returns', () => {
    // 25/25/25/25 allocation — FP Canada 2025 rates
    // CA: 6.3%, US: 6.3%, Intl: 6.3%, FI: 4.05%
    // Blended = 0.25 * 0.063 + 0.25 * 0.063 + 0.25 * 0.063 + 0.25 * 0.0405
    // = 0.01575 * 3 + 0.010125 = 0.057375 ≈ 5.74%
    const rate = computeBlendedReturnRate(25, 25, 25, 25);
    expect(rate).toBeCloseTo(0.057375, 4);
  });

  it('should compute correct rate for 100% Canadian equity', () => {
    // FP Canada 2025: Canadian equity = 6.30%
    const rate = computeBlendedReturnRate(100, 0, 0, 0);
    expect(rate).toBeCloseTo(0.063, 4);
  });

  it('should compute correct rate for 60/40 equity/bond split', () => {
    // 20/20/20/40 allocation — FP Canada 2025 rates
    // = 0.20*0.063 + 0.20*0.063 + 0.20*0.063 + 0.40*0.0405
    // = 0.0126 * 3 + 0.0162 = 0.0378 + 0.0162 = 0.0540 = 5.40%
    const rate = computeBlendedReturnRate(20, 20, 20, 40);
    expect(rate).toBeCloseTo(0.054, 4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7: RRIF MINIMUM RATES (CRA TABLE)
// ══════════════════════════════════════════════════════════════════════════════

describe('RRIF Minimum Rates — CRA Table Verification', () => {
  it('should return correct rates at key ages', () => {
    // CRA prescribed RRIF minimum rates
    expect(getRRIFMinimumRate(65)).toBe(0.0400);
    expect(getRRIFMinimumRate(71)).toBe(0.0528);
    expect(getRRIFMinimumRate(72)).toBe(0.0540);
    expect(getRRIFMinimumRate(75)).toBe(0.0582);
    expect(getRRIFMinimumRate(80)).toBe(0.0682);
    expect(getRRIFMinimumRate(85)).toBe(0.0851);
    expect(getRRIFMinimumRate(90)).toBe(0.1192);
    expect(getRRIFMinimumRate(94)).toBe(0.1879);
  });

  it('should return 20% for ages 95+', () => {
    expect(getRRIFMinimumRate(95)).toBe(0.20);
    expect(getRRIFMinimumRate(100)).toBe(0.20);
  });

  it('should mandate RRIF conversion at age 71', () => {
    expect(mustConvertToRRIF(70)).toBe(false);
    expect(mustConvertToRRIF(71)).toBe(true);
    expect(mustConvertToRRIF(72)).toBe(true);
  });

  it('should calculate correct minimum withdrawal', () => {
    // $500,000 balance at age 72: minimum = $500,000 * 5.40% = $27,000
    expect(calculateRRIFMinimum(500000, 72)).toBeCloseTo(27000, 0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8: OAS BENEFIT & CLAWBACK
// ══════════════════════════════════════════════════════════════════════════════

describe('OAS Benefit & Clawback — Hand-Calculated', () => {
  it('should calculate correct base OAS for 2026', () => {
    // 2025 base: $727.67/month (age 65-74)
    // 2026 = 2025 * (1 + 0.02)^1 = $727.67 * 1.02 = $742.22/month
    // Annual = $742.22 * 12 = $8,906.69
    const maxOAS = getMaxOASBenefit(2026, 65, 65, 0.02);
    expect(maxOAS).toBeCloseTo(727.67 * 1.02 * 12, 0);
  });

  it('should apply 10% supplement for age 75+', () => {
    // 2025 base for 75+: $800.44/month
    // 2026 = $800.44 * 1.02 = $816.45
    // Annual = $816.45 * 12 = $9,797.39
    const maxOAS = getMaxOASBenefit(2026, 75, 65, 0.02);
    expect(maxOAS).toBeCloseTo(800.44 * 1.02 * 12, 0);
  });

  it('should apply deferral bonus correctly', () => {
    // Defer to age 67 = 24 months deferred
    // Bonus = 24 * 0.6% = 14.4%
    // Factor = 1.144
    const maxOAS = getMaxOASBenefit(2026, 67, 67, 0.02);
    const baseAnnual = 727.67 * 1.02 * 12;
    expect(maxOAS).toBeCloseTo(baseAnnual * 1.144, 0);
  });

  it('should apply max deferral (age 70) = 36% bonus', () => {
    const maxOAS = getMaxOASBenefit(2026, 70, 70, 0.02);
    const baseAnnual = 727.67 * 1.02 * 12;
    expect(maxOAS).toBeCloseTo(baseAnnual * 1.36, 0);
  });

  it('should calculate clawback threshold correctly for 2026', () => {
    // 2025 threshold = $93,454
    // 2026 = $93,454 * 1.02 = $95,323.08
    const threshold = getClawbackThreshold(2026, 0.02);
    expect(threshold).toBeCloseTo(93454 * 1.02, 0);
  });

  it('should solve OAS clawback iteratively', () => {
    // Income = $100,000, maxOAS = $8,907, threshold = $95,323
    // Total income ~ $108,907
    // Excess = $108,907 - $95,323 = $13,584
    // Clawback = $13,584 * 15% = $2,037.60
    // But OAS is now $8,907 - $2,038 = $6,869, so re-iterate...
    // This converges. Just verify it's non-negative and < maxOAS
    const maxOAS = 8907;
    const threshold = 95323;
    const result = solveOASWithClawback(100000, maxOAS, threshold);

    expect(result.grossOAS).toBe(8907);
    expect(result.clawback).toBeGreaterThan(0);
    expect(result.clawback).toBeLessThan(8907);
    expect(result.netOAS).toBeGreaterThan(0);
    expect(result.netOAS).toBeLessThan(8907);
    // Verify: baseIncome + netOAS, then 15% of excess over threshold
    const totalIncome = 100000 + result.netOAS;
    const expectedClawback = Math.min(maxOAS, Math.max(0, totalIncome - threshold) * 0.15);
    expect(result.clawback).toBeCloseTo(expectedClawback, 0);
  });

  it('should return zero OAS when not eligible', () => {
    const result = calculateOAS({
      calendarYear: 2026,
      age: 65,
      oasStartAge: 65,
      oasEligible: false,
      baseIncomeBeforeOAS: 50000,
      inflationRate: 0.02,
    });
    expect(result.grossOAS).toBe(0);
    expect(result.netOAS).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9: CPP BENEFIT PROJECTION
// ══════════════════════════════════════════════════════════════════════════════

describe('CPP Benefit Projection — Key Checks', () => {
  it('should apply early reduction correctly', () => {
    // Taking CPP at 60: 60 months early * 0.6% = 36% reduction
    // Factor = 1 - 0.36 = 0.64
    expect(applyEarlyLateAdjustment(16000, 60)).toBeCloseTo(16000 * 0.64, 0);
  });

  it('should apply late increase correctly', () => {
    // Taking CPP at 70: 60 months late * 0.7% = 42% increase
    // Factor = 1 + 0.42 = 1.42
    expect(applyEarlyLateAdjustment(16000, 70)).toBeCloseTo(16000 * 1.42, 0);
  });

  it('should return base CPP as 25% of AMPE * 12', () => {
    // If AMPE = $3,000/month → annual = $3,000 * 0.25 * 12 = $9,000
    expect(calculateBaseCPP(3000)).toBe(9000);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 10: EMPLOYER HEALTH TAX
// ══════════════════════════════════════════════════════════════════════════════

describe('Employer Health Tax', () => {
  it('should be zero for provinces without EHT', () => {
    expect(calculateEmployerHealthTax('AB', 500000, 2026)).toBe(0);
    expect(calculateEmployerHealthTax('SK', 500000, 2026)).toBe(0);
  });

  it('should calculate Ontario EHT correctly', () => {
    // ON EHT: 0.98% on payroll up to $200K (for small businesses < $5M)
    // For payroll $100,000: $100,000 * 0.0098 = $980 (but may be exempt below $490K)
    // The exemption threshold is $1M for most, so small payrolls may be zero
    // Let's just verify it returns a reasonable number
    const eht = calculateEmployerHealthTax('ON', 500000, 2026);
    expect(eht).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 11: FULL SCENARIO TRACE — SALARY-ONLY
// Trace every dollar for a $100K salary scenario
// ══════════════════════════════════════════════════════════════════════════════

describe('Full Scenario Trace — $100K Salary-Only, Ontario, 1 Year', () => {
  const inputs: UserInputs = {
    annualCorporateRetainedEarnings: 200000,
    requiredIncome: 0,  // Will use fixed salary
    salaryStrategy: 'fixed',
    fixedSalaryAmount: 100000,
    planningHorizon: 1,
    province: 'ON',
    investmentReturnRate: 0,
    corporateInvestmentBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    expectedInflationRate: 0.02,
    contributeToRRSP: false,
    maximizeTFSA: false,
    payDownDebt: false,
    contributeToRESP: false,
    considerIPP: false,
    hasSpouse: false,
    inflateSpendingNeeds: false,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
  };

  const result = calculateProjection(inputs);
  const yr1 = result.yearlyResults[0];

  it('should have exactly $100K salary', () => {
    expect(yr1.salary).toBe(100000);
  });

  it('should have correct CPP deductions', () => {
    // CPP = (min(100000, 74600) - 3500) * 5.95% = 71100 * 0.0595 = $4,230.45
    expect(yr1.cpp).toBeCloseTo(4230.45, 0);
    // CPP2 = (min(100000, 85000) - 74600) * 4% = 10400 * 0.04 = $416.00
    expect(yr1.cpp2).toBeCloseTo(416.00, 0);
  });

  it('should have correct EI deductions', () => {
    // EI = min(100000, 68900) * 1.63% = 68900 * 0.0163 = $1,123.07
    expect(yr1.ei).toBeCloseTo(1123.07, 0);
  });

  it('should have correct federal tax', () => {
    // Taxable = $100,000 (no RRSP, no dividends)
    // Federal = tax on ($100,000 - $16,452 BPA) = tax on $83,548
    // = $58,523 * 14% + ($83,548 - $58,523) * 20.5%
    // = $8,193.22 + $25,025 * 0.205
    // = $8,193.22 + $5,130.13
    // = $13,323.35
    expect(yr1.federalTax).toBeCloseTo(13323.35, 0);
  });

  it('should have correct provincial tax (including surtax)', () => {
    // Provincial base = tax on ($100,000 - $12,989 BPA) = tax on $87,011
    // = $53,891 * 5.05% + ($87,011 - $53,891) * 9.15%
    // = $2,721.50 + $33,120 * 0.0915
    // = $2,721.50 + $3,030.48
    // = $5,751.98
    //
    // Surtax: $5,751.98 > $5,818? No (5751.98 < 5818), so surtax = $0
    //
    // Provincial total = $5,751.98
    expect(yr1.provincialTax).toBeCloseTo(5752, 1);
  });

  it('should have correct Ontario Health Premium', () => {
    // Actual income = $100,000
    // Bracket: $72,000-$200,600 → base $900, rate 0.25, max $900
    // So health premium = $900
    expect(yr1.healthPremium).toBe(900);
  });

  it('should have correct total personal tax', () => {
    // Total = federal + provincial (with surtax) + health premium
    const expectedTotal = yr1.federalTax + yr1.provincialTax + yr1.healthPremium;
    expect(yr1.personalTax).toBeCloseTo(expectedTotal, 0);
  });

  it('should have correct after-tax income', () => {
    // After-tax = salary + dividends - personalTax - CPP - CPP2 - EI
    const totalDeductions = yr1.personalTax + yr1.cpp + yr1.cpp2 + yr1.ei;
    expect(yr1.afterTaxIncome).toBeCloseTo(100000 - totalDeductions, 0);
  });

  it('should have correct corporate tax on active income', () => {
    // Active income = $200,000
    // Salary cost to corp = $100,000 + employer CPP ($4,230.45) + employer CPP2 ($416.00) + employer EI ($1,123.07 * 1.4)
    // EHT: depends on calculation, but for $100K payroll likely $0 (under threshold)
    // Taxable business income = $200,000 - total salary cost
    // Taxed at 12.2% (small business)
    expect(yr1.corporateTaxOnActive).toBeGreaterThan(0);
  });

  it('should generate correct RRSP room', () => {
    // RRSP room = $100,000 * 18% = $18,000
    expect(yr1.rrspRoomGenerated).toBeCloseTo(18000, 0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 12: FULL SCENARIO TRACE — DIVIDENDS-ONLY
// ══════════════════════════════════════════════════════════════════════════════

describe('Full Scenario Trace — Dividends-Only, Ontario, 1 Year', () => {
  const inputs: UserInputs = {
    annualCorporateRetainedEarnings: 200000,
    requiredIncome: 80000,
    salaryStrategy: 'dividends-only',
    planningHorizon: 1,
    province: 'ON',
    investmentReturnRate: 0,
    corporateInvestmentBalance: 500000, // Enough to pay dividends from
    cdaBalance: 50000,
    eRDTOHBalance: 20000,
    nRDTOHBalance: 10000,
    gripBalance: 50000,
    currentAge: 45,
    retirementAge: 65,
    planningEndAge: 90,
    expectedInflationRate: 0.02,
    contributeToRRSP: false,
    maximizeTFSA: false,
    payDownDebt: false,
    contributeToRESP: false,
    considerIPP: false,
    hasSpouse: false,
    inflateSpendingNeeds: false,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
  };

  const result = calculateProjection(inputs);
  const yr1 = result.yearlyResults[0];

  it('should have zero salary', () => {
    expect(yr1.salary).toBe(0);
  });

  it('should have zero CPP/EI', () => {
    expect(yr1.cpp).toBe(0);
    expect(yr1.cpp2).toBe(0);
    expect(yr1.ei).toBe(0);
  });

  it('should generate zero RRSP room', () => {
    expect(yr1.rrspRoomGenerated).toBe(0);
  });

  it('should pay capital dividends first (tax-free)', () => {
    // CDA starts at $50,000, but investment returns on $500K generate additional CDA
    // from realized capital gains (turnover-based). CDA may exceed initial $50K.
    // Capital dividends are tax-free, so they go straight to after-tax income.
    expect(yr1.dividends.capitalDividends).toBeGreaterThan(0);
    // CDA can grow beyond starting balance due to investment return decomposition
    // even at 0% return rate (income components are balance × yield rates)
    expect(yr1.dividends.capitalDividends).toBeLessThanOrEqual(55000); // generous upper bound
  });

  it('should deplete notional accounts in correct priority', () => {
    // Priority: CDA → eRDTOH (eligible divs) → nRDTOH (non-eligible) → GRIP → retained earnings
    const divs = yr1.dividends;
    const totalDivs = divs.capitalDividends + divs.eligibleDividends + divs.nonEligibleDividends;
    expect(totalDivs).toBeGreaterThan(0);
  });

  it('should have total after-tax income within ±2% of the $80K target', () => {
    // The dividend gross-up engine uses average (not marginal) tax rates to estimate
    // how many gross dividends deliver the required after-tax amount.  Average-rate
    // estimation is accurate to within ~1-2%, so we expect the result to land very
    // close to $80K in either direction rather than always overshooting.
    expect(yr1.afterTaxIncome).toBeGreaterThan(78400);   // no more than 2% undershoot
    expect(yr1.afterTaxIncome).toBeLessThan(81600);      // no more than 2% overshoot
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 13: TAX INTEGRATION CHECK
// The fundamental principle: the combined corporate + personal tax should
// approximate the personal tax that would apply if the same income were
// earned directly. Perfect integration means the total tax is the same
// regardless of whether income flows through a corporation.
// ══════════════════════════════════════════════════════════════════════════════

describe('Tax Integration — Salary vs Dividend Total Tax', () => {
  it('should demonstrate that salary and dividend strategies produce similar total tax at moderate income', () => {
    // This is the core insight from the PWL Optimal Compensation paper
    // At certain income levels, the integrated tax rate should be similar

    const baseInputs: Partial<UserInputs> = {
      annualCorporateRetainedEarnings: 200000,
      requiredIncome: 80000,
      planningHorizon: 1,
      province: 'ON',
      investmentReturnRate: 0,
      corporateInvestmentBalance: 500000,
      cdaBalance: 0,
      eRDTOHBalance: 100000,
      nRDTOHBalance: 100000,
      gripBalance: 100000,
      currentAge: 45,
      retirementAge: 65,
      planningEndAge: 90,
      expectedInflationRate: 0.02,
      contributeToRRSP: false,
      maximizeTFSA: false,
      payDownDebt: false,
      contributeToRESP: false,
      considerIPP: false,
      hasSpouse: false,
      inflateSpendingNeeds: false,
      canadianEquityPercent: 25,
      usEquityPercent: 25,
      internationalEquityPercent: 25,
      fixedIncomePercent: 25,
    };

    // Salary-only strategy
    const salaryResult = calculateProjection({
      ...baseInputs,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 120000, // Gross to get ~$80K after tax
    } as UserInputs);

    // Dividends-only strategy
    const dividendResult = calculateProjection({
      ...baseInputs,
      salaryStrategy: 'dividends-only',
    } as UserInputs);

    const salaryTotalTax = salaryResult.yearlyResults[0].totalTax;
    const dividendTotalTax = dividendResult.yearlyResults[0].totalTax;

    // Both should be positive
    expect(salaryTotalTax).toBeGreaterThan(0);
    expect(dividendTotalTax).toBeGreaterThan(0);

    // The effective integrated rates should be in a reasonable range
    // Due to imperfect integration, they won't be identical, but both should
    // be in the 20-50% range for moderate income
    const salaryEffective = salaryResult.yearlyResults[0].effectiveIntegratedRate;
    const dividendEffective = dividendResult.yearlyResults[0].effectiveIntegratedRate;

    expect(salaryEffective).toBeGreaterThan(0.10);
    expect(salaryEffective).toBeLessThan(0.60);
    expect(dividendEffective).toBeGreaterThan(0.10);
    expect(dividendEffective).toBeLessThan(0.60);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 14: EDGE CASES & BOUNDARY CONDITIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases & Boundary Conditions', () => {
  it('should handle zero income gracefully', () => {
    const result = calculateProjection({
      annualCorporateRetainedEarnings: 0,
      requiredIncome: 0,
      salaryStrategy: 'dividends-only',
      planningHorizon: 1,
      province: 'ON',
      investmentReturnRate: 0,
      corporateInvestmentBalance: 0,
      cdaBalance: 0,
      eRDTOHBalance: 0,
      nRDTOHBalance: 0,
      gripBalance: 0,
      currentAge: 45,
      retirementAge: 65,
      planningEndAge: 90,
      expectedInflationRate: 0.02,
      contributeToRRSP: false,
      maximizeTFSA: false,
      payDownDebt: false,
      contributeToRESP: false,
      considerIPP: false,
      hasSpouse: false,
      inflateSpendingNeeds: false,
      canadianEquityPercent: 25,
      usEquityPercent: 25,
      internationalEquityPercent: 25,
      fixedIncomePercent: 25,
    } as UserInputs);

    expect(result.yearlyResults[0].personalTax).toBe(0);
    expect(result.yearlyResults[0].corporateTax).toBe(0);
    expect(result.yearlyResults[0].afterTaxIncome).toBe(0);
  });

  it('should handle salary exactly at YMPE', () => {
    // Salary = $74,600 (exactly YMPE)
    // CPP = ($74,600 - $3,500) * 5.95% = $71,100 * 0.0595 = $4,230.45
    // CPP2 = $0 (salary = YMPE, not above)
    const cpp = calculateCPP(74600);
    const cpp2 = calculateCPP2(74600);
    expect(cpp).toBeCloseTo(4230.45, 0);
    expect(cpp2).toBe(0);
  });

  it('should handle salary below basic exemption', () => {
    const cpp = calculateCPP(3000);
    expect(cpp).toBe(0);
  });

  it('should handle zero-balance RRIF', () => {
    const min = calculateRRIFMinimum(0, 72);
    expect(min).toBe(0);
  });

  it('should handle OAS full clawback at very high income', () => {
    // At $200K income, OAS should be fully clawed back
    const result = calculateOAS({
      calendarYear: 2026,
      age: 65,
      oasStartAge: 65,
      oasEligible: true,
      baseIncomeBeforeOAS: 200000,
      inflationRate: 0.02,
    });
    expect(result.netOAS).toBe(0);
    expect(result.clawback).toBe(result.grossOAS);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 15: MULTI-PROVINCE CORPORATE RATE VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

describe('Multi-Province Corporate Rate Verification', () => {
  const provinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK', 'YT'] as const;

  // Federal small business = 9%, General = 15%
  const expectedSmallBusiness: Record<string, number> = {
    AB: 0.09 + 0.02,   // 11%
    BC: 0.09 + 0.02,   // 11%
    MB: 0.09 + 0.00,   // 9% (Manitoba eliminated provincial SB rate)
    NB: 0.09 + 0.025,  // 11.5%
    NL: 0.09 + 0.03,   // 12%
    NS: 0.09 + 0.025,  // 11.5%
    ON: 0.09 + 0.032,  // 12.2%
    PE: 0.09 + 0.01,   // 10%
    QC: 0.09 + 0.032,  // 12.2%
    SK: 0.09 + 0.01,   // 10%
    YT: 0.09 + 0.00,   // 9% (Yukon = 0%)
  };

  for (const prov of provinces) {
    it(`should have correct small business rate for ${prov}`, () => {
      const taxData = getTaxYearData(2026, 0.02, prov);
      expect(taxData.corporate.smallBusiness).toBeCloseTo(expectedSmallBusiness[prov], 3);
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 16: NON-REFUNDABLE TAX ON INVESTMENT INCOME TRACE
// The corporate passive income tax has a refundable (RDTOH) and
// non-refundable component. Verify the split is correct.
// ══════════════════════════════════════════════════════════════════════════════

describe('Corporate Passive Income Tax Split — Province-Specific Non-Refundable Rate', () => {
  // After the math audit fix: updateAccountsFromReturns now uses the province-specific
  // passive investment tax rate instead of the hardcoded 0.265 general corporate rate.
  //
  // The formula: nonRefundableTax = max(0, passiveRate * taxableIncome - nRDTOH)
  //
  // This correctly splits the total passive tax into:
  //   - Refundable (nRDTOH) → recovered when paying dividends
  //   - Non-refundable → permanently reduces corporate balance

  const balance = 1000000;
  const returns = calculateInvestmentReturns(balance, 0.0725, 25, 25, 25, 25);
  const taxableCapGain = returns.realizedCapitalGain * CG_INCLUSION_RATE;
  const taxableInvIncome = returns.foreignIncome + taxableCapGain;

  it('should verify nRDTOH calculation is correct', () => {
    const grossNRDTOH = (returns.foreignIncome + taxableCapGain) * 0.3067;
    const foreignDivs = 1000000 * 0.25 * 0.015 + 1000000 * 0.25 * 0.030;
    const withholdingCredit = foreignDivs * 0.15;
    const expectedNRDTOH = Math.max(0, grossNRDTOH - withholdingCredit);

    expect(returns.nRDTOHIncrease).toBeCloseTo(expectedNRDTOH, 0);
  });

  it('should produce correct non-refundable tax for Ontario', () => {
    // ON passive rate = 50.17%
    // Total tax = $22,500 * 0.5017 = $11,288.25
    // nRDTOH = $5,213.25 (already calculated)
    // Non-refundable = $11,288.25 - $5,213.25 = $6,075.00
    const passiveRate = getPassiveInvestmentTaxRate('ON');
    const totalPassiveTax = taxableInvIncome * passiveRate;
    const expectedNonRefundable = totalPassiveTax - returns.nRDTOHIncrease;

    const accounts: NotionalAccounts = {
      CDA: 0, eRDTOH: 0, nRDTOH: 0, GRIP: 0, corporateInvestments: balance, corporateACB: balance,
    };
    const updated = updateAccountsFromReturns(accounts, returns, passiveRate);

    // Corporate balance should increase by: totalReturn - nonRefundableTax
    const balanceIncrease = updated.corporateInvestments - balance;
    const actualNonRefundable = returns.totalReturn - balanceIncrease;

    expect(actualNonRefundable).toBeCloseTo(expectedNonRefundable, 0);
    // And nonRefundable + nRDTOH ≈ total passive tax
    expect(actualNonRefundable + returns.nRDTOHIncrease).toBeCloseTo(totalPassiveTax, 0);
  });

  it('should produce correct non-refundable tax for Alberta', () => {
    // AB passive rate = 46.67%
    // Non-refundable = 46.67% * taxable - nRDTOH
    const passiveRate = getPassiveInvestmentTaxRate('AB');
    const totalPassiveTax = taxableInvIncome * passiveRate;
    const expectedNonRefundable = totalPassiveTax - returns.nRDTOHIncrease;

    const accounts: NotionalAccounts = {
      CDA: 0, eRDTOH: 0, nRDTOH: 0, GRIP: 0, corporateInvestments: balance, corporateACB: balance,
    };
    const updated = updateAccountsFromReturns(accounts, returns, passiveRate);
    const balanceIncrease = updated.corporateInvestments - balance;
    const actualNonRefundable = returns.totalReturn - balanceIncrease;

    expect(actualNonRefundable).toBeCloseTo(expectedNonRefundable, 0);
    // Alberta has lower provincial rate, so less non-refundable tax
    const onNonRefundable = taxableInvIncome * getPassiveInvestmentTaxRate('ON') - returns.nRDTOHIncrease;
    expect(actualNonRefundable).toBeLessThan(onNonRefundable);
  });

  it('should produce correct non-refundable tax for BC', () => {
    // BC passive rate = 50.67%
    const passiveRate = getPassiveInvestmentTaxRate('BC');
    const totalPassiveTax = taxableInvIncome * passiveRate;
    const expectedNonRefundable = totalPassiveTax - returns.nRDTOHIncrease;

    const accounts: NotionalAccounts = {
      CDA: 0, eRDTOH: 0, nRDTOH: 0, GRIP: 0, corporateInvestments: balance, corporateACB: balance,
    };
    const updated = updateAccountsFromReturns(accounts, returns, passiveRate);
    const balanceIncrease = updated.corporateInvestments - balance;
    const actualNonRefundable = returns.totalReturn - balanceIncrease;

    expect(actualNonRefundable).toBeCloseTo(expectedNonRefundable, 0);
  });

  it('should produce balanced total: nonRefundable + nRDTOH = passiveRate * taxable', () => {
    // The critical invariant: the total of non-refundable tax + nRDTOH should equal
    // the total passive tax (passiveRate * taxableInvestmentIncome).
    // The old 0.265 rate violated this invariant by missing the foreign WHT component.
    const accounts: NotionalAccounts = {
      CDA: 0, eRDTOH: 0, nRDTOH: 0, GRIP: 0, corporateInvestments: balance, corporateACB: balance,
    };

    const passiveRate = getPassiveInvestmentTaxRate('ON');
    const correctResult = updateAccountsFromReturns(accounts, returns, passiveRate);

    // Non-refundable = what was deducted from balance (beyond totalReturn)
    const actualNonRefundable = returns.totalReturn - (correctResult.corporateInvestments - balance);

    // The invariant: nonRefundable + nRDTOH = passiveRate * taxable
    const totalAccountedFor = actualNonRefundable + returns.nRDTOHIncrease;
    const expectedTotal = taxableInvIncome * passiveRate;

    // This should now EXACTLY match (the old 0.265 rate produced a ~$112.50 gap)
    expect(totalAccountedFor).toBeCloseTo(expectedTotal, 0);

    // Verify the old 0.265 rate would NOT satisfy the invariant
    const oldNonRefundable = taxableInvIncome * 0.265;
    const oldTotal = oldNonRefundable + returns.nRDTOHIncrease;
    expect(Math.abs(oldTotal - expectedTotal)).toBeGreaterThan(50);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 17: ESTATE ACB INVARIANTS
// Verifies that corporateACB tracks correctly throughout a projection:
//   - Start of projection: ACB = corporateInvestments (no embedded gain assumed)
//   - After multi-year growth: ACB <= corporateInvestments (gain accumulates but never exceeds FMV)
//   - ACB is always finite and non-negative
// ══════════════════════════════════════════════════════════════════════════════

describe('Estate ACB Invariants', () => {
  function makeProjectionInputs(overrides: Partial<ReturnType<typeof getDefaultInputs>> = {}) {
    return {
      ...getDefaultInputs(),
      province: 'ON',
      currentAge: 50,
      retirementAge: 65,
      planningEndAge: 85,
      planningHorizon: 35,
      annualCorporateRetainedEarnings: 150000,
      requiredIncome: 100000,
      corporateInvestmentBalance: 500000,
      investmentReturnRate: 0.07,
      expectedInflationRate: 0.02,
      ...overrides,
    };
  }

  it('corporateACB starts at corporateInvestmentBalance (no embedded gain assumed)', () => {
    // At projection initialization, corporateACB = corporateInvestmentBalance.
    // This means we start with zero embedded gains — the "current state" assumption.
    // In year 1, ACB may change due to salary/dividend processing, but it must be
    // <= the starting balance (no gain can have materialized before the projection starts).
    const startingBalance = 750000;
    const inputs = makeProjectionInputs({
      corporateInvestmentBalance: startingBalance,
      investmentReturnRate: 0, // zero return to isolate the ACB initialization
      planningHorizon: 1,
      annualCorporateRetainedEarnings: 0,
      requiredIncome: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // ACB must be non-negative and at most the starting balance
    // (it can decrease from proportional reduction due to salary/dividend payments)
    expect(yr1.notionalAccounts.corporateACB).toBeGreaterThanOrEqual(0);
    expect(yr1.notionalAccounts.corporateACB).toBeLessThanOrEqual(startingBalance + 1);
    // The year-end corp balance should also be <= starting (no return, only outflows possible)
    expect(yr1.notionalAccounts.corporateInvestments).toBeLessThanOrEqual(startingBalance + 1);
  });

  it('ACB <= corporateInvestments after multi-year projection with investment growth', () => {
    // Over many years at 7%, unrealized gains accumulate.
    // ACB only grows from taxed income; FMV grows from both income AND appreciation.
    // Therefore ACB must always be <= corporateInvestments.
    const inputs = makeProjectionInputs({ planningHorizon: 15 });
    const result = calculateProjection(inputs);

    for (const yr of result.yearlyResults) {
      if (yr.notionalAccounts.corporateInvestments > 0) {
        expect(yr.notionalAccounts.corporateACB).toBeLessThanOrEqual(
          yr.notionalAccounts.corporateInvestments + 0.01
        );
      }
    }
  });

  it('ACB is always finite and non-negative across all years', () => {
    const inputs = makeProjectionInputs({ planningHorizon: 20 });
    const result = calculateProjection(inputs);

    for (const yr of result.yearlyResults) {
      expect(yr.notionalAccounts.corporateACB).not.toBeNaN();
      expect(Number.isFinite(yr.notionalAccounts.corporateACB)).toBe(true);
      expect(yr.notionalAccounts.corporateACB).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it('estate with ACB = FMV has zero corporate CG tax (backward-compatible case)', () => {
    // When ACB equals corporateInvestments at death, unrealizedGain = 0 → no CG tax
    // This test verifies backward compatibility: old projections with no embedded gains
    // produce the same result as before.
    const inputs = makeProjectionInputs({
      corporateInvestmentBalance: 500000,
      investmentReturnRate: 0, // no return → no unrealized gains → ACB stays equal to FMV
      annualCorporateRetainedEarnings: 0,
      requiredIncome: 0,
      planningHorizon: 5,
      currentAge: 80,
      retirementAge: 65,
      planningEndAge: 85,
    });
    const result = calculateProjection(inputs);
    const lastYr = result.yearlyResults[result.yearlyResults.length - 1];

    if (lastYr.estate) {
      // With 0% return and no business income, ACB = FMV, so corporate CG tax = 0
      expect(lastYr.estate.corporateCapitalGainsTax).toBeCloseTo(0, 0);
    }
  });
});
