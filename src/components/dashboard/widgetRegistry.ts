/**
 * Widget Registry (v2.3.0)
 */

import type { WidgetDefinition, DashboardWidget, DashboardLayout } from './types';

export type { WidgetDefinition, DashboardWidget, DashboardLayout };

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  'total-tax-comparison': { id: 'total-tax-comparison', label: 'Total Tax Comparison', icon: '\u{1F4CA}', category: 'chart' },
  'corporate-balance-over-time': { id: 'corporate-balance-over-time', label: 'Corporate Balance Over Time', icon: '\u{1F4C8}', category: 'chart' },
  'cumulative-tax-paid': { id: 'cumulative-tax-paid', label: 'Cumulative Tax Paid', icon: '\u{1F4C9}', category: 'chart' },
  'tax-breakdown': { id: 'tax-breakdown', label: 'Tax Breakdown', icon: '\u{1F3D7}\uFE0F', category: 'chart' },
  'compensation-mix': { id: 'compensation-mix', label: 'Compensation Mix', icon: '\u{1F4B0}', category: 'chart' },
  'rrsp-room': { id: 'rrsp-room', label: 'RRSP Room', icon: '\u{1F3E6}', category: 'chart' },
  'effective-tax-rate': { id: 'effective-tax-rate', label: 'Effective Tax Rate', icon: '\u{1F4D0}', category: 'chart' },
  'ipp-contributions': { id: 'ipp-contributions', label: 'IPP Contributions', icon: '\u{1F3AF}', category: 'chart', conditional: true },
  'compensation-by-year': { id: 'compensation-by-year', label: 'Compensation by Year', icon: '\u{1F4C5}', category: 'chart' },
  'after-tax-wealth': { id: 'after-tax-wealth', label: 'After-Tax Wealth Scenarios', icon: '\u{1F48E}', category: 'table' },
  'action-plan': { id: 'action-plan', label: 'Year-by-Year Action Plan', icon: '\u2705', category: 'table' },
  'yearly-projection': { id: 'yearly-projection', label: 'Full Yearly Projection', icon: '\u{1F4CB}', category: 'table' },
  'key-metrics': { id: 'key-metrics', label: 'Key Metrics Summary', icon: '\u{1F3AF}', category: 'stat' },
};

export function getAvailableWidgets(options?: { ippEnabled?: boolean }): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(w => {
    if (w.conditional && w.id === 'ipp-contributions' && !options?.ippEnabled) return false;
    return true;
  });
}

export const STRATEGY_IDS = ['salary-at-ympe', 'dividends-only', 'dynamic'] as const;
export type StrategyId = typeof STRATEGY_IDS[number];

let instanceCounter = 0;
export function createWidgetInstance(widgetType: string, strategyId: string): DashboardWidget {
  instanceCounter++;
  return { instanceId: `w_${Date.now()}_${instanceCounter}`, widgetType, strategyId };
}
