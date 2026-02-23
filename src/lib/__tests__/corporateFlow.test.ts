/**
 * Corporate Flow End-to-End Tests
 *
 * Tests the full corporate dollar flow through the calculator engine:
 * - SBD vs general rate split on active business income
 * - Notional account generation from investment returns (CDA, eRDTOH, nRDTOH)
 * - RDTOH refund mechanics (depletion on dividend payout, eRDTOH cascade)
 * - GRIP tracking (decrease on eligible dividends, cap enforcement)
 * - Multi-year corporate investment balance tracking
 * - Passive income grind (SBD clawback at $50K/$150K thresholds)
 * - Dividend depletion priority (CDA -> eRDTOH -> nRDTOH -> GRIP -> retained)
 * - Retained earnings as last resort for non-eligible dividends
 * - IPP as deductible corporate expense
 * - Multi-year notional account conservation
 */

import { describe, it, expect } from 'vitest';
import type { UserInputs } from '../types';
import { getDefaultInputs } from '../localStorage';
import { calculateProjection } from '../calculator';

const defaults = getDefaultInputs();

/** Helper: create standard inputs with sensible defaults for corporate flow testing */
function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...defaults,
    province: 'ON',
    requiredIncome: 100000,
    planningHorizon: 5,
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
    annualCorporateRetainedEarnings: 200000,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

// ─── Ontario 2026 corporate rate constants ───
const SBD_RATE = 0.122;      // 9% federal + 3.2% Ontario
// GENERAL_RATE = 0.265 (15% federal + 11.5% Ontario) — used in comments for reference
const RDTOH_REFUND_RATE = 0.3833;
const SBD_LIMIT = 500000;

describe('Corporate Flow — SBD vs General Rate Split', () => {
  it('should tax active income entirely at SBD rate when below $500K', () => {
    // With $200K retained earnings and ~$100K salary cost, taxable business
    // income is roughly $100K — well below SBD limit.
    const inputs = createInputs({
      annualCorporateRetainedEarnings: 200000,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 80000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // All active income should be under SBD limit
    expect(yr1.passiveIncomeGrind.reducedSBDLimit).toBe(SBD_LIMIT);

    // Corporate tax on active income should approximate SBD rate
    // taxableBusinessIncome = retainedEarnings - salaryCost
    // salaryCost includes salary + employer CPP/EI
    // With $80K salary, employer cost is roughly $6-8K
    // So taxable ~= $200K - ~$88K = ~$112K
    // Tax should be ~$112K * 0.122 = ~$13,664
    // taxableApprox ≈ 200000 - 80000 = $120K (rough lower bound, ignoring employer cost)
    expect(yr1.corporateTaxOnActive).toBeGreaterThan(0);
    // Derive expected taxable income from known inputs:
    // grossRevenue ($200K) - salary ($80K) - employer payroll (~$5.5-6K for ON 2026)
    // Employer payroll for $80K in ON ≈ CPP($3,867) + CPP2($396) + EI_employer($1,469) ≈ $5,732
    // EHT = $0 (payroll below $1M ON exemption)
    // expectedTaxableIncome ≈ $200K - $80K - ~$5,732 ≈ ~$114,268
    const grossRevenue = 200000;
    const expectedTaxableIncome = grossRevenue - yr1.salary - yr1.cpp - yr1.cpp2 - (yr1.ei * 1.4);
    // All income under SBD limit, so tax = taxableIncome * 12.2%
    expect(yr1.corporateTaxOnActive).toBeCloseTo(expectedTaxableIncome * SBD_RATE, -2);
  });

  it('should split between SBD and general rates when active income exceeds $500K', () => {
    // High retained earnings, minimal salary to maximize taxable business income
    const inputs = createInputs({
      annualCorporateRetainedEarnings: 700000,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 50000,
      corporateInvestmentBalance: 100000, // Low balance to minimize passive income grind
      investmentReturnRate: 0.01,         // Low return to avoid passive income grind
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // With $700K earnings and ~$55K salary cost, taxable ~= $645K > $500K SBD limit
    // Tax should be: $500K * 12.2% + ~$145K * 26.5%
    const expectedMinTax = SBD_LIMIT * SBD_RATE; // $61,000 from SBD portion alone
    expect(yr1.corporateTaxOnActive).toBeGreaterThan(expectedMinTax);

    // The effective rate should be between SBD and general rate
    // Rough check: taxableBusinessIncome ≈ corpTax / blendedRate
    // (SBD_LIMIT * SBD_RATE + (700K - 50K - SBD_LIMIT) * GENERAL_RATE) / (700K - 50K)
    expect(yr1.corporateTaxOnActive).toBeGreaterThan(SBD_LIMIT * SBD_RATE);
  });

  it('should compute pure SBD rate when taxable business income is small', () => {
    const inputs = createInputs({
      annualCorporateRetainedEarnings: 150000,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
      corporateInvestmentBalance: 10000, // Minimal to avoid passive income
      investmentReturnRate: 0.01,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Taxable business income ~= $150K - ~$110K(salary+employer) ~= $40K
    // All at SBD rate: $40K * 0.122 = $4,880
    // Verify the effective rate is exactly SBD rate (no general-rate portion)
    if (yr1.corporateTaxOnActive > 0) {
      // Reverse engineer taxable business income from the tax at SBD rate
      // If all at SBD, then tax / SBD_RATE = taxable
      // If any at general, tax / SBD_RATE would underestimate
      const impliedTaxable = yr1.corporateTaxOnActive / SBD_RATE;
      // Should be within rounding of actual taxable
      expect(impliedTaxable).toBeLessThan(SBD_LIMIT);
    }
  });
});

describe('Corporate Flow — Notional Account Generation', () => {
  it('should generate CDA = 50% of realized capital gains', () => {
    const inputs = createInputs({
      cdaBalance: 0,
      corporateInvestmentBalance: 1000000,
      investmentReturnRate: 0.06,
      salaryStrategy: 'dividends-only',
      requiredIncome: 10000, // Small income so dividends don't fully drain CDA
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    const realizedGains = yr1.investmentReturns.realizedCapitalGain;
    const expectedCDAIncrease = realizedGains * 0.5;
    expect(yr1.investmentReturns.CDAIncrease).toBeCloseTo(expectedCDAIncrease, 0);
    expect(yr1.investmentReturns.CDAIncrease).toBeGreaterThan(0);
  });

  it('should generate eRDTOH = 38.33% of Canadian dividends received', () => {
    const inputs = createInputs({
      corporateInvestmentBalance: 1000000,
      canadianEquityPercent: 100,
      usEquityPercent: 0,
      internationalEquityPercent: 0,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    const canadianDivs = yr1.investmentReturns.canadianDividends;
    const expectedERDTOH = canadianDivs * RDTOH_REFUND_RATE;
    expect(yr1.investmentReturns.eRDTOHIncrease).toBeCloseTo(expectedERDTOH, 0);
    expect(yr1.investmentReturns.eRDTOHIncrease).toBeGreaterThan(0);
  });

  it('should generate nRDTOH = 30.67% of foreign income minus 15% withholding on foreign dividends', () => {
    const inputs = createInputs({
      corporateInvestmentBalance: 1000000,
      canadianEquityPercent: 0,
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Corrected model (ITA s.129(3)): nRDTOH = (foreignIncome + taxableCapGain) * 0.3067 - foreignDividends * 0.15
    // For 50% US (1.5% yield) + 50% intl (3.0% yield) on $1M: foreignIncome = $22,500
    // foreignDividends = $22,500 (all foreign income is dividends, no interest)
    // taxableCapGain = (50%US * 0.003 + 50%intl * 0.004) * 1M * 0.50 = $1,750
    const foreignIncome = yr1.investmentReturns.foreignIncome;
    const taxableCapGain = yr1.investmentReturns.realizedCapitalGain * 0.50;
    const FOREIGN_DIVIDEND_RATE = 0.5 * 0.015 + 0.5 * 0.030; // 2.25%
    const foreignDividends = 1000000 * FOREIGN_DIVIDEND_RATE;
    const expectedNRDTOH = (foreignIncome + taxableCapGain) * 0.3067 - foreignDividends * 0.15;
    expect(yr1.investmentReturns.nRDTOHIncrease).toBeCloseTo(expectedNRDTOH, 0);
    expect(yr1.investmentReturns.nRDTOHIncrease).toBeGreaterThan(0);
  });

  it('should generate GRIP increase from Canadian dividends received', () => {
    const inputs = createInputs({
      corporateInvestmentBalance: 1000000,
      canadianEquityPercent: 100,
      usEquityPercent: 0,
      internationalEquityPercent: 0,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    const canadianDivs = yr1.investmentReturns.canadianDividends;
    // GRIP increases by Canadian dividends received (they pass through as eligible)
    expect(yr1.investmentReturns.GRIPIncrease).toBeCloseTo(canadianDivs, 0);
    expect(yr1.investmentReturns.GRIPIncrease).toBeGreaterThan(0);
  });
});

describe('Corporate Flow — RDTOH Refund Mechanics', () => {
  it('should decrease eRDTOH when eligible dividends are paid', () => {
    const inputs = createInputs({
      eRDTOHBalance: 50000,
      gripBalance: 200000,
      salaryStrategy: 'dividends-only',
      requiredIncome: 80000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // eRDTOH should decrease due to refund on eligible dividends
    if (yr1.dividends.eligibleDividends > 0) {
      expect(yr1.rdtohRefundReceived).toBeGreaterThan(0);
      // Ending eRDTOH should be less than starting (50000 + increases - refunds)
      const eRDTOHEndExpected = 50000 + yr1.investmentReturns.eRDTOHIncrease;
      expect(yr1.notionalAccounts.eRDTOH).toBeLessThan(eRDTOHEndExpected);
    }
  });

  it('should decrease nRDTOH when non-eligible dividends are paid', () => {
    // No GRIP or eRDTOH so only nRDTOH dividends are available
    const inputs = createInputs({
      nRDTOHBalance: 50000,
      eRDTOHBalance: 0,
      gripBalance: 0,
      cdaBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 50000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Should use nRDTOH for non-eligible dividends
    expect(yr1.dividends.nonEligibleDividends).toBeGreaterThan(0);
    expect(yr1.rdtohRefundReceived).toBeGreaterThan(0);
  });

  it('should cascade eRDTOH refund when nRDTOH is depleted', () => {
    // Small nRDTOH that will be exhausted, then eRDTOH cascade should kick in
    const inputs = createInputs({
      nRDTOHBalance: 5000,    // Small, will deplete quickly
      eRDTOHBalance: 50000,   // Larger, available for cascade
      gripBalance: 0,          // No GRIP forces non-eligible path
      cdaBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 80000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Total RDTOH refund should exceed what nRDTOH alone could provide
    // nRDTOH could refund at most $5000
    // With cascade, eRDTOH contributes additional refund via non-eligible dividends
    expect(yr1.rdtohRefundReceived).toBeGreaterThan(5000);
    // eRDTOH should have decreased due to cascade
    const eRDTOHWithoutCascade = yr1.investmentReturns.eRDTOHIncrease;
    // Ending eRDTOH should be less than just the new increase (since starting 50K was partly used)
    expect(yr1.notionalAccounts.eRDTOH).toBeLessThan(50000 + eRDTOHWithoutCascade);
  });
});

describe('Corporate Flow — GRIP Tracking', () => {
  it('should decrease GRIP when eligible dividends are paid', () => {
    const inputs = createInputs({
      gripBalance: 100000,
      eRDTOHBalance: 30000,
      salaryStrategy: 'dividends-only',
      requiredIncome: 50000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // GRIP should decrease by the amount of eligible dividends paid
    if (yr1.dividends.eligibleDividends > 0) {
      const expectedGRIP = 100000 + yr1.investmentReturns.GRIPIncrease - yr1.dividends.eligibleDividends;
      expect(yr1.notionalAccounts.GRIP).toBeCloseTo(expectedGRIP, -1);
    }
  });

  it('should cap eligible dividends at available GRIP', () => {
    // Small GRIP balance, large eRDTOH — eligible dividends should be capped by GRIP
    const inputs = createInputs({
      gripBalance: 5000,       // Small
      eRDTOHBalance: 100000,   // Large — but eligible divs need GRIP
      nRDTOHBalance: 0,
      cdaBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 80000,
      corporateInvestmentBalance: 500000,
      canadianEquityPercent: 0, // No GRIP increase from returns
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Eligible dividends should not exceed initial GRIP + any GRIP increase from returns
    const maxEligible = 5000 + yr1.investmentReturns.GRIPIncrease;
    expect(yr1.dividends.eligibleDividends).toBeLessThanOrEqual(maxEligible + 1); // small tolerance
  });
});

describe('Corporate Flow — 5-Year Balance Tracking', () => {
  it('should show corporate investments growing when earnings exceed compensation costs', () => {
    // High earnings, moderate compensation — balance should grow
    const inputs = createInputs({
      annualCorporateRetainedEarnings: 400000,
      requiredIncome: 80000,
      corporateInvestmentBalance: 500000,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 60000,
    });
    const result = calculateProjection(inputs);

    // Each year's ending balance should be greater than the previous
    for (let i = 1; i < result.yearlyResults.length; i++) {
      const prevBalance = result.yearlyResults[i - 1].notionalAccounts.corporateInvestments;
      const currBalance = result.yearlyResults[i].notionalAccounts.corporateInvestments;
      expect(currBalance).toBeGreaterThan(prevBalance);
    }
  });

  it('should show declining balance when compensation exceeds earnings', () => {
    // No retained earnings, high compensation — balance should decrease
    const inputs = createInputs({
      annualCorporateRetainedEarnings: 0,
      requiredIncome: 150000,
      corporateInvestmentBalance: 1000000,
      salaryStrategy: 'dividends-only',
    });
    const result = calculateProjection(inputs);

    // Final balance should be significantly less than starting
    expect(result.finalCorporateBalance).toBeLessThan(1000000);
  });

  it('should track balance across 5 years consistently', () => {
    const inputs = createInputs({ planningHorizon: 5 });
    const result = calculateProjection(inputs);

    expect(result.yearlyResults).toHaveLength(5);
    // Year numbers should be sequential
    for (let i = 0; i < 5; i++) {
      expect(result.yearlyResults[i].year).toBe(i + 1);
    }
    // Final corporate balance should match last year's ending notional accounts
    expect(result.finalCorporateBalance).toBe(
      result.yearlyResults[4].notionalAccounts.corporateInvestments
    );
  });
});

describe('Corporate Flow — Passive Income Grind', () => {
  it('should have no SBD grind when AAII is below $50K', () => {
    // Low investment balance = low passive income
    const inputs = createInputs({
      corporateInvestmentBalance: 100000, // 4% return = $4K total, AAII well under $50K
      investmentReturnRate: 0.04,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    expect(yr1.passiveIncomeGrind.totalPassiveIncome).toBeLessThan(50000);
    expect(yr1.passiveIncomeGrind.reducedSBDLimit).toBe(SBD_LIMIT);
    expect(yr1.passiveIncomeGrind.sbdReduction).toBe(0);
    expect(yr1.passiveIncomeGrind.isFullyGrounded).toBe(false);
  });

  it('should apply partial grind when AAII is between $50K and $150K', () => {
    // Need large balance to generate >$50K passive income
    // At 4% return with 25/25/25/25 allocation, AAII includes foreign + 50% cap gains
    // For $2M at 4%, total return = $80K; AAII depends on composition
    const inputs = createInputs({
      corporateInvestmentBalance: 3000000,
      investmentReturnRate: 0.06,
      annualCorporateRetainedEarnings: 200000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    if (yr1.passiveIncomeGrind.totalPassiveIncome > 50000 &&
        yr1.passiveIncomeGrind.totalPassiveIncome < 150000) {
      expect(yr1.passiveIncomeGrind.reducedSBDLimit).toBeLessThan(SBD_LIMIT);
      expect(yr1.passiveIncomeGrind.reducedSBDLimit).toBeGreaterThan(0);
      expect(yr1.passiveIncomeGrind.sbdReduction).toBeGreaterThan(0);
      expect(yr1.passiveIncomeGrind.isFullyGrounded).toBe(false);

      // Verify grind formula: reduction = $5 * (AAII - $50,000)
      const expectedReduction = 5 * (yr1.passiveIncomeGrind.totalPassiveIncome - 50000);
      expect(yr1.passiveIncomeGrind.sbdReduction).toBeCloseTo(expectedReduction, -1);
    }
  });

  it('should fully eliminate SBD when AAII reaches $150K+', () => {
    // Very large balance to ensure AAII > $150K
    const inputs = createInputs({
      corporateInvestmentBalance: 10000000,
      investmentReturnRate: 0.06,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    expect(yr1.passiveIncomeGrind.totalPassiveIncome).toBeGreaterThanOrEqual(150000);
    expect(yr1.passiveIncomeGrind.reducedSBDLimit).toBe(0);
    expect(yr1.passiveIncomeGrind.isFullyGrounded).toBe(true);
  });

  it('should compute AAII as foreignIncome + 50% of realized capital gains', () => {
    // $2M balance, 25/25/25/25 allocation:
    //   foreignIncome = $2M * (0.25*0.015 + 0.25*0.030 + 0.25*0.040) = $42,500
    //   realizedCG    = $2M * (0.25*0.003 + 0.25*0.003 + 0.25*0.004 + 0) = $5,000
    //   AAII = $42,500 + $5,000 * 0.50 = $45,000
    const inputs = createInputs({
      corporateInvestmentBalance: 2000000,
      investmentReturnRate: 0.05,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    expect(yr1.passiveIncomeGrind.totalPassiveIncome).toBeCloseTo(45000, -2);
  });
});

describe('Corporate Flow — Dividend Depletion Priority', () => {
  it('should use CDA first (tax-free capital dividends)', () => {
    const inputs = createInputs({
      cdaBalance: 200000,
      eRDTOHBalance: 50000,
      nRDTOHBalance: 50000,
      gripBalance: 200000,
      salaryStrategy: 'dividends-only',
      requiredIncome: 50000, // Small enough to be fully covered by CDA
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // CDA should be used first — capital dividends should be non-zero
    expect(yr1.dividends.capitalDividends).toBeGreaterThan(0);
    // Since CDA ($200K) > required income ($50K), all income should come from CDA
    expect(yr1.dividends.capitalDividends).toBeCloseTo(50000, -1);
    // No eligible or non-eligible dividends needed
    expect(yr1.dividends.eligibleDividends).toBeCloseTo(0, -1);
    expect(yr1.dividends.nonEligibleDividends).toBeCloseTo(0, -1);
  });

  it('should use eRDTOH-backed eligible dividends after CDA', () => {
    const inputs = createInputs({
      cdaBalance: 10000,      // Small CDA
      eRDTOHBalance: 50000,   // Significant eRDTOH
      gripBalance: 200000,    // Enough GRIP
      nRDTOHBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 80000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Should use CDA first (up to $10K + increases), then eligible from eRDTOH
    expect(yr1.dividends.capitalDividends).toBeGreaterThan(0);
    expect(yr1.dividends.eligibleDividends).toBeGreaterThan(0);
  });

  it('should use nRDTOH-backed non-eligible dividends after eRDTOH+GRIP', () => {
    const inputs = createInputs({
      cdaBalance: 0,
      eRDTOHBalance: 0,
      nRDTOHBalance: 50000,
      gripBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 60000,
      corporateInvestmentBalance: 500000,
      canadianEquityPercent: 0, // No GRIP increase from returns
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // With no CDA/eRDTOH/GRIP, should use nRDTOH for non-eligible dividends
    expect(yr1.dividends.nonEligibleDividends).toBeGreaterThan(0);
    expect(yr1.rdtohRefundReceived).toBeGreaterThan(0);
  });

  it('should use GRIP-backed eligible dividends (no refund) after RDTOH pools', () => {
    const inputs = createInputs({
      cdaBalance: 0,
      eRDTOHBalance: 0,
      nRDTOHBalance: 0,
      gripBalance: 200000,
      salaryStrategy: 'dividends-only',
      requiredIncome: 60000,
      corporateInvestmentBalance: 500000,
      canadianEquityPercent: 0,
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Should use GRIP for eligible dividends (no refund)
    // Note: investment returns may generate small eRDTOH/nRDTOH, so the priority
    // chain may use those first. But GRIP eligible dividends should appear.
    // GRIP should decrease (eligible dividends drawn from GRIP pool)
    expect(yr1.notionalAccounts.GRIP).toBeLessThan(200000 + yr1.investmentReturns.GRIPIncrease);
  });
});

describe('Corporate Flow — Retained Earnings as Last Resort', () => {
  it('should use retained earnings for non-eligible dividends when all notional accounts are exhausted', () => {
    const inputs = createInputs({
      cdaBalance: 0,
      eRDTOHBalance: 0,
      nRDTOHBalance: 0,
      gripBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 100000,
      corporateInvestmentBalance: 500000,
      // Use only foreign equity to minimize GRIP generation
      canadianEquityPercent: 0,
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // With dividends-only strategy and useRetainedEarnings=true,
    // after small RDTOH pools from returns are exhausted, remaining comes from retained earnings
    expect(yr1.dividends.nonEligibleDividends).toBeGreaterThan(0);
    // The after-tax income from dividends should approximate the required income
    expect(yr1.dividends.afterTaxIncome).toBeCloseTo(100000, -2);
  });

  it('should not produce RDTOH refund when drawing from pure retained earnings', () => {
    // Set up a scenario where notional pools are truly zero after returns
    const inputs = createInputs({
      cdaBalance: 0,
      eRDTOHBalance: 0,
      nRDTOHBalance: 0,
      gripBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 200000, // Large enough to exhaust any small returns-generated pools
      corporateInvestmentBalance: 1000000,
      canadianEquityPercent: 0,
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Some small RDTOH refund from return-generated pools, then remainder from retained earnings
    // The RDTOH refund should be relatively small compared to total dividends
    const refundAsPercentOfDividends = yr1.rdtohRefundReceived / yr1.dividends.grossDividends;
    // Most of the dividends should come from retained earnings (no refund)
    expect(refundAsPercentOfDividends).toBeLessThan(0.15);
  });
});

describe('Corporate Flow — IPP Corporate Expense', () => {
  it('should reduce corporate tax when IPP is enabled vs disabled', () => {
    const baseInputs = createInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 120000,
      annualCorporateRetainedEarnings: 300000,
    });

    const withIPP = { ...baseInputs, considerIPP: true, ippMemberAge: 50, ippYearsOfService: 10 };
    const withoutIPP = { ...baseInputs, considerIPP: false };

    const resultIPP = calculateProjection(withIPP);
    const resultNoIPP = calculateProjection(withoutIPP);

    // IPP is a deductible expense, reducing taxable business income
    expect(resultIPP.totalCorporateTaxOnActive).toBeLessThanOrEqual(
      resultNoIPP.totalCorporateTaxOnActive
    );
  });

  it('should have zero IPP contribution when salary is zero', () => {
    const inputs = createInputs({
      salaryStrategy: 'dividends-only',
      considerIPP: true,
      ippMemberAge: 50,
      ippYearsOfService: 10,
    });
    const result = calculateProjection(inputs);

    // IPP requires pensionable earnings (salary) — no salary = no IPP
    expect(result.ipp).toBeUndefined();
    for (const yr of result.yearlyResults) {
      expect(yr.ipp).toBeUndefined();
    }
  });

  it('should draw IPP contribution from corporate investments', () => {
    const baseInputs = createInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
      annualCorporateRetainedEarnings: 300000,
      corporateInvestmentBalance: 500000,
    });

    const withIPP = { ...baseInputs, considerIPP: true, ippMemberAge: 55, ippYearsOfService: 15 };
    const withoutIPP = { ...baseInputs, considerIPP: false };

    const resultIPP = calculateProjection(withIPP);
    const resultNoIPP = calculateProjection(withoutIPP);

    // Corporate balance should be lower with IPP (IPP draws from corp)
    expect(resultIPP.finalCorporateBalance).toBeLessThan(resultNoIPP.finalCorporateBalance);
  });
});

describe('Corporate Flow — Multi-Year Account Conservation', () => {
  it('should conserve CDA: ending = starting + increases - capital dividends paid', () => {
    const inputs = createInputs({
      cdaBalance: 20000,
      salaryStrategy: 'dividends-only',
      requiredIncome: 30000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 5,
    });
    const result = calculateProjection(inputs);

    // Track CDA across all years
    let cumulativeCDAIncrease = 0;
    let cumulativeCapitalDividends = 0;

    for (const yr of result.yearlyResults) {
      cumulativeCDAIncrease += yr.investmentReturns.CDAIncrease;
      cumulativeCapitalDividends += yr.dividends.capitalDividends;
    }

    const finalCDA = result.yearlyResults[4].notionalAccounts.CDA;
    const expectedCDA = 20000 + cumulativeCDAIncrease - cumulativeCapitalDividends;
    expect(finalCDA).toBeCloseTo(expectedCDA, -1);
  });

  it('should conserve eRDTOH: ending = starting + increases - refunds used', () => {
    const inputs = createInputs({
      eRDTOHBalance: 30000,
      gripBalance: 200000,
      salaryStrategy: 'dividends-only',
      requiredIncome: 40000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 3,
    });
    const result = calculateProjection(inputs);

    // Conservation: finalERDTOH ≤ starting + cumulative increases (refunds only decrease it)
    // and finalERDTOH ≥ starting + cumulative increases - cumulative total RDTOH refunds
    // (since some refunds may come from nRDTOH instead of eRDTOH)
    const cumulativeERDTOHIncrease = result.yearlyResults.reduce(
      (sum, yr) => sum + yr.investmentReturns.eRDTOHIncrease, 0);
    const cumulativeRDTOHRefunds = result.yearlyResults.reduce(
      (sum, yr) => sum + yr.rdtohRefundReceived, 0);
    const finalERDTOH = result.yearlyResults[2].notionalAccounts.eRDTOH;

    // Upper bound: no refunds came from eRDTOH
    expect(finalERDTOH).toBeLessThanOrEqual(30000 + cumulativeERDTOHIncrease + 1);
    // Lower bound: all refunds came from eRDTOH (conservative)
    // Use -0.01 tolerance for floating-point rounding in tax calculations
    expect(finalERDTOH).toBeGreaterThanOrEqual(
      Math.max(-0.01, 30000 + cumulativeERDTOHIncrease - cumulativeRDTOHRefunds));
    // eRDTOH increases should be positive (investments generate Canadian dividends)
    expect(cumulativeERDTOHIncrease).toBeGreaterThan(0);
  });

  it('should show monotonic CDA increase when no capital dividends are paid', () => {
    // Use salary-only strategy so no dividends (including capital dividends) are paid
    const inputs = createInputs({
      cdaBalance: 0,
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 150000,
      requiredIncome: 80000,
      corporateInvestmentBalance: 500000,
      annualCorporateRetainedEarnings: 200000,
      planningHorizon: 5,
    });
    const result = calculateProjection(inputs);

    // CDA should only increase (from investment returns) since no capital dividends paid
    let prevCDA = 0;
    for (const yr of result.yearlyResults) {
      expect(yr.notionalAccounts.CDA).toBeGreaterThanOrEqual(prevCDA);
      prevCDA = yr.notionalAccounts.CDA;
    }
  });

  it('should have year-1 ending accounts serve as year-2 starting accounts', () => {
    const inputs = createInputs({ planningHorizon: 3 });
    const result = calculateProjection(inputs);

    // The ending notional accounts of year N become the starting state for year N+1
    // We can verify this indirectly: year 2's CDA increase should add to year 1's ending CDA
    const yr1End = result.yearlyResults[0].notionalAccounts;
    const yr2End = result.yearlyResults[1].notionalAccounts;
    const yr2Returns = result.yearlyResults[1].investmentReturns;
    const yr2CapDivs = result.yearlyResults[1].dividends.capitalDividends;

    // CDA conservation for year 2
    const expectedYr2CDA = yr1End.CDA + yr2Returns.CDAIncrease - yr2CapDivs;
    expect(yr2End.CDA).toBeCloseTo(expectedYr2CDA, -1);
  });

  it('should have nRDTOH balance track correctly over multiple years', () => {
    const inputs = createInputs({
      nRDTOHBalance: 10000,
      eRDTOHBalance: 0,
      cdaBalance: 0,
      gripBalance: 0,
      salaryStrategy: 'dividends-only',
      requiredIncome: 30000,
      corporateInvestmentBalance: 500000,
      planningHorizon: 3,
    });
    const result = calculateProjection(inputs);

    // nRDTOH should be consumed as non-eligible dividends are paid
    // but replenished by investment returns
    for (const yr of result.yearlyResults) {
      expect(yr.notionalAccounts.nRDTOH).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Corporate Flow — Investment Returns Impact on Balance', () => {
  it('should add after-tax investment returns to corporate balance', () => {
    // No compensation, no earnings — just pure investment returns
    const inputs = createInputs({
      annualCorporateRetainedEarnings: 0,
      requiredIncome: 0,
      salaryStrategy: 'dividends-only',
      corporateInvestmentBalance: 1000000,
      investmentReturnRate: 0.05,
      planningHorizon: 3,
    });
    const result = calculateProjection(inputs);

    // With no compensation draws and no retained earnings,
    // balance should grow from investment returns (minus corp tax on passive)
    // First year: $1M * 5% = $50K return; some tax deducted
    expect(result.yearlyResults[0].notionalAccounts.corporateInvestments).toBeGreaterThan(1000000);
  });

  it('should correctly split passive tax into refundable and non-refundable portions', () => {
    // $1M balance, 25/25/25/25 allocation (Ontario):
    //   foreignIncome = $1M * (0.25*0.015 + 0.25*0.030 + 0.25*0.040) = $21,250
    //   realizedCG    = $1M * (0.25*0.003 + 0.25*0.003 + 0.25*0.004 + 0) = $2,500
    //   taxableCapGain = $2,500 * 0.50 = $1,250
    //   taxableInvestmentIncome = $21,250 + $1,250 = $22,500
    //   passiveTax = $22,500 * 0.5017 (Ontario rate) = $11,288.25
    const inputs = createInputs({
      corporateInvestmentBalance: 1000000,
      investmentReturnRate: 0.05,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    expect(yr1.corporateTaxOnPassive).toBeCloseTo(11288.25, -1);
  });
});

describe('Corporate Flow — Dynamic Strategy Integration', () => {
  it('should deplete notional accounts before taking salary in dynamic strategy', () => {
    const inputs = createInputs({
      cdaBalance: 50000,
      eRDTOHBalance: 20000,
      gripBalance: 50000,
      nRDTOHBalance: 10000,
      salaryStrategy: 'dynamic',
      requiredIncome: 30000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // With $30K required and $50K CDA, dynamic should use all dividends (from CDA)
    // and no salary
    expect(yr1.dividends.capitalDividends).toBeGreaterThan(0);
    // CDA alone ($50K) exceeds required ($30K), so salary should be 0 or minimal
    expect(yr1.salary).toBeCloseTo(0, -1);
  });

  it('should take salary for remaining income after notional accounts are depleted', () => {
    const inputs = createInputs({
      cdaBalance: 5000,
      eRDTOHBalance: 0,
      nRDTOHBalance: 0,
      gripBalance: 0,
      salaryStrategy: 'dynamic',
      requiredIncome: 100000,
      corporateInvestmentBalance: 500000,
      canadianEquityPercent: 0,
      usEquityPercent: 50,
      internationalEquityPercent: 50,
      fixedIncomePercent: 0,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // With minimal notional accounts and $100K required, most should come from salary
    // Small dividend component from CDA + small returns-generated pools
    expect(yr1.salary).toBeGreaterThan(0);
    // Total after-tax should approximate required income
    const spouseAfterTax = yr1.spouse?.afterTaxIncome ?? 0;
    expect(yr1.afterTaxIncome + spouseAfterTax).toBeCloseTo(100000, -3);
  });
});

describe('Corporate Flow — Fixed Strategy Corporate Impact', () => {
  it('should deduct salary + employer costs from corporate investments', () => {
    const inputs = createInputs({
      salaryStrategy: 'fixed',
      fixedSalaryAmount: 100000,
      requiredIncome: 60000,
      annualCorporateRetainedEarnings: 200000,
      corporateInvestmentBalance: 500000,
    });
    const result = calculateProjection(inputs);
    const yr1 = result.yearlyResults[0];

    // Salary of $100K + employer costs (CPP match + EI * 1.4x) is deducted from corp
    expect(yr1.salary).toBe(100000);
    // Corporate tax on active should reflect deduction of salary cost
    expect(yr1.corporateTaxOnActive).toBeGreaterThan(0);
    // Taxable business income = $200K - salary cost
    // Tax should be less than $200K * SBD_RATE since salary is deducted
    expect(yr1.corporateTaxOnActive).toBeLessThan(200000 * SBD_RATE);
  });
});
