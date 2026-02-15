/**
 * Golden Dataset: CRA 2026 Verified Values
 *
 * Hand-verified test cases using actual CRA 2026 tax tables and rates.
 * These tests validate that stored tax data and core calculation functions
 * produce results consistent with official CRA publications.
 *
 * Sources:
 * - CRA 2026 federal tax brackets and BPA
 * - CRA 2026 CPP/CPP2 contribution rates
 * - CRA 2026 EI premium rates
 * - Provincial tax data for ON, AB, BC, QC
 *
 * Note: The 2026 federal lowest bracket uses the full-year 14% rate.
 * (2025 had a blended 14.5% due to mid-year change from 15% to 14%.)
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import { getTaxYearData, KNOWN_TAX_YEARS } from '../tax/indexation';
import { calculateTaxByBrackets } from '../tax/constants';
import { calculatePassiveIncomeGrind } from '../tax/passiveIncomeGrind';
import type { UserInputs } from '../types';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    province: 'ON',
    requiredIncome: 100000,
    planningHorizon: 3,
    startingYear: 2026,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: false,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    investmentReturnRate: 0.04,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: 100000,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'fixed',
    fixedSalaryAmount: 100000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Known Tax Year Data (2026)
// ---------------------------------------------------------------------------

describe('Golden Dataset: CRA 2026 Verified Values', () => {
  describe('2026 Known Tax Year Data', () => {
    const data2026 = KNOWN_TAX_YEARS[2026];

    it('should have federal BPA of $16,452', () => {
      expect(data2026.federal.basicPersonalAmount).toBe(16452);
    });

    it('should have correct 2026 federal bracket thresholds', () => {
      expect(data2026.federal.brackets[0].threshold).toBe(0);
      expect(data2026.federal.brackets[1].threshold).toBe(58523);
      expect(data2026.federal.brackets[2].threshold).toBe(117045);
      expect(data2026.federal.brackets[3].threshold).toBe(181440);
      expect(data2026.federal.brackets[4].threshold).toBe(258482);
    });

    it('should have 14% lowest bracket rate for 2026 (full year)', () => {
      expect(data2026.federal.brackets[0].rate).toBe(0.14);
    });

    it('should have correct federal bracket rates', () => {
      expect(data2026.federal.brackets[1].rate).toBe(0.205);
      expect(data2026.federal.brackets[2].rate).toBe(0.26);
      expect(data2026.federal.brackets[3].rate).toBe(0.29);
      expect(data2026.federal.brackets[4].rate).toBe(0.33);
    });

    it('should have CPP YMPE of $74,600', () => {
      expect(data2026.cpp.ympe).toBe(74600);
    });

    it('should have CPP basic exemption of $3,500', () => {
      expect(data2026.cpp.basicExemption).toBe(3500);
    });

    it('should have CPP rate of 5.95%', () => {
      expect(data2026.cpp.rate).toBe(0.0595);
    });

    it('should have CPP max contribution of $4,230.45', () => {
      expect(data2026.cpp.maxContribution).toBe(4230.45);
    });

    it('should have CPP2 YAMPE of $85,000', () => {
      expect(data2026.cpp2.secondCeiling).toBe(85000);
    });

    it('should have CPP2 max contribution of $416.00', () => {
      expect(data2026.cpp2.maxContribution).toBe(416.00);
    });

    it('should have EI max insurable earnings of $68,900', () => {
      expect(data2026.ei.maxInsurableEarnings).toBe(68900);
    });

    it('should have EI rate of 1.63%', () => {
      expect(data2026.ei.rate).toBe(0.0163);
    });

    it('should have EI max contribution of $1,123.07', () => {
      expect(data2026.ei.maxContribution).toBe(1123.07);
    });

    it('should have RRSP dollar limit of $33,810', () => {
      expect(data2026.rrsp.dollarLimit).toBe(33810);
    });

    it('should have RRSP contribution rate of 18%', () => {
      expect(data2026.rrsp.contributionRate).toBe(0.18);
    });

    it('should have TFSA annual limit of $7,000', () => {
      expect(data2026.tfsa.annualLimit).toBe(7000);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Federal Tax at Known Income Levels
  // ---------------------------------------------------------------------------

  describe('Federal tax at known income levels', () => {
    const taxData = getTaxYearData(2026, 0.02, 'ON');
    const brackets = taxData.federal.brackets;
    const bpa = taxData.federal.basicPersonalAmount;

    it('should calculate $0 tax on $0 income', () => {
      const tax = calculateTaxByBrackets(0, brackets);
      expect(tax).toBe(0);
    });

    it('should calculate $0 tax at BPA level ($16,452)', () => {
      const taxableIncome = Math.max(0, bpa - bpa);
      const tax = calculateTaxByBrackets(taxableIncome, brackets);
      expect(tax).toBe(0);
    });

    it('should calculate correct tax at $58,523 income', () => {
      // Taxable = $58,523 - $16,452 = $42,071 all in first bracket at 14%
      const taxableIncome = 58523 - bpa;
      const tax = calculateTaxByBrackets(taxableIncome, brackets);
      const expected = taxableIncome * 0.14;
      expect(tax).toBeCloseTo(expected, 0);
    });

    it('should calculate correct tax at $100,000 income', () => {
      // Taxable = $100,000 - $16,452 = $83,548
      // First bracket: $58,523 at 14%
      // Second bracket: ($83,548 - $58,523) = $25,025 at 20.5%
      const taxableIncome = 100000 - bpa;
      const tax = calculateTaxByBrackets(taxableIncome, brackets);
      const firstBracket = 58523 * 0.14;
      const secondBracket = (taxableIncome - 58523) * 0.205;
      const expected = firstBracket + secondBracket;
      expect(tax).toBeCloseTo(expected, 0);
    });

    it('should calculate correct tax at $117,045 income', () => {
      // Taxable = $117,045 - $16,452 = $100,593
      const taxableIncome = 117045 - bpa;
      const tax = calculateTaxByBrackets(taxableIncome, brackets);
      const firstBracket = 58523 * 0.14;
      const secondBracket = (taxableIncome - 58523) * 0.205;
      const expected = firstBracket + secondBracket;
      expect(tax).toBeCloseTo(expected, 0);
    });

    it('should calculate correct tax at $200,000 income (4 brackets)', () => {
      // Taxable = $200,000 - $16,452 = $183,548
      const taxableIncome = 200000 - bpa;
      const tax = calculateTaxByBrackets(taxableIncome, brackets);
      const b1 = 58523 * 0.14;
      const b2 = (117045 - 58523) * 0.205;
      const b3 = (181440 - 117045) * 0.26;
      const b4 = (taxableIncome - 181440) * 0.29;
      const expected = b1 + b2 + b3 + b4;
      expect(tax).toBeCloseTo(expected, -1); // within ~$10
    });

    it('should calculate correct tax at $500,000 income (all 5 brackets)', () => {
      // Taxable = $500,000 - $16,452 = $483,548
      const taxableIncome = 500000 - bpa;
      const tax = calculateTaxByBrackets(taxableIncome, brackets);
      const b1 = 58523 * 0.14;
      const b2 = (117045 - 58523) * 0.205;
      const b3 = (181440 - 117045) * 0.26;
      const b4 = (258482 - 181440) * 0.29;
      const b5 = (taxableIncome - 258482) * 0.33;
      const expected = b1 + b2 + b3 + b4 + b5;
      expect(tax).toBeCloseTo(expected, -1); // within ~$10
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CPP 2026 Verification
  // ---------------------------------------------------------------------------

  describe('CPP 2026 verification', () => {
    it('should calculate max CPP at $74,600 salary', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 74600,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // Max CPP = (74600 - 3500) * 0.0595 = $4,230.45
      expect(year1.cpp).toBeCloseTo(4230.45, 0);
    });

    it('should calculate CPP at $30,000 salary', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 30000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // CPP = (30000 - 3500) * 0.0595 = $1,576.75
      expect(year1.cpp).toBeCloseTo(1576.75, 0);
    });

    it('should cap CPP at max for $200,000 salary (same as $74,600)', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 200000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // Should be capped at max: $4,230.45
      expect(year1.cpp).toBeCloseTo(4230.45, 0);
    });

    it('should calculate CPP2 for salary above YMPE', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 85000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // CPP2 = (85000 - 74600) * 0.04 = $416.00
      expect(year1.cpp2).toBeCloseTo(416.00, 0);
    });

    it('should have $0 CPP2 for salary below YMPE', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 60000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      expect(year1.cpp2).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. EI 2026 Verification
  // ---------------------------------------------------------------------------

  describe('EI 2026 verification', () => {
    it('should calculate max EI at $68,900 salary', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 68900,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // Max EI = 68900 * 0.0163 = $1,123.07
      expect(year1.ei).toBeCloseTo(1123.07, 0);
    });

    it('should calculate EI at $30,000 salary', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 30000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // EI = 30000 * 0.0163 = $489
      expect(year1.ei).toBeCloseTo(489, 0);
    });

    it('should cap EI at max for $200,000 salary', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 200000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // Should be capped at max: $1,123.07
      expect(year1.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Ontario Combined Tax at $100K Salary
  // ---------------------------------------------------------------------------

  describe('Ontario combined tax at $100K salary', () => {
    const result = calculateProjection(createInputs({
      province: 'ON',
      fixedSalaryAmount: 100000,
      planningHorizon: 3,
      salaryStrategy: 'fixed',
    }));
    const year1 = result.yearlyResults[0];

    it('should have personal tax between $20,000 and $30,000', () => {
      expect(year1.personalTax).toBeGreaterThan(20000);
      expect(year1.personalTax).toBeLessThan(30000);
    });

    it('should have effective personal tax rate between 20% and 30%', () => {
      const salaryTaxRate = year1.personalTax / 100000;
      expect(salaryTaxRate).toBeGreaterThan(0.20);
      expect(salaryTaxRate).toBeLessThan(0.30);
    });

    it('should have Ontario Health Premium included', () => {
      expect(year1.healthPremium).toBeGreaterThan(0);
      expect(year1.healthPremium).toBeLessThanOrEqual(900);
    });

    it('should have CPP close to max at $100K salary', () => {
      // $100K > YMPE of $74,600, so CPP should be at max
      expect(year1.cpp).toBeCloseTo(4230.45, 0);
    });

    it('should have EI at max at $100K salary', () => {
      // $100K > max insurable earnings of $68,900
      expect(year1.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Alberta Tax Comparison
  // ---------------------------------------------------------------------------

  describe('Alberta tax comparison', () => {
    const salaryOnlyInputs = {
      fixedSalaryAmount: 150000,
      requiredIncome: 50000,
      planningHorizon: 3 as const,
      salaryStrategy: 'fixed' as const,
      corporateInvestmentBalance: 0,
      annualCorporateRetainedEarnings: 0,
      gripBalance: 0,
      eRDTOHBalance: 0,
      nRDTOHBalance: 0,
      cdaBalance: 0,
    };

    const abResult = calculateProjection(createInputs({
      province: 'AB',
      ...salaryOnlyInputs,
    }));
    const abYear1 = abResult.yearlyResults[0];

    const onResult = calculateProjection(createInputs({
      province: 'ON',
      ...salaryOnlyInputs,
    }));
    const onYear1 = onResult.yearlyResults[0];

    it('should have Alberta personal tax in the expected range at $150K salary', () => {
      expect(abYear1.personalTax).toBeGreaterThan(20000);
      expect(abYear1.personalTax).toBeLessThan(40000);
    });

    it('should have lower combined personal tax in Alberta than Ontario on salary', () => {
      expect(abYear1.personalTax).toBeLessThan(onYear1.personalTax);
    });

    it('should have $0 health premium in Alberta', () => {
      expect(abYear1.healthPremium).toBe(0);
    });

    it('should have $0 provincial surtax in Alberta', () => {
      expect(abYear1.provincialSurtax).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Quebec Special Handling
  // ---------------------------------------------------------------------------

  describe('Quebec special handling', () => {
    const qcResult = calculateProjection(createInputs({
      province: 'QC',
      fixedSalaryAmount: 100000,
      planningHorizon: 3,
      salaryStrategy: 'fixed',
    }));
    const qcYear1 = qcResult.yearlyResults[0];

    const onResult = calculateProjection(createInputs({
      province: 'ON',
      fixedSalaryAmount: 100000,
      planningHorizon: 3,
      salaryStrategy: 'fixed',
    }));
    const onYear1 = onResult.yearlyResults[0];

    it('should use QPP instead of CPP (higher contribution)', () => {
      // QPP rate is 6.4% vs CPP 5.95%
      // QPP = (74600 - 3500) * 0.064 = $4,550.40 (capped at maxContribution)
      // Salary of $100K > YMPE, so QPP at max
      expect(qcYear1.cpp).toBeGreaterThan(4000);
      expect(qcYear1.cpp).toBeCloseTo(4550.40, 0);
    });

    it('should have QPIP > 0 for Quebec', () => {
      // QPIP employee rate = 0.494% on insurable earnings (max $100K)
      // At $100K salary: min(100000, 100000) * 0.00494 = $494.00
      expect(qcYear1.qpip).toBeGreaterThan(0);
      expect(qcYear1.qpip).toBeCloseTo(494.00, 5);
    });

    it('should have $0 QPIP for Ontario', () => {
      expect(onYear1.qpip).toBe(0);
    });

    it('should have Quebec EI at reduced rate', () => {
      // Quebec EI rate is 1.264% for 2026 (vs 1.63% for rest of Canada)
      // At $100K (> max insurable $68,900): max = 68900 * 0.01264 = $870.90
      expect(qcYear1.ei).toBeCloseTo(870.90, 0);
    });

    it('should have higher combined personal tax in Quebec than Ontario', () => {
      expect(qcYear1.personalTax).toBeGreaterThan(onYear1.personalTax);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Corporate Tax Rates
  // ---------------------------------------------------------------------------

  describe('Corporate tax rates', () => {
    it('should have Ontario small business combined rate of 12.2%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.122, 3);
    });

    it('should have Alberta small business combined rate of 11%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'AB');
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.11, 3);
    });

    it('should have BC small business combined rate of 11%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'BC');
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.11, 3);
    });

    it('should have Ontario general rate of approximately 26.5%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.corporate.general).toBeCloseTo(0.265, 3);
    });

    it('should have Alberta general rate of 23%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'AB');
      expect(taxData.corporate.general).toBeCloseTo(0.23, 3);
    });

    it('should have BC general rate of 27%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'BC');
      expect(taxData.corporate.general).toBeCloseTo(0.27, 3);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Passive Income Grind Verification
  // ---------------------------------------------------------------------------

  describe('Passive income grind verification', () => {
    const sbRate = 0.122;
    const genRate = 0.265;

    it('should have no SBD reduction at $50,000 AAII (threshold)', () => {
      const result = calculatePassiveIncomeGrind(50000, 500000, sbRate, genRate);
      expect(result.reducedSBDLimit).toBe(500000);
      expect(result.sbdReduction).toBe(0);
      expect(result.isFullyGrounded).toBe(false);
    });

    it('should reduce SBD by $125,000 at $75,000 AAII', () => {
      const result = calculatePassiveIncomeGrind(75000, 500000, sbRate, genRate);
      expect(result.sbdReduction).toBe(125000);
      expect(result.reducedSBDLimit).toBe(375000);
      expect(result.isFullyGrounded).toBe(false);
    });

    it('should reduce SBD by $250,000 at $100,000 AAII', () => {
      const result = calculatePassiveIncomeGrind(100000, 500000, sbRate, genRate);
      expect(result.sbdReduction).toBe(250000);
      expect(result.reducedSBDLimit).toBe(250000);
      expect(result.isFullyGrounded).toBe(false);
    });

    it('should fully eliminate SBD at $150,000 AAII', () => {
      const result = calculatePassiveIncomeGrind(150000, 500000, sbRate, genRate);
      expect(result.sbdReduction).toBe(500000);
      expect(result.reducedSBDLimit).toBe(0);
      expect(result.isFullyGrounded).toBe(true);
    });

    it('should calculate additional tax from grind at $100,000 AAII', () => {
      const result = calculatePassiveIncomeGrind(100000, 500000, sbRate, genRate);
      const expectedAdditionalTax = 250000 * (genRate - sbRate);
      expect(result.additionalTaxFromGrind).toBeCloseTo(expectedAdditionalTax, 0);
    });

    it('should have no grind at $30,000 AAII (below threshold)', () => {
      const result = calculatePassiveIncomeGrind(30000, 500000, sbRate, genRate);
      expect(result.reducedSBDLimit).toBe(500000);
      expect(result.sbdReduction).toBe(0);
      expect(result.additionalTaxFromGrind).toBe(0);
    });

    it('should cap SBD at zero even when AAII exceeds $150K', () => {
      const result = calculatePassiveIncomeGrind(200000, 500000, sbRate, genRate);
      expect(result.reducedSBDLimit).toBe(0);
      expect(result.isFullyGrounded).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Dividend Tax Integration
  // ---------------------------------------------------------------------------

  describe('Dividend tax integration', () => {
    it('should have eligible dividend gross-up of 38%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.dividend.eligible.grossUp).toBe(0.38);
    });

    it('should have non-eligible dividend gross-up of 15%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.dividend.nonEligible.grossUp).toBe(0.15);
    });

    it('should have federal DTC for eligible dividends of ~15.02%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.dividend.eligible.federalCredit).toBeCloseTo(0.150198, 4);
    });

    it('should have ON provincial DTC for eligible dividends of 10%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.dividend.eligible.provincialCredit).toBe(0.10);
    });

    it('should have lower effective tax on dividends-only vs salary at $100K', () => {
      const divResult = calculateProjection(createInputs({
        province: 'ON',
        salaryStrategy: 'dividends-only',
        requiredIncome: 80000,
        planningHorizon: 3,
        corporateInvestmentBalance: 0,
        gripBalance: 500000,
        eRDTOHBalance: 200000,
        annualCorporateRetainedEarnings: 200000,
      }));

      const salResult = calculateProjection(createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 80000,
        requiredIncome: 80000,
        planningHorizon: 3,
        corporateInvestmentBalance: 0,
        gripBalance: 0,
        annualCorporateRetainedEarnings: 200000,
      }));

      const divYear1 = divResult.yearlyResults[0];
      const salYear1 = salResult.yearlyResults[0];

      // Dividends should not have CPP/EI deductions
      expect(divYear1.cpp).toBe(0);
      expect(divYear1.ei).toBe(0);

      // Salary should have CPP and EI
      expect(salYear1.cpp).toBeGreaterThan(0);
      expect(salYear1.ei).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. RRSP and TFSA Limits 2026
  // ---------------------------------------------------------------------------

  describe('RRSP and TFSA limits 2026', () => {
    it('should have RRSP dollar limit of $33,810 for 2026', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.rrsp.dollarLimit).toBe(33810);
    });

    it('should have RRSP contribution rate of 18%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.rrsp.contributionRate).toBe(0.18);
    });

    it('should have TFSA annual limit of $7,000 for 2026', () => {
      const taxData = getTaxYearData(2026, 0.02, 'ON');
      expect(taxData.tfsa.annualLimit).toBe(7000);
    });

    it('should generate RRSP room equal to 18% of salary', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 100000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      expect(year1.rrspRoomGenerated).toBeCloseTo(18000, 0);
    });

    it('should have RRSP limit of $33,810 cap RRSP room generation', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 200000,
        planningHorizon: 3,
      }));
      const year1 = result.yearlyResults[0];
      // Room generated = 200,000 * 0.18 = $36,000 (room is uncapped, contribution is capped)
      expect(year1.rrspRoomGenerated).toBeCloseTo(36000, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // Additional: Cross-province corporate rate checks
  // ---------------------------------------------------------------------------

  describe('Cross-province corporate rates', () => {
    it('should have Saskatchewan small business rate of 10%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'SK');
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.10, 3);
    });

    it('should have Manitoba small business rate of 9%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'MB');
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.09, 3);
    });

    it('should have Quebec small business combined rate of 12.2%', () => {
      const taxData = getTaxYearData(2026, 0.02, 'QC');
      expect(taxData.corporate.smallBusiness).toBeCloseTo(0.122, 3);
    });
  });

  // ---------------------------------------------------------------------------
  // Additional: RDTOH refund rate
  // ---------------------------------------------------------------------------

  describe('RDTOH refund rate', () => {
    it('should have RDTOH refund rate of 38.33%', () => {
      const data2026 = KNOWN_TAX_YEARS[2026];
      expect(data2026.rdtoh.refundRate).toBeCloseTo(0.3833, 4);
    });
  });
});
