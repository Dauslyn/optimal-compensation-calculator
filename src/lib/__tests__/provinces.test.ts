/**
 * Tests for getTopProvincialRate helper function.
 * These are the top combined federal + provincial marginal tax rates for 2025.
 */

import { describe, it, expect } from 'vitest';
import { getTopProvincialRate } from '../tax/provinces';
import type { ProvinceCode } from '../tax/provinces';

describe('getTopProvincialRate', () => {
  it('returns top combined rate for Ontario', () => {
    // 33% federal + 20.53% ON (incl. surtax effect) = ~53.53%
    expect(getTopProvincialRate('ON')).toBeCloseTo(0.5353, 3);
  });

  it('returns top combined rate for Alberta', () => {
    // 33% federal + 15% AB = 48%
    expect(getTopProvincialRate('AB')).toBeCloseTo(0.48, 3);
  });

  it('returns top combined rate for BC', () => {
    // 33% federal + 20.5% BC = 53.5%
    expect(getTopProvincialRate('BC')).toBeCloseTo(0.535, 3);
  });

  it('returns top combined rate for Quebec', () => {
    // 33% federal (less 16.5% abatement) + 25.75% QC = ~53.31%
    expect(getTopProvincialRate('QC')).toBeCloseTo(0.5331, 3);
  });

  it('returns top combined rate for Saskatchewan', () => {
    // 33% federal + 14.5% SK = 47.5%
    expect(getTopProvincialRate('SK')).toBeCloseTo(0.475, 3);
  });

  it('returns a valid rate for all provinces', () => {
    const provinces: ProvinceCode[] = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
    for (const prov of provinces) {
      const rate = getTopProvincialRate(prov);
      expect(rate).toBeGreaterThan(0.40);
      expect(rate).toBeLessThan(0.60);
    }
  });
});
