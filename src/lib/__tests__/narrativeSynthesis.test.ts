import { describe, it, expect } from 'vitest';
import { buildRecommendationNarrative } from '../narrativeSynthesis';
import type { NarrativeInput } from '../narrativeSynthesis';

function makeNarrativeInput(overrides: Partial<NarrativeInput> = {}): NarrativeInput {
  return {
    winnerId: 'dynamic',
    winnerLabel: 'Dynamic Optimizer',
    runnerId: 'dividends-only',
    runnerLabel: 'Dividends Only',
    lifetimeTaxDifference: 340000,   // winner saves this much vs runner
    estateValueDifference: 180000,   // winner leaves this much more
    rrspRoomDifference: 200000,      // winner builds this much more RRSP room
    annualRetirementIncome: 87400,
    retirementSuccessRate: 0.94,
    objective: 'balanced',
    ...overrides,
  };
}

describe('buildRecommendationNarrative', () => {
  it('returns a non-empty string', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput());
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('dynamic winner narrative mentions RRSP room and tax savings', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput({ winnerId: 'dynamic' }));
    expect(result.toLowerCase()).toMatch(/rrsp|tax/);
  });

  it('dividends-only winner narrative mentions estate or structure', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput({
      winnerId: 'dividends-only',
      winnerLabel: 'Dividends Only',
      runnerId: 'dynamic',
      runnerLabel: 'Dynamic Optimizer',
    }));
    expect(result.toLowerCase()).toMatch(/estate|structure|dividend/);
  });

  it('salary-at-ympe winner narrative mentions CPP', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput({
      winnerId: 'salary-at-ympe',
      winnerLabel: 'Salary at YMPE',
      runnerId: 'dynamic',
      runnerLabel: 'Dynamic Optimizer',
    }));
    expect(result.toLowerCase()).toMatch(/cpp|pension|salary/);
  });

  it('includes currency-formatted numbers', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput({
      lifetimeTaxDifference: 340000,
    }));
    // Should contain something like $340,000
    expect(result).toMatch(/\$[\d,]+/);
  });

  it('handles zero differences gracefully (no NaN or undefined)', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput({
      lifetimeTaxDifference: 0,
      estateValueDifference: 0,
      rrspRoomDifference: 0,
    }));
    expect(result).toBeTruthy();
    expect(result).not.toContain('NaN');
    expect(result).not.toContain('undefined');
  });

  it('appends spousal rollover note when hasSpouse is true', () => {
    const result = buildRecommendationNarrative(makeNarrativeInput({ hasSpouse: true }));
    expect(result.toLowerCase()).toMatch(/spouse|rrsp.*transfer|tax.deferred/);
    expect(result).toContain('tax-deferred');
  });

  it('omits spousal rollover note when hasSpouse is false or absent', () => {
    const withFalse = buildRecommendationNarrative(makeNarrativeInput({ hasSpouse: false }));
    const withAbsent = buildRecommendationNarrative(makeNarrativeInput());
    expect(withFalse).not.toContain('tax-deferred');
    expect(withAbsent).not.toContain('tax-deferred');
  });

  it('spousal rollover note appears for all strategy winner types', () => {
    const strategies = ['dynamic', 'dividends-only', 'salary-at-ympe', 'custom'] as const;
    for (const winnerId of strategies) {
      const result = buildRecommendationNarrative(makeNarrativeInput({ winnerId, hasSpouse: true }));
      expect(result).toContain('tax-deferred');
    }
  });
});
