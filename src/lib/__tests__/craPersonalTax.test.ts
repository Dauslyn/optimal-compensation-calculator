/**
 * CRA Personal Tax Verification Tests — Tight Tolerance Edition
 *
 * Hand-computed personal tax scenarios for 2026 across 4 provinces.
 * Now verifies federalTax and provincialTax SEPARATELY (not just the combined
 * personalTax total) so we can pinpoint exactly where any discrepancy lives.
 *
 * TOLERANCE: ±$1 (toBeCloseTo(value, 0)) for all dollar amounts.
 * This is strict enough to catch real bracket bugs but allows for
 * sub-dollar floating-point rounding in the bracket engine.
 *
 * IMPORTANT: These hand calculations use the bracket data hardcoded in
 * indexation.ts and provincialRates.ts. They verify that the ENGINE applies
 * those brackets correctly. They do NOT independently verify the stored
 * bracket values against CRA publications — that's a separate concern
 * (see goldenDataset.test.ts for constant verification).
 *
 * 2026 Federal brackets (from KNOWN_TAX_YEARS[2026]):
 *   14%    on $0–$58,523         BPA: $16,452
 *   20.5%  on $58,523–$117,045
 *   26%    on $117,045–$181,440
 *   29%    on $181,440–$258,482
 *   33%    on $258,482+
 *
 * 2026 Ontario (ON_2026):
 *   5.05%  on $0–$53,891         BPA: $12,989
 *   9.15%  on $53,891–$107,785   Surtax: 20% > $5,818; 36% > $7,446
 *   11.16% on $107,785–$150,000  Health premium: max $900
 *   12.16% on $150,000–$220,000  ($150K/$220K NOT indexed — legislatively fixed)
 *   13.16% on $220,000+
 *
 * 2026 Alberta (AB_2026):
 *   8%     on $0–$61,200         BPA: $22,769
 *   10%    on $61,200–$154,259   No surtax, no health premium
 *   12%    on $154,259–$185,111
 *   13%    on $185,111–$246,813
 *   14%    on $246,813–$370,220
 *   15%    on $370,220+
 *
 * 2026 Quebec (QC_2026):
 *   14%     on $0–$54,345        BPA: $18,952
 *   19%     on $54,345–$108,680  No surtax, no health premium
 *   24%     on $108,680–$132,245
 *   25.75%  on $132,245+
 *
 * 2026 BC (BC_2026):
 *   5.06%  on $0–$50,363         BPA: $13,216
 *   7.70%  on $50,363–$100,728   No surtax, no health premium
 *   10.50% on $100,728–$115,648
 *   12.29% on $115,648–$140,430
 *   14.70% on $140,430–$190,405
 *   16.80% on $190,405–$265,545
 *   20.50% on $265,545+
 *
 * Payroll (2026):
 *   CPP:  5.95%, YMPE $74,600, basic exemption $3,500, max $4,230.45
 *   CPP2: 4%, YAMPE $85,000, max $416
 *   EI:   1.63%, max insurable $68,900, max $1,123.07
 *   QPP:  6.4%, max $4,550.40
 *   QPIP: 0.494%, max insurable $100,000
 *   QC EI: 1.264%, max $870.90 (approx)
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

// Salary-only helper: no dividends, no RRSP, no inflation, fixed strategy.
// requiredIncome=0 so the engine does NOT add dividends.
function salaryOnlyInputs(salary: number, province: string): UserInputs {
  return {
    province: province as any,
    requiredIncome: 0,
    planningHorizon: 3,
    startingYear: 2026,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: false,
    corporateInvestmentBalance: 2000000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    investmentReturnRate: 0,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: salary * 3,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'fixed',
    fixedSalaryAmount: salary,
  };
}

describe('CRA Personal Tax Verification — Tight Tolerances (2026)', () => {

  // =========================================================================
  // ONTARIO $75,000
  // =========================================================================
  // Federal:
  //   Taxable = 75,000 - 16,452 = 58,548
  //   58,523 × 0.14 = 8,193.22
  //   (58,548 - 58,523) × 0.205 = 25 × 0.205 = 5.125
  //   Federal tax = 8,198.345
  //
  // Ontario:
  //   Taxable = 75,000 - 12,989 = 62,011
  //   53,891 × 0.0505 = 2,721.4955
  //   (62,011 - 53,891) × 0.0915 = 8,120 × 0.0915 = 742.98
  //   Prov before surtax = 3,464.4755
  //   Surtax: 3,464.48 < 5,818 → $0
  //   Prov incl surtax = 3,464.4755
  //   Health premium: $900 (income $75K is in the $72K+ band, capped at $900)
  //   personalTax = 8,198.345 + 3,464.4755 + 900 = 12,562.8205
  //
  // CPP: min(75,000 - 3,500, 74,600 - 3,500) × 0.0595 = 71,100 × 0.0595 = 4,230.45
  // CPP2: (75,000 - 74,600) × 0.04 = 400 × 0.04 = 16.00
  // EI: 68,900 × 0.0163 = 1,123.07

  describe('Ontario $75K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(75000, 'ON'));
    const y = result.yearlyResults[0];

    it('federalTax = $8,198', () => {
      expect(y.federalTax).toBeCloseTo(8198.35, 0);
    });
    it('provincialTax (incl surtax) = $3,464', () => {
      expect(y.provincialTax).toBeCloseTo(3464.48, 0);
    });
    it('surtax = $0', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('healthPremium = $900', () => {
      expect(y.healthPremium).toBe(900);
    });
    it('personalTax = fed + prov + health = $12,563', () => {
      expect(y.personalTax).toBeCloseTo(12562.82, 0);
    });
    it('identity: personalTax = federalTax + provincialTax + healthPremium', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
    it('CPP = $4,230.45', () => {
      expect(y.cpp).toBeCloseTo(4230.45, 0);
    });
    it('CPP2 = $16.00', () => {
      expect(y.cpp2).toBeCloseTo(16, 0);
    });
    it('EI = $1,123.07', () => {
      expect(y.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // =========================================================================
  // ONTARIO $150,000
  // =========================================================================
  // Federal:
  //   Taxable = 150,000 - 16,452 = 133,548
  //   58,523 × 0.14 = 8,193.22
  //   (117,045 - 58,523) × 0.205 = 58,522 × 0.205 = 11,997.01
  //   (133,548 - 117,045) × 0.26 = 16,503 × 0.26 = 4,290.78
  //   Federal tax = 24,481.01
  //
  // Ontario:
  //   Taxable = 150,000 - 12,989 = 137,011
  //   53,891 × 0.0505 = 2,721.4955
  //   (107,785 - 53,891) × 0.0915 = 53,894 × 0.0915 = 4,931.301
  //   (137,011 - 107,785) × 0.1116 = 29,226 × 0.1116 = 3,261.6216
  //   Prov before surtax = 10,914.4181
  //   Surtax 1: (10,914.4181 - 5,818) × 0.20 = 5,096.4181 × 0.20 = 1,019.2836
  //   Surtax 2: (10,914.4181 - 7,446) × 0.36 = 3,468.4181 × 0.36 = 1,248.6305
  //   Total surtax = 2,267.9141
  //   Prov incl surtax = 10,914.4181 + 2,267.9141 = 13,182.3322
  //   Health premium: $900
  //   personalTax = 24,481.01 + 13,182.3322 + 900 = 38,563.3422
  //
  // CPP: 4,230.45 (maxed), CPP2: 416 (maxed), EI: 1,123.07 (maxed)

  describe('Ontario $150K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(150000, 'ON'));
    const y = result.yearlyResults[0];

    it('federalTax = $24,481', () => {
      expect(y.federalTax).toBeCloseTo(24481.01, 0);
    });
    it('provincialTax (incl surtax) = $13,182', () => {
      expect(y.provincialTax).toBeCloseTo(13182.33, 0);
    });
    it('surtax = $2,268', () => {
      expect(y.provincialSurtax).toBeCloseTo(2267.91, 0);
    });
    it('healthPremium = $900', () => {
      expect(y.healthPremium).toBe(900);
    });
    it('personalTax = $38,563', () => {
      expect(y.personalTax).toBeCloseTo(38563.34, 0);
    });
    it('identity: personalTax = federalTax + provincialTax + healthPremium', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
    it('CPP maxed', () => {
      expect(y.cpp).toBeCloseTo(4230.45, 0);
    });
    it('CPP2 maxed', () => {
      expect(y.cpp2).toBeCloseTo(416, 0);
    });
    it('EI maxed', () => {
      expect(y.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // =========================================================================
  // ONTARIO $250,000
  // =========================================================================
  // Federal:
  //   Taxable = 250,000 - 16,452 = 233,548
  //   58,523 × 0.14 = 8,193.22
  //   58,522 × 0.205 = 11,997.01
  //   (181,440 - 117,045) × 0.26 = 64,395 × 0.26 = 16,742.70
  //   (233,548 - 181,440) × 0.29 = 52,108 × 0.29 = 15,111.32
  //   Federal tax = 52,044.25
  //
  // Ontario:
  //   Taxable = 250,000 - 12,989 = 237,011
  //   53,891 × 0.0505 = 2,721.4955
  //   53,894 × 0.0915 = 4,931.301
  //   (150,000 - 107,785) × 0.1116 = 42,215 × 0.1116 = 4,711.194
  //   (220,000 - 150,000) × 0.1216 = 70,000 × 0.1216 = 8,512.00
  //   (237,011 - 220,000) × 0.1316 = 17,011 × 0.1316 = 2,238.6476
  //   Prov before surtax = 23,114.6381
  //   Surtax 1: (23,114.6381 - 5,818) × 0.20 = 17,296.6381 × 0.20 = 3,459.3276
  //   Surtax 2: (23,114.6381 - 7,446) × 0.36 = 15,668.6381 × 0.36 = 5,640.7097
  //   Total surtax = 9,100.0373
  //   Prov incl surtax = 23,114.6381 + 9,100.0373 = 32,214.6754
  //   Health premium: $900
  //   personalTax = 52,044.25 + 32,214.6754 + 900 = 85,158.9254

  describe('Ontario $250K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(250000, 'ON'));
    const y = result.yearlyResults[0];

    it('federalTax = $52,044', () => {
      expect(y.federalTax).toBeCloseTo(52044.25, 0);
    });
    it('provincialTax (incl surtax) = $32,215', () => {
      expect(y.provincialTax).toBeCloseTo(32214.68, 0);
    });
    it('surtax = $9,100', () => {
      expect(y.provincialSurtax).toBeCloseTo(9100.04, 0);
    });
    it('healthPremium = $900', () => {
      expect(y.healthPremium).toBe(900);
    });
    it('personalTax = $85,159', () => {
      expect(y.personalTax).toBeCloseTo(85158.93, 0);
    });
    it('identity: personalTax = federalTax + provincialTax + healthPremium', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // ONTARIO $400,000
  // =========================================================================
  // Federal:
  //   Taxable = 400,000 - 16,452 = 383,548
  //   58,523 × 0.14 = 8,193.22
  //   58,522 × 0.205 = 11,997.01
  //   64,395 × 0.26 = 16,742.70
  //   (258,482 - 181,440) × 0.29 = 77,042 × 0.29 = 22,342.18
  //   (383,548 - 258,482) × 0.33 = 125,066 × 0.33 = 41,271.78
  //   Federal tax = 100,546.89
  //
  // Ontario:
  //   Taxable = 400,000 - 12,989 = 387,011
  //   53,891 × 0.0505 = 2,721.4955
  //   53,894 × 0.0915 = 4,931.301
  //   42,215 × 0.1116 = 4,711.194
  //   70,000 × 0.1216 = 8,512.00
  //   (387,011 - 220,000) × 0.1316 = 167,011 × 0.1316 = 21,978.6476
  //   Prov before surtax = 42,854.6381
  //   Surtax 1: (42,854.6381 - 5,818) × 0.20 = 37,036.6381 × 0.20 = 7,407.3276
  //   Surtax 2: (42,854.6381 - 7,446) × 0.36 = 35,408.6381 × 0.36 = 12,747.1097
  //   Total surtax = 20,154.4373
  //   Prov incl surtax = 42,854.6381 + 20,154.4373 = 63,009.0754
  //   Health premium: $900
  //   personalTax = 100,546.89 + 63,009.0754 + 900 = 164,455.9654

  describe('Ontario $400K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(400000, 'ON'));
    const y = result.yearlyResults[0];

    it('federalTax = $100,547', () => {
      expect(y.federalTax).toBeCloseTo(100546.89, 0);
    });
    it('provincialTax (incl surtax) = $63,009', () => {
      expect(y.provincialTax).toBeCloseTo(63009.08, 0);
    });
    it('surtax = $20,154', () => {
      expect(y.provincialSurtax).toBeCloseTo(20154.44, 0);
    });
    it('healthPremium = $900', () => {
      expect(y.healthPremium).toBe(900);
    });
    it('personalTax = $164,456', () => {
      expect(y.personalTax).toBeCloseTo(164455.97, 0);
    });
    it('identity: personalTax = federalTax + provincialTax + healthPremium', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // ALBERTA $75,000
  // =========================================================================
  // Federal: 8,198.345 (same as ON $75K)
  //
  // Alberta:
  //   Taxable = 75,000 - 22,769 = 52,231
  //   52,231 × 0.08 = 4,178.48 (all in first bracket, 52,231 < 61,200)
  //   No surtax, no health premium
  //   personalTax = 8,198.345 + 4,178.48 = 12,376.825
  //
  // CPP: 4,230.45, CPP2: 16.00, EI: 1,123.07

  describe('Alberta $75K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(75000, 'AB'));
    const y = result.yearlyResults[0];

    it('federalTax = $8,198', () => {
      expect(y.federalTax).toBeCloseTo(8198.35, 0);
    });
    it('provincialTax = $4,178 (8% bracket only)', () => {
      expect(y.provincialTax).toBeCloseTo(4178.48, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $12,377', () => {
      expect(y.personalTax).toBeCloseTo(12376.83, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // ALBERTA $150,000
  // =========================================================================
  // Federal: 24,481.01 (same as ON $150K)
  //
  // Alberta:
  //   Taxable = 150,000 - 22,769 = 127,231
  //   61,200 × 0.08 = 4,896.00
  //   (127,231 - 61,200) × 0.10 = 66,031 × 0.10 = 6,603.10
  //   Provincial tax = 11,499.10
  //   No surtax, no health premium
  //   personalTax = 24,481.01 + 11,499.10 = 35,980.11

  describe('Alberta $150K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(150000, 'AB'));
    const y = result.yearlyResults[0];

    it('federalTax = $24,481', () => {
      expect(y.federalTax).toBeCloseTo(24481.01, 0);
    });
    it('provincialTax = $11,499 (8% + 10%)', () => {
      expect(y.provincialTax).toBeCloseTo(11499.10, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $35,980', () => {
      expect(y.personalTax).toBeCloseTo(35980.11, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // ALBERTA $250,000
  // =========================================================================
  // Federal: 52,044.25 (same as ON $250K)
  //
  // Alberta:
  //   Taxable = 250,000 - 22,769 = 227,231
  //   61,200 × 0.08 = 4,896.00
  //   (154,259 - 61,200) × 0.10 = 93,059 × 0.10 = 9,305.90
  //   (185,111 - 154,259) × 0.12 = 30,852 × 0.12 = 3,702.24
  //   (227,231 - 185,111) × 0.13 = 42,120 × 0.13 = 5,475.60
  //   Provincial tax = 23,379.74
  //   personalTax = 52,044.25 + 23,379.74 = 75,423.99

  describe('Alberta $250K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(250000, 'AB'));
    const y = result.yearlyResults[0];

    it('federalTax = $52,044', () => {
      expect(y.federalTax).toBeCloseTo(52044.25, 0);
    });
    it('provincialTax = $23,380 (4 brackets)', () => {
      expect(y.provincialTax).toBeCloseTo(23379.74, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $75,424', () => {
      expect(y.personalTax).toBeCloseTo(75423.99, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // ALBERTA $400,000
  // =========================================================================
  // Federal: 100,546.89 (same as ON $400K)
  //
  // Alberta:
  //   Taxable = 400,000 - 22,769 = 377,231
  //   61,200 × 0.08 = 4,896.00
  //   (154,259 - 61,200) × 0.10 = 93,059 × 0.10 = 9,305.90
  //   (185,111 - 154,259) × 0.12 = 30,852 × 0.12 = 3,702.24
  //   (246,813 - 185,111) × 0.13 = 61,702 × 0.13 = 8,021.26
  //   (370,220 - 246,813) × 0.14 = 123,407 × 0.14 = 17,276.98
  //   (377,231 - 370,220) × 0.15 = 7,011 × 0.15 = 1,051.65
  //   Provincial tax = 44,254.03
  //   personalTax = 100,546.89 + 44,254.03 = 144,800.92

  describe('Alberta $400K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(400000, 'AB'));
    const y = result.yearlyResults[0];

    it('federalTax = $100,547', () => {
      expect(y.federalTax).toBeCloseTo(100546.89, 0);
    });
    it('provincialTax = $44,254 (all 6 brackets)', () => {
      expect(y.provincialTax).toBeCloseTo(44254.03, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $144,801', () => {
      expect(y.personalTax).toBeCloseTo(144800.92, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // QUEBEC $75,000
  // =========================================================================
  // Federal (pre-abatement): 8,198.345
  // Quebec abatement: 16.5% → 8,198.345 × 0.835 = 6,845.62
  //
  // Quebec:
  //   Taxable = 75,000 - 18,952 = 56,048
  //   54,345 × 0.14 = 7,608.30
  //   (56,048 - 54,345) × 0.19 = 1,703 × 0.19 = 323.57
  //   Provincial tax = 7,931.87
  //   personalTax = 6,845.62 + 7,931.87 = 14,777.49
  //
  // QPP: 71,100 × 0.064 = 4,550.40
  // QPP2: (75,000 - 74,600) × 0.04 = 400 × 0.04 = 16.00
  // QPIP: 75,000 × 0.00494 = 370.50
  // QC EI: 68,900 × 0.01264 ≈ 870.90

  describe('Quebec $75K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(75000, 'QC'));
    const y = result.yearlyResults[0];

    it('federalTax = $6,846 (after 16.5% Quebec abatement)', () => {
      expect(y.federalTax).toBeCloseTo(6845.62, 0);
    });
    it('provincialTax = $7,932', () => {
      expect(y.provincialTax).toBeCloseTo(7931.87, 0);
    });
    it('no health premium (integrated into QC brackets)', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $14,777', () => {
      expect(y.personalTax).toBeCloseTo(14777.49, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // QUEBEC $150,000
  // =========================================================================
  // Federal (pre-abatement): 24,481.01
  // Quebec abatement: 16.5% → 24,481.01 × 0.835 = 20,441.64
  //
  // Quebec:
  //   Taxable = 150,000 - 18,952 = 131,048
  //   54,345 × 0.14 = 7,608.30
  //   (108,680 - 54,345) × 0.19 = 54,335 × 0.19 = 10,323.65
  //   (131,048 - 108,680) × 0.24 = 22,368 × 0.24 = 5,368.32
  //   Provincial tax = 23,300.27
  //   personalTax = 20,441.64 + 23,300.27 = 43,741.91
  //
  // QPP: 71,100 × 0.064 = 4,550.40
  // QPP2: 10,400 × 0.04 = 416
  // QPIP: 100,000 × 0.00494 = 494 (capped at $100K insurable)
  // QC EI: 68,900 × 0.01264 ≈ 870.90

  describe('Quebec $150K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(150000, 'QC'));
    const y = result.yearlyResults[0];

    it('federalTax = $20,442 (after 16.5% Quebec abatement)', () => {
      expect(y.federalTax).toBeCloseTo(20441.64, 0);
    });
    it('provincialTax = $23,300', () => {
      expect(y.provincialTax).toBeCloseTo(23300.27, 0);
    });
    it('no health premium (integrated into QC brackets)', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $43,742', () => {
      expect(y.personalTax).toBeCloseTo(43741.91, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
    it('QPP = $4,550.40 (higher than CPP)', () => {
      expect(y.cpp).toBeCloseTo(4550.40, 0);
    });
    it('QPP2 = $416', () => {
      expect(y.cpp2).toBeCloseTo(416, 0);
    });
    it('QPIP ≈ $494', () => {
      expect(y.qpip).toBeCloseTo(494, 0);
    });
    it('QC EI ≈ $871 (reduced rate)', () => {
      expect(y.ei).toBeCloseTo(870.90, 0);
    });
  });

  // =========================================================================
  // QUEBEC $250,000
  // =========================================================================
  // Federal (pre-abatement): 52,044.25
  // Quebec abatement: 16.5% → 52,044.25 × 0.835 = 43,456.95
  //
  // Quebec:
  //   Taxable = 250,000 - 18,952 = 231,048
  //   54,345 × 0.14 = 7,608.30
  //   54,335 × 0.19 = 10,323.65
  //   (132,245 - 108,680) × 0.24 = 23,565 × 0.24 = 5,655.60
  //   (231,048 - 132,245) × 0.2575 = 98,803 × 0.2575 = 25,441.7725
  //   Provincial tax = 49,029.3225
  //   personalTax = 43,456.95 + 49,029.3225 = 92,486.27

  describe('Quebec $250K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(250000, 'QC'));
    const y = result.yearlyResults[0];

    it('federalTax = $43,457 (after 16.5% Quebec abatement)', () => {
      expect(y.federalTax).toBeCloseTo(43456.95, 0);
    });
    it('provincialTax = $49,029', () => {
      expect(y.provincialTax).toBeCloseTo(49029.32, 0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $92,486', () => {
      expect(y.personalTax).toBeCloseTo(92486.27, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // QUEBEC $400,000
  // =========================================================================
  // Federal (pre-abatement): 100,546.89
  // Quebec abatement: 16.5% → 100,546.89 × 0.835 = 83,956.65
  //
  // Quebec:
  //   Taxable = 400,000 - 18,952 = 381,048
  //   54,345 × 0.14 = 7,608.30
  //   54,335 × 0.19 = 10,323.65
  //   23,565 × 0.24 = 5,655.60
  //   (381,048 - 132,245) × 0.2575 = 248,803 × 0.2575 = 64,066.7725
  //   Provincial tax = 87,654.3225
  //   personalTax = 83,956.65 + 87,654.3225 = 171,610.97

  describe('Quebec $400K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(400000, 'QC'));
    const y = result.yearlyResults[0];

    it('federalTax = $83,957 (after 16.5% Quebec abatement)', () => {
      expect(y.federalTax).toBeCloseTo(83956.65, 0);
    });
    it('provincialTax = $87,654', () => {
      expect(y.provincialTax).toBeCloseTo(87654.32, 0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $171,611', () => {
      expect(y.personalTax).toBeCloseTo(171610.97, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // BC $75,000
  // =========================================================================
  // Federal: 8,198.345
  //
  // BC:
  //   Taxable = 75,000 - 13,216 = 61,784
  //   50,363 × 0.0506 = 2,548.3678
  //   (61,784 - 50,363) × 0.077 = 11,421 × 0.077 = 879.417
  //   Provincial tax = 3,427.7848
  //   No surtax, no health premium
  //   personalTax = 8,198.345 + 3,427.7848 = 11,626.1298

  describe('BC $75K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(75000, 'BC'));
    const y = result.yearlyResults[0];

    it('federalTax = $8,198', () => {
      expect(y.federalTax).toBeCloseTo(8198.35, 0);
    });
    it('provincialTax = $3,428', () => {
      expect(y.provincialTax).toBeCloseTo(3427.78, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $11,626', () => {
      expect(y.personalTax).toBeCloseTo(11626.13, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // BC $150,000
  // =========================================================================
  // Federal: 24,481.01
  //
  // BC:
  //   Taxable = 150,000 - 13,216 = 136,784
  //   50,363 × 0.0506 = 2,548.3678
  //   (100,728 - 50,363) × 0.077 = 50,365 × 0.077 = 3,878.105
  //   (115,648 - 100,728) × 0.105 = 14,920 × 0.105 = 1,566.60
  //   (136,784 - 115,648) × 0.1229 = 21,136 × 0.1229 = 2,597.6144
  //   Provincial tax = 10,590.6872
  //   personalTax = 24,481.01 + 10,590.6872 = 35,071.6972

  describe('BC $150K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(150000, 'BC'));
    const y = result.yearlyResults[0];

    it('federalTax = $24,481', () => {
      expect(y.federalTax).toBeCloseTo(24481.01, 0);
    });
    it('provincialTax = $10,591', () => {
      expect(y.provincialTax).toBeCloseTo(10590.69, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $35,072', () => {
      expect(y.personalTax).toBeCloseTo(35071.70, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
    it('CPP/CPP2/EI same as non-QC', () => {
      expect(y.cpp).toBeCloseTo(4230.45, 0);
      expect(y.cpp2).toBeCloseTo(416, 0);
      expect(y.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // =========================================================================
  // BC $250,000
  // =========================================================================
  // Federal: 52,044.25
  //
  // BC:
  //   Taxable = 250,000 - 13,216 = 236,784
  //   50,363 × 0.0506 = 2,548.3678
  //   50,365 × 0.077 = 3,878.105
  //   14,920 × 0.105 = 1,566.60
  //   (140,430 - 115,648) × 0.1229 = 24,782 × 0.1229 = 3,045.7178
  //   (190,405 - 140,430) × 0.147 = 49,975 × 0.147 = 7,346.325
  //   (236,784 - 190,405) × 0.168 = 46,379 × 0.168 = 7,791.672
  //   Provincial tax = 26,176.7876
  //   personalTax = 52,044.25 + 26,176.7876 = 78,221.0376

  describe('BC $250K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(250000, 'BC'));
    const y = result.yearlyResults[0];

    it('federalTax = $52,044', () => {
      expect(y.federalTax).toBeCloseTo(52044.25, 0);
    });
    it('provincialTax = $26,177', () => {
      expect(y.provincialTax).toBeCloseTo(26176.78, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $78,221', () => {
      expect(y.personalTax).toBeCloseTo(78221.03, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // BC $400,000
  // =========================================================================
  // Federal: 100,546.89
  //
  // BC:
  //   Taxable = 400,000 - 13,216 = 386,784
  //   50,363 × 0.0506 = 2,548.3678
  //   50,365 × 0.077 = 3,878.105
  //   14,920 × 0.105 = 1,566.60
  //   24,782 × 0.1229 = 3,045.7178
  //   49,975 × 0.147 = 7,346.325
  //   (265,545 - 190,405) × 0.168 = 75,140 × 0.168 = 12,623.52
  //   (386,784 - 265,545) × 0.205 = 121,239 × 0.205 = 24,853.995
  //   Provincial tax = 55,862.6306
  //   personalTax = 100,546.89 + 55,862.6306 = 156,409.5206

  describe('BC $400K salary', () => {
    const result = calculateProjection(salaryOnlyInputs(400000, 'BC'));
    const y = result.yearlyResults[0];

    it('federalTax = $100,547', () => {
      expect(y.federalTax).toBeCloseTo(100546.89, 0);
    });
    it('provincialTax = $55,863', () => {
      expect(y.provincialTax).toBeCloseTo(55862.63, 0);
    });
    it('no surtax', () => {
      expect(y.provincialSurtax).toBe(0);
    });
    it('no health premium', () => {
      expect(y.healthPremium).toBe(0);
    });
    it('personalTax = $156,410', () => {
      expect(y.personalTax).toBeCloseTo(156409.52, 0);
    });
    it('identity', () => {
      expect(y.personalTax).toBeCloseTo(y.federalTax + y.provincialTax + y.healthPremium, 0);
    });
  });

  // =========================================================================
  // CROSS-PROVINCE ORDERING at $150K
  // =========================================================================
  // personalTax totals: BC ($35,072) < AB ($35,980) < ON ($38,563) < QC ($43,742)
  // Note: QC federal tax is lower due to 16.5% abatement, but high provincial rates
  // still make QC the highest total personalTax.

  describe('Cross-province ordering at $150K', () => {
    const bc = calculateProjection(salaryOnlyInputs(150000, 'BC')).yearlyResults[0];
    const ab = calculateProjection(salaryOnlyInputs(150000, 'AB')).yearlyResults[0];
    const on = calculateProjection(salaryOnlyInputs(150000, 'ON')).yearlyResults[0];
    const qc = calculateProjection(salaryOnlyInputs(150000, 'QC')).yearlyResults[0];

    it('BC < AB < ON < QC (personalTax)', () => {
      expect(bc.personalTax).toBeLessThan(ab.personalTax);
      expect(ab.personalTax).toBeLessThan(on.personalTax);
      expect(on.personalTax).toBeLessThan(qc.personalTax);
    });

    it('federal tax is identical across non-QC provinces (same brackets)', () => {
      expect(ab.federalTax).toBeCloseTo(bc.federalTax, 0);
      expect(on.federalTax).toBeCloseTo(bc.federalTax, 0);
    });

    it('QC federal tax is lower due to 16.5% abatement', () => {
      expect(qc.federalTax).toBeLessThan(bc.federalTax);
      // Abatement = 16.5%, so QC federal ≈ 83.5% of other provinces
      expect(qc.federalTax).toBeCloseTo(bc.federalTax * 0.835, 0);
    });

    it('provincial tax: BC < AB < ON (incl surtax) < QC', () => {
      expect(bc.provincialTax).toBeLessThan(ab.provincialTax);
      expect(ab.provincialTax).toBeLessThan(on.provincialTax);
      expect(on.provincialTax).toBeLessThan(qc.provincialTax);
    });
  });

  // =========================================================================
  // RRSP DEDUCTION REDUCES TAX
  // =========================================================================

  describe('RRSP deduction reduces tax', () => {
    const withoutRRSP = salaryOnlyInputs(150000, 'ON');
    withoutRRSP.contributeToRRSP = false;
    withoutRRSP.rrspBalance = 30000;

    const withRRSP = salaryOnlyInputs(150000, 'ON');
    withRRSP.contributeToRRSP = true;
    withRRSP.rrspBalance = 30000;

    const r0 = calculateProjection(withoutRRSP).yearlyResults[0];
    const r1 = calculateProjection(withRRSP).yearlyResults[0];

    it('RRSP contribution is made', () => {
      expect(r1.rrspContribution).toBeGreaterThan(0);
    });
    it('both federalTax and provincialTax are lower with RRSP', () => {
      expect(r1.federalTax).toBeLessThan(r0.federalTax);
      expect(r1.provincialTax).toBeLessThan(r0.provincialTax);
    });
    it('personalTax is lower with RRSP', () => {
      expect(r1.personalTax).toBeLessThan(r0.personalTax);
    });
    it('tax savings are meaningful (>$5K)', () => {
      const savings = r0.personalTax - r1.personalTax;
      expect(savings).toBeGreaterThan(5000);
    });
    it('payroll unaffected by RRSP', () => {
      expect(r1.cpp).toBeCloseTo(r0.cpp, 0);
      expect(r1.cpp2).toBeCloseTo(r0.cpp2, 0);
      expect(r1.ei).toBeCloseTo(r0.ei, 0);
    });
  });
});
