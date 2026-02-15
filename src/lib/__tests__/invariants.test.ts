/**
 * Mathematical Invariants Test Suite
 *
 * Verifies mathematical invariants that must hold regardless of inputs.
 * These tests ensure the calculator never produces logically impossible results
 * such as negative taxes, rates exceeding 100%, or violated monotonicity properties.
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

const ALL_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] as const;

function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    province: 'ON',
    requiredIncome: 100000,
    planningHorizon: 5,
    startingYear: 2026,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: true,
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
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

describe('Mathematical Invariants', () => {
  // ---------------------------------------------------------------------------
  // 1. Non-negativity invariants
  // ---------------------------------------------------------------------------
  describe('Non-negativity invariants', () => {
    // All 13 provinces with dynamic strategy at $100K
    const dynamicCases = ALL_PROVINCES.map(
      (p) => [p, 'dynamic', 100000, {}] as const
    );

    // Additional fixed strategy cases for key provinces
    const fixedCases = [
      ['ON', 'fixed', 75000, { fixedSalaryAmount: 80000 }],
      ['QC', 'fixed', 150000, { fixedSalaryAmount: 80000 }],
      ['AB', 'fixed', 100000, { fixedSalaryAmount: 80000 }],
      ['BC', 'fixed', 100000, { fixedSalaryAmount: 80000 }],
    ] as const;

    // Additional dividends-only cases for key provinces
    const dividendsCases = [
      ['AB', 'dividends-only', 75000, { eRDTOHBalance: 100000, nRDTOHBalance: 100000 }],
      ['BC', 'dividends-only', 150000, { eRDTOHBalance: 100000, nRDTOHBalance: 100000 }],
      ['ON', 'dividends-only', 100000, { eRDTOHBalance: 100000, nRDTOHBalance: 100000 }],
      ['QC', 'dividends-only', 100000, { eRDTOHBalance: 100000, nRDTOHBalance: 100000 }],
    ] as const;

    const allTestCases = [
      ...dynamicCases.map(([p, s, i, o]) => ({
        province: p,
        strategy: s,
        income: i,
        extras: o,
        label: `${p} / ${s} / $${i}`,
      })),
      ...fixedCases.map(([p, s, i, o]) => ({
        province: p,
        strategy: s,
        income: i,
        extras: o,
        label: `${p} / ${s} / $${i}`,
      })),
      ...dividendsCases.map(([p, s, i, o]) => ({
        province: p,
        strategy: s,
        income: i,
        extras: o,
        label: `${p} / ${s} / $${i}`,
      })),
    ];

    it.each(allTestCases)(
      'afterTaxIncome >= 0 for every year ($label)',
      ({ province, strategy, income, extras }) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: strategy as UserInputs['salaryStrategy'],
          requiredIncome: income,
          ...extras,
        });
        const result = calculateProjection(inputs);

        for (const yr of result.yearlyResults) {
          expect(yr.afterTaxIncome).toBeGreaterThanOrEqual(0);
        }
      }
    );

    it.each(allTestCases)(
      'personalTax >= 0 for every year ($label)',
      ({ province, strategy, income, extras }) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: strategy as UserInputs['salaryStrategy'],
          requiredIncome: income,
          ...extras,
        });
        const result = calculateProjection(inputs);

        for (const yr of result.yearlyResults) {
          expect(yr.personalTax).toBeGreaterThanOrEqual(0);
        }
      }
    );

    it.each(allTestCases)(
      'corporateTax >= 0 for every year ($label)',
      ({ province, strategy, income, extras }) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: strategy as UserInputs['salaryStrategy'],
          requiredIncome: income,
          ...extras,
        });
        const result = calculateProjection(inputs);

        for (const yr of result.yearlyResults) {
          expect(yr.corporateTax).toBeGreaterThanOrEqual(0);
        }
      }
    );

    it.each(allTestCases)(
      'payroll deductions >= 0 for every year ($label)',
      ({ province, strategy, income, extras }) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: strategy as UserInputs['salaryStrategy'],
          requiredIncome: income,
          ...extras,
        });
        const result = calculateProjection(inputs);

        for (const yr of result.yearlyResults) {
          expect(yr.cpp).toBeGreaterThanOrEqual(0);
          expect(yr.cpp2).toBeGreaterThanOrEqual(0);
          expect(yr.ei).toBeGreaterThanOrEqual(0);
          expect(yr.qpip).toBeGreaterThanOrEqual(0);
        }
      }
    );

    it.each(allTestCases)(
      'notional accounts >= 0 for every year ($label)',
      ({ province, strategy, income, extras }) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: strategy as UserInputs['salaryStrategy'],
          requiredIncome: income,
          ...extras,
        });
        const result = calculateProjection(inputs);

        // Use a small epsilon to account for floating point rounding (e.g. -4.5e-13)
        const EPSILON = -1e-6;
        for (const yr of result.yearlyResults) {
          expect(yr.notionalAccounts.CDA).toBeGreaterThanOrEqual(EPSILON);
          expect(yr.notionalAccounts.eRDTOH).toBeGreaterThanOrEqual(EPSILON);
          expect(yr.notionalAccounts.nRDTOH).toBeGreaterThanOrEqual(EPSILON);
          expect(yr.notionalAccounts.GRIP).toBeGreaterThanOrEqual(EPSILON);
          // Note: corporateInvestments can go negative when withdrawals exceed the pool.
          // This is tested separately below with appropriate scenarios.
        }
      }
    );

    it('corporateInvestments stays non-negative with sufficient balance and retained earnings', () => {
      // With $500K starting balance, $100K annual retained earnings, and only $30K withdrawal,
      // the corporate investment pool should never go negative
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 30000,
        corporateInvestmentBalance: 500000,
        annualCorporateRetainedEarnings: 100000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(yr.notionalAccounts.corporateInvestments).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Tax rate bounds
  // ---------------------------------------------------------------------------
  describe('Tax rate bounds', () => {
    const rateProvinces = ['ON', 'QC', 'AB', 'BC'] as const;

    it.each(rateProvinces)(
      'effectiveTaxRate within [0, 0.65] for %s at $100K dynamic',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        expect(result.effectiveTaxRate).toBeGreaterThanOrEqual(0);
        expect(result.effectiveTaxRate).toBeLessThanOrEqual(0.65);
      }
    );

    it.each(rateProvinces)(
      'effectiveIntegratedRate within [0, 1] for every year for %s',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        for (const yr of result.yearlyResults) {
          expect(yr.effectiveIntegratedRate).toBeGreaterThanOrEqual(0);
          expect(yr.effectiveIntegratedRate).toBeLessThanOrEqual(1);
        }
      }
    );

    it.each(rateProvinces)(
      'effectiveCompensationRate <= 0.60 for %s at $100K dynamic',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        expect(result.effectiveCompensationRate).toBeLessThanOrEqual(0.60);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Monotonicity: higher income => higher total tax
  // ---------------------------------------------------------------------------
  describe('Monotonicity: higher income => higher total tax', () => {
    const incomes = [30000, 75000, 150000, 300000] as const;

    it('totalTax increases monotonically with income for ON dynamic', () => {
      const results = incomes.map((income) =>
        calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'dynamic',
            requiredIncome: income,
          })
        )
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i].totalTax).toBeGreaterThanOrEqual(results[i - 1].totalTax);
      }
    });

    it('year 1 personalTax increases monotonically with income for ON dynamic', () => {
      const results = incomes.map((income) =>
        calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'dynamic',
            requiredIncome: income,
          })
        )
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i].yearlyResults[0].personalTax).toBeGreaterThanOrEqual(
          results[i - 1].yearlyResults[0].personalTax
        );
      }
    });

    it('totalTax increases monotonically with income for QC dynamic', () => {
      const results = incomes.map((income) =>
        calculateProjection(
          createInputs({
            province: 'QC',
            salaryStrategy: 'dynamic',
            requiredIncome: income,
          })
        )
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i].totalTax).toBeGreaterThanOrEqual(results[i - 1].totalTax);
      }
    });

    it('totalTax increases monotonically with income for AB dynamic', () => {
      const results = incomes.map((income) =>
        calculateProjection(
          createInputs({
            province: 'AB',
            salaryStrategy: 'dynamic',
            requiredIncome: income,
          })
        )
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i].totalTax).toBeGreaterThanOrEqual(results[i - 1].totalTax);
      }
    });

    it('totalTax increases monotonically with income for BC dynamic', () => {
      const results = incomes.map((income) =>
        calculateProjection(
          createInputs({
            province: 'BC',
            salaryStrategy: 'dynamic',
            requiredIncome: income,
          })
        )
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i].totalTax).toBeGreaterThanOrEqual(results[i - 1].totalTax);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Province ordering for same income
  // ---------------------------------------------------------------------------
  describe('Province ordering for same income', () => {
    it('Alberta effectiveTaxRate < Ontario effectiveTaxRate at $100K dynamic', () => {
      const abResult = calculateProjection(
        createInputs({ province: 'AB', salaryStrategy: 'dynamic', requiredIncome: 100000 })
      );
      const onResult = calculateProjection(
        createInputs({ province: 'ON', salaryStrategy: 'dynamic', requiredIncome: 100000 })
      );

      expect(abResult.effectiveTaxRate).toBeLessThan(onResult.effectiveTaxRate);
    });

    it.each(ALL_PROVINCES)(
      'province %s produces a result without crashing at $100K dynamic',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        expect(result).toBeDefined();
        expect(result.yearlyResults.length).toBe(5);
        expect(result.totalCompensation).toBeGreaterThan(0);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 5. CPP/EI caps
  // ---------------------------------------------------------------------------
  describe('CPP/EI caps', () => {
    it('CPP is capped for ON with salary $200K', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const year1 = result.yearlyResults[0];

      // 2026 CPP max employee contribution is ~$4,230.45; use generous bound of $4,700
      expect(year1.cpp).toBeLessThanOrEqual(4700);
      expect(year1.cpp).toBeGreaterThan(0);
    });

    it('CPP2 is capped for ON with salary $200K', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const year1 = result.yearlyResults[0];

      // 2025 CPP2 max employee contribution is ~$396; use generous bound of $1,000
      expect(year1.cpp2).toBeLessThanOrEqual(1000);
    });

    it('EI is capped for ON with salary $200K', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const year1 = result.yearlyResults[0];

      // 2025 EI max employee contribution is ~$1,077.48; use generous bound of $1,200
      expect(year1.ei).toBeLessThanOrEqual(1200);
      expect(year1.ei).toBeGreaterThan(0);
    });

    it('QPIP > 0 for QC with salary $200K', () => {
      const inputs = createInputs({
        province: 'QC',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const year1 = result.yearlyResults[0];

      expect(year1.qpip).toBeGreaterThan(0);
    });

    it('QPP (cpp field) is capped for QC with salary $200K', () => {
      const inputs = createInputs({
        province: 'QC',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const year1 = result.yearlyResults[0];

      // QPP max is similar to CPP; use generous bound of $4,700
      expect(year1.cpp).toBeLessThanOrEqual(4700);
      expect(year1.cpp).toBeGreaterThan(0);
    });

    it('QPIP is 0 outside Quebec', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 200000,
        requiredIncome: 80000,
      });
      const result = calculateProjection(inputs);
      const year1 = result.yearlyResults[0];

      expect(year1.qpip).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Notional account conservation
  // ---------------------------------------------------------------------------
  describe('Notional account conservation', () => {
    const conservationInputs = createInputs({
      province: 'ON',
      salaryStrategy: 'dynamic',
      requiredIncome: 100000,
      cdaBalance: 100000,
      eRDTOHBalance: 50000,
      nRDTOHBalance: 30000,
      gripBalance: 80000,
    });

    it('CDA never goes negative over 5 years', () => {
      const result = calculateProjection(conservationInputs);

      for (const yr of result.yearlyResults) {
        expect(yr.notionalAccounts.CDA).toBeGreaterThanOrEqual(0);
      }
    });

    it('eRDTOH never goes negative over 5 years', () => {
      const result = calculateProjection(conservationInputs);

      for (const yr of result.yearlyResults) {
        expect(yr.notionalAccounts.eRDTOH).toBeGreaterThanOrEqual(0);
      }
    });

    it('nRDTOH never goes negative over 5 years', () => {
      const result = calculateProjection(conservationInputs);

      for (const yr of result.yearlyResults) {
        expect(yr.notionalAccounts.nRDTOH).toBeGreaterThanOrEqual(0);
      }
    });

    it('GRIP never goes negative over 5 years', () => {
      const result = calculateProjection(conservationInputs);

      for (const yr of result.yearlyResults) {
        expect(yr.notionalAccounts.GRIP).toBeGreaterThanOrEqual(0);
      }
    });

    it('corporateInvestments never goes negative over 5 years', () => {
      const result = calculateProjection(conservationInputs);

      for (const yr of result.yearlyResults) {
        expect(yr.notionalAccounts.corporateInvestments).toBeGreaterThanOrEqual(0);
      }
    });

    it('sum of capitalDividends over all years <= initial CDA', () => {
      const result = calculateProjection(conservationInputs);

      let totalCapitalDividends = 0;
      for (const yr of result.yearlyResults) {
        totalCapitalDividends += yr.dividends.capitalDividends;
      }

      // Capital dividends paid should not exceed starting CDA plus any CDA increases from investment returns
      // The strict invariant: total capital dividends paid <= initial CDA + sum of CDA increases
      let totalCDAIncrease = 0;
      for (const yr of result.yearlyResults) {
        totalCDAIncrease += yr.investmentReturns.CDAIncrease;
      }

      expect(totalCapitalDividends).toBeLessThanOrEqual(
        conservationInputs.cdaBalance + totalCDAIncrease + 1 // +1 for rounding
      );
    });

    it('CDA balance tracks: initial + increases - capital dividends paid', () => {
      const result = calculateProjection(conservationInputs);

      let expectedCDA = conservationInputs.cdaBalance;
      for (const yr of result.yearlyResults) {
        // CDA increases from investment returns, decreases from capital dividends
        expectedCDA += yr.investmentReturns.CDAIncrease;
        expectedCDA -= yr.dividends.capitalDividends;

        // Allow small rounding differences
        expect(yr.notionalAccounts.CDA).toBeCloseTo(Math.max(0, expectedCDA), 0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Summary consistency
  // ---------------------------------------------------------------------------
  describe('Summary consistency', () => {
    const consistencyProvinces = ['ON', 'QC'] as const;

    it.each(consistencyProvinces)(
      'totalCompensation = totalSalary + totalDividends for %s at $100K',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        expect(result.totalCompensation).toBeCloseTo(
          result.totalSalary + result.totalDividends,
          2
        );
      }
    );

    it.each(consistencyProvinces)(
      'totalTax = totalPersonalTax + totalCorporateTax for %s at $100K',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        expect(result.totalTax).toBeCloseTo(
          result.totalPersonalTax + result.totalCorporateTax,
          2
        );
      }
    );

    it.each(consistencyProvinces)(
      'effectiveTaxRate = totalTax / totalCompensation (within 0.001) for %s',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
        });
        const result = calculateProjection(inputs);

        if (result.totalCompensation > 0) {
          const expectedRate = result.totalTax / result.totalCompensation;
          expect(result.effectiveTaxRate).toBeCloseTo(expectedRate, 3);
        }
      }
    );

    it.each(consistencyProvinces)(
      'yearlyResults.length === planningHorizon for %s',
      (province) => {
        const inputs = createInputs({
          province: province as UserInputs['province'],
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
          planningHorizon: 5,
        });
        const result = calculateProjection(inputs);

        expect(result.yearlyResults.length).toBe(5);
      }
    );

    it('totalSalary equals sum of yearly salaries', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      const sumSalary = result.yearlyResults.reduce((sum, yr) => sum + yr.salary, 0);
      expect(result.totalSalary).toBeCloseTo(sumSalary, 2);
    });

    it('totalDividends equals sum of yearly grossDividends', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      const sumDividends = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.dividends.grossDividends,
        0
      );
      expect(result.totalDividends).toBeCloseTo(sumDividends, 2);
    });

    it('totalPersonalTax equals sum of yearly personalTax', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      const sumPersonalTax = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.personalTax,
        0
      );
      expect(result.totalPersonalTax).toBeCloseTo(sumPersonalTax, 2);
    });

    it('totalCorporateTax equals sum of yearly corporateTax', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      const sumCorpTax = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.corporateTax,
        0
      );
      expect(result.totalCorporateTax).toBeCloseTo(sumCorpTax, 2);
    });

    it('totalCorporateTaxOnActive equals sum of yearly corporateTaxOnActive', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      const sum = result.yearlyResults.reduce(
        (s, yr) => s + yr.corporateTaxOnActive,
        0
      );
      expect(result.totalCorporateTaxOnActive).toBeCloseTo(sum, 2);
    });

    it('totalCorporateTaxOnPassive equals sum of yearly corporateTaxOnPassive', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      const sum = result.yearlyResults.reduce(
        (s, yr) => s + yr.corporateTaxOnPassive,
        0
      );
      expect(result.totalCorporateTaxOnPassive).toBeCloseTo(sum, 2);
    });

    it('totalRdtohRefund equals sum of yearly rdtohRefundReceived', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        eRDTOHBalance: 50000,
        nRDTOHBalance: 30000,
      });
      const result = calculateProjection(inputs);

      const sum = result.yearlyResults.reduce(
        (s, yr) => s + yr.rdtohRefundReceived,
        0
      );
      expect(result.totalRdtohRefund).toBeCloseTo(sum, 2);
    });

    it('averageAnnualIncome = totalCompensation / planningHorizon', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        planningHorizon: 5,
      });
      const result = calculateProjection(inputs);

      expect(result.averageAnnualIncome).toBeCloseTo(
        result.totalCompensation / 5,
        2
      );
    });

    it('yearly totalTax = personalTax + corporateTax + cpp + cpp2 + ei + qpip', () => {
      const inputs = createInputs({
        province: 'QC',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        const expectedTotal =
          yr.personalTax + yr.corporateTax + yr.cpp + yr.cpp2 + yr.ei + yr.qpip;
        expect(yr.totalTax).toBeCloseTo(expectedTotal, 2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 8. RRSP room generation
  // ---------------------------------------------------------------------------
  describe('RRSP room generation', () => {
    it('rrspRoomGenerated = salary * 0.18 for each year with fixed $100K salary', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
        requiredIncome: 60000,
        planningHorizon: 5,
        inflateSpendingNeeds: false,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        // RRSP room = salary * 18%, capped at dollar limit (~$32,490 in 2025)
        // For $100K salary, 18% = $18,000 which is under the limit
        const expectedRoom = yr.salary * 0.18;
        expect(yr.rrspRoomGenerated).toBeCloseTo(expectedRoom, 0);
      }
    });

    it('totalRRSPRoomGenerated equals sum of yearly rrspRoomGenerated', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 100000,
        requiredIncome: 60000,
        planningHorizon: 5,
        inflateSpendingNeeds: false,
      });
      const result = calculateProjection(inputs);

      const sumRoom = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.rrspRoomGenerated,
        0
      );
      expect(result.totalRRSPRoomGenerated).toBeCloseTo(sumRoom, 2);
    });

    it('rrspRoomGenerated is 0 when salary is 0 (dividends-only)', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dividends-only',
        requiredIncome: 100000,
        eRDTOHBalance: 100000,
        nRDTOHBalance: 100000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(yr.rrspRoomGenerated).toBe(0);
      }
    });

    it('rrspRoomGenerated = salary * rrspRate for high salaries (room is uncapped)', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'fixed',
        fixedSalaryAmount: 300000,
        requiredIncome: 100000,
        planningHorizon: 5,
        inflateSpendingNeeds: false,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        // Room generated = salary * 18% (uncapped); cap applies at contribution time
        const expectedRoom = yr.salary * 0.18;
        expect(yr.rrspRoomGenerated).toBeCloseTo(expectedRoom, 0);
        expect(yr.rrspRoomGenerated).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Additional invariants for broader coverage
  // ---------------------------------------------------------------------------
  describe('Investment return invariants', () => {
    it('investmentReturns.totalReturn is consistent with sub-components', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        const sumComponents =
          yr.investmentReturns.canadianDividends +
          yr.investmentReturns.foreignIncome +
          yr.investmentReturns.realizedCapitalGain +
          yr.investmentReturns.unrealizedCapitalGain;
        expect(yr.investmentReturns.totalReturn).toBeCloseTo(sumComponents, 2);
      }
    });

    it('investment return sub-components >= 0', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        investmentReturnRate: 0.06,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(yr.investmentReturns.canadianDividends).toBeGreaterThanOrEqual(0);
        expect(yr.investmentReturns.foreignIncome).toBeGreaterThanOrEqual(0);
        expect(yr.investmentReturns.realizedCapitalGain).toBeGreaterThanOrEqual(0);
        expect(yr.investmentReturns.unrealizedCapitalGain).toBeGreaterThanOrEqual(0);
        expect(yr.investmentReturns.CDAIncrease).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Passive income grind invariants', () => {
    it('reducedSBDLimit is in [0, 500000]', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        corporateInvestmentBalance: 2000000,
        investmentReturnRate: 0.06,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(yr.passiveIncomeGrind.reducedSBDLimit).toBeGreaterThanOrEqual(0);
        expect(yr.passiveIncomeGrind.reducedSBDLimit).toBeLessThanOrEqual(500000);
      }
    });

    it('sbdReduction >= 0 and additionalTaxFromGrind >= 0', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        corporateInvestmentBalance: 2000000,
        investmentReturnRate: 0.06,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(yr.passiveIncomeGrind.sbdReduction).toBeGreaterThanOrEqual(0);
        expect(yr.passiveIncomeGrind.additionalTaxFromGrind).toBeGreaterThanOrEqual(0);
      }
    });

    it('isFullyGrounded is boolean', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(typeof yr.passiveIncomeGrind.isFullyGrounded).toBe('boolean');
      }
    });
  });

  describe('Dividend funding invariants', () => {
    it('grossDividends = capitalDividends + eligibleDividends + nonEligibleDividends', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        cdaBalance: 50000,
        eRDTOHBalance: 30000,
        nRDTOHBalance: 20000,
        gripBalance: 60000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        // grossDividends should be sum of the three dividend types
        // (regularDividends is a subset category, not additive)
        const sumDivTypes =
          yr.dividends.capitalDividends +
          yr.dividends.eligibleDividends +
          yr.dividends.nonEligibleDividends;
        expect(yr.dividends.grossDividends).toBeCloseTo(sumDivTypes, 2);
      }
    });

    it('all dividend components >= 0', () => {
      const inputs = createInputs({
        province: 'ON',
        salaryStrategy: 'dynamic',
        requiredIncome: 100000,
        cdaBalance: 50000,
        eRDTOHBalance: 30000,
        nRDTOHBalance: 20000,
        gripBalance: 60000,
      });
      const result = calculateProjection(inputs);

      for (const yr of result.yearlyResults) {
        expect(yr.dividends.capitalDividends).toBeGreaterThanOrEqual(0);
        expect(yr.dividends.eligibleDividends).toBeGreaterThanOrEqual(0);
        expect(yr.dividends.nonEligibleDividends).toBeGreaterThanOrEqual(0);
        expect(yr.dividends.regularDividends).toBeGreaterThanOrEqual(0);
        expect(yr.dividends.grossDividends).toBeGreaterThanOrEqual(0);
        expect(yr.dividends.afterTaxIncome).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Planning horizon invariants', () => {
    const horizons = [3, 5, 7, 10] as const;

    it.each(horizons)(
      'yearlyResults.length matches planningHorizon = %i',
      (horizon) => {
        const inputs = createInputs({
          province: 'ON',
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
          planningHorizon: horizon as UserInputs['planningHorizon'],
        });
        const result = calculateProjection(inputs);

        expect(result.yearlyResults.length).toBe(horizon);
      }
    );

    it.each(horizons)(
      'year numbers are sequential 1..%i',
      (horizon) => {
        const inputs = createInputs({
          province: 'ON',
          salaryStrategy: 'dynamic',
          requiredIncome: 100000,
          planningHorizon: horizon as UserInputs['planningHorizon'],
        });
        const result = calculateProjection(inputs);

        for (let i = 0; i < horizon; i++) {
          expect(result.yearlyResults[i].year).toBe(i + 1);
        }
      }
    );
  });
});
