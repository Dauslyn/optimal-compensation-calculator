import { describe, it, expect } from 'vitest';
import { aggregateDebts, PAYMENT_FREQUENCY_MULTIPLIERS } from '../types';
import type { DebtEntry } from '../types';

describe('aggregateDebts', () => {
  it('returns zeros for empty array', () => {
    const result = aggregateDebts([]);
    expect(result.totalBalance).toBe(0);
    expect(result.totalAnnualPayment).toBe(0);
    expect(result.weightedInterestRate).toBe(0);
  });

  it('computes annual payment from monthly frequency', () => {
    const debts: DebtEntry[] = [{
      id: '1',
      label: 'Mortgage',
      balance: 400000,
      paymentAmount: 2000,
      paymentFrequency: 'monthly',
      interestRate: 0.05,
    }];
    const result = aggregateDebts(debts);
    expect(result.totalAnnualPayment).toBe(24000); // 2000 × 12
    expect(result.totalBalance).toBe(400000);
    expect(result.weightedInterestRate).toBeCloseTo(0.05);
  });

  it('computes balance-weighted interest rate across multiple debts', () => {
    const debts: DebtEntry[] = [
      { id: '1', label: 'Mortgage', balance: 400000, paymentAmount: 2000, paymentFrequency: 'monthly', interestRate: 0.05 },
      { id: '2', label: 'LOC', balance: 100000, paymentAmount: 500, paymentFrequency: 'monthly', interestRate: 0.07 },
    ];
    const result = aggregateDebts(debts);
    // Weighted: (400000×0.05 + 100000×0.07) / 500000 = (20000 + 7000) / 500000 = 0.054
    expect(result.weightedInterestRate).toBeCloseTo(0.054);
    expect(result.totalBalance).toBe(500000);
    expect(result.totalAnnualPayment).toBe(30000); // (2000 + 500) × 12
  });

  it('handles biweekly frequency correctly', () => {
    const debts: DebtEntry[] = [{
      id: '1', label: 'Mortgage', balance: 300000,
      paymentAmount: 1200, paymentFrequency: 'biweekly', interestRate: 0.05,
    }];
    expect(aggregateDebts(debts).totalAnnualPayment).toBe(1200 * 26);
  });
});
