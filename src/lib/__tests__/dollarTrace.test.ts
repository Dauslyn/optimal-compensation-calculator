/**
 * Dollar Trace Tests
 *
 * Traces every dollar through the calculation pipeline to verify that
 * accounting identities hold across all provinces and strategies.
 */

import { describe, it, expect } from 'vitest';
import { calculateProjection } from '../calculator';
import type { UserInputs } from '../types';

// Helper to create valid default inputs
// Note: planningHorizon is typed as 3..10 in UserInputs,
// so we use the minimum (3) and pick yearlyResults[0] for single-year tracing.
function createInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    province: 'ON',
    requiredIncome: 100000,
    planningHorizon: 3,
    startingYear: 2026,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: false, // No inflation for clean dollar tracing
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

const ALL_PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
] as const;

const MAJOR_PROVINCES = ['ON', 'QC', 'AB', 'BC'] as const;

describe('Dollar Trace Tests', () => {
  // ---------------------------------------------------------------
  // 1. Accounting identity per province
  // ---------------------------------------------------------------
  describe('Accounting identity per province', () => {
    it.each(ALL_PROVINCES)(
      '%s: totalTax = personalTax + corporateTax + cpp + cpp2 + ei + qpip',
      (province) => {
        const result = calculateProjection(createInputs({ province }));
        const year1 = result.yearlyResults[0];

        const expectedTotalTax =
          year1.personalTax +
          year1.corporateTax +
          year1.cpp +
          year1.cpp2 +
          year1.ei +
          year1.qpip;

        expect(year1.totalTax).toBeCloseTo(expectedTotalTax, 2);
      }
    );

    it.each(ALL_PROVINCES)(
      '%s: afterTaxIncome = salary + grossDividends - personalTax - cpp - cpp2 - ei - qpip',
      (province) => {
        const result = calculateProjection(createInputs({ province }));
        const year1 = result.yearlyResults[0];

        const grossDividends =
          year1.dividends.capitalDividends +
          year1.dividends.eligibleDividends +
          year1.dividends.nonEligibleDividends;

        const expectedAfterTax =
          year1.salary +
          grossDividends -
          year1.personalTax -
          year1.cpp -
          year1.cpp2 -
          year1.ei -
          year1.qpip;

        expect(Math.abs(year1.afterTaxIncome - expectedAfterTax)).toBeLessThan(2);
      }
    );
  });

  // ---------------------------------------------------------------
  // 2. Salary-only dollar trace
  // ---------------------------------------------------------------
  describe('Salary-only dollar trace', () => {
    it.each(MAJOR_PROVINCES)(
      '%s: fixed salary of 100000 flows correctly',
      (province) => {
        const result = calculateProjection(
          createInputs({
            province,
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
          })
        );
        const year1 = result.yearlyResults[0];

        // Salary should be exactly 100000
        expect(year1.salary).toBe(100000);

        // All dividend types should be 0 (salary covers everything or remainder is dividends,
        // but with a high fixed salary, any dividends should be minimal or 0)
        // Note: If required income < salary after-tax, no dividends are needed.
        // With 100k salary in ON, after-tax is ~73k which < 100k required, so dividends may be needed.
        // We relax this: if salary strategy is fixed at 100k, the salary portion is exactly 100k.
        expect(year1.salary).toBe(100000);

        // Payroll deductions should be positive for salary earners
        expect(year1.cpp).toBeGreaterThan(0);
        expect(year1.ei).toBeGreaterThan(0);

        // Personal tax on salary should be positive
        expect(year1.personalTax).toBeGreaterThan(0);

        // After-tax identity check:
        // afterTaxIncome = salary + grossDividends - personalTax - cpp - cpp2 - ei - qpip
        const grossDividends =
          year1.dividends.capitalDividends +
          year1.dividends.eligibleDividends +
          year1.dividends.nonEligibleDividends;
        const expectedAfterTax =
          year1.salary +
          grossDividends -
          year1.personalTax -
          year1.cpp -
          year1.cpp2 -
          year1.ei -
          year1.qpip;

        expect(Math.abs(year1.afterTaxIncome - expectedAfterTax)).toBeLessThan(2);
      }
    );

    it.each(MAJOR_PROVINCES)(
      '%s: salary-only (no dividends needed when salary covers required income)',
      (province) => {
        // Use a very low required income so salary fully covers it
        const result = calculateProjection(
          createInputs({
            province,
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
            requiredIncome: 30000, // Low enough that salary after-tax covers it
          })
        );
        const year1 = result.yearlyResults[0];

        // When salary after-tax exceeds required income, no dividends should be needed
        expect(year1.dividends.capitalDividends).toBe(0);
        expect(year1.dividends.eligibleDividends).toBe(0);
        expect(year1.dividends.nonEligibleDividends).toBe(0);
      }
    );
  });

  // ---------------------------------------------------------------
  // 3. Dividend-only dollar trace
  // ---------------------------------------------------------------
  describe('Dividend-only dollar trace', () => {
    it.each(MAJOR_PROVINCES)(
      '%s: dividends-only strategy has zero salary and payroll',
      (province) => {
        const result = calculateProjection(
          createInputs({
            province,
            salaryStrategy: 'dividends-only',
            eRDTOHBalance: 100000,
            nRDTOHBalance: 100000,
          })
        );
        const year1 = result.yearlyResults[0];

        // No salary
        expect(year1.salary).toBe(0);

        // No payroll deductions (CPP and EI require salary)
        expect(year1.cpp).toBe(0);
        expect(year1.ei).toBe(0);

        // Dividends should be positive (the only source of personal income)
        expect(year1.dividends.grossDividends).toBeGreaterThan(0);

        // Personal tax on dividends can be 0 if dividend tax credits cover it
        expect(year1.personalTax).toBeGreaterThanOrEqual(0);

        // After-tax identity: with no salary or payroll, it simplifies to
        // afterTaxIncome = grossDividends - personalTax
        const expectedAfterTax = year1.dividends.grossDividends - year1.personalTax;
        expect(Math.abs(year1.afterTaxIncome - expectedAfterTax)).toBeLessThan(2);
      }
    );
  });

  // ---------------------------------------------------------------
  // 4. Dynamic strategy dollar trace
  // ---------------------------------------------------------------
  describe('Dynamic strategy dollar trace', () => {
    it.each(['ON', 'AB'] as const)(
      '%s: capital dividends depleted from CDA first',
      (province) => {
        const initialCDA = 50000;
        const result = calculateProjection(
          createInputs({
            province,
            salaryStrategy: 'dynamic',
            cdaBalance: initialCDA,
            eRDTOHBalance: 30000,
          })
        );
        const year1 = result.yearlyResults[0];

        // CDA should be used first (capital dividends are tax-free)
        expect(year1.dividends.capitalDividends).toBeGreaterThan(0);

        // CDA balance should decrease by the capital dividends paid
        // The ending CDA includes any CDA increases from investment returns
        const investmentCDAIncrease = year1.investmentReturns.CDAIncrease;
        const expectedCDA = initialCDA + investmentCDAIncrease - year1.dividends.capitalDividends;
        expect(year1.notionalAccounts.CDA).toBeCloseTo(expectedCDA, 0);
      }
    );

    it.each(['ON', 'AB'] as const)(
      '%s: eRDTOH decreases when eligible dividends paid',
      (province) => {
        const initialERDTOH = 30000;
        const result = calculateProjection(
          createInputs({
            province,
            salaryStrategy: 'dynamic',
            cdaBalance: 0, // No CDA, so eRDTOH is used next
            eRDTOHBalance: initialERDTOH,
            nRDTOHBalance: 0,
            gripBalance: 0,
          })
        );
        const year1 = result.yearlyResults[0];

        if (year1.dividends.eligibleDividends > 0) {
          // eRDTOH should decrease due to refund
          const eRDTOHIncrease = year1.investmentReturns.eRDTOHIncrease;
          expect(year1.notionalAccounts.eRDTOH).toBeLessThan(
            initialERDTOH + eRDTOHIncrease
          );
        }
      }
    );
  });

  // ---------------------------------------------------------------
  // 5. Tax component consistency
  // ---------------------------------------------------------------
  describe('Tax component consistency', () => {
    it.each(MAJOR_PROVINCES)(
      '%s: effectiveIntegratedRate = (personalTax + corporateTaxOnActive) / compensation',
      (province) => {
        const result = calculateProjection(createInputs({ province }));
        const year1 = result.yearlyResults[0];

        const grossDividends =
          year1.dividends.capitalDividends +
          year1.dividends.eligibleDividends +
          year1.dividends.nonEligibleDividends;
        const compensation = year1.salary + grossDividends;

        if (compensation > 0) {
          const expectedRate =
            (year1.personalTax + year1.corporateTaxOnActive) / compensation;
          expect(Math.abs(year1.effectiveIntegratedRate - expectedRate)).toBeLessThan(0.001);
        }
      }
    );

    it.each(MAJOR_PROVINCES)(
      '%s: corporateTax = corporateTaxOnActive + corporateTaxOnPassive',
      (province) => {
        const result = calculateProjection(createInputs({ province }));
        const year1 = result.yearlyResults[0];

        const expectedCorpTax = year1.corporateTaxOnActive + year1.corporateTaxOnPassive;
        expect(Math.abs(year1.corporateTax - expectedCorpTax)).toBeLessThan(2);
      }
    );
  });

  // ---------------------------------------------------------------
  // 6. Payroll deductions trace
  // ---------------------------------------------------------------
  describe('Payroll deductions trace', () => {
    describe('Ontario (standard CPP/EI)', () => {
      it('should have positive CPP and EI on $100k salary', () => {
        const result = calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
          })
        );
        const year1 = result.yearlyResults[0];

        expect(year1.cpp).toBeGreaterThan(0);
        expect(year1.cpp2).toBeGreaterThanOrEqual(0);
        expect(year1.ei).toBeGreaterThan(0);
      });

      it('should have zero QPIP outside Quebec', () => {
        const result = calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
          })
        );
        const year1 = result.yearlyResults[0];

        expect(year1.qpip).toBe(0);
      });

      it('should cap CPP at maximum (approximately $4230 for 2026)', () => {
        const result = calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 200000, // Well above YMPE
          })
        );
        const year1 = result.yearlyResults[0];

        // CPP employee max contribution ~$4230.45 for 2026
        expect(year1.cpp).toBeLessThanOrEqual(4300);
        expect(year1.cpp).toBeGreaterThan(3500);
      });

      it('should cap EI at maximum (approximately $1077 for 2025)', () => {
        const result = calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 200000, // Well above max insurable earnings
          })
        );
        const year1 = result.yearlyResults[0];

        // EI employee max contribution ~$1077.48 for 2025
        expect(year1.ei).toBeLessThanOrEqual(1150);
        expect(year1.ei).toBeGreaterThan(900);
      });
    });

    describe('Quebec (QPP/QPIP)', () => {
      it('should have positive QPP and QPIP on $100k salary', () => {
        const result = calculateProjection(
          createInputs({
            province: 'QC',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
          })
        );
        const year1 = result.yearlyResults[0];

        // Quebec uses QPP (reported in cpp field) and QPIP
        expect(year1.cpp).toBeGreaterThan(0);
        expect(year1.qpip).toBeGreaterThan(0);
      });

      it('should have EI at reduced Quebec rate', () => {
        const result = calculateProjection(
          createInputs({
            province: 'QC',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
          })
        );
        const year1 = result.yearlyResults[0];

        // Quebec has reduced EI rate (no parental benefits component)
        expect(year1.ei).toBeGreaterThan(0);

        // Compare to Ontario EI to verify it's lower
        const onResult = calculateProjection(
          createInputs({
            province: 'ON',
            salaryStrategy: 'fixed',
            fixedSalaryAmount: 100000,
          })
        );
        const onYear1 = onResult.yearlyResults[0];

        // Quebec EI should be less than Ontario EI (reduced rate)
        expect(year1.ei).toBeLessThan(onYear1.ei);
      });
    });
  });

  // ---------------------------------------------------------------
  // 7. Investment returns trace
  // ---------------------------------------------------------------
  describe('Investment returns trace', () => {
    it('should generate returns close to balance * rate', () => {
      const balance = 500000;
      const rate = 0.04;
      const result = calculateProjection(
        createInputs({
          investmentReturnRate: rate,
          corporateInvestmentBalance: balance,
          annualCorporateRetainedEarnings: 0,
        })
      );
      const year1 = result.yearlyResults[0];
      const expectedReturn = balance * rate; // 20000

      // Within 10% tolerance (timing of withdrawals may affect actual balance)
      expect(year1.investmentReturns.totalReturn).toBeGreaterThan(expectedReturn * 0.9);
      expect(year1.investmentReturns.totalReturn).toBeLessThan(expectedReturn * 1.1);
    });

    it('should have return components sum to totalReturn', () => {
      const result = calculateProjection(
        createInputs({
          investmentReturnRate: 0.04,
          corporateInvestmentBalance: 500000,
          annualCorporateRetainedEarnings: 0,
        })
      );
      const year1 = result.yearlyResults[0];
      const returns = year1.investmentReturns;

      const componentSum =
        returns.canadianDividends +
        returns.foreignIncome +
        returns.realizedCapitalGain +
        returns.unrealizedCapitalGain;

      expect(Math.abs(returns.totalReturn - componentSum)).toBeLessThan(2);
    });

    it('should split returns roughly according to portfolio allocation', () => {
      const result = calculateProjection(
        createInputs({
          investmentReturnRate: 0.04,
          corporateInvestmentBalance: 500000,
          canadianEquityPercent: 25,
          usEquityPercent: 25,
          internationalEquityPercent: 25,
          fixedIncomePercent: 25,
          annualCorporateRetainedEarnings: 0,
        })
      );
      const year1 = result.yearlyResults[0];
      const returns = year1.investmentReturns;

      // Each component should be a meaningful portion (> 0)
      // Exact split depends on how allocations map to return types
      // With 25% each, no single component should dominate (> 80% of total)
      if (returns.totalReturn > 0) {
        const components = [
          returns.canadianDividends,
          returns.foreignIncome,
          returns.realizedCapitalGain + returns.unrealizedCapitalGain,
        ];

        for (const component of components) {
          // No component should be more than 80% of total (50% tolerance)
          expect(component).toBeLessThanOrEqual(returns.totalReturn * 0.8);
        }
      }
    });

    it('should generate zero returns with zero balance and zero earnings', () => {
      const result = calculateProjection(
        createInputs({
          investmentReturnRate: 0.04,
          corporateInvestmentBalance: 0,
          annualCorporateRetainedEarnings: 0,
        })
      );
      const year1 = result.yearlyResults[0];

      expect(year1.investmentReturns.totalReturn).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // 8. RDTOH refund mechanism
  // ---------------------------------------------------------------
  describe('RDTOH refund mechanism', () => {
    it('should receive RDTOH refund when eligible dividends are paid from eRDTOH', () => {
      const initialERDTOH = 50000;
      const result = calculateProjection(
        createInputs({
          salaryStrategy: 'dividends-only',
          eRDTOHBalance: initialERDTOH,
          nRDTOHBalance: 0,
          cdaBalance: 0,
          gripBalance: 0,
        })
      );
      const year1 = result.yearlyResults[0];

      // When eligible dividends are paid and eRDTOH exists, a refund should occur
      if (year1.dividends.eligibleDividends > 0) {
        expect(year1.rdtohRefundReceived).toBeGreaterThan(0);
      }
    });

    it('should not refund more than starting eRDTOH balance plus increases', () => {
      const initialERDTOH = 50000;
      const result = calculateProjection(
        createInputs({
          salaryStrategy: 'dividends-only',
          eRDTOHBalance: initialERDTOH,
          nRDTOHBalance: 0,
          cdaBalance: 0,
          gripBalance: 0,
        })
      );
      const year1 = result.yearlyResults[0];
      const maxRefund = initialERDTOH + year1.investmentReturns.eRDTOHIncrease;

      expect(year1.rdtohRefundReceived).toBeLessThanOrEqual(maxRefund + 1);
    });

    it('should decrease eRDTOH when refund is received', () => {
      const initialERDTOH = 50000;
      const result = calculateProjection(
        createInputs({
          salaryStrategy: 'dividends-only',
          eRDTOHBalance: initialERDTOH,
          nRDTOHBalance: 0,
          cdaBalance: 0,
          gripBalance: 0,
        })
      );
      const year1 = result.yearlyResults[0];

      if (year1.rdtohRefundReceived > 0) {
        // eRDTOH after = starting + increases from investment returns - refund
        const expectedAfterRefund =
          initialERDTOH +
          year1.investmentReturns.eRDTOHIncrease -
          year1.rdtohRefundReceived;
        expect(year1.notionalAccounts.eRDTOH).toBeCloseTo(expectedAfterRefund, 0);
      }
    });

    it('should receive nRDTOH refund when non-eligible dividends are paid', () => {
      const initialNRDTOH = 50000;
      const result = calculateProjection(
        createInputs({
          salaryStrategy: 'dividends-only',
          eRDTOHBalance: 0,
          nRDTOHBalance: initialNRDTOH,
          cdaBalance: 0,
          gripBalance: 0,
        })
      );
      const year1 = result.yearlyResults[0];

      // With only nRDTOH available (no CDA, eRDTOH, GRIP), non-eligible dividends should be paid
      if (year1.dividends.nonEligibleDividends > 0) {
        expect(year1.rdtohRefundReceived).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------
  // 9. Corporate tax on active income
  // ---------------------------------------------------------------
  describe('Corporate tax on active income', () => {
    it('should tax active business income above salary costs', () => {
      const result = calculateProjection(
        createInputs({
          annualCorporateRetainedEarnings: 200000,
          salaryStrategy: 'fixed',
          fixedSalaryAmount: 50000,
        })
      );
      const year1 = result.yearlyResults[0];

      // With 200k earnings and only 50k salary (plus employer payroll costs),
      // there should be substantial taxable active income
      expect(year1.corporateTaxOnActive).toBeGreaterThan(0);
    });

    it('should not exceed general rate on full business income', () => {
      const earnings = 200000;
      const result = calculateProjection(
        createInputs({
          annualCorporateRetainedEarnings: earnings,
          salaryStrategy: 'fixed',
          fixedSalaryAmount: 50000,
        })
      );
      const year1 = result.yearlyResults[0];

      // Corporate tax cannot exceed the general rate (approximately 26.5%) on the full amount
      expect(year1.corporateTaxOnActive).toBeLessThan(earnings * 0.27);
    });

    it('should have zero corporate tax on active income when salary exceeds earnings', () => {
      const result = calculateProjection(
        createInputs({
          annualCorporateRetainedEarnings: 50000,
          salaryStrategy: 'fixed',
          fixedSalaryAmount: 100000, // Salary > earnings
        })
      );
      const year1 = result.yearlyResults[0];

      // When salary + employer costs exceed business income, taxable active income is 0
      expect(year1.corporateTaxOnActive).toBe(0);
    });

    it('should tax at small business rate when within SBD limit', () => {
      const result = calculateProjection(
        createInputs({
          annualCorporateRetainedEarnings: 100000,
          salaryStrategy: 'fixed',
          fixedSalaryAmount: 0, // No salary -- all retained
          corporateInvestmentBalance: 0, // No passive income to trigger grind
          investmentReturnRate: 0,
        })
      );
      const year1 = result.yearlyResults[0];

      // With 100k of active income and no passive income grind,
      // should be taxed at small business rate (~12.2% combined for ON)
      if (year1.corporateTaxOnActive > 0) {
        const taxableActive = 100000; // Approx, no salary deducted
        const effectiveActiveRate = year1.corporateTaxOnActive / taxableActive;
        // Small business rate is roughly 12-13%, general is ~26%
        expect(effectiveActiveRate).toBeLessThan(0.20);
      }
    });
  });

  // ---------------------------------------------------------------
  // 10. Multi-year cumulative dollar trace
  // ---------------------------------------------------------------
  describe('Multi-year cumulative dollar trace', () => {
    it('should sum yearly personalTax to summary totalPersonalTax', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      const sumPersonalTax = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.personalTax,
        0
      );

      expect(result.totalPersonalTax).toBeCloseTo(sumPersonalTax, 2);
    });

    it('should sum yearly corporateTax to summary totalCorporateTax', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      const sumCorporateTax = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.corporateTax,
        0
      );

      expect(result.totalCorporateTax).toBeCloseTo(sumCorporateTax, 2);
    });

    it('should sum yearly salary to summary totalSalary', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      const sumSalary = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.salary,
        0
      );

      expect(result.totalSalary).toBeCloseTo(sumSalary, 2);
    });

    it('should sum yearly grossDividends to summary totalDividends', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      const sumDividends = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.dividends.grossDividends,
        0
      );

      expect(result.totalDividends).toBeCloseTo(sumDividends, 2);
    });

    it('should compute effectiveTaxRate = totalTax / totalCompensation', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      if (result.totalCompensation > 0) {
        const expectedRate = result.totalTax / result.totalCompensation;
        expect(Math.abs(result.effectiveTaxRate - expectedRate)).toBeLessThan(0.001);
      }
    });

    it('should have totalCompensation = totalSalary + totalDividends', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      expect(result.totalCompensation).toBeCloseTo(
        result.totalSalary + result.totalDividends,
        2
      );
    });

    it('should have totalTax = totalPersonalTax + totalCorporateTax (summary level)', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      // Summary totalTax = personalTax + corporateTax (no payroll at summary level)
      expect(result.totalTax).toBeCloseTo(
        result.totalPersonalTax + result.totalCorporateTax,
        2
      );
    });

    it('should sum corporateTaxOnActive and corporateTaxOnPassive to summary totals', () => {
      const result = calculateProjection(
        createInputs({ planningHorizon: 5 })
      );

      const sumActive = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.corporateTaxOnActive,
        0
      );
      const sumPassive = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.corporateTaxOnPassive,
        0
      );

      expect(result.totalCorporateTaxOnActive).toBeCloseTo(sumActive, 2);
      expect(result.totalCorporateTaxOnPassive).toBeCloseTo(sumPassive, 2);
    });

    it('should sum rdtohRefundReceived to summary totalRdtohRefund', () => {
      const result = calculateProjection(
        createInputs({
          planningHorizon: 5,
          eRDTOHBalance: 50000,
          nRDTOHBalance: 50000,
        })
      );

      const sumRdtoh = result.yearlyResults.reduce(
        (sum, yr) => sum + yr.rdtohRefundReceived,
        0
      );

      expect(result.totalRdtohRefund).toBeCloseTo(sumRdtoh, 2);
    });
  });

  // ---------------------------------------------------------------
  // Additional identity tests for robustness
  // ---------------------------------------------------------------
  describe('grossDividends identity', () => {
    it.each(ALL_PROVINCES)(
      '%s: grossDividends = capitalDividends + eligibleDividends + nonEligibleDividends',
      (province) => {
        const result = calculateProjection(
          createInputs({
            province,
            cdaBalance: 20000,
            eRDTOHBalance: 20000,
            nRDTOHBalance: 20000,
            gripBalance: 20000,
          })
        );
        const year1 = result.yearlyResults[0];

        const expectedGross =
          year1.dividends.capitalDividends +
          year1.dividends.eligibleDividends +
          year1.dividends.nonEligibleDividends;

        expect(year1.dividends.grossDividends).toBeCloseTo(expectedGross, 2);
      }
    );
  });

  describe('Non-negative constraints', () => {
    it.each(ALL_PROVINCES)(
      '%s: all tax and income fields are non-negative',
      (province) => {
        const result = calculateProjection(createInputs({ province }));
        const year1 = result.yearlyResults[0];

        expect(year1.salary).toBeGreaterThanOrEqual(0);
        expect(year1.personalTax).toBeGreaterThanOrEqual(0);
        expect(year1.corporateTax).toBeGreaterThanOrEqual(0);
        expect(year1.corporateTaxOnActive).toBeGreaterThanOrEqual(0);
        expect(year1.corporateTaxOnPassive).toBeGreaterThanOrEqual(0);
        expect(year1.cpp).toBeGreaterThanOrEqual(0);
        expect(year1.cpp2).toBeGreaterThanOrEqual(0);
        expect(year1.ei).toBeGreaterThanOrEqual(0);
        expect(year1.qpip).toBeGreaterThanOrEqual(0);
        expect(year1.totalTax).toBeGreaterThanOrEqual(0);
        expect(year1.afterTaxIncome).toBeGreaterThan(0);
        expect(year1.dividends.capitalDividends).toBeGreaterThanOrEqual(0);
        expect(year1.dividends.eligibleDividends).toBeGreaterThanOrEqual(0);
        expect(year1.dividends.nonEligibleDividends).toBeGreaterThanOrEqual(0);
        expect(year1.dividends.grossDividends).toBeGreaterThanOrEqual(0);
        expect(year1.rdtohRefundReceived).toBeGreaterThanOrEqual(0);
      }
    );
  });

  describe('Notional account non-negative constraints', () => {
    it.each(ALL_PROVINCES)(
      '%s: notional accounts remain non-negative',
      (province) => {
        const result = calculateProjection(
          createInputs({
            province,
            cdaBalance: 10000,
            eRDTOHBalance: 10000,
            nRDTOHBalance: 10000,
            gripBalance: 10000,
          })
        );
        const year1 = result.yearlyResults[0];

        expect(year1.notionalAccounts.CDA).toBeGreaterThanOrEqual(-1);
        expect(year1.notionalAccounts.eRDTOH).toBeGreaterThanOrEqual(-1);
        expect(year1.notionalAccounts.nRDTOH).toBeGreaterThanOrEqual(-1);
        expect(year1.notionalAccounts.GRIP).toBeGreaterThanOrEqual(-1);
      }
    );
  });

  describe('Cross-strategy consistency', () => {
    it.each(MAJOR_PROVINCES)(
      '%s: all strategies produce positive after-tax income',
      (province) => {
        const strategies = ['dynamic', 'fixed', 'dividends-only'] as const;

        for (const strategy of strategies) {
          const overrides: Partial<UserInputs> = {
            province,
            salaryStrategy: strategy,
            eRDTOHBalance: 50000,
            nRDTOHBalance: 50000,
            cdaBalance: 50000,
          };
          if (strategy === 'fixed') {
            overrides.fixedSalaryAmount = 80000;
          }

          const result = calculateProjection(createInputs(overrides));
          const year1 = result.yearlyResults[0];

          expect(year1.afterTaxIncome).toBeGreaterThan(0);
        }
      }
    );
  });

  describe('Passive income grind consistency', () => {
    it('should report passive income grind details', () => {
      const result = calculateProjection(
        createInputs({
          corporateInvestmentBalance: 2000000, // Large balance for significant passive income
          investmentReturnRate: 0.06,
          annualCorporateRetainedEarnings: 200000,
          salaryStrategy: 'fixed',
          fixedSalaryAmount: 60000,
        })
      );
      const year1 = result.yearlyResults[0];

      // With a large investment balance, there should be measurable passive income
      expect(year1.passiveIncomeGrind.totalPassiveIncome).toBeGreaterThanOrEqual(0);
      expect(year1.passiveIncomeGrind.reducedSBDLimit).toBeGreaterThanOrEqual(0);
      expect(year1.passiveIncomeGrind.reducedSBDLimit).toBeLessThanOrEqual(500000);
      expect(year1.passiveIncomeGrind.sbdReduction).toBeGreaterThanOrEqual(0);
      expect(year1.passiveIncomeGrind.additionalTaxFromGrind).toBeGreaterThanOrEqual(0);
    });

    it('should not grind SBD when passive income is below threshold', () => {
      const result = calculateProjection(
        createInputs({
          corporateInvestmentBalance: 100000, // Small balance = low passive income
          investmentReturnRate: 0.02,
          annualCorporateRetainedEarnings: 100000,
          salaryStrategy: 'fixed',
          fixedSalaryAmount: 60000,
        })
      );
      const year1 = result.yearlyResults[0];

      // With small passive income (below $50k AAII threshold), SBD should be full $500k
      if (year1.passiveIncomeGrind.totalPassiveIncome < 50000) {
        expect(year1.passiveIncomeGrind.reducedSBDLimit).toBe(500000);
        expect(year1.passiveIncomeGrind.sbdReduction).toBe(0);
      }
    });
  });

  describe('Year numbering and horizon', () => {
    it('should have correct year numbers in sequence', () => {
      const horizon = 5;
      const result = calculateProjection(createInputs({ planningHorizon: horizon }));

      expect(result.yearlyResults.length).toBe(horizon);
      for (let i = 0; i < horizon; i++) {
        expect(result.yearlyResults[i].year).toBe(i + 1);
      }
    });

    it('should maintain accounting identities across all years', () => {
      const result = calculateProjection(
        createInputs({
          planningHorizon: 10,
          cdaBalance: 50000,
          eRDTOHBalance: 50000,
          nRDTOHBalance: 50000,
          gripBalance: 50000,
        })
      );

      for (const year of result.yearlyResults) {
        // totalTax identity
        const expectedTotalTax =
          year.personalTax +
          year.corporateTax +
          year.cpp +
          year.cpp2 +
          year.ei +
          year.qpip;
        expect(Math.abs(year.totalTax - expectedTotalTax)).toBeLessThan(2);

        // afterTaxIncome identity
        const grossDividends =
          year.dividends.capitalDividends +
          year.dividends.eligibleDividends +
          year.dividends.nonEligibleDividends;
        const expectedAfterTax =
          year.salary +
          grossDividends -
          year.personalTax -
          year.cpp -
          year.cpp2 -
          year.ei -
          year.qpip;
        expect(Math.abs(year.afterTaxIncome - expectedAfterTax)).toBeLessThan(2);

        // grossDividends identity
        expect(year.dividends.grossDividends).toBeCloseTo(grossDividends, 2);

        // corporateTax decomposition
        expect(
          Math.abs(year.corporateTax - year.corporateTaxOnActive - year.corporateTaxOnPassive)
        ).toBeLessThan(2);
      }
    });
  });
});
