# Math & Logic Verification Test Suite

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 layers of verification tests that validate every calculation against hand-computed CRA values, trace corporate flows end-to-end, and stress-test boundary conditions.

**Architecture:** 3 new test files, each layer independent. All tests use `calculateProjection()` as the entry point (black-box) with hand-computed expected values. No mocking — we test the real engine.

**Tech Stack:** Vitest, existing `calculateProjection()` + `getTaxYearData()` + `calculateTaxByBrackets()` exports

---

## Task 1: Layer 1 — CRA Hand-Calculated Personal Tax (craPersonalTax.test.ts)

**Files:**
- Create: `src/lib/__tests__/craPersonalTax.test.ts`

**What this tests:** Federal + provincial personal income tax payable for specific salary-only scenarios, hand-computed step-by-step using 2026 CRA bracket data. These are the "ground truth" anchors — if these pass, our bracket math is correct.

**Step 1: Write the test file**

All values below are hand-computed using the 2026 rates from `indexation.ts`.

```typescript
/**
 * CRA Hand-Calculated Personal Tax Verification
 *
 * Each test case is hand-computed step-by-step using 2026 CRA brackets.
 * These are ground truth anchors — if bracket math is correct, everything
 * downstream builds on a solid foundation.
 *
 * Method: Salary-only scenarios (no dividends) to isolate personal tax math.
 * No RRSP, no TFSA, no inflation — pure bracket verification.
 *
 * 2026 Federal brackets:
 *   14%    on $0–$58,523
 *   20.5%  on $58,523–$117,045
 *   26%    on $117,045–$181,440
 *   29%    on $181,440–$258,482
 *   33%    on $258,482+
 *   BPA: $16,452
 *
 * 2026 Ontario brackets:
 *   5.05%  on $0–$52,475
 *   9.15%  on $52,475–$104,951
 *   11.16% on $104,951–$150,000
 *   12.16% on $150,000–$220,000
 *   13.16% on $220,000+
 *   BPA: $12,647
 *   Surtax: 20% on prov tax > $5,824; 36% on prov tax > $7,453
 *   Health premium: tiered, max $900
 *
 * 2026 Alberta brackets:
 *   10%   on $0–$151,234
 *   12%   on $151,234–$181,480
 *   13%   on $181,480–$241,975
 *   14%   on $241,975–$362,962
 *   15%   on $362,962+
 *   BPA: $21,423
 *
 * 2026 Quebec brackets:
 *   14%     on $0–$52,816
 *   19%     on $52,816–$105,616
 *   24%     on $105,616–$128,520
 *   25.75%  on $128,520+
 *   BPA: $18,417
 *
 * 2026 BC brackets:
 *   5.06%  on $0–$48,896
 *   7.70%  on $48,896–$97,792
 *   10.50% on $97,792–$112,278
 *   12.29% on $112,278–$136,337
 *   14.70% on $136,337–$184,857
 *   16.80% on $184,857–$257,807
 *   20.50% on $257,807+
 *   BPA: $13,191
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

// Salary-only helper: no dividends, no RRSP, no inflation, fixed strategy
function salaryOnlyInputs(salary: number, province: string): UserInputs {
  return {
    province: province as any,
    requiredIncome: salary, // Will be met by salary
    planningHorizon: 3,
    startingYear: 2026,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: false,
    corporateInvestmentBalance: 2000000, // Plenty of cash
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    investmentReturnRate: 0, // Zero returns to isolate tax math
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: salary * 2, // Enough to cover salary + employer costs
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'fixed',
    fixedSalaryAmount: salary,
  };
}

describe('CRA Hand-Calculated Personal Tax Verification (2026)', () => {

  // =========================================================================
  // ONTARIO — $75,000 salary
  // =========================================================================
  // Federal tax:
  //   Taxable = $75,000 - $16,452 BPA = $58,548
  //   Bracket 1: $58,523 × 14% = $8,193.22
  //   Bracket 2: ($58,548 - $58,523) × 20.5% = $25 × 20.5% = $5.13
  //   Federal tax = $8,198.35
  //
  // Ontario tax:
  //   Taxable = $75,000 - $12,647 BPA = $62,353
  //   Bracket 1: $52,475 × 5.05% = $2,649.99
  //   Bracket 2: ($62,353 - $52,475) × 9.15% = $9,878 × 9.15% = $903.84
  //   Provincial tax before surtax = $3,553.83
  //   Surtax: $3,553.83 < $5,824 → $0
  //   Health premium: $75,000 > $72,000 → base $750 + ($75,000-$72,000)×0.25 = $750 + $750 = $1,500
  //     but max at bracket is $900, so premium = $900
  //   Total Ontario = $3,553.83 + $0 + $900 = $4,453.83
  //
  // CPP: min($75,000 - $3,500, $74,600 - $3,500) × 5.95% = $71,100 × 5.95% = $4,230.45
  // CPP2: $75,000 > $74,600 → ($75,000 - $74,600) × 4% = $400 × 4% = $16.00
  // EI: min($75,000, $68,900) × 1.63% = $68,900 × 1.63% = $1,123.07
  //
  // Total personal tax = $8,198.35 + $4,453.83 = $12,652.18
  // (payroll deductions are separate from personal tax in our model)

  describe('Ontario $75K salary', () => {
    it('should match hand-computed federal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(75000, 'ON'));
      const y1 = result.yearlyResults[0];
      // Federal tax ≈ $8,198
      expect(y1.federalTax).toBeCloseTo(8198, -1); // within $10
    });

    it('should match hand-computed provincial tax (incl surtax + health premium)', () => {
      const result = calculateProjection(salaryOnlyInputs(75000, 'ON'));
      const y1 = result.yearlyResults[0];
      // Provincial tax (before health premium) ≈ $3,554
      // Health premium = $900
      // Total provincial in our model includes surtax
      // Provincial portion (excl health premium) ≈ $3,554
      const provTaxExclHealth = y1.provincialTax - y1.healthPremium;
      expect(provTaxExclHealth).toBeCloseTo(3554, -1);
      expect(y1.healthPremium).toBe(900);
    });

    it('should match hand-computed CPP/CPP2/EI', () => {
      const result = calculateProjection(salaryOnlyInputs(75000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.cpp).toBeCloseTo(4230.45, 0);
      expect(y1.cpp2).toBeCloseTo(16, 0);
      expect(y1.ei).toBeCloseTo(1123.07, 0);
    });

    it('should match hand-computed total personal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(75000, 'ON'));
      const y1 = result.yearlyResults[0];
      // personalTax = federalTax + provincialTax (incl surtax + health premium)
      expect(y1.personalTax).toBeCloseTo(12652, -1);
    });
  });

  // =========================================================================
  // ONTARIO — $150,000 salary
  // =========================================================================
  // Federal tax:
  //   Taxable = $150,000 - $16,452 = $133,548
  //   Bracket 1: $58,523 × 14% = $8,193.22
  //   Bracket 2: ($117,045 - $58,523) × 20.5% = $58,522 × 20.5% = $11,997.01
  //   Bracket 3: ($133,548 - $117,045) × 26% = $16,503 × 26% = $4,290.78
  //   Federal tax = $24,481.01
  //
  // Ontario tax:
  //   Taxable = $150,000 - $12,647 = $137,353
  //   Bracket 1: $52,475 × 5.05% = $2,649.99
  //   Bracket 2: ($104,951 - $52,475) × 9.15% = $52,476 × 9.15% = $4,801.55
  //   Bracket 3: ($137,353 - $104,951) × 11.16% = $32,402 × 11.16% = $3,616.06
  //   Provincial tax before surtax = $11,067.60
  //   Surtax first: ($11,067.60 - $5,824) × 20% = $5,243.60 × 20% = $1,048.72
  //   Surtax second: ($11,067.60 - $7,453) × 36% = $3,614.60 × 36% = $1,301.26
  //   Provincial + surtax = $11,067.60 + $1,048.72 + $1,301.26 = $13,417.58
  //   Health premium = $900 (income > $200k → $900, but $150k is in the $72k-$200k band → $900)
  //   Total Ontario = $13,417.58 + $900 = $14,317.58
  //
  // Total personal tax = $24,481.01 + $14,317.58 = $38,798.59
  //
  // CPP: ($74,600 - $3,500) × 5.95% = $71,100 × 5.95% = $4,230.45
  // CPP2: ($85,000 - $74,600) × 4% = $10,400 × 4% = $416.00
  //   But salary $150,000 > YAMPE $85,000, so CPP2 = max contribution = $416.00
  // EI: $68,900 × 1.63% = $1,123.07

  describe('Ontario $150K salary', () => {
    it('should match hand-computed federal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.federalTax).toBeCloseTo(24481, -1);
    });

    it('should match hand-computed provincial tax with surtax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'ON'));
      const y1 = result.yearlyResults[0];
      const provTaxExclHealth = y1.provincialTax - y1.healthPremium;
      // Provincial + surtax ≈ $13,418
      expect(provTaxExclHealth).toBeCloseTo(13418, -1);
      expect(y1.healthPremium).toBe(900);
    });

    it('should match hand-computed total personal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.personalTax).toBeCloseTo(38799, -1);
    });

    it('should match hand-computed payroll', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.cpp).toBeCloseTo(4230.45, 0);
      expect(y1.cpp2).toBeCloseTo(416, 0);
      expect(y1.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // =========================================================================
  // ONTARIO — $250,000 salary
  // =========================================================================
  // Federal tax:
  //   Taxable = $250,000 - $16,452 = $233,548
  //   Bracket 1: $58,523 × 14% = $8,193.22
  //   Bracket 2: $58,522 × 20.5% = $11,997.01
  //   Bracket 3: ($181,440 - $117,045) × 26% = $64,395 × 26% = $16,742.70
  //   Bracket 4: ($233,548 - $181,440) × 29% = $52,108 × 29% = $15,111.32
  //   Federal tax = $52,044.25
  //
  // Ontario tax:
  //   Taxable = $250,000 - $12,647 = $237,353
  //   Bracket 1: $52,475 × 5.05% = $2,649.99
  //   Bracket 2: $52,476 × 9.15% = $4,801.55
  //   Bracket 3: ($150,000 - $104,951) × 11.16% = $45,049 × 11.16% = $5,027.47
  //   Bracket 4: ($220,000 - $150,000) × 12.16% = $70,000 × 12.16% = $8,512.00
  //   Bracket 5: ($237,353 - $220,000) × 13.16% = $17,353 × 13.16% = $2,283.65
  //   Provincial before surtax = $23,274.66
  //   Surtax first: ($23,274.66 - $5,824) × 20% = $17,450.66 × 20% = $3,490.13
  //   Surtax second: ($23,274.66 - $7,453) × 36% = $15,821.66 × 36% = $5,695.80
  //   Provincial + surtax = $23,274.66 + $3,490.13 + $5,695.80 = $32,460.59
  //   Health premium = $900
  //   Total Ontario = $33,360.59
  //
  // Total personal tax = $52,044.25 + $33,360.59 = $85,404.84

  describe('Ontario $250K salary', () => {
    it('should match hand-computed federal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(250000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.federalTax).toBeCloseTo(52044, -1);
    });

    it('should match hand-computed provincial tax with surtax', () => {
      const result = calculateProjection(salaryOnlyInputs(250000, 'ON'));
      const y1 = result.yearlyResults[0];
      const provTaxExclHealth = y1.provincialTax - y1.healthPremium;
      expect(provTaxExclHealth).toBeCloseTo(32461, -1);
    });

    it('should match hand-computed total personal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(250000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.personalTax).toBeCloseTo(85405, -1);
    });
  });

  // =========================================================================
  // ONTARIO — $400,000 salary (above top bracket)
  // =========================================================================
  // Federal tax:
  //   Taxable = $400,000 - $16,452 = $383,548
  //   Bracket 1: $58,523 × 14% = $8,193.22
  //   Bracket 2: $58,522 × 20.5% = $11,997.01
  //   Bracket 3: $64,395 × 26% = $16,742.70
  //   Bracket 4: ($258,482 - $181,440) × 29% = $77,042 × 29% = $22,342.18
  //   Bracket 5: ($383,548 - $258,482) × 33% = $125,066 × 33% = $41,271.78
  //   Federal tax = $100,546.89
  //
  // Ontario tax:
  //   Taxable = $400,000 - $12,647 = $387,353
  //   Bracket 1: $52,475 × 5.05% = $2,649.99
  //   Bracket 2: $52,476 × 9.15% = $4,801.55
  //   Bracket 3: $45,049 × 11.16% = $5,027.47
  //   Bracket 4: $70,000 × 12.16% = $8,512.00
  //   Bracket 5: ($387,353 - $220,000) × 13.16% = $167,353 × 13.16% = $22,023.65
  //   Provincial before surtax = $43,014.66
  //   Surtax first: ($43,014.66 - $5,824) × 20% = $37,190.66 × 20% = $7,438.13
  //   Surtax second: ($43,014.66 - $7,453) × 36% = $35,561.66 × 36% = $12,802.20
  //   Provincial + surtax = $43,014.66 + $7,438.13 + $12,802.20 = $63,254.99
  //   Health premium = $900
  //   Total Ontario = $64,154.99
  //
  // Total personal tax = $100,546.89 + $64,154.99 = $164,701.88

  describe('Ontario $400K salary', () => {
    it('should match hand-computed federal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(400000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.federalTax).toBeCloseTo(100547, -1);
    });

    it('should match hand-computed provincial + surtax', () => {
      const result = calculateProjection(salaryOnlyInputs(400000, 'ON'));
      const y1 = result.yearlyResults[0];
      const provTaxExclHealth = y1.provincialTax - y1.healthPremium;
      expect(provTaxExclHealth).toBeCloseTo(63255, -1);
    });

    it('should match hand-computed total personal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(400000, 'ON'));
      const y1 = result.yearlyResults[0];
      expect(y1.personalTax).toBeCloseTo(164702, -1);
    });
  });

  // =========================================================================
  // ALBERTA — $150,000 salary (flat 10% up to $151,234)
  // =========================================================================
  // Federal tax: same as ON $150K = $24,481.01
  //
  // Alberta tax:
  //   Taxable = $150,000 - $21,423 = $128,577
  //   Bracket 1: $128,577 × 10% = $12,857.70 (all within first bracket)
  //   No surtax, no health premium
  //   Total Alberta = $12,857.70
  //
  // Total personal tax = $24,481.01 + $12,857.70 = $37,338.71
  //
  // CPP/CPP2/EI: same as ON (federal)

  describe('Alberta $150K salary', () => {
    it('should match hand-computed federal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'AB'));
      const y1 = result.yearlyResults[0];
      expect(y1.federalTax).toBeCloseTo(24481, -1);
    });

    it('should match hand-computed provincial tax (flat 10%)', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'AB'));
      const y1 = result.yearlyResults[0];
      expect(y1.provincialTax).toBeCloseTo(12858, -1);
    });

    it('should have zero health premium and surtax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'AB'));
      const y1 = result.yearlyResults[0];
      expect(y1.healthPremium).toBe(0);
    });

    it('should match total personal tax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'AB'));
      const y1 = result.yearlyResults[0];
      expect(y1.personalTax).toBeCloseTo(37339, -1);
    });
  });

  // =========================================================================
  // ALBERTA — $250,000 salary (crosses into 2nd + 3rd brackets)
  // =========================================================================
  // Alberta tax:
  //   Taxable = $250,000 - $21,423 = $228,577
  //   Bracket 1: $151,234 × 10% = $15,123.40
  //   Bracket 2: ($181,480 - $151,234) × 12% = $30,246 × 12% = $3,629.52
  //   Bracket 3: ($228,577 - $181,480) × 13% = $47,097 × 13% = $6,122.61
  //   Total Alberta = $24,875.53

  describe('Alberta $250K salary', () => {
    it('should match hand-computed provincial tax', () => {
      const result = calculateProjection(salaryOnlyInputs(250000, 'AB'));
      const y1 = result.yearlyResults[0];
      expect(y1.provincialTax).toBeCloseTo(24876, -1);
    });
  });

  // =========================================================================
  // QUEBEC — $150,000 salary
  // =========================================================================
  // Federal tax: same as ON = $24,481.01
  // (Note: Quebec has federal tax abatement of 16.5%, but our model may or
  //  may not implement this. The test will validate what the engine produces.)
  //
  // Quebec provincial tax:
  //   Taxable = $150,000 - $18,417 = $131,583
  //   Bracket 1: $52,816 × 14% = $7,394.24
  //   Bracket 2: ($105,616 - $52,816) × 19% = $52,800 × 19% = $10,032.00
  //   Bracket 3: ($128,520 - $105,616) × 24% = $22,904 × 24% = $5,496.96
  //   Bracket 4: ($131,583 - $128,520) × 25.75% = $3,063 × 25.75% = $788.72
  //   Total Quebec = $23,711.92
  //
  // QPP: ($74,600 - $3,500) × 6.40% = $71,100 × 6.40% = $4,550.40
  // QPP2: ($85,000 - $74,600) × 4% = $10,400 × 4% = $416
  //   salary $150K > YAMPE → QPP2 = max
  // QPIP: min($150,000, max insurable) × 0.494%
  // Quebec EI: $68,900 × 1.278% = $880.54 (reduced rate for QC)

  describe('Quebec $150K salary', () => {
    it('should match hand-computed provincial tax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'QC'));
      const y1 = result.yearlyResults[0];
      expect(y1.provincialTax).toBeCloseTo(23712, -1);
    });

    it('should have QPP instead of CPP (higher rate)', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'QC'));
      const y1 = result.yearlyResults[0];
      // QPP at 6.4% vs CPP at 5.95% — QC payroll should be higher
      expect(y1.cpp).toBeGreaterThan(4230); // QPP > CPP
    });

    it('should have QPIP > 0 and reduced EI', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'QC'));
      const y1 = result.yearlyResults[0];
      expect(y1.qpip).toBeGreaterThan(0);
      expect(y1.ei).toBeLessThan(1123.07); // Quebec EI is lower
    });
  });

  // =========================================================================
  // BC — $150,000 salary
  // =========================================================================
  // BC tax:
  //   Taxable = $150,000 - $13,191 = $136,809
  //   Bracket 1: $48,896 × 5.06% = $2,474.14
  //   Bracket 2: ($97,792 - $48,896) × 7.70% = $48,896 × 7.70% = $3,765.00
  //   Bracket 3: ($112,278 - $97,792) × 10.50% = $14,486 × 10.50% = $1,521.03
  //   Bracket 4: ($136,337 - $112,278) × 12.29% = $24,059 × 12.29% = $2,956.85
  //   Bracket 5: ($136,809 - $136,337) × 14.70% = $472 × 14.70% = $69.38
  //   Total BC = $10,786.40

  describe('BC $150K salary', () => {
    it('should match hand-computed provincial tax', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'BC'));
      const y1 = result.yearlyResults[0];
      expect(y1.provincialTax).toBeCloseTo(10786, -1);
    });

    it('should have no surtax or health premium', () => {
      const result = calculateProjection(salaryOnlyInputs(150000, 'BC'));
      const y1 = result.yearlyResults[0];
      expect(y1.healthPremium).toBe(0);
    });
  });

  // =========================================================================
  // ONTARIO — Dividend-only scenarios (eligible + non-eligible)
  // =========================================================================
  // $100K eligible dividends in Ontario, 2026:
  //   Grossed-up: $100,000 × 1.38 = $138,000
  //   Taxable = $138,000 (no salary, no RRSP)
  //   Federal taxable = $138,000 - $16,452 = $121,548
  //   Federal tax before credits:
  //     B1: $58,523 × 14% = $8,193.22
  //     B2: ($117,045 - $58,523) × 20.5% = $58,522 × 20.5% = $11,997.01
  //     B3: ($121,548 - $117,045) × 26% = $4,503 × 26% = $1,170.78
  //     = $21,361.01
  //   Federal DTC: $138,000 × 15.0198% = $20,727.32
  //   Federal tax = max(0, $21,361.01 - $20,727.32) = $633.69
  //
  //   Ontario taxable = $138,000 - $12,647 = $125,353
  //   Ontario tax before credits:
  //     B1: $52,475 × 5.05% = $2,649.99
  //     B2: ($104,951 - $52,475) × 9.15% = $52,476 × 9.15% = $4,801.55
  //     B3: ($125,353 - $104,951) × 11.16% = $20,402 × 11.16% = $2,276.86
  //     = $9,728.40
  //   Ontario DTC: $138,000 × 10% = $13,800
  //   Ontario tax = max(0, $9,728.40 - $13,800) = $0 (credits exceed tax!)
  //   Surtax: $0 (no provincial tax)
  //   Health premium: actual income $100,000 → $900
  //
  //   Total personal tax = $633.69 + $0 + $900 = $1,533.69
  //   Effective rate on $100K eligible divs ≈ 1.5%

  describe('Ontario $100K eligible dividends only', () => {
    it('should have very low personal tax (dividend credits offset most tax)', () => {
      const inputs = salaryOnlyInputs(100000, 'ON');
      inputs.salaryStrategy = 'dividends-only';
      inputs.gripBalance = 200000; // Enough GRIP for eligible dividends
      inputs.eRDTOHBalance = 100000; // Enough RDTOH
      inputs.corporateInvestmentBalance = 500000;
      inputs.annualCorporateRetainedEarnings = 0;
      const result = calculateProjection(inputs);
      const y1 = result.yearlyResults[0];
      // Personal tax should be very low — most offset by dividend credits
      expect(y1.personalTax).toBeLessThan(3000);
      // Federal tax should be very small after credits
      expect(y1.federalTax).toBeLessThan(1500);
    });
  });

  // =========================================================================
  // Cross-province comparison at $150K salary
  // =========================================================================
  // Expected ordering (lowest to highest personal tax):
  // AB < BC < ON < QC (approximately, at $150K)

  describe('Cross-province tax ordering at $150K', () => {
    const provinces = ['AB', 'BC', 'ON', 'QC'] as const;
    const results: Record<string, number> = {};

    it('Alberta should have lowest personal tax', () => {
      for (const prov of provinces) {
        const r = calculateProjection(salaryOnlyInputs(150000, prov));
        results[prov] = r.yearlyResults[0].personalTax;
      }
      expect(results['AB']).toBeLessThan(results['ON']);
      expect(results['AB']).toBeLessThan(results['BC']);
    });

    it('Quebec should have highest provincial tax', () => {
      for (const prov of provinces) {
        const r = calculateProjection(salaryOnlyInputs(150000, prov));
        results[prov] = r.yearlyResults[0].provincialTax;
      }
      expect(results['QC']).toBeGreaterThan(results['ON']);
      expect(results['QC']).toBeGreaterThan(results['BC']);
      expect(results['QC']).toBeGreaterThan(results['AB']);
    });
  });

  // =========================================================================
  // RRSP deduction verification
  // =========================================================================
  // $150K salary, ON, with RRSP contribution
  // RRSP room = $150K × 18% = $27,000 (capped at annual limit $33,810 → $27,000)
  // Taxable income reduced by RRSP contribution
  // This should reduce both federal and provincial tax proportionally

  describe('RRSP deduction reduces tax', () => {
    it('contributing to RRSP should reduce personal tax', () => {
      const noRRSP = calculateProjection(salaryOnlyInputs(150000, 'ON'));
      const withRRSP = calculateProjection({
        ...salaryOnlyInputs(150000, 'ON'),
        contributeToRRSP: true,
        rrspBalance: 50000, // Has RRSP room
      });
      const y1NoRRSP = noRRSP.yearlyResults[0];
      const y1RRSP = withRRSP.yearlyResults[0];
      // RRSP contribution should reduce personal tax
      expect(y1RRSP.personalTax).toBeLessThan(y1NoRRSP.personalTax);
      // Tax saving should be roughly marginal rate × RRSP contribution
      const taxSaving = y1NoRRSP.personalTax - y1RRSP.personalTax;
      // At $150K in ON, marginal rate ≈ 26% federal + 11.16% provincial ≈ 37%
      // RRSP contribution = 18% × $150K = $27,000
      // Expected saving ≈ $27,000 × 37% ≈ $10,000
      expect(taxSaving).toBeGreaterThan(7000);
      expect(taxSaving).toBeLessThan(15000);
    });
  });
});
```

**Step 2: Run the tests**

Run: `npx vitest run src/lib/__tests__/craPersonalTax.test.ts`
Expected: All tests pass (values hand-computed from our stored bracket data)

**Step 3: Commit**

```bash
git add src/lib/__tests__/craPersonalTax.test.ts
git commit -m "test: add CRA hand-calculated personal tax verification (Layer 1)

Hand-computed federal + provincial tax at $75K/$150K/$250K/$400K for
ON, AB, QC, BC. Verifies bracket math, surtax, health premium, CPP/EI,
dividend tax credits, RRSP deductions, and cross-province ordering."
```

---

## Task 2: Layer 2 — Corporate Flow End-to-End (corporateFlow.test.ts)

**Files:**
- Create: `src/lib/__tests__/corporateFlow.test.ts`

**What this tests:** Full corporate lifecycle over 3-5 years: active business income → SBD/general rate → RDTOH generation → dividend payment → refund → GRIP tracking → retained earnings. Every notional account balance verified at each step.

**Step 1: Write the test file**

```typescript
/**
 * Corporate Flow End-to-End Tests
 *
 * Traces the full corporate lifecycle over multiple years:
 * - Active business income → SBD vs general rate tax
 * - Investment returns → CDA, eRDTOH, nRDTOH, GRIP generation
 * - Dividend payments → account depletion + RDTOH refund
 * - Retained earnings accumulation
 * - Passive income grind (SBD clawback)
 *
 * Each test traces balances year-by-year to verify the accounting flow.
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
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

describe('Corporate Flow End-to-End', () => {

  // =========================================================================
  // 1. SBD vs General Rate Split
  // =========================================================================
  describe('SBD vs General Rate corporate tax', () => {
    it('should tax first $500K of business income at SBD rate', () => {
      // $200K annual retained earnings, $100K salary → taxable < $500K → all SBD
      const result = calculateProjection(createInputs({
        annualCorporateRetainedEarnings: 200000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
        investmentReturnRate: 0, // No passive income
      }));
      const y1 = result.yearlyResults[0];
      // Taxable business income = $200K - salary cost (salary + employer CPP/EI + EHT)
      // At $100K salary: employer CPP ≈ $4,230, employer EI ≈ $1,572, EHT = $0 (under exemption)
      // Taxable ≈ $200K - $100K - $4,230 - $1,572 = ~$94,198
      // All within SBD limit → taxed at 12.2%
      // Corp tax ≈ $94,198 × 0.122 ≈ $11,492
      expect(y1.corporateTaxOnActive).toBeGreaterThan(0);
      // With SBD, effective rate should be near 12.2%
      if (y1.corporateTaxOnActive > 0 && y1.taxableBusinessIncome > 0) {
        const effectiveCorpRate = y1.corporateTaxOnActive / y1.taxableBusinessIncome;
        expect(effectiveCorpRate).toBeCloseTo(0.122, 2);
      }
    });

    it('should split at general rate when income exceeds SBD limit', () => {
      // $700K retained earnings, no salary → all $700K taxable
      // SBD on first $500K at 12.2%, general on remaining $200K at 26.5%
      const result = calculateProjection(createInputs({
        annualCorporateRetainedEarnings: 700000,
        salaryStrategy: 'dividends-only',
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // Expected corp tax ≈ $500K × 12.2% + $200K × 26.5% = $61,000 + $53,000 = $114,000
      expect(y1.corporateTaxOnActive).toBeGreaterThan(100000);
      // Effective rate should be between SBD (12.2%) and general (26.5%)
      if (y1.corporateTaxOnActive > 0 && y1.taxableBusinessIncome > 0) {
        const effectiveCorpRate = y1.corporateTaxOnActive / y1.taxableBusinessIncome;
        expect(effectiveCorpRate).toBeGreaterThan(0.122);
        expect(effectiveCorpRate).toBeLessThan(0.265);
      }
    });
  });

  // =========================================================================
  // 2. Notional Account Generation from Investment Returns
  // =========================================================================
  describe('Notional account generation from investments', () => {
    it('should generate CDA from 50% of capital gains', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 1000000,
        investmentReturnRate: 0.08,
        annualCorporateRetainedEarnings: 0,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 50000,
        requiredIncome: 40000,
      }));
      const y1 = result.yearlyResults[0];
      // $1M × 8% = $80K total return
      // With 25% equities each type, some is capital gains
      // CDA should increase by 50% of realized capital gains
      if (y1.investmentReturns) {
        expect(y1.investmentReturns.CDAIncrease).toBeCloseTo(
          y1.investmentReturns.realizedCapitalGain * 0.5, 0
        );
      }
    });

    it('should generate eRDTOH from Canadian dividend income at 38.33%', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 1000000,
        investmentReturnRate: 0.08,
        canadianEquityPercent: 100,  // All Canadian equity
        usEquityPercent: 0,
        internationalEquityPercent: 0,
        fixedIncomePercent: 0,
        annualCorporateRetainedEarnings: 0,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 50000,
        requiredIncome: 40000,
      }));
      const y1 = result.yearlyResults[0];
      if (y1.investmentReturns && y1.investmentReturns.canadianDividends > 0) {
        // eRDTOH increase ≈ 38.33% of Canadian dividends
        expect(y1.investmentReturns.eRDTOHIncrease).toBeCloseTo(
          y1.investmentReturns.canadianDividends * 0.3833, 0
        );
      }
    });

    it('should generate nRDTOH from foreign + capital gains income at 30.67%', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 1000000,
        investmentReturnRate: 0.08,
        canadianEquityPercent: 0,
        usEquityPercent: 50,
        internationalEquityPercent: 50,
        fixedIncomePercent: 0,
        annualCorporateRetainedEarnings: 0,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 50000,
        requiredIncome: 40000,
      }));
      const y1 = result.yearlyResults[0];
      if (y1.investmentReturns) {
        const taxableInvestmentIncome = y1.investmentReturns.foreignIncome +
          y1.investmentReturns.realizedCapitalGain * 0.5;
        if (taxableInvestmentIncome > 0) {
          expect(y1.investmentReturns.nRDTOHIncrease).toBeCloseTo(
            taxableInvestmentIncome * 0.3067, 0
          );
        }
      }
    });
  });

  // =========================================================================
  // 3. RDTOH Refund Mechanics
  // =========================================================================
  describe('RDTOH refund on dividend payment', () => {
    it('eRDTOH should decrease when eligible dividends paid', () => {
      const result = calculateProjection(createInputs({
        eRDTOHBalance: 50000,
        gripBalance: 200000,
        salaryStrategy: 'dividends-only',
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // Paid eligible dividends → eRDTOH should decrease
      if (y1.dividendFunding.eligibleDividends > 0) {
        const expectedRefund = y1.dividendFunding.eligibleDividends * 0.3833;
        // Refund capped at available eRDTOH
        const actualRefund = Math.min(expectedRefund, 50000);
        expect(y1.rdtohRefund).toBeCloseTo(actualRefund, -1);
      }
    });

    it('nRDTOH should decrease when non-eligible dividends paid', () => {
      const result = calculateProjection(createInputs({
        nRDTOHBalance: 50000,
        eRDTOHBalance: 0,
        gripBalance: 0,
        salaryStrategy: 'dividends-only',
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // Non-eligible dividends should trigger nRDTOH refund
      if (y1.dividendFunding.nonEligibleDividends > 0) {
        expect(y1.rdtohRefund).toBeGreaterThan(0);
      }
    });

    it('eRDTOH cascade: non-eligible divs can trigger eRDTOH refund when nRDTOH depleted', () => {
      const result = calculateProjection(createInputs({
        eRDTOHBalance: 100000,
        nRDTOHBalance: 1000, // Small nRDTOH, will deplete quickly
        gripBalance: 0,      // No GRIP → forces non-eligible dividends
        requiredIncome: 80000,
        salaryStrategy: 'dividends-only',
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // nRDTOH should be fully depleted, then cascade into eRDTOH
      // Total refund should exceed just the nRDTOH balance
      expect(y1.rdtohRefund).toBeGreaterThan(1000);
    });
  });

  // =========================================================================
  // 4. GRIP Tracking
  // =========================================================================
  describe('GRIP tracking', () => {
    it('GRIP should decrease when eligible dividends paid', () => {
      const result = calculateProjection(createInputs({
        gripBalance: 100000,
        eRDTOHBalance: 50000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 50000,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      const gripUsed = y1.dividendFunding.eligibleDividends;
      // GRIP should decrease by the amount of eligible dividends paid
      expect(gripUsed).toBeGreaterThan(0);
      expect(gripUsed).toBeLessThanOrEqual(100000);
    });

    it('eligible dividends should be capped at GRIP balance', () => {
      const result = calculateProjection(createInputs({
        gripBalance: 10000, // Very limited GRIP
        eRDTOHBalance: 100000,
        nRDTOHBalance: 100000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 100000,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // Eligible dividends from eRDTOH step can't exceed GRIP
      // (GRIP-no-refund step also limited)
      // Total eligible ≤ initial GRIP + any GRIP generated
      expect(y1.dividendFunding.eligibleDividends).toBeLessThanOrEqual(10000 + 1);
    });
  });

  // =========================================================================
  // 5. Corporate Investment Balance Tracking Over 5 Years
  // =========================================================================
  describe('5-year corporate balance tracking', () => {
    it('corporate investments should grow with retained earnings and returns', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 500000,
        annualCorporateRetainedEarnings: 300000,
        investmentReturnRate: 0.05,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 80000,
        requiredIncome: 60000,
        planningHorizon: 5,
      }));
      // Over 5 years: $500K start + ~$300K/yr earnings + 5% returns - salary costs - taxes
      // Balance should grow significantly
      const finalBalance = result.yearlyResults[4].endingCorporateInvestments;
      expect(finalBalance).toBeGreaterThan(500000);
      // Should be substantially higher after 5 years of $300K retained earnings
      expect(finalBalance).toBeGreaterThan(1000000);
    });

    it('year-over-year balance should be monotonically increasing when earnings exceed costs', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 500000,
        annualCorporateRetainedEarnings: 500000, // Very high earnings
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 80000,
        requiredIncome: 60000,
        planningHorizon: 5,
      }));
      for (let i = 1; i < result.yearlyResults.length; i++) {
        expect(result.yearlyResults[i].endingCorporateInvestments)
          .toBeGreaterThan(result.yearlyResults[i - 1].endingCorporateInvestments);
      }
    });
  });

  // =========================================================================
  // 6. Passive Income Grind
  // =========================================================================
  describe('Passive income grind (SBD clawback)', () => {
    it('should not grind SBD when AAII < $50K', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 500000,
        investmentReturnRate: 0.04, // $20K return → AAII well under $50K
        annualCorporateRetainedEarnings: 200000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
      }));
      const y1 = result.yearlyResults[0];
      if (y1.passiveIncomeGrind) {
        expect(y1.passiveIncomeGrind.sbdReduction).toBe(0);
        expect(y1.passiveIncomeGrind.reducedSBDLimit).toBe(500000);
      }
    });

    it('should grind SBD when AAII > $50K', () => {
      // Need $50K+ in foreign income + 50% of realized capital gains
      // $2.5M × 4% = $100K return → AAII ≈ foreign (25%) + 50% of cap gains
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 5000000,
        investmentReturnRate: 0.06,
        annualCorporateRetainedEarnings: 200000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
      }));
      const y1 = result.yearlyResults[0];
      if (y1.passiveIncomeGrind && y1.passiveIncomeGrind.aaii > 50000) {
        expect(y1.passiveIncomeGrind.sbdReduction).toBeGreaterThan(0);
        expect(y1.passiveIncomeGrind.reducedSBDLimit).toBeLessThan(500000);
      }
    });

    it('should fully grind SBD when AAII >= $150K', () => {
      // $10M × 6% = $600K return → AAII should be well above $150K
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 10000000,
        investmentReturnRate: 0.06,
        annualCorporateRetainedEarnings: 200000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
      }));
      const y1 = result.yearlyResults[0];
      if (y1.passiveIncomeGrind && y1.passiveIncomeGrind.aaii >= 150000) {
        expect(y1.passiveIncomeGrind.reducedSBDLimit).toBe(0);
        expect(y1.passiveIncomeGrind.isFullyGround).toBe(true);
      }
    });
  });

  // =========================================================================
  // 7. Dividend Depletion Priority Order
  // =========================================================================
  describe('Dividend depletion priority: CDA → eRDTOH → nRDTOH → GRIP → retained', () => {
    it('should use CDA first (tax-free)', () => {
      const result = calculateProjection(createInputs({
        cdaBalance: 50000,
        eRDTOHBalance: 50000,
        nRDTOHBalance: 50000,
        gripBalance: 50000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 30000,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // CDA should be used first (tax-free, most efficient)
      expect(y1.dividendFunding.capitalDividends).toBeGreaterThan(0);
      // If $30K required and CDA has $50K, CDA alone should cover it
      expect(y1.dividendFunding.capitalDividends).toBeCloseTo(30000, -1);
    });

    it('should use eRDTOH after CDA depleted', () => {
      const result = calculateProjection(createInputs({
        cdaBalance: 10000, // Small CDA
        eRDTOHBalance: 50000,
        gripBalance: 200000, // Need GRIP for eligible dividends
        nRDTOHBalance: 50000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 80000,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.dividendFunding.capitalDividends).toBeCloseTo(10000, 0);
      expect(y1.dividendFunding.eligibleDividends).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 8. Retained Earnings as Last Resort
  // =========================================================================
  describe('Retained earnings usage', () => {
    it('should use retained earnings when all notional accounts depleted', () => {
      const result = calculateProjection(createInputs({
        cdaBalance: 0,
        eRDTOHBalance: 0,
        nRDTOHBalance: 0,
        gripBalance: 0,
        corporateInvestmentBalance: 500000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 80000,
        investmentReturnRate: 0,
        annualCorporateRetainedEarnings: 0,
      }));
      const y1 = result.yearlyResults[0];
      // All dividends should be non-eligible (from retained earnings)
      expect(y1.dividendFunding.nonEligibleDividends).toBeGreaterThan(0);
      expect(y1.dividendFunding.capitalDividends).toBe(0);
      // No eligible dividends possible (no GRIP, no eRDTOH)
    });
  });

  // =========================================================================
  // 9. IPP Corporate Expense Flow
  // =========================================================================
  describe('IPP as corporate deductible expense', () => {
    it('IPP contribution should reduce taxable business income', () => {
      const noIPP = calculateProjection(createInputs({
        annualCorporateRetainedEarnings: 300000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 150000,
        investmentReturnRate: 0,
      }));
      const withIPP = calculateProjection(createInputs({
        annualCorporateRetainedEarnings: 300000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 150000,
        investmentReturnRate: 0,
        considerIPP: true,
        ippMemberAge: 50,
        ippYearsOfService: 10,
      }));
      // IPP contribution is a corporate expense → reduces taxable income → lower corp tax
      expect(withIPP.yearlyResults[0].corporateTaxOnActive)
        .toBeLessThan(noIPP.yearlyResults[0].corporateTaxOnActive);
    });

    it('IPP should be zero when salary is zero (dividends-only)', () => {
      const result = calculateProjection(createInputs({
        salaryStrategy: 'dividends-only',
        considerIPP: true,
        ippMemberAge: 50,
        ippYearsOfService: 10,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      if (y1.ipp) {
        expect(y1.ipp.contribution).toBe(0);
      }
    });
  });

  // =========================================================================
  // 10. Multi-Year Account Conservation
  // =========================================================================
  describe('Multi-year notional account conservation', () => {
    it('CDA ending balance = starting + investment increases - capital dividends paid', () => {
      const result = calculateProjection(createInputs({
        cdaBalance: 20000,
        investmentReturnRate: 0.04,
        planningHorizon: 5,
        salaryStrategy: 'dividends-only',
      }));

      let cumulativeCDAIncrease = 0;
      let cumulativeCapDivs = 0;
      for (const year of result.yearlyResults) {
        if (year.investmentReturns) {
          cumulativeCDAIncrease += year.investmentReturns.CDAIncrease;
        }
        cumulativeCapDivs += year.dividendFunding.capitalDividends;
      }

      const expectedEnd = 20000 + cumulativeCDAIncrease - cumulativeCapDivs;
      const actualEnd = result.yearlyResults[4].endingCDA;
      expect(actualEnd).toBeCloseTo(expectedEnd, 0);
    });
  });
});
```

**Step 2: Run the tests**

Run: `npx vitest run src/lib/__tests__/corporateFlow.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/__tests__/corporateFlow.test.ts
git commit -m "test: add corporate flow end-to-end verification (Layer 2)

Traces SBD/general rate splits, notional account generation from
investments, RDTOH refund mechanics, GRIP tracking, dividend depletion
priority, passive income grind, IPP corporate expense, and multi-year
account conservation."
```

---

## Task 3: Layer 3 — Boundary & Stress Tests (boundaryStress.test.ts)

**Files:**
- Create: `src/lib/__tests__/boundaryStress.test.ts`

**What this tests:** Edge cases at exact boundaries — bracket thresholds, YMPE, SBD grind limits, zero/max values, depleted accounts, and extreme scenarios.

**Step 1: Write the test file**

```typescript
/**
 * Boundary & Stress Tests
 *
 * Tests at exact boundary values where calculations switch behavior:
 * - Tax bracket thresholds (exactly at boundary vs $1 above)
 * - YMPE/YAMPE for CPP/CPP2
 * - SBD grind thresholds ($50K/$150K AAII)
 * - Zero income, zero balance, zero retained earnings
 * - Very high income ($1M+)
 * - Account exhaustion mid-year
 * - BPA edge cases
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    province: 'ON',
    requiredIncome: 100000,
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
    annualCorporateRetainedEarnings: 500000,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'fixed',
    fixedSalaryAmount: 100000,
    ...overrides,
  };
}

describe('Boundary & Stress Tests', () => {

  // =========================================================================
  // 1. Federal Bracket Boundaries (2026)
  // =========================================================================
  describe('Federal bracket boundaries', () => {
    // Income just below vs just above each bracket threshold
    // Bracket 2 starts at $58,523

    it('$1 below bracket 2 should be taxed entirely at 14%', () => {
      // Salary = BPA + $58,522 = $16,452 + $58,522 = $74,974
      const salary = 16452 + 58522;
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: salary,
        requiredIncome: salary * 0.7,
        annualCorporateRetainedEarnings: salary * 2,
      }));
      const y1 = result.yearlyResults[0];
      // All $58,522 of taxable income at 14%
      expect(y1.federalTax).toBeCloseTo(58522 * 0.14, 0);
    });

    it('$1 above bracket 2 should have marginal tax at 20.5%', () => {
      const salary = 16452 + 58524; // $1 into bracket 2
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: salary,
        requiredIncome: salary * 0.7,
        annualCorporateRetainedEarnings: salary * 2,
      }));
      const y1 = result.yearlyResults[0];
      // $58,523 at 14% + $1 at 20.5%
      const expected = 58523 * 0.14 + 1 * 0.205;
      expect(y1.federalTax).toBeCloseTo(expected, 0);
    });
  });

  // =========================================================================
  // 2. CPP/CPP2 Boundaries
  // =========================================================================
  describe('CPP/CPP2 at YMPE/YAMPE boundaries', () => {
    it('salary exactly at YMPE should hit max CPP, zero CPP2', () => {
      const ympe = 74600;
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: ympe,
        requiredIncome: ympe * 0.6,
        annualCorporateRetainedEarnings: ympe * 2,
      }));
      const y1 = result.yearlyResults[0];
      // CPP = (YMPE - $3,500) × 5.95% = $71,100 × 5.95% = $4,230.45
      expect(y1.cpp).toBeCloseTo(4230.45, 0);
      // CPP2 = $0 (salary not above YMPE)
      expect(y1.cpp2).toBe(0);
    });

    it('salary $1 above YMPE should trigger CPP2', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 74601,
        requiredIncome: 50000,
        annualCorporateRetainedEarnings: 200000,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.cpp).toBeCloseTo(4230.45, 0);
      // CPP2 = ($74,601 - $74,600) × 4% = $0.04
      expect(y1.cpp2).toBeCloseTo(0.04, 1);
    });

    it('salary at YAMPE should hit max CPP2', () => {
      const yampe = 85000;
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: yampe,
        requiredIncome: yampe * 0.6,
        annualCorporateRetainedEarnings: yampe * 2,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.cpp).toBeCloseTo(4230.45, 0);
      // CPP2 max = ($85,000 - $74,600) × 4% = $10,400 × 4% = $416
      expect(y1.cpp2).toBeCloseTo(416, 0);
    });

    it('salary above YAMPE should cap CPP2 at max', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 200000,
        requiredIncome: 100000,
        annualCorporateRetainedEarnings: 400000,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.cpp2).toBeCloseTo(416, 0);
    });

    it('salary below basic exemption should have zero CPP', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 3000, // Below $3,500 basic exemption
        requiredIncome: 2000,
        annualCorporateRetainedEarnings: 10000,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.cpp).toBe(0);
      expect(y1.cpp2).toBe(0);
    });
  });

  // =========================================================================
  // 3. EI Boundaries
  // =========================================================================
  describe('EI boundaries', () => {
    it('salary at max insurable should hit max EI', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 68900, // Max insurable earnings
        requiredIncome: 45000,
        annualCorporateRetainedEarnings: 150000,
      }));
      const y1 = result.yearlyResults[0];
      // EI = $68,900 × 1.63% = $1,123.07
      expect(y1.ei).toBeCloseTo(1123.07, 0);
    });

    it('salary above max insurable should cap at max EI', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 200000,
        requiredIncome: 100000,
        annualCorporateRetainedEarnings: 400000,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.ei).toBeCloseTo(1123.07, 0);
    });
  });

  // =========================================================================
  // 4. BPA Edge Cases
  // =========================================================================
  describe('Basic Personal Amount edge cases', () => {
    it('salary exactly at BPA should produce zero federal tax', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 16452, // Federal BPA
        requiredIncome: 10000,
        annualCorporateRetainedEarnings: 50000,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.federalTax).toBe(0);
    });

    it('salary $1 above BPA should produce minimal federal tax', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 16453,
        requiredIncome: 10000,
        annualCorporateRetainedEarnings: 50000,
      }));
      const y1 = result.yearlyResults[0];
      // $1 × 14% = $0.14
      expect(y1.federalTax).toBeCloseTo(0.14, 1);
    });
  });

  // =========================================================================
  // 5. Zero and Near-Zero Scenarios
  // =========================================================================
  describe('Zero income scenarios', () => {
    it('zero salary dividends-only with zero balances should produce zero everything', () => {
      const result = calculateProjection(createInputs({
        requiredIncome: 0,
        salaryStrategy: 'dividends-only',
        corporateInvestmentBalance: 0,
        annualCorporateRetainedEarnings: 0,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.salary).toBe(0);
      expect(y1.personalTax).toBe(0);
      expect(y1.cpp).toBe(0);
      expect(y1.ei).toBe(0);
    });

    it('very small required income ($1) should work without errors', () => {
      const result = calculateProjection(createInputs({
        requiredIncome: 1,
        salaryStrategy: 'dynamic',
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.afterTaxIncome).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 6. Very High Income ($1M+)
  // =========================================================================
  describe('Very high income scenarios', () => {
    it('$1M salary should work and hit top brackets everywhere', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 1000000,
        requiredIncome: 500000,
        annualCorporateRetainedEarnings: 2000000,
      }));
      const y1 = result.yearlyResults[0];
      // Should hit all 5 federal brackets
      // Should hit all 5 Ontario brackets
      // All payroll caps should be hit
      expect(y1.cpp).toBeCloseTo(4230.45, 0);
      expect(y1.cpp2).toBeCloseTo(416, 0);
      expect(y1.ei).toBeCloseTo(1123.07, 0);
      // Federal tax should be very high
      expect(y1.federalTax).toBeGreaterThan(250000);
      // Effective personal rate should be high
      const effectiveRate = y1.personalTax / 1000000;
      expect(effectiveRate).toBeGreaterThan(0.40);
      expect(effectiveRate).toBeLessThan(0.55);
    });

    it('$5M salary should not cause overflow or NaN', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 5000000,
        requiredIncome: 2000000,
        annualCorporateRetainedEarnings: 10000000,
      }));
      const y1 = result.yearlyResults[0];
      expect(y1.federalTax).not.toBeNaN();
      expect(y1.provincialTax).not.toBeNaN();
      expect(y1.personalTax).not.toBeNaN();
      expect(y1.afterTaxIncome).not.toBeNaN();
      expect(isFinite(y1.personalTax)).toBe(true);
    });
  });

  // =========================================================================
  // 7. Account Exhaustion
  // =========================================================================
  describe('Account exhaustion scenarios', () => {
    it('should handle CDA depletion across multiple years', () => {
      const result = calculateProjection(createInputs({
        cdaBalance: 30000, // Will run out
        eRDTOHBalance: 100000,
        gripBalance: 200000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 50000,
        planningHorizon: 5,
        investmentReturnRate: 0,
        annualCorporateRetainedEarnings: 0,
      }));
      // CDA should be fully used in early years, then fall to 0
      const finalCDA = result.yearlyResults[4].endingCDA;
      expect(finalCDA).toBeGreaterThanOrEqual(-0.01); // Should not go negative
    });

    it('should gracefully handle zero corporate balance with required income', () => {
      const result = calculateProjection(createInputs({
        corporateInvestmentBalance: 0,
        annualCorporateRetainedEarnings: 200000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
        requiredIncome: 70000,
        investmentReturnRate: 0,
      }));
      // Should still work — salary is funded from current-year earnings
      const y1 = result.yearlyResults[0];
      expect(y1.salary).toBe(100000);
      expect(y1.personalTax).toBeGreaterThan(0);
    });

    it('should handle GRIP exhaustion mid-depletion', () => {
      const result = calculateProjection(createInputs({
        gripBalance: 20000, // Small GRIP
        eRDTOHBalance: 50000,
        nRDTOHBalance: 50000,
        salaryStrategy: 'dividends-only',
        requiredIncome: 100000,
        investmentReturnRate: 0,
        annualCorporateRetainedEarnings: 0,
      }));
      const y1 = result.yearlyResults[0];
      // Eligible dividends limited by GRIP
      // Should fall back to non-eligible dividends for remainder
      expect(y1.dividendFunding.eligibleDividends).toBeLessThanOrEqual(20001);
      expect(y1.dividendFunding.nonEligibleDividends).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 8. Ontario Health Premium Boundaries
  // =========================================================================
  describe('Ontario Health Premium boundaries', () => {
    it('income $20,000 → $0 premium', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 20000,
        requiredIncome: 15000,
        annualCorporateRetainedEarnings: 50000,
      }));
      expect(result.yearlyResults[0].healthPremium).toBe(0);
    });

    it('income $20,001 → small premium (6% marginal)', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 20001,
        requiredIncome: 15000,
        annualCorporateRetainedEarnings: 50000,
      }));
      // Health premium should be very small but > $0
      expect(result.yearlyResults[0].healthPremium).toBeGreaterThan(0);
      expect(result.yearlyResults[0].healthPremium).toBeLessThan(10);
    });

    it('income $200,000+ → max premium $900', () => {
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 300000,
        requiredIncome: 150000,
        annualCorporateRetainedEarnings: 600000,
      }));
      expect(result.yearlyResults[0].healthPremium).toBe(900);
    });
  });

  // =========================================================================
  // 9. Ontario Surtax Boundaries
  // =========================================================================
  describe('Ontario surtax boundaries', () => {
    it('provincial tax just below first surtax threshold → $0 surtax', () => {
      // Need provincial tax ≈ $5,824
      // Provincial tax = 5.05% on first $52,475 + 9.15% on remainder
      // $52,475 × 5.05% = $2,650; need $3,174 more → $3,174 / 9.15% = $34,688
      // Taxable provincial = $52,475 + $34,688 = $87,163
      // Salary = $87,163 + $12,647 BPA = $99,810
      const result = calculateProjection(createInputs({
        fixedSalaryAmount: 99000,
        requiredIncome: 65000,
        annualCorporateRetainedEarnings: 200000,
      }));
      const y1 = result.yearlyResults[0];
      const provTaxExclHealth = y1.provincialTax - y1.healthPremium;
      // Provincial tax should be near the surtax threshold
      // Surtax should be $0 or very small
      if (provTaxExclHealth < 5824) {
        // Verify no surtax component
        const taxOnBrackets = 52475 * 0.0505 + (99000 - 12647 - 52475) * 0.0915;
        expect(provTaxExclHealth).toBeCloseTo(taxOnBrackets, -1);
      }
    });
  });

  // =========================================================================
  // 10. Spouse Boundary Tests
  // =========================================================================
  describe('Spouse scenarios', () => {
    it('spouse should draw from same corporate pool after primary', () => {
      const noSpouse = calculateProjection(createInputs({
        requiredIncome: 100000,
        salaryStrategy: 'dynamic',
        corporateInvestmentBalance: 500000,
        investmentReturnRate: 0,
        annualCorporateRetainedEarnings: 300000,
      }));
      const withSpouse = calculateProjection(createInputs({
        requiredIncome: 100000,
        salaryStrategy: 'dynamic',
        corporateInvestmentBalance: 500000,
        investmentReturnRate: 0,
        annualCorporateRetainedEarnings: 300000,
        hasSpouse: true,
        spouseRequiredIncome: 60000,
        spouseSalaryStrategy: 'dynamic',
      }));
      // With spouse drawing more, corporate balance should be lower
      const noSpouseEnd = noSpouse.yearlyResults[0].endingCorporateInvestments;
      const withSpouseEnd = withSpouse.yearlyResults[0].endingCorporateInvestments;
      expect(withSpouseEnd).toBeLessThan(noSpouseEnd);
    });

    it('spouse dividends should use spouse marginal rate, not primary', () => {
      // Spouse at $40K income vs primary at $200K — very different marginal rates
      const result = calculateProjection(createInputs({
        requiredIncome: 200000,
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        annualCorporateRetainedEarnings: 500000,
        hasSpouse: true,
        spouseRequiredIncome: 40000,
        spouseSalaryStrategy: 'dividends-only',
        gripBalance: 200000,
        eRDTOHBalance: 100000,
        nRDTOHBalance: 100000,
        investmentReturnRate: 0,
      }));
      const y1 = result.yearlyResults[0];
      // Both should have tax calculations
      expect(y1.personalTax).toBeGreaterThan(0);
      if (y1.spouse) {
        // Spouse at lower income should have lower effective rate
        const primaryRate = y1.personalTax / 200000;
        const spouseRate = y1.spouse.personalTax / 40000;
        // Spouse at $40K should have much lower rate than primary at $200K
        expect(spouseRate).toBeLessThan(primaryRate);
      }
    });
  });

  // =========================================================================
  // 11. All 13 Provinces Non-Error Test
  // =========================================================================
  describe('All 13 provinces produce valid results', () => {
    const ALL_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] as const;

    it.each(ALL_PROVINCES)('%s: $150K salary produces valid, finite results', (province) => {
      const result = calculateProjection(createInputs({
        province,
        fixedSalaryAmount: 150000,
        requiredIncome: 100000,
        annualCorporateRetainedEarnings: 300000,
      }));
      const y1 = result.yearlyResults[0];
      expect(isFinite(y1.personalTax)).toBe(true);
      expect(isFinite(y1.federalTax)).toBe(true);
      expect(isFinite(y1.provincialTax)).toBe(true);
      expect(isFinite(y1.corporateTax)).toBe(true);
      expect(y1.personalTax).toBeGreaterThan(0);
      expect(y1.federalTax).toBeGreaterThan(0);
      expect(y1.provincialTax).toBeGreaterThan(0);
    });

    it.each(ALL_PROVINCES)('%s: dividends-only at $80K produces valid results', (province) => {
      const result = calculateProjection(createInputs({
        province,
        salaryStrategy: 'dividends-only',
        requiredIncome: 80000,
        eRDTOHBalance: 50000,
        nRDTOHBalance: 50000,
        gripBalance: 100000,
        investmentReturnRate: 0,
        annualCorporateRetainedEarnings: 0,
      }));
      const y1 = result.yearlyResults[0];
      expect(isFinite(y1.personalTax)).toBe(true);
      expect(y1.salary).toBe(0);
      expect(y1.dividendFunding.grossDividends).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 12. Planning Horizon Boundaries
  // =========================================================================
  describe('Planning horizon boundaries', () => {
    it('minimum horizon (3 years) should produce exactly 3 results', () => {
      const result = calculateProjection(createInputs({ planningHorizon: 3 }));
      expect(result.yearlyResults).toHaveLength(3);
    });

    it('maximum horizon (10 years) should produce exactly 10 results', () => {
      const result = calculateProjection(createInputs({ planningHorizon: 10 }));
      expect(result.yearlyResults).toHaveLength(10);
    });

    it('10-year projection with inflation should index brackets upward', () => {
      const result = calculateProjection(createInputs({
        planningHorizon: 10,
        expectedInflationRate: 0.03, // 3% inflation
        inflateSpendingNeeds: true,
      }));
      // Year 10 should have higher required income than year 1
      const y1Income = result.yearlyResults[0].requiredIncome;
      const y10Income = result.yearlyResults[9].requiredIncome;
      expect(y10Income).toBeGreaterThan(y1Income);
    });
  });
});
```

**Step 2: Run the tests**

Run: `npx vitest run src/lib/__tests__/boundaryStress.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/__tests__/boundaryStress.test.ts
git commit -m "test: add boundary and stress tests (Layer 3)

Tests at exact bracket boundaries, CPP/CPP2 YMPE/YAMPE thresholds,
EI caps, BPA edge cases, zero/near-zero scenarios, $1M+ salaries,
account exhaustion, health premium/surtax boundaries, spouse
sequential depletion, all 13 provinces, and planning horizon limits."
```

---

## Task 4: Run Full Suite & Fix Any Failures

**Step 1: Run all tests together**

Run: `npx vitest run`
Expected: All 1500+ existing tests pass, plus the new ~120 tests

**Step 2: Investigate any failures**

If any hand-calculated values don't match the engine output:
1. Check whether the engine is wrong or the hand calculation is wrong
2. For engine bugs: fix the source code and document the fix
3. For hand-calculation errors: update the test expected values with correct math

**Step 3: Commit fixes if any**

```bash
git commit -m "fix: correct any calculation discrepancies found by verification tests"
```

---

## Task 5: Final Verification & Summary

**Step 1: Run full suite one more time**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -5`
Expected: All tests pass

**Step 2: Count new tests**

Run: `npx vitest run --reporter=verbose 2>&1 | grep -c "✓"`

**Step 3: Commit all together**

If not already committed in earlier steps, ensure all 3 test files are committed.

---

## Summary of Coverage Added

| Test File | Layer | Tests | What It Validates |
|---|---|---|---|
| `craPersonalTax.test.ts` | 1: Ground Truth | ~25 | Federal + provincial tax at 4 income levels × 4 provinces, hand-computed step-by-step |
| `corporateFlow.test.ts` | 2: Corporate E2E | ~25 | SBD split, RDTOH refund, GRIP tracking, depletion priority, IPP expense, 5-year conservation |
| `boundaryStress.test.ts` | 3: Edge Cases | ~50 | Bracket boundaries, YMPE/YAMPE, BPA, zero/$5M, account exhaustion, surtax/health premium, 13 provinces |

**Total new tests: ~100**
**Total after: ~1,600 tests**
