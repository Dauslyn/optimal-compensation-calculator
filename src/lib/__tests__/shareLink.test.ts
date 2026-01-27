import { describe, it, expect } from 'vitest';
import { encodeShareLink, decodeShareLink } from '../shareLink';
import type { UserInputs } from '../types';

describe('Share Link', () => {
  const sampleInputs: UserInputs = {
    province: 'ON',
    requiredIncome: 150000,
    planningHorizon: 5,
    startingYear: 2025,
    expectedInflationRate: 0.02,
    inflateSpendingNeeds: true,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 50000,
    rrspBalance: 100000,
    cdaBalance: 25000,
    eRDTOHBalance: 10000,
    nRDTOHBalance: 5000,
    gripBalance: 50000,
    investmentReturnRate: 0.0431,
    canadianEquityPercent: 25,
    usEquityPercent: 25,
    internationalEquityPercent: 25,
    fixedIncomePercent: 25,
    annualCorporateRetainedEarnings: 200000,
    maximizeTFSA: true,
    contributeToRRSP: true,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
  };

  describe('encodeShareLink', () => {
    it('encodes inputs to a non-empty string', () => {
      const encoded = encodeShareLink(sampleInputs);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('produces URL-safe output (no +, /, or =)', () => {
      const encoded = encodeShareLink(sampleInputs);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      // Note: = can appear at the end of base64, but we strip trailing =
    });

    it('produces different output for different inputs', () => {
      const encoded1 = encodeShareLink(sampleInputs);
      const modifiedInputs = { ...sampleInputs, requiredIncome: 200000 };
      const encoded2 = encodeShareLink(modifiedInputs);
      expect(encoded1).not.toBe(encoded2);
    });
  });

  describe('decodeShareLink', () => {
    it('decodes an encoded string back to original inputs', () => {
      const encoded = encodeShareLink(sampleInputs);
      const decoded = decodeShareLink(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.requiredIncome).toBe(sampleInputs.requiredIncome);
      expect(decoded!.planningHorizon).toBe(sampleInputs.planningHorizon);
      expect(decoded!.startingYear).toBe(sampleInputs.startingYear);
      expect(decoded!.expectedInflationRate).toBe(sampleInputs.expectedInflationRate);
      expect(decoded!.inflateSpendingNeeds).toBe(sampleInputs.inflateSpendingNeeds);
      expect(decoded!.corporateInvestmentBalance).toBe(sampleInputs.corporateInvestmentBalance);
      expect(decoded!.salaryStrategy).toBe(sampleInputs.salaryStrategy);
      expect(decoded!.maximizeTFSA).toBe(sampleInputs.maximizeTFSA);
      expect(decoded!.contributeToRRSP).toBe(sampleInputs.contributeToRRSP);
    });

    it('preserves optional fields when set', () => {
      const inputsWithOptional: UserInputs = {
        ...sampleInputs,
        respContributionAmount: 5000,
        debtPaydownAmount: 10000,
        totalDebtAmount: 100000,
        debtInterestRate: 0.05,
        fixedSalaryAmount: 80000,
      };

      const encoded = encodeShareLink(inputsWithOptional);
      const decoded = decodeShareLink(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.respContributionAmount).toBe(5000);
      expect(decoded!.debtPaydownAmount).toBe(10000);
      expect(decoded!.totalDebtAmount).toBe(100000);
      expect(decoded!.debtInterestRate).toBe(0.05);
      expect(decoded!.fixedSalaryAmount).toBe(80000);
    });

    it('returns null for invalid encoded string', () => {
      const decoded = decodeShareLink('not-valid-base64!!!');
      expect(decoded).toBeNull();
    });

    it('returns null for empty string', () => {
      const decoded = decodeShareLink('');
      expect(decoded).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      // Valid base64 but not valid JSON
      const notJson = btoa('not json').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decoded = decodeShareLink(notJson);
      expect(decoded).toBeNull();
    });
  });

  describe('round-trip', () => {
    it('preserves all fields through encode/decode cycle', () => {
      const fullInputs: UserInputs = {
        province: 'BC',
        requiredIncome: 123456,
        planningHorizon: 3,
        startingYear: 2026,
        expectedInflationRate: 0.025,
        inflateSpendingNeeds: false,
        corporateInvestmentBalance: 999999,
        tfsaBalance: 11111,
        rrspBalance: 22222,
        cdaBalance: 33333,
        eRDTOHBalance: 44444,
        nRDTOHBalance: 55555,
        gripBalance: 66666,
        investmentReturnRate: 0.055,
        canadianEquityPercent: 10,
        usEquityPercent: 20,
        internationalEquityPercent: 30,
        fixedIncomePercent: 40,
        annualCorporateRetainedEarnings: 77777,
        maximizeTFSA: false,
        contributeToRRSP: false,
        contributeToRESP: true,
        payDownDebt: true,
        salaryStrategy: 'fixed',
        respContributionAmount: 2500,
        debtPaydownAmount: 5000,
        totalDebtAmount: 50000,
        debtInterestRate: 0.045,
        fixedSalaryAmount: 60000,
      };

      const encoded = encodeShareLink(fullInputs);
      const decoded = decodeShareLink(encoded);

      expect(decoded).toEqual(fullInputs);
    });

    it('handles dividends-only strategy', () => {
      const dividendsOnly: UserInputs = {
        ...sampleInputs,
        salaryStrategy: 'dividends-only',
      };

      const encoded = encodeShareLink(dividendsOnly);
      const decoded = decodeShareLink(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.salaryStrategy).toBe('dividends-only');
    });
  });
});
