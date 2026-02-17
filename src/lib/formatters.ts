/**
 * Formatting utilities for currency, percentages, and numbers
 */

/**
 * Format a number as Canadian currency
 */
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
  }

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a decimal as a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a decimal as a percentage (alias for formatPercent, used by some components)
 */
export function formatPercentage(decimal: number): string {
  return formatPercent(decimal);
}

/**
 * Format a difference (positive/negative) with color indication
 */
export function formatDifference(value: number, invert = false): {
  text: string;
  color: 'positive' | 'negative' | 'neutral';
} {
  const formatted = formatCurrency(Math.abs(value));
  let color: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (value > 0) {
    color = invert ? 'negative' : 'positive';
  } else if (value < 0) {
    color = invert ? 'positive' : 'negative';
  }

  return {
    text: value >= 0 ? `+${formatted}` : `-${formatted}`,
    color,
  };
}
