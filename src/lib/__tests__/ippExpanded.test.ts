import { describe, it, expect } from 'vitest';
import {
  calculateProjectedPension,
  estimateCurrentTargetLiability,
  calculateFundingStatus,
  estimateTerminalFunding,
} from '../tax/ipp';

describe('calculateProjectedPension', () => {
  it('caps pension at DB limit when salary exceeds implied cap', () => {
    // DB limit 2026 = 3725. Implied salary cap = 3725 / 0.02 = 186,250.
    // Salary $250,000 exceeds cap, so unit pension = $3,725.
    const pension = calculateProjectedPension(20, 250000, 2026);
    expect(pension).toBeCloseTo(3725 * 20); // $74,500
  });

  it('uses actual salary when below DB limit cap', () => {
    // 2% × $150,000 = $3,000 < $3,725 DB limit
    const pension = calculateProjectedPension(20, 150000, 2026);
    expect(pension).toBeCloseTo(0.02 * 150000 * 20); // $60,000
  });

  it('falls back to 2026 limit for unknown future year', () => {
    const p2030 = calculateProjectedPension(10, 200000, 2030);
    const p2026 = calculateProjectedPension(10, 200000, 2026);
    expect(p2030).toBe(p2026);
  });
});

describe('estimateCurrentTargetLiability', () => {
  it('returns liability grown at 7.5% with no CSC', () => {
    const result = estimateCurrentTargetLiability(500000, 2022, 0, 2025);
    expect(result).toBeCloseTo(500000 * Math.pow(1.075, 3));
  });

  it('adds CSC contributions accumulated at 7.5%', () => {
    const result = estimateCurrentTargetLiability(500000, 2023, 36000, 2025);
    const liabilityGrown = 500000 * Math.pow(1.075, 2);
    const cscAccum = 36000 * ((Math.pow(1.075, 2) - 1) / 0.075);
    expect(result).toBeCloseTo(liabilityGrown + cscAccum);
  });

  it('returns liability unchanged when years elapsed = 0', () => {
    const result = estimateCurrentTargetLiability(500000, 2025, 36000, 2025);
    expect(result).toBeCloseTo(500000);
  });
});

describe('calculateFundingStatus', () => {
  it('shows deficiency when fund < liability', () => {
    const status = calculateFundingStatus(450000, 550000);
    expect(status.gap).toBeCloseTo(100000);
    expect(status.surplus).toBe(0);
    expect(status.deficiencyLikely).toBe(true);
    expect(status.contributionHolidayTriggered).toBe(false);
    expect(status.fundingRatio).toBeCloseTo(450000 / 550000);
  });

  it('shows surplus when fund > liability', () => {
    const status = calculateFundingStatus(600000, 500000);
    expect(status.surplus).toBeCloseTo(100000);
    expect(status.gap).toBe(0);
    expect(status.deficiencyLikely).toBe(false);
  });

  it('triggers contribution holiday when fund > 1.25× liability', () => {
    const status = calculateFundingStatus(650000, 500000);
    expect(status.contributionHolidayTriggered).toBe(true);
  });
});

describe('estimateTerminalFunding', () => {
  it('returns positive value when fund < annuity cost', () => {
    // Annual pension $70,000, annuity factor 12.5 → cost = $875,000
    // Fund $600,000 → gap = $275,000
    const result = estimateTerminalFunding(600000, 70000);
    expect(result).toBeCloseTo(875000 - 600000);
  });

  it('returns zero when fund >= annuity cost', () => {
    const result = estimateTerminalFunding(1000000, 70000);
    expect(result).toBe(0);
  });
});
